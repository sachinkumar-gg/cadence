#!/usr/bin/env node
import http from 'node:http';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const PORT = 4321;

const COMBINED_PLAYER_SCRIPT = `
tell application "System Events"
  set isSpotifyRunning to (exists (processes where name is "Spotify"))
  set isMusicRunning to (exists (processes where name is "Music"))
end tell

if isSpotifyRunning then
  tell application "Spotify"
    set pState to player state as string
    if pState is not "stopped" then
      set tName to name of current track
      set tArtist to artist of current track
      set tAlbum to album of current track
      set tDuration to (duration of current track) / 1000
      set tPosition to player position
      set tArt to artwork url of current track
      return "OK|||Spotify|||" & tName & "|||" & tArtist & "|||" & tAlbum & "|||" & tDuration & "|||" & tPosition & "|||" & pState & "|||" & tArt
    end if
  end tell
else if isMusicRunning then
  tell application "Music"
    set pState to player state as string
    if pState is not "stopped" then
      set tName to name of current track
      set tArtist to artist of current track
      set tAlbum to album of current track
      set tDuration to duration of current track
      set tPosition to player position
      return "OK|||Apple Music|||" & tName & "|||" & tArtist & "|||" & tAlbum & "|||" & tDuration & "|||" & tPosition & "|||" & pState & "|||"
    end if
  end tell
end if
return "INACTIVE"
`;

let currentTrackState = {
  active: false,
  source: null,
  title: '',
  artist: '',
  album: '',
  duration: 0,
  position: 0,
  isPlaying: false,
  artworkUrl: '',
  timestamp: Date.now(),
};

const sseClients = new Set();

async function pollPlayer() {
  try {
    const queryStart = performance.now();
    const { stdout } = await execAsync(`osascript -e '${COMBINED_PLAYER_SCRIPT}'`);
    const execLatencySeconds = (performance.now() - queryStart) / 1000;
    const clean = stdout.trim();

    if (clean.startsWith('OK|||')) {
      const [, source, title, artist, album, duration, position, state, artworkUrl] = clean.split('|||');
      const isPlaying = state.toLowerCase() === 'playing';
      const rawPosition = parseFloat(position) || 0;
      const compensatedPosition = rawPosition + (isPlaying ? execLatencySeconds : 0);

      updateTrackState({
        active: true,
        source,
        title: title || '',
        artist: artist || '',
        album: album || '',
        duration: parseFloat(duration) || 0,
        position: compensatedPosition,
        isPlaying,
        artworkUrl: artworkUrl || '',
        timestamp: Date.now(),
      });
      return;
    }

    if (currentTrackState.active) {
      updateTrackState({
        active: false,
        source: null,
        title: '',
        artist: '',
        album: '',
        duration: 0,
        position: 0,
        isPlaying: false,
        artworkUrl: '',
        timestamp: Date.now(),
      });
    }
  } catch (err) {
    // Ignore transient AppleScript timeouts
  }
}

function updateTrackState(newState) {
  const changed =
    currentTrackState.title !== newState.title ||
    currentTrackState.artist !== newState.artist ||
    currentTrackState.isPlaying !== newState.isPlaying ||
    Math.abs(currentTrackState.position - newState.position) > 0.8 ||
    currentTrackState.active !== newState.active;

  currentTrackState = newState;

  if (changed) {
    const payload = `data: ${JSON.stringify(currentTrackState)}\n\n`;
    for (const res of sseClients) {
      res.write(payload);
    }
  }
}

setInterval(pollPlayer, 300);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/api/player') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(currentTrackState));
    return;
  }

  if (req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    res.write(`data: ${JSON.stringify(currentTrackState)}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🎵 Cadence macOS Music Bridge running on http://127.0.0.1:${PORT}`);
  console.log(`Listening for Spotify & Apple Music playback...\n`);
});
