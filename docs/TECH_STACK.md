# Technical Stack & Architecture Document

## Project: Cadence (Kinetic Lyrics Visualizer & Ambient Wallpaper)
**Target Platform:** macOS 13.0+ (Ventura, Sonoma, Sequoia)  
**Architecture:** Apple Silicon (arm64) & Intel (x86_64)  

---

## 1. Architecture Overview

```
+-------------------------------------------------------------------------+
|                              Cadence APP                                |
+-------------------------------------------------------------------------+
| [ FRONTEND LAYER ] React 18/19 + Vite + TypeScript                       |
|   ├── Motion & Physics: Framer Motion (spring curves, layout animations)|
|   ├── Kinetic Engine: Word-level segmenter, emoji enricher, tilt badges |
|   ├── Ambient Corner Bloom: CSS Mesh Gradients + Canvas Color Extraction|
|   └── State & Sync: Zustand store + high-precision rAF clock            |
+-------------------------------------------------------------------------+
| [ INTEROP / IPC BRIDGE ] Native Bridge (Tauri Rust / Electron Main)     |
|   ├── AppleScript Runner (osascript for Spotify & Music.app)            |
|   ├── macOS Window Manager (kCGDesktopWindowLevel, transparent canvas)  |
|   └── Local Cache & Storage (SQLite / Key-Value Store)                  |
+-------------------------------------------------------------------------+
| [ EXTERNAL DATA LAYER ]                                                 |
|   ├── LRCLIB Public API (https://lrclib.net/api/get)                    |
|   ├── Netease / Fallback Lyrics Mirrors                                 |
|   └── Local Track Lyrics Cache                                          |
+-------------------------------------------------------------------------+
```

---

## 2. Core Technology Stack

### 2.1 UI & Animation Layer
- **Framework**: **React 18/19** with **Vite** (for blazing fast HMR and lightweight bundle size).
- **Language**: **TypeScript** (strict type safety for lyrics timing structures, player models, and theme configs).
- **Animation & Physics**: **Framer Motion (`framer-motion`)**:
  - `AnimatePresence` with `mode="popLayout"` for smooth line arrivals/departures.
  - Spring-driven transforms: `type: "spring", stiffness: 350, damping: 28`.
  - Word-level layout animations and dynamic text skewing/tilting.
- **Styling**: **Vanilla CSS / CSS Modules + Tailwind CSS**:
  - Custom fluid typography clamp calculations.
  - Custom display fonts (*Syne, Clash Display, Dela Gothic One, Cabinet Grotesk, Plus Jakarta Sans* via `@fontsource`).
- **Icons**: **Lucide React** (`lucide-react`).

### 2.2 Color & Ambient Reactivity
- **Color Extraction**: **`colorthief` / `node-vibrant`**:
  - Extracts 4 key dominant color swatches (`primary`, `vibrant`, `darkMuted`, `accent`) from track artwork.
- **Ambient Glow Corner Engine**:
  - 4 absolute corner containers with dynamic radial mesh gradients and heavy backdrop/box Gaussian blurs (`filter: blur(80px) to blur(140px)`).
  - Beat-synced opacity and scale modulation using CSS custom properties (`--pulse-scale`, `--pulse-opacity`).

### 2.3 macOS IPC & Music Player Bridge
- **Local Player Query**: macOS AppleScript (`osascript`) executed via Node/Rust child processes.
  - **Spotify Script**:
    ```applescript
    tell application "Spotify"
      if it is running then
        set trackName to name of current track
        set artistName to artist of current track
        set albumName to album of current track
        set trackDuration to (duration of current track) / 1000
        set playerPos to player position
        set playerState to player state as string
        set artUrl to artwork url of current track
        return trackName & "|||" & artistName & "|||" & albumName & "|||" & trackDuration & "|||" & playerPos & "|||" & playerState & "|||" & artUrl
      end if
    end tell
    ```
  - **Apple Music Script**:
    ```applescript
    tell application "Music"
      if it is running then
        set trackName to name of current track
        set artistName to artist of current track
        set albumName to album of current track
        set trackDuration to duration of current track
        set playerPos to player position
        set playerState to player state as string
        return trackName & "|||" & artistName & "|||" & albumName & "|||" & trackDuration & "|||" & playerPos & "|||" & playerState
      end if
    end tell
    ```

### 2.4 Lyrics Engine & Data Structures
- **LRCLIB Public Endpoint**:
  `GET https://lrclib.net/api/get?artist_name={artist}&track_name={title}&album_name={album}&duration={seconds}`
- **Parsed Data Model**:
  ```typescript
  interface WordTimestamp {
    word: string;
    startTime: number; // in seconds
    endTime: number;
    badgeStyle?: 'pill' | 'highlight' | 'bracket' | 'none';
    tiltAngle?: number; // e.g., -4deg to 6deg
    emojiAccent?: string; // e.g., "⌛", "🔥"
  }

  interface LyricLine {
    id: string;
    startTime: number; // in seconds
    endTime: number;
    rawText: string;
    words: WordTimestamp[];
  }

  interface TrackState {
    title: string;
    artist: string;
    album: string;
    duration: number;
    position: number;
    isPlaying: boolean;
    artworkUrl?: string;
    palette: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
    };
  }
  ```

---

## 3. High-Precision Interpolation Clock

Because AppleScript polling happens every 500ms (to prevent CPU overhead), client-side time interpolation calculates current exact time:

$$\text{currentTime} = \text{lastPolledPosition} + (\text{performance.now()} - \text{lastPolledTimestamp}) \times \text{playbackRate}$$

A drift-correction algorithm softly snaps time whenever a new poll arrives without sudden visual jumps.

---

## 4. macOS Window Placement, Lock Screen & Home Screen Integration

### 4.1 Home Screen (Live Desktop Wallpaper Mode)
- **Window Level**: Pinned to `kCGDesktopWindowLevel` (`NSWindow.Level(rawValue: Int(CGWindowLevelForKey(.desktopWindow)))`).
- **Behaviors**:
  - `collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]`
  - `ignoresMouseEvents = true` (enables full interaction with normal desktop files, folders, and icons).
  - Background set to transparent or deep OLED `#050505` with corner ambient lighting.

### 4.2 Lock Screen & Screen Saver Engine
- **Implementation**: Native macOS `ScreenSaverView` module hosting a lightweight local `WKWebView` rendering the kinetic visualizer directly from the local bundle.
- **Lock Screen Lifecycle Listener**:
  - `NSWorkspace.shared.notificationCenter.addObserver` listens for `screensDidSleepNotification` and `sessionDidResignActiveNotification`.
  - Seamlessly keeps lyrics sync alive when the Mac screen locks.

### 4.3 Fullscreen Cinema & Floating Island Modes
- **Fullscreen Cinema**: `kCGNormalWindowLevel` or `kCGScreenSaverWindowLevel` with borderless full monitor coverage.
- **Floating Island**: `kCGFloatingWindowLevel` with draggable, compact pill mode.

---

## 5. Security & Privacy
- Zero user data collection or telemetry.
- No network logins or credential storage.
- Operates fully locally with public open lyrics APIs.
