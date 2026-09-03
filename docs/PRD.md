# Product Requirements Document (PRD)

## Project Name: Jinx (Open-Source "Verci" Alternative for macOS)
**Status:** Draft / Active Ideation  
**Platform:** macOS (Apple Silicon & Intel)  
**Target Audience:** Music lovers, aesthetics enthusiasts, desktop customizers, audiophiles  

---

## 1. Executive Summary & Vision
**Jinx** is an open-source, ultra-fluid, kinetic lyrics visualizer and wallpaper engine for macOS. Inspired by closed-source and paid apps like *Verci*, Jinx transforms real-time music playback from **Spotify** and **Apple Music** into an expressive, kinetic typography show on the user's desktop, lock screen, or full-screen OLED ambient display.

Instead of static, generic karaoke text, Jinx crafts dynamic, lively typography layouts: words bounce, tilt, scale up on vocal emphasis, get accented with contextual emojis, sit inside styled pill badges, and curve organically across a pitch-black background accompanied by music-reactive ambient corner glows.

---

## 2. Core Value Proposition & Key Differentiators
1. **100% Free & Open Source**: No subscription paywalls or closed-source lock-in.
2. **Zero-Config Local Music Detection**: Reads active tracks, playback state, and millisecond timestamps directly from macOS Spotify and Apple Music via local AppleScript IPC—**no Spotify Developer accounts or OAuth tokens required**.
3. **Kinetic "Framer Motion" Typography**: Not standard rolling subtitles; typography is alive with spring physics, rotation offsets, high-contrast badges, and dynamic font weights.
4. **Contextual & Expressive Accents**: Intelligent emoji injection based on lyrical sentiment and rhythm (e.g., `"wait ⌛"`, `"another"`, `"[ minute ⏰ ]"`).
5. **Music-Reactive Ambient Corner Blooms**: 4-corner blurred ambient mesh glows that sample vibrant color palettes from current album art and breathe/pulse with the track tempo.
6. **Versatile macOS Display Modes**:
   - **Lock Screen & Screen Saver Mode**: Native macOS `.saver` screensaver / lock screen visualizer integration that automatically kicks in when your Mac locks or goes idle.
   - **Home Screen / Live Wallpaper Mode**: Pinned behind desktop icons and open windows at `kCGDesktopWindowLevel` as an interactive or passive dynamic wallpaper.
   - **OLED Cinema Mode**: Fullscreen pure black distraction-free visualizer for desk setups and secondary displays.
   - **Floating Mini-Island / Notch Mode**: Sleek compact dynamic overlay widget.

---

## 3. User Personas & Use Cases
- **The Desk Setup / Workspace Aestheticist**: Wants a gorgeous background visualization playing on a secondary monitor or Mac display during work/study sessions.
- **The Casual Listener / Karaoke Lover**: Enjoys singing along with ultra-accurate word-by-word and line-by-line synced lyrics.
- **The Mac Power User**: Appreciates lightweight native performance, clean shortcuts, and customizable themes without heavy resource drain.

---

## 4. Functional Requirements

### 4.1 Music Player Detection & Synchronization
- **FR-1.1**: Automatically detect when Spotify or Apple Music is running and playing on macOS.
- **FR-1.2**: Poll track metadata (`title`, `artist`, `album`, `duration`, `position`, `playback state`, `artwork URL/base64`) every 500ms via AppleScript.
- **FR-1.3**: Use high-resolution local clock interpolation (`requestAnimationFrame` + drift correction) to achieve 60/120 FPS sub-millisecond lyrics synchronization.
- **FR-1.4**: Handle pause, seek, track change, and player switch seamlessly with zero lag.

### 4.2 Synced Lyrics Engine
- **FR-2.1**: Query public lyrics APIs (primary: **LRCLIB**, secondary: **Netease / Musixmatch** mirrors) using track metadata.
- **FR-2.2**: Support parsing both standard Line-Synced (`[mm:ss.xx] line`) and Syllable/Word-Synced (`<mm:ss.xx> word`) `.lrc` / extended formats.
- **FR-2.3**: Cache fetched lyrics locally in SQLite/IndexedDB to prevent duplicate network calls.
- **FR-2.4**: Graceful fallback to rich plain lyrics or stylish animated "Instrumental / Listening..." state when synced lyrics are unavailable.

### 4.3 Kinetic Typography & Visual Experience
- **FR-3.1**: Display lyrics in continuous, dynamic kinetic motion using spring physics.
- **FR-3.2**: Feature word-level active highlights with organic tilt angles (-4° to +6°), dynamic scale-up, and highlighted background pill boxes.
- **FR-3.3**: Contextual emoji injection for emotional triggers, temporal words, and symbolic phrases.
- **FR-3.4**: Configurable typographic styles (fonts: *Syne, Clash Display, Dela Gothic, Inter, Cabinet Grotesk*).
- **FR-3.5**: Subtle fluid curvature / wave distortion on scrolling text blocks.

### 4.4 Music-Reactive Ambient Glow Corners
- **FR-4.1**: Extract dominant color palette (Vibrant, Dark Vibrant, Light Vibrant, Muted) from the active track's album art.
- **FR-4.2**: Render 4-corner Gaussian blurred mesh gradient blooms.
- **FR-4.3**: Reactively pulse glow intensity, radius, and hue shift aligned with playback beat / time pulse.

### 4.5 Window & Presentation Controls
- **FR-5.1**: Mode 1: **Lock Screen & Screensaver Engine**: Seamless `.saver` bundle rendering the kinetic lyrics engine when macOS locks or activates screensaver.
- **FR-5.2**: Mode 2: **Home Screen / Live Desktop Wallpaper**: Transparent borderless window pinned to `kCGDesktopWindowLevel` beneath desktop icons with `ignoresMouseEvents = true`.
- **FR-5.3**: Mode 3: **Fullscreen Cinema Display**: Fullscreen OLED black visualizer (`Cmd+Shift+F`).
- **FR-5.4**: Mode 4: **Windowed / Floating Island Overlay**: Draggable always-on-top compact lyrics pill.
- **FR-5.5**: Menu bar tray icon with quick settings: Display mode toggle (Lock Screen, Home Wallpaper, Cinema, Island), font selector, color theme, offset calibration (+/- 100ms), and auto-start at login.

---

## 5. Non-Functional Requirements
- **Performance**: Idle CPU usage under 3-5% on Apple Silicon M-series chips; GPU accelerated rendering.
- **Responsiveness**: Instant visual feedback (< 16ms frame times, 60-120Hz ProMotion support).
- **Offline Reliability**: Cached lyrics and local AppleScript work without active internet once track lyrics are stored.
- **Privacy**: Zero tracking, zero telemetry, zero accounts required. All music detection is strictly local.

---

## 6. Success Metrics & Milestones
- **Sync Precision**: Lyrics highlight within ±50ms of vocal delivery.
- **Visual Delight**: Fluidity on par with top-tier Framer Motion and Apple Keynote typography animations.
- **Resource Footprint**: Lightweight memory footprint (< 120MB in background).
