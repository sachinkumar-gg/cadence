import { LyricLine, WordToken, BadgeStyle } from '../types/lyrics';

// Keyword to contextual emoji map
const EMOJI_MAP: Record<string, string> = {
  // Time & Waiting
  wait: '⏳',
  waiting: '⏳',
  minute: '⏰',
  minutes: '⏰',
  hour: '⌛',
  hours: '⌛',
  time: '⏰',
  forever: '♾️',
  clock: '🕰️',
  stop: '🛑',
  late: '⏱️',
  early: '🌅',
  now: '⚡',

  // Emotions & Romance
  love: '❤️',
  heart: '💖',
  broken: '💔',
  cry: '💧',
  crying: '💧',
  tears: '💧',
  smile: '✨',
  kiss: '💋',
  feel: '💫',
  die: '🥀',
  dead: '🥀',
  trust: '🤞',
  alone: '👤',

  // Celestial, Elements & Nature
  fire: '🔥',
  burn: '🔥',
  hot: '🔥',
  flame: '🔥',
  ice: '❄️',
  cold: '🧊',
  freeze: '❄️',
  sun: '☀️',
  sunshine: '☀️',
  moon: '🌙',
  moonlight: '🌕',
  star: '✨',
  stars: '✨',
  sky: '🌌',
  night: '🌙',
  rain: '🌧️',
  storm: '⚡',
  lightning: '⚡',
  wind: '💨',
  lights: '💡',
  blinded: '🙈',

  // Music & Action
  dance: '💃',
  dancing: '🕺',
  music: '🎵',
  song: '🎶',
  sing: '🎤',
  party: '🎉',
  money: '💸',
  dream: '💭',
  dreams: '✨',
  eyes: '👀',
  mind: '🧠',
  car: '🚗',
  city: '🏙️',
  church: '⛪',
};

// Playful tilts for kinetic aesthetic
const TILT_ANGLES = [-4.5, -3, -2, 2, 3.5, 4.5];

function enrichWords(
  rawWords: { word: string; startTime: number; endTime: number; lineIndex: number }[],
  globalOffset: number
): WordToken[] {
  return rawWords.map((w, index) => {
    const cleanWord = w.word.toLowerCase().replace(/[^a-z0-9]/g, '');
    const emoji = EMOJI_MAP[cleanWord];

    let badgeStyle: BadgeStyle = 'none';
    let isSpecialEmphasis = false;

    if (emoji || cleanWord === 'minute' || cleanWord === 'wait' || cleanWord === 'lights' || cleanWord === 'blinded') {
      badgeStyle = 'pill';
      isSpecialEmphasis = true;
    } else if (w.word.length >= 6 && index % 2 === 0) {
      badgeStyle = 'highlight';
      isSpecialEmphasis = true;
    }

    let hash = 0;
    for (let i = 0; i < w.word.length; i++) {
      hash = (hash << 5) - hash + w.word.charCodeAt(i);
    }
    const tiltIndex = Math.abs(hash + index) % TILT_ANGLES.length;
    const tiltAngle = TILT_ANGLES[tiltIndex];

    return {
      id: `w-${globalOffset + index}-${cleanWord}`,
      globalIndex: globalOffset + index,
      lineIndex: w.lineIndex,
      word: w.word,
      startTime: w.startTime,
      endTime: w.endTime,
      badgeStyle,
      tiltAngle,
      emojiAccent: emoji,
      isSpecialEmphasis,
    };
  });
}

// Syllable & character weight estimator for natural vocal pacing
function estimateWordWeight(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length <= 1) return 1.0;
  
  // Syllable count approximation: count distinct vowel clusters
  const vowelMatches = clean.match(/[aeiouy]+/g);
  let syllables = vowelMatches ? vowelMatches.length : 1;
  
  // Adjust for silent 'e' at end of words (e.g., 'love', 'make', 'time')
  if (clean.endsWith('e') && syllables > 1 && !clean.endsWith('le')) {
    syllables -= 1;
  }
  
  // Blend syllables (primary factor in singing duration) with word length
  return Math.max(1.0, syllables * 1.4 + clean.length * 0.15);
}

/**
 * Parses LRC into both LyricLines and a flat array of all WordTokens with natural vocal cadence
 */
export function parseLRC(
  lrcContent: string,
  totalDuration: number = 0
): { lines: LyricLine[]; allWords: WordToken[] } {
  if (!lrcContent || typeof lrcContent !== 'string') return { lines: [], allWords: [] };

  const rawLines = lrcContent.split('\n');
  const parsedLines: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
  const wordTimeRegex = /<(\d{2}):(\d{2})(?:\.(\d{2,3}))?>/g;

  let globalWordCount = 0;
  const allWords: WordToken[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;

    const matches = [...line.matchAll(timeRegex)];
    if (matches.length === 0) continue;

    const rawText = line.replace(timeRegex, '').trim();
    if (!rawText) continue;

    // Skip lines that are just music notes / instrumental markers (e.g. ♪, ♫, ---, ...)
    if (/^[♪♫♩♬🎵🎶\-.\s_~]+$/.test(rawText)) continue;

    for (const match of matches) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
      const startTime = min * 60 + sec + ms / 1000;

      const hasWordSync = wordTimeRegex.test(rawText);
      const wordsForThisLine: { word: string; startTime: number; endTime: number; lineIndex: number }[] = [];

      if (hasWordSync) {
        const parts = rawText.split(/(<\d{2}:\d{2}(?:\.\d{2,3})?>)/g);
        let currentWordTime = startTime;

        for (const part of parts) {
          const wordMatch = part.match(/<(\d{2}):(\d{2})(?:\.(\d{2,3}))?>/);
          if (wordMatch) {
            const wMin = parseInt(wordMatch[1], 10);
            const wSec = parseInt(wordMatch[2], 10);
            const wMs = wordMatch[3] ? parseInt(wordMatch[3].padEnd(3, '0').slice(0, 3), 10) : 0;
            currentWordTime = wMin * 60 + wSec + wMs / 1000;
          } else {
            const trimmed = part.trim();
            if (trimmed) {
              wordsForThisLine.push({
                word: trimmed,
                startTime: currentWordTime,
                endTime: currentWordTime + 0.35,
                lineIndex: parsedLines.length,
              });
            }
          }
        }
      } else {
        const cleanText = rawText.replace(/<[^>]+>/g, '').trim();
        const splitWords = cleanText.split(/\s+/).filter(Boolean);

        splitWords.forEach((w) => {
          wordsForThisLine.push({
            word: w,
            startTime,
            endTime: startTime + 0.35,
            lineIndex: parsedLines.length,
          });
        });
      }

      const enriched = enrichWords(wordsForThisLine, globalWordCount);
      globalWordCount += enriched.length;
      allWords.push(...enriched);

      parsedLines.push({
        id: `line-${i}-${startTime}`,
        index: parsedLines.length,
        startTime,
        endTime: startTime + 3.5,
        rawText: rawText.replace(/<[^>]+>/g, '').trim(),
        words: enriched,
        hasWordSync,
      });
    }
  }

  parsedLines.sort((a, b) => a.startTime - b.startTime);

  // Proportional syllable-weighted interpolation between this line's start and the next line's start
  for (let i = 0; i < parsedLines.length; i++) {
    parsedLines[i].index = i;
    const currentLine = parsedLines[i];
    const isLastLine = i === parsedLines.length - 1;

    let totalLineGap: number;
    if (!isLastLine) {
      currentLine.endTime = parsedLines[i + 1].startTime;
      totalLineGap = Math.max(0.4, currentLine.endTime - currentLine.startTime);
    } else {
      const remainingTrackTime = totalDuration > currentLine.startTime ? totalDuration - currentLine.startTime : 4.5;
      totalLineGap = Math.min(6.0, Math.max(2.5, remainingTrackTime));
      currentLine.endTime = currentLine.startTime + totalLineGap;
    }

    const wordCount = currentLine.words.length;

    if (wordCount > 0 && !currentLine.hasWordSync) {
      // If there's an instrumental break (> 7s), don't stretch vocals over the whole break
      // Otherwise, vocals occupy ~90% of the line interval with a subtle breath pause before the next line
      const maxNaturalSingingDuration = Math.max(2.0, wordCount * 0.7);
      const lineVocalDuration = totalLineGap > 7.0
        ? Math.min(totalLineGap, maxNaturalSingingDuration)
        : Math.max(0.4, totalLineGap * 0.92);

      // Compute weights based on syllables and character count
      const weights = currentLine.words.map((w) => estimateWordWeight(w.word));
      const totalWeight = weights.reduce((acc, val) => acc + val, 0);

      let accumulatedTime = currentLine.startTime;

      currentLine.words.forEach((w, wIdx) => {
        const wordWeightFraction = totalWeight > 0 ? weights[wIdx] / totalWeight : 1 / wordCount;
        const wordDuration = Math.max(0.12, lineVocalDuration * wordWeightFraction);

        w.startTime = accumulatedTime;
        w.endTime = accumulatedTime + wordDuration;
        accumulatedTime += wordDuration;

        // If last word in line, extend slightly (max 1.2s) to keep highlight steady without leaking into instrumental solos
        if (wIdx === wordCount - 1) {
          w.endTime = Math.min(accumulatedTime + 1.2, currentLine.endTime);
        }
      });
    }
  }

  // Ensure allWords are ordered by startTime and continuous
  allWords.sort((a, b) => a.startTime - b.startTime);
  allWords.forEach((w, idx) => {
    w.globalIndex = idx;
    if (idx < allWords.length - 1 && w.endTime > allWords[idx + 1].startTime) {
      w.endTime = allWords[idx + 1].startTime;
    }
  });

  return { lines: parsedLines, allWords };
}

