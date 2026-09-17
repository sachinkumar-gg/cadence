import { parseLRC } from './lrcParser';
import { LyricLine, WordToken } from '../types/lyrics';

interface LRCLibResponse {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
}

interface CacheItem {
  lines: LyricLine[];
  allWords: WordToken[];
  isSynced: boolean;
  isInstrumental: boolean;
}

const memoryCache = new Map<string, CacheItem>();

function cleanQuery(str: string): string {
  if (!str) return '';
  return str
    .replace(/\s*\(feat\..*?\)/gi, '')
    .replace(/\s*\(with.*?\)/gi, '')
    .replace(/\s*-\s*.*?(remaster|deluxe|version|edit|bonus|single|radio).*$/gi, '')
    .replace(/\s*\(.*?(remaster|deluxe|version|edit|bonus|single|radio).*?\)/gi, '')
    .replace(/[[\]]/g, '')
    .trim();
}

export async function fetchLyrics(
  trackName: string,
  artistName: string,
  albumName: string = '',
  duration: number = 0
): Promise<CacheItem> {
  const cleanTitle = cleanQuery(trackName);
  const cleanArtist = cleanQuery(artistName).split(',')[0].split('&')[0].trim();
  const cleanAlbum = cleanQuery(albumName);
  const roundedDuration = Math.round(duration || 0);

  // Keyed with rounded duration to prevent remix/live mismatch and redundant refetches
  const cacheKey = `${cleanArtist.toLowerCase()}___${cleanTitle.toLowerCase()}___${roundedDuration}`;

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  try {
    const local = localStorage.getItem(`cadence_lyrics_v3_${cacheKey}`);
    if (local) {
      const parsed: CacheItem = JSON.parse(local);
      memoryCache.set(cacheKey, parsed);
      return parsed;
    }
  } catch {
    // ignore local storage errors
  }

  // Strategy 1: Exact GET with track_name, artist_name, album_name, and duration
  try {
    const params = new URLSearchParams({
      track_name: cleanTitle,
      artist_name: cleanArtist,
    });
    if (cleanAlbum) params.set('album_name', cleanAlbum);
    if (roundedDuration > 0) params.set('duration', roundedDuration.toString());

    const getUrl = `https://lrclib.net/api/get?${params.toString()}`;
    const res = await fetch(getUrl);

    if (res.ok) {
      const data: LRCLibResponse = await res.json();
      if (data && (data.syncedLyrics || data.plainLyrics || data.instrumental)) {
        return processAndCache(data, cacheKey, duration);
      }
    }
  } catch {
    // try fallback search
  }

  // Strategy 2: Fuzzy Search via /api/search with duration tolerance matching (±3s)
  try {
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanArtist} ${cleanTitle}`)}`;
    const searchRes = await fetch(searchUrl);

    if (searchRes.ok) {
      const results: LRCLibResponse[] = await searchRes.json();
      if (Array.isArray(results) && results.length > 0) {
        // Filter or rank by closest duration if duration is known
        let bestMatch: LRCLibResponse | undefined;
        if (roundedDuration > 0) {
          bestMatch = results.find(
            (r) => r.syncedLyrics && Math.abs(r.duration - roundedDuration) <= 3
          );
        }
        if (!bestMatch) {
          bestMatch = results.find((r) => !!r.syncedLyrics) || results[0];
        }

        if (bestMatch) {
          return processAndCache(bestMatch, cacheKey, duration);
        }
      }
    }
  } catch {
    // ignore
  }

  // Strategy 3: Empty / Instrumental / No-Lyrics fallback state
  const emptyResult: CacheItem = {
    lines: [],
    allWords: [],
    isSynced: false,
    isInstrumental: false,
  };
  // Cache the negative result so we don't spam the API on every tick of an unsupported track
  memoryCache.set(cacheKey, emptyResult);
  try {
    localStorage.setItem(`cadence_lyrics_v3_${cacheKey}`, JSON.stringify(emptyResult));
  } catch {
    // ignore
  }

  return emptyResult;
}

function processAndCache(
  data: LRCLibResponse,
  cacheKey: string,
  duration: number
): CacheItem {
  let result: CacheItem;

  if (data.instrumental) {
    result = { lines: [], allWords: [], isSynced: true, isInstrumental: true };
  } else if (data.syncedLyrics) {
    const parsed = parseLRC(data.syncedLyrics, duration || data.duration);
    result = { lines: parsed.lines, allWords: parsed.allWords, isSynced: true, isInstrumental: false };
  } else if (data.plainLyrics) {
    const rawLines = data.plainLyrics.split('\n').map((l) => l.trim()).filter(Boolean);
    const totalD = duration || 180;
    const lineSlot = totalD / Math.max(1, rawLines.length);
    const pseudoLrc = rawLines
      .map((l, i) => {
        const s = i * lineSlot;
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = Math.floor(s % 60).toString().padStart(2, '0');
        return `[${m}:${sec}.00] ${l}`;
      })
      .join('\n');

    const parsed = parseLRC(pseudoLrc, totalD);
    result = { lines: parsed.lines, allWords: parsed.allWords, isSynced: false, isInstrumental: false };
  } else {
    result = { lines: [], allWords: [], isSynced: false, isInstrumental: false };
  }

  memoryCache.set(cacheKey, result);
  try {
    localStorage.setItem(`cadence_lyrics_v3_${cacheKey}`, JSON.stringify(result));
  } catch {
    // ignore
  }
  return result;
}

