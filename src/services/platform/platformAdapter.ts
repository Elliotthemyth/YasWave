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
        // Provide standard responsive icons for Android notification & lock screen
        for (const size of ['96x96', '128x128', '192x192', '256x256', '384x384', '512x512']) {
          artwork.push({
            src: track.coverArtUrl,
            sizes: size,
            type: 'image/jpeg',
          });
        }
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
    } catch {
      // Ignore
    }
  }

  public setPositionState(details: { duration: number; playbackRate?: number; position: number }): void {
    if (!this.isSupported || typeof navigator.mediaSession.setPositionState !== 'function') return;
    try {
      const dur = Math.max(0, details.duration || 0);
      if (dur > 0 && isFinite(dur)) {
        const pos = Math.max(0, Math.min(details.position || 0, dur));
        navigator.mediaSession.setPositionState({
          duration: dur,
          playbackRate: details.playbackRate || 1.0,
          position: pos,
        });
      }
    } catch {
      // Ignore transition states
    }
  }

  public registerActionHandlers(handlers: {
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onSeek?: (seconds: number) => void;
    onSeekRelative?: (deltaSeconds: number) => void;
  }): void {
    if (!this.isSupported) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => handlers.onPlay());
      navigator.mediaSession.setActionHandler('pause', () => handlers.onPause());
      navigator.mediaSession.setActionHandler('nexttrack', () => handlers.onNext());
      navigator.mediaSession.setActionHandler('previoustrack', () => handlers.onPrevious());
      navigator.mediaSession.setActionHandler('stop', () => handlers.onPause());

      if (handlers.onSeek) {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined) {
            handlers.onSeek!(details.seekTime);
          }
        });
      }

      if (handlers.onSeekRelative) {
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          const skipTime = details.seekOffset || 10;
          handlers.onSeekRelative!(skipTime);
        });
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          const skipTime = details.seekOffset || 10;
          handlers.onSeekRelative!(-skipTime);
        });
      }
    } catch (e) {
      console.warn('MediaSession action handler registration note:', e);
    }
  }
}

export const systemMediaSession = new SystemMediaSessionAdapter();
