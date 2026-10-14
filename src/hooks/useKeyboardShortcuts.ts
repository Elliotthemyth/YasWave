import { useEffect } from 'react';
import { APP_CONFIG } from '../config/appConfig';

export interface ShortcutHandlers {
  onTogglePlay: () => void;
  onSeek: (deltaSeconds: number) => void;
  onVolumeChange?: (delta: number) => void;
  onToggleMute?: () => void;
  onPlayNext?: () => void;
  onPlayPrevious?: () => void;
  onToggleShuffle?: () => void;
  onCycleRepeat?: () => void;
  onToggleQueue?: () => void;
  onFocusSearch: () => void;
  onCloseOverlay: () => void;
  onToggleLyrics?: () => void;
  onToggleVisualizer?: () => void;
  onOpenShortcuts?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl && (activeEl as HTMLElement).isContentEditable);

      // Escape always closes overlays even inside inputs
      if (e.key === 'Escape') {
        handlers.onCloseOverlay();
        return;
      }

      // Ctrl+F or Cmd+F focuses search input
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        handlers.onFocusSearch();
        return;
      }

      // If user is typing in a text field, let standard typing events pass through unmodified
      if (isInput) return;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        handlers.onOpenShortcuts?.();
      } else if (e.key === '/') {
        e.preventDefault();
        handlers.onFocusSearch();
      } else if (e.code === 'Space') {
        e.preventDefault();
        handlers.onTogglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? -15 : -APP_CONFIG.seekIntervalSeconds;
        handlers.onSeek(delta);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const delta = e.shiftKey ? 15 : APP_CONFIG.seekIntervalSeconds;
        handlers.onSeek(delta);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlers.onVolumeChange?.(0.05);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handlers.onVolumeChange?.(-0.05);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handlers.onToggleMute?.();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handlers.onToggleLyrics?.();
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        handlers.onToggleVisualizer?.();
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        handlers.onToggleQueue?.();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handlers.onToggleShuffle?.();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handlers.onCycleRepeat?.();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handlers.onPlayNext?.();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handlers.onPlayPrevious?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers]);
}
