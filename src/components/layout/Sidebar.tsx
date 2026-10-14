import React from 'react';
import {
  Home,
  Search,
  Library,
  Heart,
  History,
  Plus,
  FolderDown,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ListMusic,
  CheckCircle2,
  Keyboard,
  Sparkles,
} from 'lucide-react';
import { Playlist } from '../../types/playlist';
import { APP_CONFIG } from '../../config/appConfig';

export type ActiveView =
  | 'home'
  | 'search'
  | 'library'
  | 'favorites'
  | 'recently_played'
  | 'playlist_detail'
  | 'settings'
  | 'diagnostics';

interface SidebarProps {
  activeView: ActiveView;
  selectedPlaylistId?: string;
  playlists: Playlist[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectView: (view: ActiveView, playlistId?: string) => void;
  onCreatePlaylist: () => void;
  onOpenSmartPlaylist?: () => void;
  onOpenImportModal: () => void;
  onOpenShortcuts?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  selectedPlaylistId,
  playlists,
  isCollapsed,
  onToggleCollapse,
  onSelectView,
  onCreatePlaylist,
  onOpenSmartPlaylist,
  onOpenImportModal,
  onOpenShortcuts,
}) => {
  return (
    <aside
      className={`h-full bg-neutral-950 flex flex-col border-r border-white/5 transition-all duration-200 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header / App Brand */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5">
            <img
              src="/yaswave-mark.png"
              alt="YASWAVE"
              className="w-7 h-7 object-contain drop-shadow-[0_0_6px_rgba(25,190,190,0.35)]"
            />
            <span className="font-bold text-neutral-100 tracking-tight text-base">
              {APP_CONFIG.name}
            </span>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/5 transition-colors ${
            isCollapsed ? 'mx-auto' : ''
          }`}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Main Navigation Links */}
      <div className="p-2 space-y-1">
        <button
          onClick={() => onSelectView('home')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeView === 'home'
              ? 'bg-white/10 text-white'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
          title="Home"
        >
          <Home size={18} className={activeView === 'home' ? 'text-brand-400' : ''} />
          {!isCollapsed && <span>Home</span>}
        </button>

        <button
          onClick={() => onSelectView('search')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeView === 'search'
              ? 'bg-white/10 text-white'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
          title="Search (Ctrl+F)"
        >
          <Search size={18} className={activeView === 'search' ? 'text-brand-400' : ''} />
          {!isCollapsed && <span>Search</span>}
        </button>

        <button
          onClick={() => onSelectView('library')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeView === 'library'
              ? 'bg-white/10 text-white'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
          title="Your Library"
        >
          <Library size={18} className={activeView === 'library' ? 'text-brand-400' : ''} />
          {!isCollapsed && <span>Your Library</span>}
        </button>
      </div>

      <div className="h-px bg-white/5 mx-3 my-1" />

      {/* Quick Sections: Favorites & Recently Played */}
      <div className="p-2 space-y-1">
        <button
          onClick={() => onSelectView('favorites')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeView === 'favorites'
              ? 'bg-white/10 text-white'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
          title="Favorites"
        >
          <Heart size={18} className="text-rose-500 fill-rose-500/20" />
          {!isCollapsed && <span>Favorites</span>}
        </button>

        <button
          onClick={() => onSelectView('recently_played')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeView === 'recently_played'
              ? 'bg-white/10 text-white'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
          title="Recently Played"
        >
          <History size={18} className={activeView === 'recently_played' ? 'text-brand-400' : ''} />
          {!isCollapsed && <span>Recently Played</span>}
        </button>
      </div>

      <div className="h-px bg-white/5 mx-3 my-1" />

      {/* Playlists Section */}
      <div className="flex-1 min-h-0 flex flex-col p-2">
        {!isCollapsed && (
          <div className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            <span>Playlists</span>
            <div className="flex items-center gap-1">
              {onOpenSmartPlaylist && (
                <button
                  onClick={onOpenSmartPlaylist}
                  className="p-1 rounded hover:bg-brand-500/20 text-neutral-400 hover:text-brand-400 transition-colors"
                  title="Create Smart Playlist (Rule-based)"
                >
                  <Sparkles size={14} />
                </button>
              )}
              <button
                onClick={onCreatePlaylist}
                className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
                title="Create Standard Playlist"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 mt-1">
          {playlists.map((pl) => {
            const isSelected = activeView === 'playlist_detail' && selectedPlaylistId === pl.id;
            const isSmart = Boolean(pl.isSmart);
            return (
              <button
                key={pl.id}
                onClick={() => onSelectView('playlist_detail', pl.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors text-left truncate ${
                  isSelected
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                }`}
                title={`${pl.name}${isSmart ? ' (Smart Playlist)' : ''}`}
              >
                {isSmart ? (
                  <Sparkles
                    size={15}
                    className={
                      isSelected
                        ? 'text-brand-400 shrink-0'
                        : 'text-brand-400/80 shrink-0'
                    }
                  />
                ) : (
                  <ListMusic
                    size={16}
                    className={
                      isSelected ? 'text-brand-400 shrink-0' : 'text-neutral-500 shrink-0'
                    }
                  />
                )}
                {!isCollapsed && <span className="truncate">{pl.name}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Actions: Import & Settings & Diagnostics */}
      <div className="p-2 border-t border-white/5 space-y-1 shrink-0">
        <button
          onClick={onOpenImportModal}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-white/5 hover:bg-white/10 text-brand-400 hover:text-brand-300 ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
          title="Import Local Music"
        >
          <FolderDown size={18} />
          {!isCollapsed && <span>Import Music</span>}
        </button>

        <button
          onClick={() => onSelectView('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeView === 'settings'
              ? 'bg-white/10 text-white'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          } ${isCollapsed ? 'justify-center px-0' : ''}`}
          title="Settings"
        >
          <Settings size={18} className={activeView === 'settings' ? 'text-brand-400' : ''} />
          {!isCollapsed && <span>Settings</span>}
        </button>

        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs transition-colors text-neutral-500 hover:text-neutral-300 hover:bg-white/5 ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard size={15} />
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1">
                <span>Shortcuts</span>
                <kbd className="px-1 py-0.2 bg-neutral-800 rounded border border-white/10 text-[9px] font-mono">?</kbd>
              </div>
            )}
          </button>
        )}

        <button
          onClick={() => onSelectView('diagnostics')}
          className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs transition-colors ${
            activeView === 'diagnostics'
              ? 'bg-white/10 text-white'
              : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
          } ${isCollapsed ? 'justify-center px-0' : ''}`}
          title="App Diagnostics & Tests"
        >
          <CheckCircle2 size={15} />
          {!isCollapsed && <span>Diagnostics & Tests</span>}
        </button>
      </div>
    </aside>
  );
};
