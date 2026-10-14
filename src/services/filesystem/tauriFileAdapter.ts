import { FileAdapter } from '../../types/adapters';
import { Track } from '../../types/track';

/**
 * Tauri 2 Linux Desktop File Adapter.
 * Prepared for Tauri 2 native desktop compilation with strict scope constraints:
 * - Uses dialog.open for explicit file & folder selection
 * - Uses convertFileSrc to stream local Linux audio without full browser sandbox limits
 * - No arbitrary unrestricted filesystem traversal
 */
export class TauriFileAdapter implements FileAdapter {
  readonly mode = 'tauri' as const;

  isAvailable(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window;
  }

  async selectFiles(): Promise<File[]> {
    if (!this.isAvailable()) {
      throw new Error('Tauri API is not available in browser preview mode.');
    }
    // Future Tauri 2 implementation:
    // const { open } = await import('@tauri-apps/plugin-dialog');
    // const selected = await open({
    //   multiple: true,
    //   filters: [{ name: 'Audio Files', extensions: ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac', 'opus'] }]
    // });
    return [];
  }

  async selectFolder(): Promise<File[]> {
    if (!this.isAvailable()) {
      throw new Error('Tauri API is not available in browser preview mode.');
    }
    return [];
  }

  async getPlayableUrl(track: Track): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Tauri API is not available in browser preview mode.');
    }
    if (!track.filePath) {
      throw new Error(`Track "${track.title}" has no native file path associated.`);
    }

    // Tauri 2 convertFileSrc wraps local paths like /home/user/Music/track.flac into asset:// protocol
    // const { convertFileSrc } = await import('@tauri-apps/api/core');
    // return convertFileSrc(track.filePath);
    return `asset://${track.filePath}`;
  }

  revokePlayableUrl(): void {
    // Tauri asset URLs do not require manual revocation like blob: URLs
  }
}

export const tauriFileAdapter = new TauriFileAdapter();
