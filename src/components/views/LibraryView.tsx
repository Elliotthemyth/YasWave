import React, { useState, useMemo } from 'react';
import { Track } from '../../types/track';
import { TrackTable } from '../common/TrackTable';
import { formatTime } from '../../utils/formatters';
import { Play, Shuffle, Search, FolderDown, Library as LibraryIcon } from 'lucide-react';

interface LibraryViewProps {
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track, trackList: Track[]) => void;
  onTogglePlay: () => void;
  onToggleFavorite: (trackId: string) => void;
  onOpenContextMenu: (e: React.MouseEvent, track: Track) => void;
  onOpenImportModal: () => void;
  onShuffleAll: (tracks: Track[]) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onToggleFavorite,
  onOpenContextMenu,
  onOpenImportModal,
  onShuffleAll,
}) => {
  const [filterText, setFilterText] = useState('');

  const totalDuration = useMemo(() => {
    return tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  }, [tracks]);

  const filteredTracks = useMemo(() => {
    if (!filterText.trim()) return tracks;
    const lower = filterText.toLowerCase();
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        t.artist.toLowerCase().includes(lower) ||
        (t.album && t.album.toLowerCase().includes(lower)) ||
        (t.genre && t.genre.toLowerCase().includes(lower))
    );
  }, [tracks, filterText]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-900 flex items-center justify-center text-white shadow-xl border border-white/10">
            <LibraryIcon size={36} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Collection
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">Your Library</h1>
            <p className="text-xs text-neutral-400 mt-1">
              {tracks.length} songs · {formatTime(totalDuration)} total duration
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {tracks.length > 0 && (
            <>
              <button
                onClick={() => onPlayTrack(tracks[0], tracks)}
                className="w-11 h-11 rounded-full bg-emerald-500 text-neutral-950 flex items-center justify-center hover:scale-105 active:scale-95 shadow-lg transition-transform"
                title="Play All"
              >
                <Play size={20} className="fill-current ml-0.5" />
              </button>

              <button
                onClick={() => onShuffleAll(tracks)}
                className="p-3 rounded-full bg-white/10 hover:bg-white/15 text-white transition-colors"
                title="Shuffle All Songs"
              >
                <Shuffle size={18} />
              </button>
            </>
          )}

          <button
            onClick={onOpenImportModal}
            className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center gap-2 border border-white/10 shadow-sm transition-all"
          >
            <FolderDown size={14} className="text-emerald-400" />
            <span>Import Music</span>
          </button>
        </div>
      </div>

      {/* Filter search bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter library tracks..."
            className="w-full bg-neutral-900 border border-white/10 rounded-lg pl-8 pr-4 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-white/30"
          />
        </div>

        <span className="text-xs text-neutral-500 font-mono tabular-nums">
          Showing {filteredTracks.length} of {tracks.length}
        </span>
      </div>

      {/* Main Track Table */}
      <div className="bg-neutral-900/30 rounded-xl border border-white/5 overflow-hidden">
        <TrackTable
          tracks={filteredTracks}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          onPlayTrack={onPlayTrack}
          onTogglePlay={onTogglePlay}
          onToggleFavorite={onToggleFavorite}
          onOpenContextMenu={onOpenContextMenu}
          emptyMessage={
            filterText
              ? 'No songs matched your filter.'
              : 'Your library is empty. Import audio files to get started.'
          }
        />
      </div>
    </div>
  );
};
