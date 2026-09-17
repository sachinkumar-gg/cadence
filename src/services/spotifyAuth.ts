/**
 * Spotify OAuth PKCE Flow (100% Client-Side, No Client Secret Required)
 */

const SPOTIFY_CLIENT_ID_KEY = 'cadence_spotify_client_id';
const SPOTIFY_REDIRECT_URI_KEY = 'cadence_spotify_redirect_uri';
const SPOTIFY_ACCESS_TOKEN_KEY = 'cadence_spotify_access_token';
const SPOTIFY_REFRESH_TOKEN_KEY = 'cadence_spotify_refresh_token';
const SPOTIFY_TOKEN_EXPIRY_KEY = 'cadence_spotify_token_expiry';
const SPOTIFY_VERIFIER_KEY = 'cadence_spotify_code_verifier';

export const DEFAULT_CLIENT_ID = '9195b07856e74567a1496a79ceb68ab3';

function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64encode(input: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function getDefaultRedirectUri(): string {
  if (typeof window === 'undefined') return 'https://127.0.0.1:5173/';
  // Spotify strictly requires the 127.0.0.1 IP literal instead of "localhost"
  const url = new URL(window.location.href);
  const hostname = url.hostname === 'localhost' ? '127.0.0.1' : url.hostname;
  return `${url.protocol}//${hostname}:${url.port}/`;
}

export async function redirectToSpotifyAuth(
  clientId: string,
  customRedirectUri?: string
) {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  const redirectUri = (customRedirectUri || getDefaultRedirectUri()).trim();

  localStorage.setItem(SPOTIFY_VERIFIER_KEY, codeVerifier);
  localStorage.setItem(SPOTIFY_CLIENT_ID_KEY, clientId.trim());
  localStorage.setItem(SPOTIFY_REDIRECT_URI_KEY, redirectUri);

  const scope = [
    'user-read-playback-state',
    'user-read-currently-playing',
  ].join(' ');

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId.trim(),
    scope,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
  }).toString();

  window.location.href = authUrl.toString();
}

export async function handleSpotifyCallback(): Promise<boolean> {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (!code) return false;

  const codeVerifier = localStorage.getItem(SPOTIFY_VERIFIER_KEY);
  const clientId = localStorage.getItem(SPOTIFY_CLIENT_ID_KEY) || DEFAULT_CLIENT_ID;
  const redirectUri = localStorage.getItem(SPOTIFY_REDIRECT_URI_KEY) || getDefaultRedirectUri();

  if (!codeVerifier) return false;

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      console.error('Failed to exchange Spotify token');
      return false;
    }

    const data = await response.json();
    localStorage.setItem(SPOTIFY_ACCESS_TOKEN_KEY, data.access_token);
    if (data.refresh_token) {
      localStorage.setItem(SPOTIFY_REFRESH_TOKEN_KEY, data.refresh_token);
    }
    localStorage.setItem(
      SPOTIFY_TOKEN_EXPIRY_KEY,
      (Date.now() + data.expires_in * 1000).toString()
    );

    // Clean up URL query parameters
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  } catch (err) {
    console.error('Spotify token exchange error:', err);
    return false;
  }
}

export function getStoredSpotifyToken(): string | null {
  const token = localStorage.getItem(SPOTIFY_ACCESS_TOKEN_KEY);
  const expiry = localStorage.getItem(SPOTIFY_TOKEN_EXPIRY_KEY);

  if (!token) return null;
  if (expiry && Date.now() > parseInt(expiry, 10)) {
    return null;
  }
  return token;
}

export function logoutSpotify() {
  localStorage.removeItem(SPOTIFY_ACCESS_TOKEN_KEY);
  localStorage.removeItem(SPOTIFY_REFRESH_TOKEN_KEY);
  localStorage.removeItem(SPOTIFY_TOKEN_EXPIRY_KEY);
  localStorage.removeItem(SPOTIFY_VERIFIER_KEY);
}

/**
 * Lightweight fetch for current playback using standard Spotify Web API (0% CPU)
 */
export async function fetchCurrentSpotifyPlayback(token: string) {
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 204 || res.status > 400) {
      return null;
    }

    const data = await res.json();
    if (!data || !data.item) return null;

    return {
      active: true,
      source: 'Spotify' as const,
      trackId: data.item.id,
      title: data.item.name,
      artist: data.item.artists?.map((a: any) => a.name).join(', ') || '',
      album: data.item.album?.name || '',
      duration: (data.item.duration_ms || 0) / 1000,
      position: (data.progress_ms || 0) / 1000,
      isPlaying: !!data.is_playing,
      artworkUrl: data.item.album?.images?.[0]?.url || '',
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}
