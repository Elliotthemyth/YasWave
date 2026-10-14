import React from 'react';
import { Track } from '../../types/track';
import { TrackTable } from '../common/TrackTable';
import { formatTime } from '../../utils/formatters';
import { Play, Shuffle, Heart } from 'lucide-react';

interface FavoritesViewProps {
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track, trackList: Track[]) => void;
  onTogglePlay: () => void;
  onToggleFavorite: (trackId: string) => void;
  onOpenContextMenu: (e: React.MouseEvent, track: Track) => void;
  onShuffleAll: (tracks: Track[]) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onToggleFavorite,
  onOpenContextMenu,
  onShuffleAll,
}) => {
  const favoriteTracks = tracks.filter((t) => t.isFavorite);
  const totalDuration = favoriteTracks.reduce((acc, t) => acc + (t.duration || 0), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-600 to-pink-900 flex items-center justify-center text-white shadow-xl border border-white/10">
            <Heart size={36} className="fill-white" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Auto Playlist
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">Liked Songs</h1>
            <p className="text-xs text-neutral-400 mt-1">
              {favoriteTracks.length} favorite songs · {formatTime(totalDuration)}
            </p>
          </div>
        </div>

        {favoriteTracks.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => onPlayTrack(favoriteTracks[0], favoriteTracks)}
              className="w-12 h-12 rounded-full bg-brand-500 text-neutral-950 flex items-center justify-center hover:scale-105 active:scale-95 shadow-xl transition-transform"
              title="Play All Favorites"
            >
              <Play size={22} className="fill-current ml-0.5" />
            </button>
            <button
              onClick={() => onShuffleAll(favoriteTracks)}
              className="p-3 rounded-full bg-white/10 hover:bg-white/15 text-white transition-colors"
              title="Shuffle Favorites"
            >
              <Shuffle size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Track Table */}
      <div className="bg-neutral-900/30 rounded-xl border border-white/5 overflow-hidden">
        <TrackTable
          tracks={favoriteTracks}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          onPlayTrack={onPlayTrack}
          onTogglePlay={onTogglePlay}
          onToggleFavorite={onToggleFavorite}
          onOpenContextMenu={onOpenContextMenu}
          emptyMessage="You haven't liked any songs yet. Click the heart icon on any track to save it here."
        />
      </div>
    </div>
  );
};
