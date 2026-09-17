import { create } from 'zustand';
import { PlayerState, CalibrationSettings, ColorPalette, FontTheme, DisplayMode } from '../types/player';
import { LyricLine, WordToken } from '../types/lyrics';
import { MOCK_TRACKS, getMockTrackLyrics } from '../services/mockData';
import { fetchLyrics } from '../services/lrclib';
import { fetchSpotifyOfficialLyrics } from '../services/spotifyLyrics';
import { extractPaletteFromImage } from '../services/colorExtractor';
import { globalClock } from '../services/clock';

interface PlayerStoreState {
  player: PlayerState;
  isSimulatorMode: boolean;
  selectedMockTrackId: string;

  lyrics: LyricLine[];
  allWords: WordToken[];
  isLoadingLyrics: boolean;
  activeLineIndex: number;
  activeWordGlobalIndex: number;
  hasSyncedLyrics: boolean;

  palette: ColorPalette;
  settings: CalibrationSettings;

  setPlayerState: (state: Partial<PlayerState>) => void;
  setSimulatorMode: (enabled: boolean) => void;
  selectMockTrack: (trackId: string) => void;
  updateActiveLyrics: (currentTime: number) => void;
  setOffsetMs: (offset: number) => void;
  setFontTheme: (font: FontTheme) => void;
  setFontSize: (size: CalibrationSettings['fontSize']) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  toggleDynamicEmojis: () => void;
  toggleAmbientCorners: () => void;
  setPulseIntensity: (intensity: number) => void;
  setSpDcCookie: (cookie: string) => void;
  loadTrackLyrics: (title: string, artist: string, album?: string, duration?: number, trackId?: string) => Promise<void>;
  updatePalette: (palette: ColorPalette) => void;
}

const defaultMock = MOCK_TRACKS[0];
const initialLyrics = getMockTrackLyrics(defaultMock.id);
const savedSpDc = localStorage.getItem('cadence_sp_dc') || '';

export const usePlayerStore = create<PlayerStoreState>((set, get) => ({
  player: {
    active: true,
    source: 'Simulator',
    title: defaultMock.title,
    artist: defaultMock.artist,
    album: defaultMock.album,
    duration: defaultMock.duration,
    position: 0,
    isPlaying: true,
    artworkUrl: defaultMock.artworkUrl,
    timestamp: Date.now(),
  },
  isSimulatorMode: true,
  selectedMockTrackId: defaultMock.id,

  lyrics: initialLyrics.lines,
  allWords: initialLyrics.allWords,
  isLoadingLyrics: false,
  activeLineIndex: 0,
  activeWordGlobalIndex: 0,
  hasSyncedLyrics: true,

  palette: defaultMock.palette,

  settings: {
    offsetMs: 0,
    font: 'syne',
    fontSize: 'massive',
    dynamicEmojis: true,
    ambientCorners: true,
    pulseIntensity: 0.9,
    displayMode: 'cinema',
    spDcCookie: savedSpDc,
  },

  setPlayerState: (partial) => {
    const prev = get().player;
    const updated = { ...prev, ...partial };
    set({ player: updated });

    if (partial.title && (partial.title !== prev.title || partial.artist !== prev.artist)) {
      get().loadTrackLyrics(updated.title, updated.artist, updated.album, updated.duration, updated.trackId);
      if (updated.artworkUrl) {
        extractPaletteFromImage(updated.artworkUrl).then((pal) => set({ palette: pal }));
      }
    }
  },

  setSimulatorMode: (enabled) => {
    set({ isSimulatorMode: enabled });
    if (enabled) {
      get().selectMockTrack(get().selectedMockTrackId);
    }
  },

  selectMockTrack: (trackId) => {
    const track = MOCK_TRACKS.find((t) => t.id === trackId) || MOCK_TRACKS[0];
    globalClock.seek(0);
    globalClock.setPlaying(true);

    const parsed = getMockTrackLyrics(track.id);

    set({
      selectedMockTrackId: track.id,
      player: {
        active: true,
        source: 'Simulator',
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        position: 0,
        isPlaying: true,
        artworkUrl: track.artworkUrl,
        timestamp: Date.now(),
      },
      lyrics: parsed.lines,
      allWords: parsed.allWords,
      palette: track.palette,
      activeLineIndex: 0,
      activeWordGlobalIndex: 0,
      hasSyncedLyrics: true,
    });
  },

  updateActiveLyrics: (currentTime) => {
    const { allWords, settings } = get();
    if (!allWords || allWords.length === 0) return;

    const calibratedTime = Math.max(0, currentTime + settings.offsetMs / 1000);

    let wordIdx = 0;
    for (let w = 0; w < allWords.length; w++) {
      if (calibratedTime >= allWords[w].startTime) {
        wordIdx = w;
      } else {
        break;
      }
    }

    const currentWord = allWords[wordIdx];
    const activeLineIdx = currentWord ? currentWord.lineIndex : 0;

    set({
      activeWordGlobalIndex: wordIdx,
      activeLineIndex: activeLineIdx,
    });
  },

  setOffsetMs: (offsetMs) => {
    set((s) => ({ settings: { ...s.settings, offsetMs } }));
  },

  setFontTheme: (font) => {
    set((s) => ({ settings: { ...s.settings, font } }));
  },

  setFontSize: (fontSize) => {
    set((s) => ({ settings: { ...s.settings, fontSize } }));
  },

  setDisplayMode: (displayMode) => {
    set((s) => ({ settings: { ...s.settings, displayMode } }));
  },

  toggleDynamicEmojis: () => {
    set((s) => ({ settings: { ...s.settings, dynamicEmojis: !s.settings.dynamicEmojis } }));
  },

  toggleAmbientCorners: () => {
    set((s) => ({ settings: { ...s.settings, ambientCorners: !s.settings.ambientCorners } }));
  },

  setPulseIntensity: (pulseIntensity) => {
    set((s) => ({ settings: { ...s.settings, pulseIntensity } }));
  },

  setSpDcCookie: (spDcCookie) => {
    localStorage.setItem('cadence_sp_dc', spDcCookie.trim());
    set((s) => ({ settings: { ...s.settings, spDcCookie: spDcCookie.trim() } }));
    const p = get().player;
    if (p.active) {
      get().loadTrackLyrics(p.title, p.artist, p.album, p.duration, p.trackId);
    }
  },

  loadTrackLyrics: async (title, artist, album = '', duration = 0, trackId?: string) => {
    set({ isLoadingLyrics: true });
    const { settings } = get();

    // 1. Try Official Spotify Lyrics if sp_dc cookie is configured
    if (settings.spDcCookie && trackId) {
      const spotifyResult = await fetchSpotifyOfficialLyrics(trackId, settings.spDcCookie);
      if (spotifyResult && spotifyResult.allWords.length > 0) {
        set({
          lyrics: spotifyResult.lines,
          allWords: spotifyResult.allWords,
          hasSyncedLyrics: spotifyResult.isSynced,
          isLoadingLyrics: false,
          activeLineIndex: 0,
          activeWordGlobalIndex: 0,
        });
        return;
      }
    }

    // 2. Fallback to community open lyrics (LRCLIB)
    try {
      const result = await fetchLyrics(title, artist, album, duration);
      set({
        lyrics: result.lines,
        allWords: result.allWords,
        hasSyncedLyrics: result.isSynced,
        isLoadingLyrics: false,
        activeLineIndex: 0,
        activeWordGlobalIndex: 0,
      });
    } catch {
      set({ lyrics: [], allWords: [], hasSyncedLyrics: false, isLoadingLyrics: false });
    }
  },

  updatePalette: (palette) => {
    set({ palette });
  },
}));
