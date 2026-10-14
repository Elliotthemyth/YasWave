<div align="center">

<img src="public/yaswave-logo.png" alt="YASWAVE" width="220" />

# YASWAVE

**A modern, cross-platform music player with synchronized lyrics and Persian translations.**

[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](#license)

</div>

---

## Screenshots

> Captured from the running app (development build) with the three built-in demo tracks seeded on first launch.

| Home | Your Library |
|---|---|
| ![Home](docs/screenshots/home.png) | ![Library](docs/screenshots/library.png) |

| Settings & Themes |
|---|
| ![Settings](docs/screenshots/settings.png) |

---

## Overview

YASWAVE is a polished, Spotify-inspired desktop music player. It plays your local audio files, extracts their metadata and cover art, fetches and synchronizes lyrics (with optional Persian translations), renders a real-time audio visualizer, and manages playlists — all offline-first, with local persistence.

It is built as a **React + TypeScript + Vite** web application that is architected to be packaged natively for **Linux, Windows and Android** using **Tauri 2**. The whole data layer, filesystem access and persistence sit behind clean adapters so the same UI runs both in the browser and inside a native shell.

---

## Features

- **Local audio playback engine** — `HTMLAudioElement` + Web Audio API, with play/pause, seek/scrub, volume, mute, speed, true Fisher-Yates shuffle (with un-shuffle order restore) and repeat modes (`off` / `all` / `one`).
- **Queue management** — Up Next queue with reorder, remove, play-next, play-now and history.
- **Real-time visualizer** — `AnalyserNode`-driven Frequency Bars, Waveform and Radial Spectrum modes.
- **Synchronized LRC lyrics** — high-fidelity parser (`[mm:ss.xx]` / `[mm:ss.xxx]`), metadata tags, multi-timestamp lines, auto-scroll with manual override, ±0.2s / ±1.0s sync offset controls, and an in-app editor with a **"Stamp Current Time"** button.
- **Persian lyric translations** — offline translation service with per-line manual override, associated to the synchronized lines.
- **Online lyrics discovery** — LRCLIB provider with candidate scoring and duration-aware matching.
- **Local library & metadata** — multi-file import, folder scan (`webkitdirectory`) and drag-and-drop; ID3v2 / MP4 / FLAC / Vorbis parsing via `music-metadata-browser` with embedded artwork; filename fallback parsing; in-app metadata editor.
- **Playlists** — static and smart (rule-based) playlists, plus auto collections (**Liked Songs**, **Recently Played**).
- **Themes & accents** — Dark Charcoal, OLED Midnight and Daylight themes; six accent colors (default **Turquoise**, taken from the logo).
- **Keyboard shortcuts** — `Space` play/pause, `←`/`→` seek (±5s, `Shift` ±15s), `↑`/`↓` volume, `M` mute, `L` lyrics, `V` visualizer, `Q` queue, `S` shuffle, `R` repeat, `Ctrl/⌘+F` search, `?` shortcuts, `Esc` close.
- **In-app diagnostics & tests** — a Diagnostics view plus a Vitest suite for the parser, matching, queue and persistence logic.

---

## Screenshots & Branding

The app ships the YASWAVE logo (turquoise waveform "YW" monogram) under `public/`:

| Asset | Path | Use |
|---|---|---|
| Full lockup | `public/yaswave-logo.png` (1024×1024) | Splash / about / README |
| Mark (transparent) | `public/yaswave-mark.png` (1024×1024) | Sidebar + window titlebar |
| Favicon | `public/favicon.png` (128×128) | Browser tab icon |

The brand color (`brand`, default `#19bebe`) is defined as a Tailwind theme token in `src/index.css` and as the default accent in `src/config/appConfig.ts`.

---

## Tech Stack

| Layer | Choice |
|---|---|
| UI | React 19, TypeScript 7 |
| Build | Vite 8 (`@vitejs/plugin-react`) |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Animation | `motion` |
| Icons | `lucide-react` |
| Metadata | `music-metadata-browser` |
| Persistence | IndexedDB (adapter-based) |
| Tests | Vitest 5 |
| Native packaging (planned) | Tauri 2 |

---

## Architecture

The project keeps the data model, filesystem adapters, persistence and UI strictly separated:

```
src/
├── types/              # Clean interfaces (Track, Playlist, PlaybackState, FileAdapter…)
├── config/             # APP_CONFIG branding, accent palette, demo tracks
├── services/
│   ├── audio/          # AudioEngine, VisualizerEngine, SynthAudioGenerator
│   ├── metadata/       # ID3/Vorbis parser + audio-element duration fallback
│   ├── storage/        # IndexedDB repository (swappable for SQLite in Tauri)
│   ├── filesystem/     # FileAdapter boundary:
│   │   ├── browserFileAdapter.ts   # browser session cache & object URLs
│   │   └── tauriFileAdapter.ts     # Tauri 2 native adapter with scoped paths
│   ├── lyrics/         # LRC parser/synchronizer + LRCLIB provider + Persian translations
│   └── playlist/       # Smart-playlist rule evaluator
├── hooks/              # useAudioEngine, useLibrary, useTheme, useKeyboardShortcuts
└── components/         # layout, player, views, visualizer, modals
```

On first launch the app seeds **three built-in synthesized demo tracks** (see `src/config/defaultTracks.ts`) so the player, queue, visualizer and lyric sync are usable without importing any files.

---

## Getting Started

### Prerequisites

- **Node.js 20+** or **Bun 1.x** (the repo is locked with `bun.lock`, so [Bun](https://bun.sh) is recommended)
- A modern browser (for preview) or the platform toolchain below for native builds

### Install & run

```bash
# 1. Install dependencies
bun install            # or: npm install

# 2. Start the dev server (http://localhost:3000)
bun run dev

# 3. Type-check
bun run lint           # tsc --noEmit

# 4. Run the unit tests
bun test               # vitest run

# 5. Production build (outputs to dist/)
bun run build

# 6. Preview the production build
bun run preview
```

The npm scripts are equivalent if you prefer npm/pnpm:

```bash
npm run dev / lint / test / build / preview
```

---

## Packaging as a Desktop App (Tauri 2)

> **Status:** only the web application is configured and verified in this repository. The native platform scaffolds below are **not** present yet and **no Windows or Android build has been produced or published**. Use this section as the setup guide.

### 1. Add the Tauri CLI and APIs

```bash
bun add -d @tauri-apps/cli
bun add @tauri-apps/api @tauri-apps/plugin-dialog @tauri-apps/plugin-fs
```

### 2. Initialize Tauri

```bash
bunx tauri init
```

Configure `src-tauri/tauri.conf.json`:

- `productName`: `YASWAVE`
- `identifier`: `com.yaswave.music`
- `build.devUrl`: `http://localhost:3000`
- `build.frontendDist`: `../dist`
- `app.windows[].decorations`: `false` to use YASWAVE's own titlebar, or `true` for the native frame
- `bundle.publisher`: `YASWAVE`

### 3. Generate the platform icon set

```bash
bunx tauri icon public/yaswave-mark.png   # writes src-tauri/icons/*
```

This produces `icon.ico` (Windows), `icon.icns` (macOS), the Linux PNGs and the Android mipmaps from the master mark.

### 4. Build per platform

| Platform | Command | Bundle outputs | Status |
|---|---|---|---|
| Linux | `bunx tauri build` | `.deb`, `.AppImage`, `.rpm` | not built |
| Windows | `bunx tauri build` (on Windows) | `.msi` / NSIS `.exe` | not built |
| Android | `bunx tauri android init && bunx tauri android build` | `.apk` / `.aab` | not built |

Set the Android label to `YASWAVE` in `src-tauri/gen/android/app/src/main/res/values/strings.xml` after `android init`.

Compiled desktop binaries land in `src-tauri/target/release/bundle/`.

---

## Product Identity

| Property | Value |
|---|---|
| Product / display name | `YASWAVE` |
| Description | A modern, cross-platform music player with synchronized lyrics and Persian translations. |
| npm package | `yaswave` (private) |
| Rust crate / Tauri bundle identifier | `yaswave` |
| Desktop & Android application ID | `com.yaswave.music` |
| Default accent | `#19bebe` (Turquoise, from the logo) |
| Persistence namespace | `nocturne_music_db` / `nocturne_` (kept for data compatibility) |

The single source of truth for in-app branding is [`src/config/appConfig.ts`](src/config/appConfig.ts).

---

## Browser Preview vs. Native Build

| Feature | Browser preview | Native (Tauri 2) |
|---|---|---|
| Filesystem access | Sandboxed; picked files live in the session | Direct OS paths via native dialogs |
| Path durability | `blob:` URLs expire with the tab; metadata persists in IndexedDB | Paths persist in SQLite |
| Media keys | Standard web keyboard events | Linux MPRIS / OS media-key integration |
| Window frame | In-app mock titlebar | Native window management & controls |

---

## License

Apache-2.0.

---

## نمای کلی (فارسی)

**YASWAVE** یک پخشکنندهٔ موسیقی مدرن و چندسکویی است که با React + TypeScript + Vite ساخته شده و برای بستهبندی با Tauri 2 روی لینوکس، ویندوز و اندروید آماده است. امکانات: پخش فایلهای صوتی محلی، خواندن متادیتا و کاور آلبوم، ویژوالایزر بلادرنگ، لیریک همگام با ترجمهٔ فارسی، جستوجوی آنلاین لیریک، پلیلیستهای ساده و هوشمند، تمها و رنگهای اکسنت (پیشفرض فیروزهای برگرفته از لوگو) و ذخیرهسازی محلی.

اجرا در حالت توسعه:

```bash
bun install
bun run dev      # http://localhost:3000
bun test         # تستها
bun run build    # خروجی در dist/
```

نسخهٔ وب بهطور کامل تست شده است؛ ساخت نسخهٔ ویندوز و اندروید هنوز پیکربندی نشده و هیچ بیلد بومی منتشر نشده است.
