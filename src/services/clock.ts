/**
 * High-Precision Zero-Jitter Interpolation Clock
 * Decoupled from polling jitter: uses monotonic performance.now() elapsed time.
 * Native push updates only correct drift if delta exceeds the 150ms threshold.
 */
export class InterpolationClock {
  private basePosition: number = 0; // seconds
  private baseTimestamp: number = 0; // performance.now()
  private isPlaying: boolean = true;
  private playbackRate: number = 1.0;
  private readonly DRIFT_SNAP_THRESHOLD_SEC = 0.150; // 150ms threshold


  constructor() {
    this.baseTimestamp = performance.now();
  }

  /**
   * Called on native updates (MediaRemote / AppleScript push or poll).
   * Snaps only if delta > 150ms, play state changes, or user seeks.
   */
  public sync(
    reportedPosition: number,
    isPlaying: boolean,
    reportedTimestampMs: number = Date.now(),
    forceSnap: boolean = false
  ) {
    const now = performance.now();
    const transitLag = Math.max(0, (Date.now() - reportedTimestampMs) / 1000);
    const targetPosition = Math.max(0, reportedPosition + (isPlaying ? transitLag : 0));

    // If play/pause state changed, immediately snap
    if (this.isPlaying !== isPlaying || forceSnap) {
      this.isPlaying = isPlaying;
      this.basePosition = targetPosition;
      this.baseTimestamp = now;
      return;
    }

    // Measure delta against current local clock
    const currentLocalTime = this.getTime();
    const delta = Math.abs(currentLocalTime - targetPosition);

    if (delta > this.DRIFT_SNAP_THRESHOLD_SEC) {
      // Delta exceeds 150ms: snap to real source position to correct true drift/skips
      this.basePosition = targetPosition;
      this.baseTimestamp = now;
    }
    // Else: delta <= 150ms, ignore polling jitter to maintain 60fps smooth progression
  }

  /**
   * Returns current elapsed position in seconds.
   */
  public getTime(): number {
    if (!this.isPlaying) {
      return this.basePosition;
    }
    const elapsed = (performance.now() - this.baseTimestamp) / 1000;
    return Math.max(0, this.basePosition + elapsed * this.playbackRate);
  }

  public seek(position: number) {
    this.basePosition = Math.max(0, position);
    this.baseTimestamp = performance.now();
  }

  public setPlaying(playing: boolean) {
    if (this.isPlaying && !playing) {
      this.basePosition = this.getTime();
    }
    this.isPlaying = playing;
    this.baseTimestamp = performance.now();
  }
}

export const globalClock = new InterpolationClock();

