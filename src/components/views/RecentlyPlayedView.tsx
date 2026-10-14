import React from 'react';
import { Track } from '../../types/track';
import { TrackTable } from '../common/TrackTable';
import { History, Play } from 'lucide-react';

interface RecentlyPlayedViewProps {
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track, trackList: Track[]) => void;
  onTogglePlay: () => void;
  onToggleFavorite: (trackId: string) => void;
  onOpenContextMenu: (e: React.MouseEvent, track: Track) => void;
}

export const RecentlyPlayedView: React.FC<RecentlyPlayedViewProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onToggleFavorite,
  onOpenContextMenu,
}) => {
  const recentlyPlayed = [...tracks]
    .filter((t) => t.lastPlayedAt && t.lastPlayedAt > 0)
    .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-700 to-slate-900 flex items-center justify-center text-white shadow-xl border border-white/10">
            <History size={36} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              History
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">
              Recently Played
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              {recentlyPlayed.length} tracks played in your listening history
            </p>
          </div>
        </div>

        {recentlyPlayed.length > 0 && (
          <button
            onClick={() => onPlayTrack(recentlyPlayed[0], recentlyPlayed)}
            className="w-12 h-12 rounded-full bg-brand-500 text-neutral-950 flex items-center justify-center hover:scale-105 active:scale-95 shadow-xl transition-transform"
            title="Play Recently Played"
          >
            <Play size={22} className="fill-current ml-0.5" />
          </button>
        )}
      </div>

      {/* Track Table */}
      <div className="bg-neutral-900/30 rounded-xl border border-white/5 overflow-hidden">
        <TrackTable
          tracks={recentlyPlayed}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          onPlayTrack={onPlayTrack}
          onTogglePlay={onTogglePlay}
          onToggleFavorite={onToggleFavorite}
          onOpenContextMenu={onOpenContextMenu}
          emptyMessage="No recently played tracks found. Start listening to music to build your history."
        />
      </div>
    </div>
  );
};
