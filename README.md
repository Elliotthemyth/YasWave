# Nocturne — Desktop Music Player for Linux

Nocturne is a modern, extensible desktop music player for Linux with a polished Spotify-inspired interface. It is architected as a high-performance React + TypeScript application designed to be packaged natively into a Linux desktop application using **Tauri 2**.

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

4. **Local Music & ID3 Metadata Parsing**
   - In-browser local audio import supporting multiple file selection, folder scans (`webkitdirectory`), and drag-and-drop.
   - Parses ID3v2, MP4, FLAC, and Vorbis tags using `music-metadata-browser` with embedded album artwork extraction.
   - Fallback filename parser (`01 - Artist - Title.mp3`) and duration probing.
   - In-app metadata editor for song title, artist, album, genre, year, and track number.

5. **Persistence & Playlists**
   - IndexedDB storage for tracks, playlists, liked songs, and user preferences.
   - Create, rename, and delete playlists with track additions and removals.
   - Automated collections for **Liked Songs** and **Recently Played**.

6. **Themes & Linux Desktop Aesthetic**
   - Linux GTK-styled window titlebar with environment status badge and controls.
   - Themes: Dark Charcoal, OLED Midnight, and Daylight.
   - Accent colors: Emerald (Spotify), Nocturne Violet, Nordic Cyan, Analog Amber, Velvet Rose, Monochrome.
   - Keyboard shortcuts: `Space` (Play/Pause), `←`/`→` (Seek ±5s / Shift for ±15s), `↑`/`↓` (Volume), `M` (Mute), `L` (Lyrics), `V` (Visualizer), `Ctrl+F` (Search), `Esc` (Close overlays).

7. **In-App Test Suite & Diagnostics**
   - Access **Diagnostics & Tests** directly in the sidebar or run `npm test` to verify LRC parsing, queue transitions, shuffle logic, metadata cleaners, and persistence serialization.

---

## Architectural Separation & Tauri 2 Integration

Nocturne strictly isolates the data model, filesystem adapters, persistence layer, and React UI:

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

### Packaging into Tauri 2 on Linux

To build a native Linux binary (`.deb`, `.AppImage`, or `.rpm`):

1. **Install Tauri CLI**:
   ```bash
   npm install --save-dev @tauri-apps/cli
   npm install @tauri-apps/api @tauri-apps/plugin-dialog @tauri-apps/plugin-fs
   ```

2. **Initialize Tauri 2**:
   ```bash
   npx tauri init
   ```
   Configure `tauri.conf.json`:
   - `build.devUrl`: `http://localhost:3000`
   - `build.frontendDist`: `../dist`
   - Window: `decorations: false` (to use Nocturne's native desktop titlebar) or `decorations: true`
   - Permissions: configure scoped access in `src-tauri/capabilities/default.json` for reading user-selected music directories via `plugin-dialog`.

3. **Build the Native Desktop Package**:
   ```bash
   npm run tauri build
   ```
   The compiled Linux binaries will be in `src-tauri/target/release/bundle/`.

---

## Known Browser Sandbox Limitations vs. Desktop Build

| Feature | Browser Preview Mode | Native Linux Desktop (Tauri 2) |
|---|---|---|
| **Filesystem Access** | Sandboxed; files selected via input/drag-and-drop are held in memory for the browser session. | Direct Linux filesystem path access via native file dialogs. |
| **Path Durability** | Object URLs (`blob:`) expire when tab is closed; metadata persists in IndexedDB. | File paths (`/home/user/Music/...`) persist permanently in SQLite. |
| **Media Keys / MPRIS** | Standard web keyboard events. | Native Linux MPRIS D-Bus integration for hardware media keys and notification daemon integration. |
| **Window Frame** | Rendered inside web viewport with mock GTK header controls. | Native Wayland / X11 window management and minimize/maximize/close signals. |

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
