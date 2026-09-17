import { LyricLine, WordToken, BadgeStyle } from '../types/lyrics';

const EMOJI_MAP: Record<string, string> = {
  wait: '⏳', waiting: '⏳', minute: '⏰', minutes: '⏰', time: '⏰', forever: '♾️',
  love: '❤️', heart: '💖', broken: '💔', cry: '💧', smile: '✨', kiss: '💋',
  fire: '🔥', burn: '🔥', hot: '🔥', ice: '❄️', sun: '☀️', moon: '🌙', star: '✨',
  night: '🌙', rain: '🌧️', lightning: '⚡', lights: '💡', dance: '💃', song: '🎶',
};

const TILT_ANGLES = [-4.5, -3, -2, 2, 3.5, 4.5];

interface SpotifyLineItem {
  startTimeMs: string;
  words: string;
  syllables?: { startTimeMs: string; text: string }[];
  endTimeMs?: string;
}

interface SpotifyLyricsResponse {
  lyrics?: {
    syncType: 'LINE_SYNCED' | 'SYLLABLE_SYNCED' | 'UNSYNCED';
    lines: SpotifyLineItem[];
  };
}

export async function fetchSpotifyOfficialLyrics(
  trackId: string,
  spDc: string
): Promise<{ lines: LyricLine[]; allWords: WordToken[]; isSynced: boolean } | null> {
  if (!trackId || !spDc) return null;

  try {
    const cleanId = trackId.replace('spotify:track:', '');
    const res = await fetch(`/api/spotify-lyrics?trackId=${encodeURIComponent(cleanId)}&spDc=${encodeURIComponent(spDc.trim())}`);
    if (!res.ok) return null;

    const data: SpotifyLyricsResponse = await res.json();
    if (!data.lyrics || !data.lyrics.lines || data.lyrics.lines.length === 0) {
      return null;
    }

    const rawLines = data.lyrics.lines;
    const parsedLines: LyricLine[] = [];
    const allWords: WordToken[] = [];
    let globalWordCount = 0;

    for (let i = 0; i < rawLines.length; i++) {
      const item = rawLines[i];
      const startTime = parseInt(item.startTimeMs, 10) / 1000;
      const nextItem = rawLines[i + 1];
      const endTime = nextItem ? parseInt(nextItem.startTimeMs, 10) / 1000 : startTime + 4.0;
      const rawText = (item.words || '').trim();

      if (!rawText) continue;

      const split = rawText.split(/\s+/).filter(Boolean);
      const wordsForThisLine: WordToken[] = [];
      const lineDuration = Math.max(0.5, endTime - startTime);
      // Realistic vocal rate within line
      const singingDuration = Math.min(lineDuration * 0.85, split.length * 0.35);
      const slot = singingDuration / Math.max(1, split.length);

      split.forEach((w, wIdx) => {
        const cleanWord = w.toLowerCase().replace(/[^a-z0-9]/g, '');
        const emoji = EMOJI_MAP[cleanWord];

        let badgeStyle: BadgeStyle = 'none';
        let isSpecialEmphasis = false;

        if (emoji || cleanWord === 'minute' || cleanWord === 'wait' || cleanWord === 'lights' || cleanWord === 'blinded') {
          badgeStyle = 'pill';
          isSpecialEmphasis = true;
        } else if (w.length >= 6 && wIdx % 2 === 0) {
          badgeStyle = 'highlight';
          isSpecialEmphasis = true;
        }

        let hash = 0;
        for (let c = 0; c < w.length; c++) {
          hash = (hash << 5) - hash + w.charCodeAt(c);
        }
        const tiltAngle = TILT_ANGLES[Math.abs(hash + wIdx) % TILT_ANGLES.length];

        const wStart = startTime + wIdx * slot;
        const wEnd = wIdx === split.length - 1 ? endTime : startTime + (wIdx + 1) * slot;

        const token: WordToken = {
          id: `sp-w-${globalWordCount + wIdx}-${cleanWord}`,
          globalIndex: globalWordCount + wIdx,
          lineIndex: parsedLines.length,
          word: w,
          startTime: wStart,
          endTime: wEnd,
          badgeStyle,
          tiltAngle,
          emojiAccent: emoji,
          isSpecialEmphasis,
        };

        wordsForThisLine.push(token);
        allWords.push(token);
      });

      globalWordCount += wordsForThisLine.length;

      parsedLines.push({
        id: `sp-line-${i}-${startTime}`,
        index: parsedLines.length,
        startTime,
        endTime,
        rawText,
        words: wordsForThisLine,
        hasWordSync: data.lyrics.syncType === 'SYLLABLE_SYNCED',
      });
    }

    allWords.sort((a, b) => a.startTime - b.startTime);
    allWords.forEach((w, idx) => {
      w.globalIndex = idx;
      if (idx < allWords.length - 1) {
        w.endTime = allWords[idx + 1].startTime;
      }
    });

    return {
      lines: parsedLines,
      allWords,
      isSynced: data.lyrics.syncType !== 'UNSYNCED',
    };
  } catch (err) {
    console.warn('Failed to fetch official Spotify lyrics:', err);
    return null;
  }
}
