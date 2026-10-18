import React, { useEffect, useRef } from 'react';
import { Track } from '../../types/track';
import { Playlist } from '../../types/playlist';
import {
  ListPlus,
  Play,
  Heart,
  Edit2,
  Trash2,
  FolderPlus,
  Copy,
  Music,
  Activity,
} from 'lucide-react';

export interface ContextMenuProps {
  x: number;
  y: number;
  track: Track;
  playlists: Playlist[];
  currentPlaylistId?: string;
  onClose: () => void;
  onPlayNow: (track: Track) => void;
  onPlayNext: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onRemoveFromPlaylist?: (playlistId: string, trackId: string) => void;
  onToggleFavorite: (trackId: string) => void;
  onEditMetadata: (track: Track) => void;
  onAnalyzeAudio?: (trackId: string) => void;
  onDeleteTrack: (trackId: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  track,
  playlists,
  currentPlaylistId,
  onClose,
  onPlayNow,
  onPlayNext,
  onAddToQueue,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onToggleFavorite,
  onEditMetadata,
  onAnalyzeAudio,
  onDeleteTrack,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = React.useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Adjust position so it doesn't clip viewport
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 340);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-56 rounded-lg bg-neutral-900 border border-white/10 shadow-2xl p-1 text-sm text-neutral-200 backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-100 select-none"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2.5 py-1.5 border-b border-white/5 mb-1">
        <p className="font-semibold text-neutral-100 truncate">{track.title}</p>
        <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
      </div>

      <button
        onClick={() => {
          onPlayNow(track);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-white/10 hover:text-white transition-colors text-left"
      >
        <Play size={14} className="text-brand-400" />
        <span>Play Now</span>
      </button>

      <button
        onClick={() => {
          onPlayNext(track);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-white/10 hover:text-white transition-colors text-left"
      >
        <Music size={14} />
        <span>Play Next</span>
      </button>

      <button
        onClick={() => {
          onAddToQueue(track);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-white/10 hover:text-white transition-colors text-left"
      >
        <ListPlus size={14} />
        <span>Add to Queue</span>
      </button>

      {/* Add to playlist submenu trigger */}
      <div
        className="relative"
        onMouseEnter={() => setShowPlaylistSubmenu(true)}
        onMouseLeave={() => setShowPlaylistSubmenu(false)}
      >
        <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-white/10 hover:text-white transition-colors text-left">
          <div className="flex items-center gap-2.5">
            <FolderPlus size={14} />
            <span>Add to Playlist</span>
          </div>
          <span className="text-xs text-neutral-500">▶</span>
        </button>

        {showPlaylistSubmenu && (
          <div className="absolute left-full top-0 ml-1 w-48 rounded-lg bg-neutral-900 border border-white/10 shadow-2xl p-1 max-h-56 overflow-y-auto">
            {playlists.length === 0 ? (
              <div className="px-3 py-2 text-xs text-neutral-500 italic">No playlists created</div>
            ) : (
              playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => {
                    onAddToPlaylist(pl.id, track.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-white/10 hover:text-white text-xs text-left truncate"
                >
                  <span className="truncate">{pl.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {currentPlaylistId && onRemoveFromPlaylist && (
        <button
          onClick={() => {
            onRemoveFromPlaylist(currentPlaylistId, track.id);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-white/10 text-amber-400 hover:text-amber-300 transition-colors text-left"
        >
          <Trash2 size={14} />
          <span>Remove from Playlist</span>
        </button>
      )}

      <div className="h-px bg-white/5 my-1" />

      <button
        onClick={() => {
          onToggleFavorite(track.id);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-white/10 hover:text-white transition-colors text-left"
      >
        <Heart
          size={14}
          className={track.isFavorite ? 'text-rose-500 fill-rose-500' : 'text-neutral-400'}
        />
        <span>{track.isFavorite ? 'Remove from Favorites' : 'Save to Favorites'}</span>
      </button>

      {onAnalyzeAudio && (
        <button
          onClick={() => {
            onAnalyzeAudio(track.id);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-white/10 hover:text-emerald-400 transition-colors text-left"
          title="Detect BPM and Musical Key from audio stream"
        >
          <Activity size={14} className="text-emerald-400" />
          <span>Calculate BPM & Key</span>
        </button>
      )}

      <button
        onClick={() => {
          onEditMetadata(track);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-white/10 hover:text-white transition-colors text-left"
      >
        <Edit2 size={14} />
        <span>Edit Track Info</span>
      </button>

      <button
        onClick={() => {
          navigator.clipboard.writeText(`${track.artist} - ${track.title}`);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-white/10 hover:text-white transition-colors text-left"
      >
        <Copy size={14} />
        <span>Copy Track Info</span>
      </button>

      <div className="h-px bg-white/5 my-1" />

      <button
        onClick={() => {
          onDeleteTrack(track.id);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors text-left"
      >
        <Trash2 size={14} />
        <span>Delete from Library</span>
      </button>
    </div>
  );
};
