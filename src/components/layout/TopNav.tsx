import React, { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  FolderDown,
  Activity,
  Mic2,
  SlidersHorizontal,
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
  accentColor?: string;
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
  accentColor = '#19bebe',
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const getTitle = () => {
    switch (activeView) {
      case 'home':
        return 'YASWAVE';
      case 'library':
        return 'Library';
      case 'search':
        return 'Search';
      case 'favorites':
        return 'Liked Songs';
      case 'recently_played':
        return 'Recently Played';
      case 'settings':
        return 'Settings';
      case 'diagnostics':
        return 'Diagnostics';
      default:
        return 'YASWAVE';
    }
  };

  return (
    <header className="h-14 w-full bg-neutral-950/80 border-b border-white/5 flex items-center justify-between px-3 sm:px-6 shrink-0 backdrop-blur-xl z-30 select-none pt-[env(safe-area-inset-top,0px)]">
      {/* Left Slot: Back Button & Wordmark */}
      <div className="flex items-center gap-2 min-w-0">
        {canNavigateBack ? (
          <button
            onClick={onNavigateBack}
            className="w-9 h-9 rounded-full bg-neutral-900 border border-white/5 flex items-center justify-center text-neutral-300 hover:text-white active:scale-90 transition-transform cursor-pointer"
            title="Back"
          >
            <ChevronLeft size={20} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-700 flex items-center justify-center text-white shadow-md">
              <span className="font-black text-sm tracking-tighter">Y</span>
            </div>
          </div>
        )}

        <span className="font-extrabold text-base tracking-tight text-white truncate ml-1">
          {getTitle()}
        </span>
      </div>

      {/* Center Slot: Quick Search Bar on desktop / tablet */}
      <div className="hidden sm:flex items-center flex-1 max-w-xs mx-4">
        <div className="relative w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
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
            placeholder="Search library..."
            className="w-full bg-neutral-900/90 text-xs text-neutral-100 placeholder-neutral-500 rounded-xl pl-9 pr-8 py-2 border border-white/10 focus:border-brand-500/50 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right Slot: Context Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onToggleVisualizer}
          className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all active:scale-95 ${
            isVisualizerOpen
              ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
              : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white'
          }`}
          title="Audio Visualizer"
        >
          <Activity size={17} />
        </button>

        <button
          onClick={onOpenImportModal}
          className="h-9 px-3 rounded-xl bg-brand-500 text-neutral-950 font-semibold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          title="Import Audio Files"
        >
          <FolderDown size={15} />
          <span className="hidden xs:inline">Import</span>
        </button>
      </div>
    </header>
  );
};
