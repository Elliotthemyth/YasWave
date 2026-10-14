# YASWAVE — Modern Cross-Platform Music Player

YASWAVE is a modern, cross-platform music player with synchronized lyrics and Persian translations. It ships a polished, Spotify-inspired interface and is architected as a high-performance React + TypeScript application designed to be packaged natively (Linux, Windows, and Android) using **Tauri 2**.

---

## Key Features

1. **Local Audio Playback Engine**
   - Centralized `AudioEngine` powered by `HTMLAudioElement` and the Web Audio API.
   - Smooth play/pause, seeking, scrub with hover timestamp tooltips, volume slider, mute, and speed controls.
   - True shuffle (Fisher-Yates with un-shuffle order restoration) and multi-mode repeat (`off`, `all`, `one`).
   - Up Next queue management with drag/reorder, remove, play next, and history.

2. **Real-Time Web Audio Visualizer**
   - Analyzes raw audio stream via `AnalyserNode`.
   - 3 distinct visualization modes:
     - **Frequency Bars**: Multi-band frequency spectrum with dynamic peak-falloff caps.
     - **Waveform**: Smooth oscilloscopic time-domain line.
     - **Radial Spectrum**: Center-pulsing circular audio spectrum.
   - Responds to real playing audio frequencies with zero simulated or fake motion.

3. **Synchronized LRC Karaoke Lyrics**
   - High-fidelity parser supporting `[mm:ss.xx]` and `[mm:ss.xxx]` timestamps, metadata tags, and multiline repeats.
   - Automatic synchronized line highlighting and auto-scrolling with manual override.
   - Live synchronization offset adjustments (±0.2s, ±1.0s, reset).
   - In-app interactive lyrics editor with **"Stamp Current Time"** button for quick, easy lyric synchronization while listening.
   - Support for importing local `.lrc` and `.txt` files.

4. **Persian Lyric Translations**
   - Offline Persian translation service with manual per-line override.
   - Translations are associated with parsed, synchronized lyric lines.

5. **Local Music & ID3 Metadata Parsing**
   - In-browser local audio import supporting multiple file selection, folder scans (`webkitdirectory`), and drag-and-drop.
   - Parses ID3v2, MP4, FLAC, and Vorbis tags using `music-metadata-browser` with embedded album artwork extraction.
   - Fallback filename parser (`01 - Artist - Title.mp3`) and duration probing.
   - In-app metadata editor for song title, artist, album, genre, year, and track number.

6. **Persistence & Playlists**
   - IndexedDB storage for tracks, playlists, liked songs, and user preferences.
   - Create, rename, and delete playlists with track additions and removals.
   - Automated collections for **Liked Songs** and **Recently Played**.

7. **Themes & Desktop Aesthetic**
   - GTK-styled window titlebar with environment status badge and controls.
   - Themes: Dark Charcoal, OLED Midnight, and Daylight.
   - Accent colors: YASWAVE Turquoise (default, from the logo), YASWAVE Violet, Nordic Cyan, Analog Amber, Velvet Rose, Monochrome.
   - Keyboard shortcuts: `Space` (Play/Pause), `←`/`→` (Seek ±5s / Shift for ±15s), `↑`/`↓` (Volume), `M` (Mute), `L` (Lyrics), `V` (Visualizer), `Ctrl+F` (Search), `Esc` (Close overlays).

8. **In-App Test Suite & Diagnostics**
   - Access **Diagnostics & Tests** directly in the sidebar or run `npm test` to verify LRC parsing, queue transitions, shuffle logic, metadata cleaners, and persistence serialization.

---

## Product Identity

| Property | Value |
|---|---|
| Product name | `YASWAVE` |
| Display name | `YASWAVE` |
| Description | A modern, cross-platform music player with synchronized lyrics and Persian translations. |
| Visual identity | Modern, premium, music-focused, Spotify-inspired |
| npm package name | `yaswave` (private) |
| Rust crate / Tauri bundle identifier | `yaswave` |
| Desktop application identifier | `com.yaswave.music` |
| Android application ID | `com.yaswave.music` |

The single source of truth for in-app branding is [`src/config/appConfig.ts`](./src/config/appConfig.ts) (`APP_CONFIG.name` / `APP_CONFIG.tagline`), consumed by the titlebar, sidebar, and settings.

---

## Architectural Separation & Tauri 2 Integration

YASWAVE strictly isolates the data model, filesystem adapters, persistence layer, and React UI:

```
src/
├── types/              # Clean TypeScript interfaces (Track, Playlist, PlaybackState, FileAdapter)
├── config/             # App name, branding tokens, and initial ambient tracks
├── services/
│   ├── audio/          # Central AudioEngine, VisualizerEngine, SynthAudioGenerator
│   ├── metadata/       # ID3/Vorbis parser with audio element duration fallback
│   ├── storage/        # Browser IndexedDB repository (swappable for SQLite in Tauri)
│   ├── filesystem/     # FileAdapter boundary:
│   │   ├── browserFileAdapter.ts   # Browser session file cache & object URLs
│   │   └── tauriFileAdapter.ts     # Tauri 2 native desktop adapter with scoped paths
│   └── lyrics/         # LRC timestamp parser, synchronizer, and formatter
├── hooks/              # useAudioEngine, useLibrary, useTheme, useKeyboardShortcuts
└── components/         # Modular layout, player, view, visualizer, and modal components
```

### Packaging into Tauri 2

To build a native desktop binary:

1. **Install Tauri CLI**:
   ```bash
   npm install --save-dev @tauri-apps/cli
   npm install @tauri-apps/api @tauri-apps/plugin-dialog @tauri-apps/plugin-fs
   ```

2. **Initialize Tauri 2**:
   ```bash
   npx tauri init
   ```

3. **Configure `tauri.conf.json`** with the YASWAVE identity:
   - `productName`: `YASWAVE`
   - `identifier`: `com.yaswave.music`
   - `build.devUrl`: `http://localhost:3000`
   - `build.frontendDist`: `../dist`
   - Window: `decorations: false` (to use YASWAVE's native desktop titlebar) or `decorations: true`
   - Bundle targets: configure `deb`/`appimage`/`rpm` for Linux and `msi`/`nsis` for Windows with `publisher: "YASWAVE"`.
   - Permissions: configure scoped access in `src-tauri/capabilities/default.json` for reading user-selected music directories via `plugin-dialog`.

4. **Build the Native Desktop Package**:
   ```bash
   npm run tauri build
   ```
   The compiled binaries will be in `src-tauri/target/release/bundle/`.

### Android (Tauri 2)

Tauri 2 supports Android targets (`npm run tauri android init` / `tauri android build`) once the Tauri scaffold exists. When initialized, set:
- `tauri.conf.json` → `identifier: "com.yaswave.music"`, `productName: "YASWAVE"`
- Android app label → `YASWAVE` in `src-tauri/gen/android/app/src/main/res/values/strings.xml`

> **Status:** Android and Windows builds have **not** been configured or verified in this repository. Only the web application and its build are currently validated. This section documents the intended identity; no platform build is claimed to work.

### Branding Assets

The web application ships the YASWAVE logo (turquoise waveform "YW" monogram) in `public/`:

| Asset | Path | Purpose |
|---|---|---|
| Full logo lockup | `public/yaswave-logo.png` (1024×1024) | Splash / about / store listings |
| Mark (transparent) | `public/yaswave-mark.png` (1024×1024) | Sidebar & window titlebar |
| Favicon | `public/favicon.png` (128×128) | Browser tab icon |

The mark is used in the sidebar (`src/components/layout/Sidebar.tsx`) and titlebar (`src/components/layout/DesktopTitleBar.tsx`), and as the favicon via `index.html`.

**Still required for native packaging** — the platform icon set has not been generated yet. Produce it from the master mark once `src-tauri/` exists:

| Asset | Purpose | Minimum size |
|---|---|---|
| `icon.png` (1024×1024, RGBA) | Tauri master app icon source | 1024×1024 |
| `32x32.png`, `128x128.png`, `128x128@2x.png` | Linux/Windows desktop icons | 128×128 |
| `icon.ico` | Windows bundle icon | 256×256 (multi-size ICO) |
| `icon.icns` | macOS bundle icon | 512×512 |
| Android mipmap set (`mdpi`…`xxxhdpi`) | Android launcher icons | 48–192 px per density |

Generate with `npx tauri icon public/yaswave-mark.png` into `src-tauri/icons/`.

---

## Known Browser Sandbox Limitations vs. Desktop Build

| Feature | Browser Preview Mode | Native Desktop (Tauri 2) |
|---|---|---|
| **Filesystem Access** | Sandboxed; files selected via input/drag-and-drop are held in memory for the browser session. | Direct filesystem path access via native file dialogs. |
| **Path Durability** | Object URLs (`blob:`) expire when tab is closed; metadata persists in IndexedDB. | File paths persist permanently in SQLite. |
| **Media Keys / MPRIS** | Standard web keyboard events. | Native Linux MPRIS D-Bus integration for hardware media keys and notification daemon integration. |
| **Window Frame** | Rendered inside web viewport with mock GTK header controls. | Native Wayland / X11 / Windows window management and minimize/maximize/close signals. |

---

## Development Commands

```bash
# Start local development server on port 3000
npm run dev

# Run TypeScript compilation check
npm run lint

# Run unit tests via Vitest
npm test

# Build production bundle
npm run build
```
