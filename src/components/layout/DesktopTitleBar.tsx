import React from 'react';
import { Disc3, Minus, Square, X } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';

interface DesktopTitleBarProps {
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  onOpenShortcuts?: () => void;
}

export const DesktopTitleBar: React.FC<DesktopTitleBarProps> = ({
  onMinimize,
  onMaximize,
  onClose,
  onOpenShortcuts,
}) => {
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

  return (
    <div
      data-tauri-drag-region
      className="h-8 w-full bg-neutral-950/80 border-b border-white/5 flex items-center justify-between px-3 select-none text-xs text-neutral-400 z-40 shrink-0 backdrop-blur-md"
    >
      {/* App brand & icon */}
      <div className="flex items-center gap-2">
        <Disc3 size={14} className="text-emerald-400 animate-spin-slow" />
        <span className="font-semibold text-neutral-200 tracking-wide">{APP_CONFIG.name}</span>
        <span className="text-[10px] text-neutral-500 hidden sm:inline">· {APP_CONFIG.tagline}</span>
      </div>

      {/* Center environment badge */}
      <div className="hidden md:flex items-center gap-3 text-[11px] text-neutral-500">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
          <span>{isTauri ? 'Linux Desktop Native (Tauri)' : 'Linux Preview Mode'}</span>
        </div>
      </div>

      {/* Window Controls (GTK / Linux style) */}
      <div className="flex items-center gap-1">
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono hover:bg-white/10 text-neutral-400 hover:text-white transition-colors mr-2 hidden sm:flex items-center gap-1"
            title="Keyboard Shortcuts (?)"
          >
            <span>Shortcuts</span>
            <kbd className="px-1 py-0.2 bg-neutral-800 rounded border border-white/15 text-[9px]">?</kbd>
          </button>
        )}
        <button
          onClick={onMinimize}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          title="Minimize"
        >
          <Minus size={12} />
        </button>
        <button
          onClick={onMaximize}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          title="Maximize"
        >
          <Square size={10} />
        </button>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-rose-500/80 text-neutral-400 hover:text-white transition-colors"
          title="Close"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};
