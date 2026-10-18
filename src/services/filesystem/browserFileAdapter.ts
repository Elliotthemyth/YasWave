import { FileAdapter } from '../../types/adapters';
import { Track } from '../../types/track';
import { APP_CONFIG } from '../../config/appConfig';
import { generateSynthesizedTrack, SynthSongType } from '../audio/synthAudioGenerator';

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
   * Register a local File object with a track ID
   */
  registerFile(trackId: string, file: File): void {
    this.fileCache.set(trackId, file);
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
      input.multiple = options.multiple ?? true;
      input.accept = options.accept || APP_CONFIG.supportedExtensions.join(',') + ',' + APP_CONFIG.supportedMimeTypes.join(',');

      input.onchange = () => {
        if (!input.files || input.files.length === 0) {
          resolve([]);
          return;
        }
        const files = Array.from(input.files);
        resolve(files);
      };

      input.oncancel = () => {
        resolve([]);
      };

      input.click();
    });
  }

  /**
   * Open browser directory picker to import entire music folders
   */
  async selectFolder(): Promise<File[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      // Set webkitdirectory for directory upload
      input.setAttribute('webkitdirectory', '');
      input.setAttribute('directory', '');
      input.multiple = true;

      input.onchange = () => {
        if (!input.files || input.files.length === 0) {
          resolve([]);
          return;
        }

        const validFiles = Array.from(input.files).filter((file) => {
          const ext = '.' + file.name.split('.').pop()?.toLowerCase();
          return (
            APP_CONFIG.supportedExtensions.includes(ext) ||
            APP_CONFIG.supportedMimeTypes.some((type) => file.type.startsWith('audio/'))
          );
        });

        resolve(validFiles);
      };

      input.oncancel = () => {
        resolve([]);
      };

      input.click();
    });
  }

  /**
   * Retrieve a playable object URL for the track
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

    // 2. Handle browser-imported files from the current session
    const file = this.fileCache.get(track.id);
    if (file) {
      const url = URL.createObjectURL(file);
      this.activeUrls.add(url);
      return url;
    }

    // 3. Fallback: If browser session was refreshed and file handle was lost
    throw new Error(
      `Audio file "${track.fileName}" is not loaded in this browser session. Please re-import this track or folder from your computer.`
    );
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
   * Check if a file is loaded in the browser session
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
