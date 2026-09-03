# Tasks & Implementation Roadmap

## Project: Jinx (macOS Kinetic Lyrics & Ambient Visualizer)
**Status:** Ready to Implement  
**Tracking Board:** Phase 1 through Phase 7  

---

## 📋 Phase 1: Project Scaffolding & Foundation
- [ ] **TASK-101**: Initialize Vite + React + TypeScript application.
- [ ] **TASK-102**: Configure Tailwind CSS / Vanilla CSS modules, Lucide icons, and `@fontsource` modern kinetic fonts (*Syne, Clash Display, Dela Gothic, Inter, Cabinet Grotesk*).
- [ ] **TASK-103**: Set up Framer Motion and define global physics presets (spring stiffness, damping, stagger timings).
- [ ] **TASK-104**: Create central state management store (Zustand) for playback state, lyrics queue, ambient colors, active display mode, and calibration offsets.

---

## 🎵 Phase 2: macOS Music Player Bridge (Local AppleScript IPC)
- [ ] **TASK-201**: Implement macOS AppleScript poller for **Spotify** (`trackName`, `artist`, `album`, `duration`, `playerPos`, `playerState`, `artUrl`).
- [ ] **TASK-202**: Implement macOS AppleScript poller for **Apple Music** (`Music.app`).
- [ ] **TASK-203**: Build high-precision local interpolation clock (`requestAnimationFrame` with drift compensation for sub-millisecond timeline tracking).
- [ ] **TASK-204**: Add mock player simulator for local browser development and demo mode (enables testing all animations with built-in tracks even without music playing).

---

## 📜 Phase 3: Lyrics Sourcing & Kinetic Word Parser
- [ ] **TASK-301**: Implement LRCLIB client (`https://lrclib.net/api/get`) with query sanitation and caching.
- [ ] **TASK-302**: Build robust `.lrc` and syllable/word-level timestamp parser.
- [ ] **TASK-303**: Build **Kinetic Enricher**:
  - Automatically calculate word emphasis and duration.
  - Assign playful tilt angles (`-4deg` to `+6deg`).
  - Assign badge wrappers (e.g. inverted rounded pill, underline, highlight box).
  - Contextual emoji matcher (e.g. `minute/time` → `⏰/⌛`, `fire/hot` → `🔥`, `heart/love` → `❤️`, `star/night` → `✨/🌙`).
- [ ] **TASK-304**: Handle edge cases: instrumental breaks, missing lyrics, non-synced plain lyrics fallback.

---

## ✨ Phase 4: Framer Motion Kinetic Typography Engine
- [ ] **TASK-401**: Build `KineticLine` and `KineticWord` components with Framer Motion spring physics.
- [ ] **TASK-402**: Implement word-by-word active pop-in, scale bounce, and smooth vertical fluid scrolling.
- [ ] **TASK-403**: Implement dynamic curved text distortion / subtle wave transforms as lines ascend.
- [ ] **TASK-404**: Add fluid exit transitions for past lines (soft blur, opacity fade, upward drift).

---

## 🌈 Phase 5: Music-Reactive Ambient Glow Corners
- [ ] **TASK-501**: Implement dominant color palette extraction from album artwork (`colorthief` / vibrant swatches).
- [ ] **TASK-502**: Create 4-corner ambient bloom mesh gradient canvas/CSS layer with dynamic Gaussian blur (`80px - 140px`).
- [ ] **TASK-503**: Implement rhythm-reactive pulse (subtle scale, brightness, and hue shift synchronized to track tempo/time).
- [ ] **TASK-504**: Add custom color override themes (Cyberpunk Neon, Pastel Dreams, Monochrome OLED, Sunset Warmth).

---

## 🖥️ Phase 6: Multi-Mode Display (Lock Screen, Home Screen & Windowing)
- [ ] **TASK-601**: Implement **Lock Screen & Screen Saver Engine** (macOS `.saver` bundle + `ScreenSaverView` WebKit host to display synced lyrics on lock screen).
- [ ] **TASK-602**: Implement **Home Screen / Live Wallpaper Mode** (transparent/OLED window pinned to `kCGDesktopWindowLevel` under desktop icons).
- [ ] **TASK-603**: Implement **OLED Cinema Mode** (fullscreen distraction-free visualizer with interactive keyboard shortcuts).
- [ ] **TASK-604**: Implement **Mini Floating Island / Notch Mode** (sleek draggable compact widget).
- [ ] **TASK-605**: Add global keyboard shortcuts (`Cmd+Shift+F` fullscreen, `[` / `]` lyrics offset calibration, `Space` play/pause).

---

## 🎛️ Phase 7: UI Controls, Customization & Menubar
- [ ] **TASK-701**: Create sleek floating control pill (Track info, album art, font switcher, theme switcher, timing calibration slider).
- [ ] **TASK-702**: Build Timing Offset Adjuster (allows instant +/- 50ms nudging for vocal perfection).
- [ ] **TASK-703**: macOS Menubar tray controller and settings drawer.
- [ ] **TASK-704**: Bundle and build native macOS app (Tauri / Electron) with auto-start on login support.
