export type BadgeStyle = 'none' | 'pill' | 'highlight' | 'bracket' | 'underline';

export interface WordToken {
  id: string;
  globalIndex: number;
  lineIndex: number;
  word: string;
  startTime: number; // in seconds
  endTime: number;
  badgeStyle: BadgeStyle;
  tiltAngle: number; // e.g. -4 to 5 degrees
  emojiAccent?: string;
  isSpecialEmphasis?: boolean;
}

export interface LyricLine {
  id: string;
  index: number;
  startTime: number; // in seconds
  endTime: number;
  rawText: string;
  words: WordToken[];
  hasWordSync: boolean;
}

export interface LyricsData {
  trackName: string;
  artistName: string;
  albumName?: string;
  duration: number;
  lines: LyricLine[];
  allWords: WordToken[];
  isSynced: boolean;
  hasWordLevelSync: boolean;
  source: 'lrclib' | 'netease' | 'mock' | 'plain';
}
