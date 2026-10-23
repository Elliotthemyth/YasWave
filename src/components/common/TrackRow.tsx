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
  onAnalyzeTrack?: (trackId: string) => void;
  showAlbum?: boolean;
  showDateAdded?: boolean;
  showBpm?: boolean;
  showKey?: boolean;
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
  showBpm = true,
  showKey = true,
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

  const gridColumns = `40px minmax(180px, 3fr) ${showAlbum ? 'minmax(130px, 2fr)' : ''} ${
    showBpm ? '70px' : ''
  } ${showKey ? '95px' : ''} ${showDateAdded ? '110px' : ''} 85px 40px`;

  return (
    <>
      {/* Mobile Touch-First Row (< 768px) */}
      <div
        onClick={() => onPlay(track)}
        onContextMenu={(e) => {
          e.preventDefault();
          onOpenContextMenu(e, track);
        }}
        className={`md:hidden flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl transition-all select-none min-h-[58px] active:scale-[0.99] cursor-pointer ${
          isCurrent ? 'bg-white/10 text-white shadow-sm' : 'hover:bg-white/5 active:bg-white/10 text-neutral-200'
        }`}
      >
        {/* Left: Thumbnail with playing state overlay */}
        <div className="relative shrink-0">
          <CoverArt
            url={track.coverArtUrl}
            title={track.title}
            artist={track.artist}
            size="sm"
            rounded="xl"
            className="w-11 h-11 object-cover shadow-sm"
          />
          {isCurrent && (
            <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
              {isPlaying ? (
                <span className="flex items-end gap-[2px] h-3">
                  <span className="w-[2.5px] h-3 bg-brand-400 animate-pulse rounded-full" />
                  <span className="w-[2.5px] h-2 bg-brand-400 animate-pulse delay-75 rounded-full" />
                  <span className="w-[2.5px] h-3.5 bg-brand-400 animate-pulse delay-150 rounded-full" />
                </span>
              ) : (
                <Volume2 size={14} className="text-brand-400" />
              )}
            </div>
          )}
        </div>

        {/* Center: Track title & metadata */}
        <div className="min-w-0 flex-1">
          <p
            dir="auto"
            className={`font-semibold text-sm truncate leading-snug ${
              isCurrent ? 'text-brand-400' : 'text-neutral-100'
            }`}
          >
            {track.title}
          </p>
          <div dir="auto" className="flex items-center gap-1.5 text-xs text-neutral-400 truncate mt-0.5">
            <span className="truncate">{track.artist}</span>
            <span className="text-neutral-600">·</span>
            <span className="shrink-0 font-mono text-[11px] tabular-nums">{formatTime(track.duration)}</span>
            {track.bpm ? (
              <>
                <span className="text-neutral-600">·</span>
                <span className="shrink-0 text-[10px] text-emerald-400 font-mono">{track.bpm} BPM</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Right: Touch actions (Always visible on mobile!) */}
        <div className="flex items-center shrink-0 -mr-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(track.id);
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full text-neutral-400 active:scale-90 transition-transform"
            title={track.isFavorite ? 'Remove favorite' : 'Add favorite'}
          >
            <Heart
              size={18}
              className={track.isFavorite ? 'text-rose-500 fill-rose-500' : 'text-neutral-400'}
            />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenContextMenu(e, track);
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full text-neutral-400 active:scale-90 transition-transform"
            title="Options"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Desktop / Tablet Grid Row (>= 768px) */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={() => onPlay(track)}
        onClick={handleRowClick}
        onContextMenu={(e) => {
          e.preventDefault();
          onOpenContextMenu(e, track);
        }}
        className={`hidden md:grid group relative items-center px-4 py-2.5 rounded-xl transition-colors cursor-pointer select-none text-sm ${
          isCurrent ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-neutral-300'
        }`}
        style={{ gridTemplateColumns: gridColumns }}
      >
        {/* Index or Play / Equalizer icon */}
        <div className="flex items-center justify-start text-xs text-neutral-400 font-mono">
          {isHovered ? (
            <button
              onClick={handlePlayButtonClick}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:scale-110 active:scale-95 text-white transition-transform"
              title={isCurrent && isPlaying ? 'Pause' : 'Play'}
            >
              {isCurrent && isPlaying ? (
                <Pause size={14} className="fill-current" />
              ) : (
                <Play size={14} className="fill-current ml-0.5" />
              )}
            </button>
          ) : isCurrent ? (
            <div className="flex items-center gap-0.5 w-6 h-6 justify-center">
              {isPlaying ? (
                <span className="flex items-end gap-[2px] h-3">
                  <span className="w-[3px] h-3 bg-brand-400 animate-pulse rounded-full" />
                  <span className="w-[3px] h-2 bg-brand-400 animate-pulse delay-75 rounded-full" />
                  <span className="w-[3px] h-3.5 bg-brand-400 animate-pulse delay-150 rounded-full" />
                </span>
              ) : (
                <Volume2 size={15} className="text-brand-400" />
              )}
            </div>
          ) : (
            <span className="tabular-nums text-neutral-400 pl-1">{index + 1}</span>
          )}
        </div>

        {/* Title & Artist & Thumbnail */}
        <div className="flex items-center gap-3 min-w-0 pr-3">
          <CoverArt
            url={track.coverArtUrl}
            title={track.title}
            artist={track.artist}
            size="sm"
            rounded="lg"
          />
          <div className="min-w-0">
            <p
              dir="auto"
              className={`font-medium truncate leading-tight ${
                isCurrent ? 'text-brand-400 font-semibold' : 'text-neutral-100 group-hover:text-white'
              }`}
            >
              {track.title}
            </p>
            <p dir="auto" className="text-xs text-neutral-400 truncate mt-0.5 group-hover:text-neutral-300">
              {track.artist}
            </p>
          </div>
        </div>

        {/* Album */}
        {showAlbum && (
          <div className="min-w-0 pr-3">
            <p dir="auto" className="text-xs text-neutral-400 truncate group-hover:text-neutral-300">
              {track.album || 'Unknown Album'}
            </p>
          </div>
        )}

        {/* BPM */}
        {showBpm && (
          <div className="text-xs font-mono tabular-nums text-neutral-400 truncate">
            {track.bpm ? (
              <span className="text-neutral-300 group-hover:text-white transition-colors" title={`${track.bpm} BPM`}>
                {track.bpm}
              </span>
            ) : (
              <span className="text-neutral-600">—</span>
            )}
          </div>
        )}

        {/* Musical Key */}
        {showKey && (
          <div className="text-xs truncate flex items-center gap-1.5">
            {track.key ? (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-white/5 border border-white/10 text-emerald-400 group-hover:border-emerald-500/30 transition-colors"
                title={`${track.key}${track.keyCamelot ? ` (${track.keyCamelot})` : ''}`}
              >
                <span>{track.key.replace(' Major', '').replace(' Minor', 'm')}</span>
                {track.keyCamelot && (
                  <span className="text-[9px] font-mono text-neutral-400 bg-neutral-900/80 px-1 py-0.2 rounded">
                    {track.keyCamelot}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-neutral-600">—</span>
            )}
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
    </>
  );
};
