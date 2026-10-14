import { Track } from '../../types/track';

export type OperatingSystem = 'linux' | 'windows' | 'android' | 'browser';

export interface PlatformCapabilities {
  os: OperatingSystem;
  isDesktop: boolean;
  isMobile: boolean;
  hasNativeFileSystem: boolean;
  hasMediaSession: boolean;
  hasNotificationSupport: boolean;
}

export function detectPlatform(): PlatformCapabilities {
  if (typeof window === 'undefined') {
    return {
      os: 'linux',
      isDesktop: true,
      isMobile: false,
      hasNativeFileSystem: false,
      hasMediaSession: false,
      hasNotificationSupport: false,
    };
  }

  const isTauri = '__TAURI__' in window;
  const ua = navigator.userAgent.toLowerCase();

  let os: OperatingSystem = 'browser';
  if (ua.includes('android')) {
    os = 'android';
  } else if (ua.includes('win')) {
    os = 'windows';
  } else if (ua.includes('linux')) {
    os = 'linux';
  }

  const isMobile = os === 'android' || /iphone|ipad|ipod/.test(ua);
  const isDesktop = !isMobile;

  return {
    os: isTauri ? os : 'browser',
    isDesktop,
    isMobile,
    hasNativeFileSystem: isTauri,
    hasMediaSession: typeof navigator !== 'undefined' && 'mediaSession' in navigator,
    hasNotificationSupport: typeof window !== 'undefined' && 'Notification' in window,
  };
}

/**
 * Universal MediaSession integration for system background playback controls,
 * hardware media keys, lock screen widgets, and desktop taskbars (Linux MPRIS,
 * Windows SMTC, Android MediaStyle Notification).
 */
export class SystemMediaSessionAdapter {
  private isSupported = typeof navigator !== 'undefined' && 'mediaSession' in navigator;

  public updateMetadata(track: Track | null): void {
    if (!this.isSupported || !track) {
      if (this.isSupported) {
        navigator.mediaSession.metadata = null;
      }
      return;
    }

    try {
      const artwork: MediaImage[] = [];
      if (track.coverArtUrl) {
        artwork.push({
          src: track.coverArtUrl,
          sizes: '512x512',
          type: 'image/jpeg',
        });
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || undefined,
        artwork,
      });
    } catch (e) {
      console.warn('MediaSession metadata error:', e);
    }
  }

  public setPlaybackState(isPlaying: boolean): void {
    if (!this.isSupported) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (e) {
      // Ignore
    }
  }

  public registerActionHandlers(handlers: {
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onSeek?: (seconds: number) => void;
  }): void {
    if (!this.isSupported) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => handlers.onPlay());
      navigator.mediaSession.setActionHandler('pause', () => handlers.onPause());
      navigator.mediaSession.setActionHandler('nexttrack', () => handlers.onNext());
      navigator.mediaSession.setActionHandler('previoustrack', () => handlers.onPrevious());

      if (handlers.onSeek) {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined) {
            handlers.onSeek!(details.seekTime);
          }
        });
      }
    } catch (e) {
      console.warn('MediaSession action handler registration note:', e);
    }
  }
}

export const systemMediaSession = new SystemMediaSessionAdapter();
