export type DisplayMode = 'cinema' | 'wallpaper' | 'lockscreen' | 'island';

export type FontTheme = 'syne' | 'clash' | 'cabinet' | 'dela' | 'jakarta' | 'inter';

export interface ColorPalette {
  primary: string;       // main vibrant tone (e.g. #D38294)
  secondary: string;     // muted/secondary tone
  darkMuted: string;     // deep shadow tone for background mesh
  accent: string;        // highlight tone for badges
  background: string;    // pure OLED or deep tinted
}

export interface PlayerState {
  active: boolean;
  source: 'MediaRemote' | 'AppleScript' | 'Spotify' | 'Apple Music' | 'Simulator' | string | null;
  trackId?: string;      // spotify:track:...
  title: string;
  artist: string;
  album: string;
  duration: number;      // in seconds
  position: number;      // in seconds (synced)
  isPlaying: boolean;
  artworkUrl?: string;
  timestamp: number;     // Date.now() when polled
}


export interface CalibrationSettings {
  offsetMs: number;      // +/- milliseconds to adjust lyrics timing
  font: FontTheme;
  fontSize: 'small' | 'medium' | 'large' | 'massive';
  dynamicEmojis: boolean;
  ambientCorners: boolean;
  pulseIntensity: number; // 0.0 to 1.0
  displayMode: DisplayMode;
  spDcCookie: string;    // Optional Spotify session cookie for official 1:1 Spotify lyrics
}
