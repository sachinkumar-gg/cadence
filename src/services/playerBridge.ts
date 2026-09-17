import { PlayerState } from '../types/player';
import { globalClock } from './clock';

type PlayerCallback = (state: PlayerState) => void;

class PlayerBridgeService {
  private eventSource: EventSource | null = null;
  private isConnected: boolean = false;
  private isNativeBridgeActive: boolean = false;
  private listeners: Set<PlayerCallback> = new Set();
  private reconnectTimer: any = null;
  private latestState: PlayerState | null = null;
  private lastTrackKey: string = '';

  constructor() {
    this.initNativeListener();
    this.connectSSE();
  }

  /**
   * Native macOS Screen Saver / WKWebView IPC Bridge
   * Receives push events dispatched via webView.evaluateJavaScript("window.dispatchEvent(...)")
   */
  private initNativeListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('nowPlayingUpdate', ((event: CustomEvent<PlayerState>) => {
      const data = event.detail;
      if (data && typeof data === 'object') {
        this.isNativeBridgeActive = true;
        this.isConnected = true;
        this.latestState = data;

        const trackKey = `${data.title}:::${data.artist}`;
        const isTrackChange = this.lastTrackKey !== '' && this.lastTrackKey !== trackKey;
        this.lastTrackKey = trackKey;

        if (data.active) {
          globalClock.sync(
            data.position || 0,
            !!data.isPlaying,
            data.timestamp || Date.now(),
            isTrackChange // Force snap immediately on track change
          );
        } else {
          globalClock.setPlaying(false);
        }

        this.notify(data);
      }
    }) as EventListener);
  }

  /**
   * Browser / Vite dev fallback bridge (SSE)
   */
  public connectSSE() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    // If native bridge is already active inside WKWebView, skip SSE polling
    if (this.isNativeBridgeActive) return;

    try {
      const sseUrl = window.location.port ? '/events' : 'http://127.0.0.1:4321/events';
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        console.log('⚡ Connected to Cadence local music bridge (SSE)');
      };

      this.eventSource.onmessage = (event) => {
        // If native bridge took over, close SSE
        if (this.isNativeBridgeActive) {
          if (this.eventSource) this.eventSource.close();
          return;
        }

        try {
          const data = JSON.parse(event.data);
          if (data && typeof data === 'object') {
            if (data.active) {
              globalClock.sync(data.position || 0, !!data.isPlaying, data.timestamp || Date.now());
            }
            this.notify(data);
          }
        } catch {
          // parse error
        }
      };

      this.eventSource.onerror = () => {
        if (!this.isNativeBridgeActive) {
          this.isConnected = false;
        }
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connectSSE(), 3500);
      };
    } catch {
      if (!this.isNativeBridgeActive) {
        this.isConnected = false;
      }
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.connectSSE(), 3500);
    }
  }

  public subscribe(callback: PlayerCallback): () => void {
    this.listeners.add(callback);
    if (this.latestState) {
      callback(this.latestState);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(state: PlayerState) {
    this.listeners.forEach((fn) => fn(state));
  }

  public getIsBridgeConnected(): boolean {
    return this.isConnected || this.isNativeBridgeActive;
  }

  public getIsNativeActive(): boolean {
    return this.isNativeBridgeActive;
  }
}

export const playerBridge = new PlayerBridgeService();

