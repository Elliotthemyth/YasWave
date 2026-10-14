import React, { useState } from 'react';
import { Track } from '../../types/track';
import { CoverArt } from './CoverArt';
import { formatTime, formatShortDate } from '../../utils/formatters';
import { Play, Pause, Heart, MoreHorizontal, Volume2 } from 'lucide-react';

interface TrackRowProps {
  track: Track;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: (track: Track) => void;
  onTogglePlay: () => void;
  onToggleFavorite: (trackId: string) => void;
  onOpenContextMenu: (e: React.MouseEvent, track: Track) => void;
  showAlbum?: boolean;
  showDateAdded?: boolean;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  isCurrent,
  isPlaying,
  onPlay,
  onTogglePlay,
  onToggleFavorite,
  onOpenContextMenu,
  showAlbum = true,
  showDateAdded = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleRowClick = () => {
    // Single click selects or plays if double clicked
  };

  const handlePlayButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      onTogglePlay();
    } else {
      onPlay(track);
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={() => onPlay(track)}
      onClick={handleRowClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenContextMenu(e, track);
      }}
      className={`group relative grid items-center px-4 py-2 rounded-md transition-colors cursor-pointer select-none text-sm ${
        isCurrent ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-neutral-300'
      }`}
      style={{
        gridTemplateColumns: `40px minmax(200px, 3fr) ${showAlbum ? 'minmax(140px, 2fr)' : ''} ${
          showDateAdded ? '120px' : ''
        } 90px 40px`,
      }}
    >
      {/* Index or Play / Equalizer icon */}
      <div className="flex items-center justify-start text-xs text-neutral-400 font-mono">
        {isHovered ? (
          <button
            onClick={handlePlayButtonClick}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:scale-110 active:scale-95 text-white transition-transform"
            title={isCurrent && isPlaying ? 'Pause' : 'Play'}
          >
            {isCurrent && isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current ml-0.5" />}
          </button>
        ) : isCurrent ? (
          <div className="flex items-center gap-0.5 w-6 h-6 justify-center">
            {isPlaying ? (
              <span className="flex items-end gap-[2px] h-3">
                <span className="w-[3px] h-3 bg-emerald-400 animate-pulse rounded-full" />
                <span className="w-[3px] h-2 bg-emerald-400 animate-pulse delay-75 rounded-full" />
                <span className="w-[3px] h-3.5 bg-emerald-400 animate-pulse delay-150 rounded-full" />
              </span>
            ) : (
              <Volume2 size={15} className="text-emerald-400" />
            )}
          </div>
        ) : (
          <span className="tabular-nums text-neutral-400 pl-1">{index + 1}</span>
        )}
      </div>

      {/* Title & Artist & Thumbnail */}
      <div className="flex items-center gap-3 min-w-0 pr-3">
        <CoverArt url={track.coverArtUrl} title={track.title} artist={track.artist} size="sm" rounded="md" />
        <div className="min-w-0">
          <p
            className={`font-medium truncate leading-tight ${
              isCurrent ? 'text-emerald-400 font-semibold' : 'text-neutral-100 group-hover:text-white'
            }`}
          >
            {track.title}
          </p>
          <p className="text-xs text-neutral-400 truncate mt-0.5 group-hover:text-neutral-300">
            {track.artist}
          </p>
        </div>
      </div>

      {/* Album */}
      {showAlbum && (
        <div className="min-w-0 pr-3">
          <p className="text-xs text-neutral-400 truncate group-hover:text-neutral-300">
            {track.album || 'Unknown Album'}
          </p>
        </div>
      )}

      {/* Date Added */}
      {showDateAdded && (
        <div className="text-xs text-neutral-400 tabular-nums truncate">
          {formatShortDate(track.dateAdded)}
        </div>
      )}

      {/* Duration & Favorite button */}
      <div className="flex items-center justify-end gap-3 text-xs text-neutral-400 font-mono tabular-nums pr-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(track.id);
          }}
          className={`p-1 rounded hover:scale-110 active:scale-90 transition-transform ${
            track.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          title={track.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          <Heart
            size={15}
            className={track.isFavorite ? 'text-rose-500 fill-rose-500' : 'text-neutral-400 hover:text-white'}
          />
        </button>
        <span>{formatTime(track.duration)}</span>
      </div>

      {/* More Options Button */}
      <div className="flex items-center justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenContextMenu(e, track);
          }}
          className="p-1 rounded-full text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          title="More options"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
};
