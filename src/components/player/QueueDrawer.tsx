import React from 'react';
import { Track } from '../../types/track';
import { CoverArt } from '../common/CoverArt';
import { formatTime } from '../../utils/formatters';
import { X, Trash2, ListMusic, Play, Volume2 } from 'lucide-react';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Track[];
  history: Track[];
  currentIndex: number;
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrackAtIndex: (index: number) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  queue,
  history,
  currentIndex,
  currentTrack,
  isPlaying,
  onPlayTrackAtIndex,
  onRemoveFromQueue,
  onClearQueue,
}) => {
  if (!isOpen) return null;

  const upNextTracks = queue.slice(currentIndex + 1);

  return (
    <div
      className="fixed inset-y-0 right-0 z-40 w-80 md:w-96 bg-neutral-900/95 border-l border-white/10 shadow-2xl flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-200 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <ListMusic size={18} className="text-emerald-400" />
          <h2 className="font-semibold text-neutral-100 text-sm">Play Queue</h2>
          <span className="text-xs text-neutral-500 tabular-nums">({queue.length})</span>
        </div>

        <div className="flex items-center gap-1">
          {queue.length > 1 && (
            <button
              onClick={onClearQueue}
              className="p-1.5 rounded text-neutral-400 hover:text-rose-400 hover:bg-white/5 transition-colors text-xs flex items-center gap-1"
              title="Clear upcoming queue"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close Queue"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Now Playing */}
        <div>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Now Playing
          </p>
          {currentTrack ? (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-white/5">
              <CoverArt
                url={currentTrack.coverArtUrl}
                title={currentTrack.title}
                artist={currentTrack.artist}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-emerald-400 truncate">
                  {currentTrack.title}
                </p>
                <p className="text-xs text-neutral-400 truncate mt-0.5">{currentTrack.artist}</p>
              </div>
              <div className="text-xs text-emerald-400 flex items-center gap-1">
                {isPlaying && <Volume2 size={14} className="animate-pulse" />}
                <span className="font-mono tabular-nums">{formatTime(currentTrack.duration)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-500 italic p-2">No track currently playing</p>
          )}
        </div>

        {/* Up Next */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Up Next ({upNextTracks.length})
            </p>
          </div>

          {upNextTracks.length === 0 ? (
            <p className="text-xs text-neutral-500 italic p-2 bg-neutral-950/40 rounded border border-white/5">
              Queue is empty. Add songs from your library or a playlist.
            </p>
          ) : (
            <div className="space-y-1">
              {upNextTracks.map((track, i) => {
                const actualIndex = currentIndex + 1 + i;
                return (
                  <div
                    key={`${track.id}-${actualIndex}`}
                    className="group flex items-center gap-2.5 p-2 rounded-md hover:bg-white/5 transition-colors"
                  >
                    <button
                      onClick={() => onPlayTrackAtIndex(actualIndex)}
                      className="w-7 h-7 shrink-0 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10"
                      title="Play this track"
                    >
                      <Play size={13} className="ml-0.5" />
                    </button>

                    <CoverArt
                      url={track.coverArtUrl}
                      title={track.title}
                      artist={track.artist}
                      size="xs"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-neutral-200 truncate group-hover:text-white">
                        {track.title}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
                    </div>

                    <span className="text-[11px] text-neutral-500 font-mono tabular-nums">
                      {formatTime(track.duration)}
                    </span>

                    <button
                      onClick={() => onRemoveFromQueue(actualIndex)}
                      className="p-1 rounded text-neutral-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove from queue"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Playback History */}
        {history.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Played Earlier ({history.length})
            </p>
            <div className="space-y-1 opacity-70 hover:opacity-100 transition-opacity">
              {history.slice(-5).reverse().map((track, idx) => (
                <div
                  key={`hist-${track.id}-${idx}`}
                  className="flex items-center gap-2.5 p-1.5 rounded text-xs text-neutral-400"
                >
                  <CoverArt
                    url={track.coverArtUrl}
                    title={track.title}
                    artist={track.artist}
                    size="xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-neutral-300 truncate">{track.title}</p>
                    <p className="text-[10px] text-neutral-500 truncate">{track.artist}</p>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums">{formatTime(track.duration)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
