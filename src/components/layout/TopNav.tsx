import React, { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  FolderDown,
  Activity,
  Mic2,
} from 'lucide-react';
import { ActiveView } from './Sidebar';

interface TopNavProps {
  activeView: ActiveView;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  canNavigateBack?: boolean;
  canNavigateForward?: boolean;
  onOpenImportModal: () => void;
  onToggleVisualizer: () => void;
  onToggleLyrics: () => void;
  isVisualizerOpen: boolean;
  isLyricsOpen: boolean;
  onSelectView: (view: ActiveView) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeView,
  searchQuery,
  onSearchChange,
  onNavigateBack,
  onNavigateForward,
  canNavigateBack = false,
  canNavigateForward = false,
  onOpenImportModal,
  onToggleVisualizer,
  onToggleLyrics,
  isVisualizerOpen,
  isLyricsOpen,
  onSelectView,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="h-14 w-full bg-neutral-900/60 border-b border-white/5 flex items-center justify-between px-3 sm:px-6 shrink-0 backdrop-blur-md z-30 select-none">
      {/* Navigation history arrows */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onNavigateBack}
          disabled={!canNavigateBack}
          className="w-8 h-8 rounded-full bg-neutral-900/80 border border-white/5 flex items-center justify-center text-neutral-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Back"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={onNavigateForward}
          disabled={!canNavigateForward}
          className="w-8 h-8 rounded-full bg-neutral-900/80 border border-white/5 flex items-center justify-center text-neutral-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Forward"
        >
          <ChevronRight size={18} />
        </button>

        {/* Global Search Bar */}
        <div className="relative ml-1 sm:ml-2 w-32 sm:w-56 md:w-80">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              if (activeView !== 'search' && e.target.value.trim().length > 0) {
                onSelectView('search');
              }
            }}
            placeholder="Search... (Ctrl+F)"
            className="w-full bg-neutral-800/80 text-xs text-neutral-100 placeholder-neutral-500 rounded-full pl-9 pr-8 py-2 border border-transparent focus:border-white/20 focus:outline-none focus:bg-neutral-800 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleLyrics}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-colors ${
            isLyricsOpen
              ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
              : 'bg-white/5 border-white/5 text-neutral-300 hover:text-white hover:bg-white/10'
          }`}
          title="Toggle Lyrics (L)"
        >
          <Mic2 size={14} />
          <span className="hidden sm:inline">Lyrics</span>
        </button>

        <button
          onClick={onToggleVisualizer}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-colors ${
            isVisualizerOpen
              ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
              : 'bg-white/5 border-white/5 text-neutral-300 hover:text-white hover:bg-white/10'
          }`}
          title="Toggle Visualizer (V)"
        >
          <Activity size={14} />
          <span className="hidden sm:inline">Visualizer</span>
        </button>

        <button
          onClick={onOpenImportModal}
          className="px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-500 text-neutral-950 hover:bg-brand-400 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
        >
          <FolderDown size={14} />
          <span>Import Music</span>
        </button>
      </div>
    </header>
  );
};
