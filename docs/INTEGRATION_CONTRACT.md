# YASWAVE: System Integration Contract & Shared Boundaries
**Owner**: Agent A (Lead Engineer, Core Systems & Integration)  
**Target Consumer**: Agent B (UI, Styling & Modular Experience)

---

## 1. Architectural Roles & Ownership Matrix

| System Domain | Responsible Agent | Files / Modules |
|---|---|---|
| **Audio Playback Engine** | **Agent A** | `src/services/audio/audioEngine.ts`, `src/hooks/useAudioEngine.ts` |
| **MediaSession & Lockscreen** | **Agent A** | `src/services/platform/platformAdapter.ts` |
| **Storage & Persistence** | **Agent A** | `src/services/storage/indexedDb.ts`, `src/services/storage/libraryRepository.ts` |
| **File Import & Document Providers** | **Agent A** | `src/services/filesystem/*` |
| **Metadata & Tag Extraction** | **Agent A** | `src/services/metadata/metadataParser.ts` |
| **Core Lyrics Services** | **Agent A** | `src/services/lyrics/*` |
| **Android System Back & Lifecycle**| **Agent A** | `src/services/platform/backButtonManager.ts` |
| **Build, CI/CD, Packaging** | **Agent A** | `package.json`, `.github/workflows/*`, `src-tauri/*` |
| **Independent UI Components** | **Agent B** | `src/components/views/*`, `src/components/common/*` |
| **Mobile Layout & Visual Presentation**| **Agent B** | `src/components/layout/*`, Liner-inspired modular styling |
| **Empty States, Onboarding & Help**| **Agent B** | First-run walkthrough, Persian RTL presentation |

> **CRITICAL RULE FOR AGENT B**: Do NOT create competing state stores for playback, queue, or library data. Always use the established React hooks and service APIs defined below.

---

## 2. Shared Data Models (`src/types/track.ts`)

```typescript
export interface TrackMetadata {
  title: string;
  artist: string;
  album: string;
  albumArtist?: string;
  year?: number;
  trackNumber?: number;
  genre?: string;
  duration: number; // in seconds
  coverArtUrl?: string; // Persistent Base64 Data URL or asset URL
  hasEmbeddedCover?: boolean;
  bpm?: number;
  key?: string;
  keyCamelot?: string;
  lyrics?: string; // Embedded or fetched LRC / plain text
  lyricsProvider?: string; // 'embedded' | 'LRCLIB' | 'manual' | 'local'
}

export interface Track extends TrackMetadata {
  id: string; // Unique stable identifier
  fileName: string;
  fileSize: number;
  fileType: string;
  dateAdded: number;
  playCount: number;
  lastPlayedAt?: number;
  isFavorite: boolean;
  sourceType: 'browser_file' | 'tauri_fs' | 'synth_demo';
  lyricsOffset?: number; // Sync offset in seconds
  persianTranslations?: Record<string, string>; // Normalized key -> Persian translation
}
```

---

## 3. Public Core APIs for Agent B

### A. Playback Engine (`useAudioEngine`)
Location: `src/hooks/useAudioEngine.ts`

```typescript
const {
  currentTrack,      // Track | null (Reactive playback state)
  isPlaying,         // boolean
  isLoading,         // boolean
  currentTime,       // number (seconds)
  duration,          // number (seconds)
  volume,            // number (0.0 to 1.0)
  isMuted,           // boolean
  repeatMode,        // 'off' | 'all' | 'one'
  isShuffle,         // boolean
  playbackRate,      // number
  error,             // string | null
  queue,             // Track[] (current active queue)
  currentIndex,      // number
  play,              // () => Promise<void>
  pause,             // () => void
  togglePlay,        // () => Promise<void>
  seek,              // (seconds: number) => void
  seekRelative,      // (deltaSeconds: number) => void
  setVolume,         // (volume: number) => void
  toggleMute,        // () => void
  cycleRepeatMode,   // () => void
  toggleShuffle,     // () => void
  playNext,          // () => Promise<void>
  playPrevious,      // () => Promise<void>
  setQueue,          // (tracks: Track[], startIndex?: number, autoPlay?: boolean) => Promise<void>
  playTrackAtIndex,  // (index: number) => Promise<void>
  addToQueue,        // (track: Track) => void
  playNextInQueue,   // (track: Track) => void
  removeFromQueue,   // (index: number) => void
  reorderQueue,      // (fromIndex: number, toIndex: number) => void
  clearQueue,        // () => void
} = useAudioEngine();
```

### B. Library & Track State (`useLibrary`)
Location: `src/hooks/useLibrary.ts`

```typescript
const {
  tracks,                  // Track[]
  playlists,               // Playlist[]
  isLoading,               // boolean
  isImporting,             // boolean
  importProgress,          // { current: number; total: number; fileName: string } | null
  importFiles,             // (files: File[]) => Promise<Track[]>
  toggleFavorite,          // (trackId: string) => Promise<void>
  updateTrack,             // (trackId: string, updates: TrackUpdateInput) => Promise<void>
  deleteTrack,             // (trackId: string) => Promise<void>
  recordTrackPlayed,       // (trackId: string) => Promise<void>
  createPlaylist,          // (name: string, description?: string) => Promise<Playlist>
  updatePlaylist,          // (id: string, updates: Partial<Playlist>) => Promise<void>
  deletePlaylist,          // (id: string) => Promise<void>
  relinkTrack,             // (trackId: string, file: File) => Promise<boolean>
  reloadData,              // () => Promise<void>
} = useLibrary();
```

### C. Android System Back Button Management
Location: `src/services/platform/backButtonManager.ts`

To make any custom modal or sheet close gracefully when the Android system back button or gesture is pressed:

```typescript
import { backButtonManager } from '../services/platform/backButtonManager';

useEffect(() => {
  if (isOpen) {
    const unregister = backButtonManager.registerHandler(() => {
      onClose();
      return true; // Return true to indicate the back event was handled
    });
    return () => unregister();
  }
}, [isOpen, onClose]);
```

---

## 4. Invariants & Data Safety
1. **No Ephemeral Blob URLs in Storage**: `coverArtUrl` must always be either a Base64 data URI (`data:image/...`) or a stable local path. Never write temporary `blob:` URLs to IndexedDB.
2. **Audio File Binary Persistence**: Audio binaries are persisted in IndexedDB `STORE_AUDIO_FILES`. Tracks remain playable after device reboot without user re-linking.
3. **AudioEngine Synchronicity**: When `updateTrack` updates metadata or lyrics for the currently playing track, `audioEngine.updateCurrentTrack(...)` is automatically called to prevent UI desynchronization.
