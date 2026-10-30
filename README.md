# GIPlayer — Premium Media & Video Streaming PWA

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable%20%26%20Offline-0ea5e9.svg)](https://github.com/ghalibkamal7/giplayer)
[![Build Status](https://img.shields.io/badge/Build-Passing-emerald.svg)](https://github.com/ghalibkamal7/giplayer)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6.svg)](https://www.typescriptlang.org/)

**GIPlayer** is a modern, responsive, installable Progressive Web Application (PWA) inspired by the fluid user experience of **MX Player Pro**. It delivers an advanced HTML5 and HLS video streaming engine with mobile touch gestures, Web Audio 200% volume boosting, customizable WebVTT subtitle synchronization, sleep timer, offline application shell caching, and local media playback.

---

## 🌟 Key Features

### 🎬 Advanced MX Player Pro-Inspired Experience
- **Touch Gesture Controls**:
  - **Brightness Gesture**: Swipe vertically on the left 50% of the screen to adjust display brightness from 20% to 150% with an interactive HUD.
  - **Volume Gesture**: Swipe vertically on the right 50% of the screen to adjust system audio with volume bar feedback.
  - **Seek Scrubbing**: Swipe horizontally across the screen for precision time scrubbing with live delta time preview (`+15s (03:45)`).
  - **Double-Tap Seeking**: Double tap left edge to rewind 10s; double tap right edge to fast forward 10s with ripple wave animations.
  - **Screen Lock Mode**: One-tap lock button to disable all touch interactions and accidental gestures during playback.
- **Audio Booster (Up to 200%)**:
  - Custom Web Audio API `GainNode` pipeline that boosts quiet dialogue and movie audio up to 200% safely without browser distortion.
- **Subtitles & Closed Captions**:
  - WebVTT / SRT parser with real-time text rendering.
  - Synchronous time offset adjustment (-5.0s to +5.0s in 0.5s increments).
  - Custom subtitle loader: Upload `.vtt` or `.srt` subtitle files from your device.
  - Subtitle styling: Choose font sizes (sm, base, lg, xl), text colors, and background opacity.
- **Aspect Ratio Controls**:
  - Instant switching between **Fit to Screen**, **Fill / Zoom**, **Stretch Full**, **16:9 Widescreen**, and **4:3 Classic**.
- **Playback Speeds**:
  - 0.25x, 0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 1.75x, 2.0x.
- **Sleep Timer**:
  - Configurable countdown timer (15m, 30m, 45m, 60m) that automatically pauses playback when elapsed.
- **Picture-in-Picture (PiP)**:
  - Native PiP support for background multitasking on mobile and desktop.
- **Episodic Binge-Watching**:
  - Season & episode browser drawer with automatic 8-second countdown overlay to play next episodes.
- **Continue Watching & Position Memory**:
  - Playback progress persists down to the second. Prompts to resume unfinished videos with a single click.

---

### 📱 Full Progressive Web App (PWA)
- **Installable Everywhere**: One-click install prompt on Android, Chrome, Edge, and iOS Safari ("Add to Home Screen").
- **Offline Shell & Fallback**: Service Worker powered by Workbox precaches application code, icons, and fonts for immediate offline loading.
- **Standalone Display**: Full immersion without browser address bars, navigation chrome, or distractions.
- **Network Awareness**: Live offline status detector that gracefully alerts users and enables local playback.

---

### 📂 My Library & Local Playback
- **Network Stream URL Player**: Paste any direct HLS (`.m3u8`), MP4, or WebM URL to stream with the full suite of MX Player controls.
- **Local File Player**: Open local video files (`.mp4`, `.mkv`, `.webm`, `.mov`) directly from your device using browser Blob memory URLs with zero server uploads.
- **Watch History**: Chronological history tracking with completion percentages and one-click clear history.
- **Watchlist & Favorites**: Save movies and web series for quick access.

---

### 📺 Curated Content Hub
1. **Home**: Hero showcase, continue watching shelf, trending movies, web series, and live highlights.
2. **Movies**: Filter by genre (Sci-Fi, Action, Animation, Fantasy, etc.) and sort by Rating, Release Year, or Alphabetical.
3. **Web Series**: Multi-season, multi-episode series with rich episode descriptions and runtimes.
4. **Live TV Broadcasts**: Curated legal public streams (NASA TV Public HD, Bloomberg News, Red Bull Extreme) with live Electronic Program Guide (EPG).

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` or `K` | Toggle Play / Pause |
| `F` | Toggle Fullscreen |
| `M` | Mute / Unmute Audio |
| `←` / `→` | Seek backward / forward 5 seconds |
| `J` / `L` | Seek backward / forward 10 seconds |
| `↑` / `↓` | Increase / Decrease volume by 5% |
| `C` | Toggle Subtitles / Captions |
| `P` | Toggle Picture-in-Picture mode |
| `N` | Play Next Episode |
| `?` | Show Keyboard Shortcuts modal |
| `Ctrl+K` or `Cmd+K` | Open Search modal |

---

## 🛠 Technology Stack

- **Frontend Core**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer
- **Icons**: Lucide React
- **Video Engine**: HTML5 Video API, Hls.js, Web Audio API
- **PWA & Offline**: `vite-plugin-pwa`, Workbox Service Worker
- **State & Storage**: IndexedDB, LocalStorage
- **Testing**: Vitest

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ghalibkamal7/giplayer.git
   cd giplayer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🧪 Testing

Execute the automated Vitest test suite:
```bash
npm run test
```

Run test suite in watch mode:
```bash
npx vitest
```

---

## 📦 Production Build

Compile TypeScript and build the optimized production PWA bundle:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

---

## 🔒 Security & Privacy

- **100% Client-Side Privacy**: Watch history, playback positions, and preferences are stored exclusively on your device.
- **Zero Third-Party Trackers**: No analytics, telemetry, or tracking scripts.
- **Safe Local Media**: Files selected from local storage are handled via in-memory `URL.createObjectURL` and never transmitted across the network.
- **CORS Compliant**: Strict origin policies and cross-origin handling for subtitles and streams.

---

## 📜 Media & Licensing Attribution

- All demo movies are open-source motion pictures provided by the **Blender Foundation Open Projects** under Creative Commons (CC-BY 3.0 / 4.0):
  - *Tears of Steel* (Blender Foundation | mango.blender.org)
  - *Big Buck Bunny* (Blender Foundation | peach.blender.org)
  - *Sintel* (Blender Foundation | durian.blender.org)
  - *Elephant's Dream* (Blender Foundation | orange.blender.org)
- Live TV feeds are public domain and verified open educational/news broadcasts (e.g., NASA Public Domain).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
