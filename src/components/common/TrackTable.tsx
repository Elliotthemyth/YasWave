import React, { useState, useMemo } from 'react';
import { Track } from '../../types/track';
import { TrackRow } from './TrackRow';
import { Clock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface TrackTableProps {
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track, trackList: Track[]) => void;
  onTogglePlay: () => void;
  onToggleFavorite: (trackId: string) => void;
  onOpenContextMenu: (e: React.MouseEvent, track: Track) => void;
  showAlbum?: boolean;
  showDateAdded?: boolean;
  emptyMessage?: string;
}

type SortField = 'custom' | 'title' | 'artist' | 'album' | 'dateAdded' | 'duration';
type SortDirection = 'asc' | 'desc';

export const TrackTable: React.FC<TrackTableProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onToggleFavorite,
  onOpenContextMenu,
  showAlbum = true,
  showDateAdded = true,
  emptyMessage = 'No tracks found.',
}) => {
  const [sortField, setSortField] = useState<SortField>('custom');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortField('custom');
        setSortDir('asc');
      }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedTracks = useMemo(() => {
    if (sortField === 'custom') return tracks;

    return [...tracks].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortField === 'artist') {
        comparison = a.artist.localeCompare(b.artist);
      } else if (sortField === 'album') {
        comparison = (a.album || '').localeCompare(b.album || '');
      } else if (sortField === 'duration') {
        comparison = a.duration - b.duration;
      } else if (sortField === 'dateAdded') {
        comparison = a.dateAdded - b.dateAdded;
      }

      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [tracks, sortField, sortDir]);

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} className="opacity-0 group-hover/col:opacity-60 transition-opacity ml-1" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp size={12} className="text-emerald-400 ml-1" />
    ) : (
      <ArrowDown size={12} className="text-emerald-400 ml-1" />
    );
  };

  return (
    <div className="w-full">
      {/* Table Header */}
      <div
        className="grid items-center px-4 py-2 border-b border-white/10 text-xs font-medium text-neutral-400 select-none uppercase tracking-wider mb-1"
        style={{
          gridTemplateColumns: `40px minmax(200px, 3fr) ${showAlbum ? 'minmax(140px, 2fr)' : ''} ${
            showDateAdded ? '120px' : ''
          } 90px 40px`,
        }}
      >
        <div className="pl-1">#</div>

        <button
          onClick={() => handleSort('title')}
          className="group/col flex items-center text-left hover:text-white transition-colors cursor-pointer"
        >
          <span>Title</span>
          {renderSortIndicator('title')}
        </button>

        {showAlbum && (
          <button
            onClick={() => handleSort('album')}
            className="group/col flex items-center text-left hover:text-white transition-colors cursor-pointer"
          >
            <span>Album</span>
            {renderSortIndicator('album')}
          </button>
        )}

        {showDateAdded && (
          <button
            onClick={() => handleSort('dateAdded')}
            className="group/col flex items-center text-left hover:text-white transition-colors cursor-pointer"
          >
            <span>Date Added</span>
            {renderSortIndicator('dateAdded')}
          </button>
        )}

        <button
          onClick={() => handleSort('duration')}
          className="group/col flex items-center justify-end hover:text-white transition-colors cursor-pointer pr-3"
        >
          <Clock size={14} />
          {renderSortIndicator('duration')}
        </button>

        <div />
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-0.5">
        {sortedTracks.map((track, idx) => (
          <TrackRow
            key={track.id}
            track={track}
            index={idx}
            isCurrent={track.id === currentTrackId}
            isPlaying={isPlaying}
            onPlay={(t) => onPlayTrack(t, sortedTracks)}
            onTogglePlay={onTogglePlay}
            onToggleFavorite={onToggleFavorite}
            onOpenContextMenu={onOpenContextMenu}
            showAlbum={showAlbum}
            showDateAdded={showDateAdded}
          />
        ))}
      </div>
    </div>
  );
};
