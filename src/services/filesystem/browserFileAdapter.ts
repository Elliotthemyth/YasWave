import { FileAdapter } from '../../types/adapters';
import { Track } from '../../types/track';
import { APP_CONFIG } from '../../config/appConfig';
import { generateSynthesizedTrack, SynthSongType } from '../audio/synthAudioGenerator';
import { idbSaveAudioFile, idbGetAudioFile } from '../storage/indexedDb';

export class BrowserFileAdapter implements FileAdapter {
  readonly mode = 'browser' as const;

  // In-memory store for File objects during the browser session
  private fileCache = new Map<string, File>();
  // Track active blob URLs to clean them up properly
  private activeUrls = new Set<string>();
  // Cached demo track URLs
  private demoTrackUrls = new Map<string, string>();

  isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.document !== 'undefined';
  }

  /**
   * Helper to determine if a File is a supported audio format
   */
  isAudioFile(file: File): boolean {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const type = file.type?.toLowerCase() || '';
    return (
      APP_CONFIG.supportedExtensions.includes(ext) ||
      type.startsWith('audio/') ||
      APP_CONFIG.supportedMimeTypes.includes(type)
    );
  }

  /**
   * Register a local File object with a track ID and persist to IndexedDB
   */
  async registerFile(trackId: string, file: File): Promise<void> {
    this.fileCache.set(trackId, file);
    try {
      await idbSaveAudioFile(trackId, file);
    } catch (err) {
      console.warn(`Failed to persist audio file in IndexedDB for track ${trackId}:`, err);
    }
  }

  /**
   * Retrieve cached File object for a track ID
   */
  getFile(trackId: string): File | undefined {
    return this.fileCache.get(trackId);
  }

  /**
   * Open native browser file picker dialog
   */
  async selectFiles(options: { multiple?: boolean; accept?: string } = {}): Promise<File[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';
      input.multiple = options.multiple ?? true;
      input.accept = options.accept || APP_CONFIG.supportedExtensions.join(',') + ',' + APP_CONFIG.supportedMimeTypes.join(',');
      document.body.appendChild(input);

      const cleanup = () => {
        if (input.parentNode) {
          input.parentNode.removeChild(input);
        }
      };

      input.onchange = () => {
        cleanup();
        if (!input.files || input.files.length === 0) {
          resolve([]);
          return;
        }
        const files = Array.from(input.files).filter((f) => this.isAudioFile(f));
        resolve(files);
      };

      input.oncancel = () => {
        cleanup();
        resolve([]);
      };

      input.click();
    });
  }

  /**
   * Recursively read files from a FileSystemDirectoryHandle (File System Access API)
   */
  private async walkDirectory(dirHandle: FileSystemDirectoryHandle): Promise<File[]> {
    const results: File[] = [];
    const entries = (dirHandle as unknown as { values: () => AsyncIterable<FileSystemHandle> }).values();
    for await (const entry of entries) {
      if (entry.kind === 'file') {
        const fileEntry = entry as FileSystemFileHandle;
        try {
          const file = await fileEntry.getFile();
          if (this.isAudioFile(file)) {
            results.push(file);
          }
        } catch (err) {
          console.warn('Could not read file from directory handle:', err);
        }
      } else if (entry.kind === 'directory') {
        const subFiles = await this.walkDirectory(entry as FileSystemDirectoryHandle);
        results.push(...subFiles);
      }
    }
    return results;
  }

  /**
   * Open directory picker to import music folders recursively
   */
  async selectFolder(): Promise<File[]> {
    // 1. Try modern File System Access API if available
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const dirPicker = (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
        const dirHandle = await dirPicker();
        const files = await this.walkDirectory(dirHandle);
        if (files.length > 0) {
          return files;
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          return [];
        }
        console.warn('showDirectoryPicker failed, falling back to input:', err);
      }
    }

    // 2. Standard webkitdirectory input fallback (adjusted for Android document provider and iframe DOM requirements)
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';
      const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
      if (!isAndroid) {
        input.setAttribute('webkitdirectory', '');
        input.setAttribute('directory', '');
      }
      input.multiple = true;
      input.accept = APP_CONFIG.supportedExtensions.join(',') + ',' + APP_CONFIG.supportedMimeTypes.join(',');
      document.body.appendChild(input);

      const cleanup = () => {
        if (input.parentNode) {
          input.parentNode.removeChild(input);
        }
      };

      input.onchange = () => {
        cleanup();
        if (!input.files || input.files.length === 0) {
          resolve([]);
          return;
        }

        const validFiles = Array.from(input.files).filter((file) => this.isAudioFile(file));
        resolve(validFiles);
      };

      input.oncancel = () => {
        cleanup();
        resolve([]);
      };

      input.click();
    });
  }

  /**
   * Retrieve a playable object URL for the track, restoring from IndexedDB if necessary
   */
  async getPlayableUrl(track: Track): Promise<string> {
    // 1. Handle synthesized ambient demo songs
    if (track.sourceType === 'synth_demo') {
      if (this.demoTrackUrls.has(track.id)) {
        return this.demoTrackUrls.get(track.id)!;
      }

      let synthType: SynthSongType = 'midnight_reverie';
      if (track.id.includes('2')) synthType = 'linux_kernel_lofi';
      if (track.id.includes('3')) synthType = 'neon_drift';

      const blob = await generateSynthesizedTrack(synthType);
      const url = URL.createObjectURL(blob);
      this.activeUrls.add(url);
      this.demoTrackUrls.set(track.id, url);
      return url;
    }

    // 2. Check in-memory session cache first
    const file = this.fileCache.get(track.id);
    if (file) {
      const url = URL.createObjectURL(file);
      this.activeUrls.add(url);
      return url;
    }

    // 3. Persistent restoration: Check IndexedDB audio_files store
    try {
      const storedBlob = await idbGetAudioFile(track.id);
      if (storedBlob) {
        const restoredFile = new File([storedBlob], track.fileName, {
          type: track.fileType || 'audio/mpeg',
        });
        this.fileCache.set(track.id, restoredFile);
        const url = URL.createObjectURL(storedBlob);
        this.activeUrls.add(url);
        return url;
      }
    } catch (dbErr) {
      console.warn(`IndexedDB retrieval failed for track ${track.id}:`, dbErr);
    }

    // 4. Fallback: Prompt user with informative recovery instruction
    throw new Error(
      `Audio file "${track.fileName}" is not loaded in this session. Tap "Relink" to reselect this track from your storage.`
    );
  }

  /**
   * Relink a missing track with a newly selected File object
   */
  async relinkFile(trackId: string, file: File): Promise<string> {
    await this.registerFile(trackId, file);
    const url = URL.createObjectURL(file);
    this.activeUrls.add(url);
    return url;
  }

  /**
   * Revoke an active blob URL
   */
  revokePlayableUrl(url: string): void {
    if (url && url.startsWith('blob:') && this.activeUrls.has(url)) {
      URL.revokeObjectURL(url);
      this.activeUrls.delete(url);
    }
  }

  /**
   * Check if a file is loaded in the browser session or IndexedDB
   */
  hasSessionFile(trackId: string): boolean {
    return this.fileCache.has(trackId);
  }

  /**
   * Revoke all URLs on unload
   */
  cleanUp(): void {
    this.activeUrls.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    this.activeUrls.clear();
    this.demoTrackUrls.clear();
  }
}

export const browserFileAdapter = new BrowserFileAdapter();
