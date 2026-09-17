import { LyricLine, WordToken } from '../types/lyrics';
import { parseLRC } from './lrcParser';

export interface MockTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  artworkUrl: string;
  lrcContent: string;
  palette: {
    primary: string;
    secondary: string;
    darkMuted: string;
    accent: string;
    background: string;
  };
}

export const MOCK_TRACKS: MockTrack[] = [
  {
    id: 'track-verci-demo',
    title: 'Wait Another Minute',
    artist: 'Cadence Vibe',
    album: 'Kinetic Reverie',
    duration: 180,
    artworkUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    palette: {
      primary: '#D9779F', // Dusty Rose from user screenshot
      secondary: '#E8A598',
      darkMuted: '#3D1E2A',
      accent: '#FFFFFF',
      background: '#070508',
    },
    lrcContent: `[00:00.00] wait another minute
[00:03.50] before you walk away into the dark
[00:07.80] I hear the clock ticking on the wall
[00:12.20] hold your breath under the moonlight
[00:16.80] every shadow dancing in the fire
[00:21.00] wait another minute
[00:24.50] time stops when you smile
[00:28.90] counting stars across the purple sky
[00:33.40] no broken hearts tonight
[00:38.00] feel the cadence in your pulse
[00:42.50] wait another minute
[00:46.00] forever is just beginning now
[00:51.00] through the thunder and the rain
[00:55.50] keep the fire burning deep inside
[01:00.00] wait another minute
[01:04.50] we belong to the dreamers`,
  },
  {
    id: 'track-blinding-lights',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    duration: 200,
    artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    palette: {
      primary: '#EF4444', // Red
      secondary: '#F97316', // Orange
      darkMuted: '#2A0808',
      accent: '#FDE047',
      background: '#080303',
    },
    lrcContent: `[00:00.00] I been on my own for long enough
[00:04.20] maybe you can show me how to love maybe
[00:09.50] I'm going through withdrawals
[00:13.80] you don't even have to do too much
[00:18.00] you can turn me on with just a touch baby
[00:24.00] I look around and Sin City's cold and empty
[00:29.00] no one's around to judge me
[00:33.00] I can't see clearly when you're gone
[00:37.50] I said ooh I'm blinded by the lights
[00:43.00] no I can't sleep until I feel your touch
[00:49.00] I said ooh I'm drowning in the night
[00:55.00] oh when I'm like this you're the one I trust`,
  },
  {
    id: 'track-starboy',
    title: 'Midnight City',
    artist: 'M83',
    album: 'Hurry Up, We\'re Dreaming',
    duration: 244,
    artworkUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    palette: {
      primary: '#38BDF8', // Cyan
      secondary: '#818CF8', // Indigo
      darkMuted: '#0B132B',
      accent: '#F472B6',
      background: '#040711',
    },
    lrcContent: `[00:00.00] waiting in a car
[00:04.00] waiting for a ride in the dark
[00:08.50] the night city grows
[00:13.00] look and see her eyes they glow
[00:18.00] waiting in a car
[00:22.50] waiting for a ride in the dark
[00:27.00] the night city grows
[00:31.50] look and see her eyes they glow
[00:36.00] the city is my church
[00:40.50] it wraps me in the sparkling twilight
[00:45.00] waiting in the dark
[00:50.00] listening to the midnight melody`,
  },
];

export function getMockTrackLyrics(trackId: string): { lines: LyricLine[]; allWords: WordToken[] } {
  const track = MOCK_TRACKS.find((t) => t.id === trackId) || MOCK_TRACKS[0];
  return parseLRC(track.lrcContent, track.duration);
}
