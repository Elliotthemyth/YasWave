import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
} from 'lucide-react';
import { RepeatMode } from '../../types/playback';

interface PlaybackControlsProps {
  isPlaying: boolean;
  isLoading?: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  onTogglePlay: () => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
  onToggleShuffle: () => void;
  onCycleRepeatMode: () => void;
  accentColor?: string;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  isLoading = false,
  isShuffle,
  repeatMode,
  onTogglePlay,
  onPlayNext,
  onPlayPrevious,
  onToggleShuffle,
  onCycleRepeatMode,
  accentColor = '#10b981',
}) => {
  return (
    <div className="flex items-center gap-4 select-none">
      {/* Shuffle Button */}
      <button
        onClick={onToggleShuffle}
        className={`relative p-1.5 rounded-full transition-colors ${
          isShuffle ? 'text-brand-400' : 'text-neutral-400 hover:text-white'
        }`}
        title={`Shuffle: ${isShuffle ? 'On' : 'Off'}`}
        aria-label="Toggle shuffle"
      >
        <Shuffle size={17} />
        {isShuffle && (
          <span
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
        )}
      </button>

      {/* Previous Track */}
      <button
        onClick={onPlayPrevious}
        className="p-1.5 rounded-full text-neutral-300 hover:text-white hover:scale-105 active:scale-95 transition-transform"
        title="Previous Track"
        aria-label="Previous track"
      >
        <SkipBack size={20} className="fill-current" />
      </button>

      {/* Play/Pause Button */}
      <button
        onClick={onTogglePlay}
        disabled={isLoading}
        className="w-9 h-9 rounded-full bg-white text-neutral-950 flex items-center justify-center hover:scale-105 active:scale-95 shadow-md transition-transform disabled:opacity-50"
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause size={17} className="fill-current" />
        ) : (
          <Play size={17} className="fill-current ml-0.5" />
        )}
      </button>

      {/* Next Track */}
      <button
        onClick={onPlayNext}
        className="p-1.5 rounded-full text-neutral-300 hover:text-white hover:scale-105 active:scale-95 transition-transform"
        title="Next Track"
        aria-label="Next track"
      >
        <SkipForward size={20} className="fill-current" />
      </button>

      {/* Repeat Button */}
      <button
        onClick={onCycleRepeatMode}
        className={`relative p-1.5 rounded-full transition-colors ${
          repeatMode !== 'off' ? 'text-brand-400' : 'text-neutral-400 hover:text-white'
        }`}
        title={`Repeat: ${repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : 'Off'}`}
        aria-label="Cycle repeat mode"
      >
        {repeatMode === 'one' ? <Repeat1 size={17} /> : <Repeat size={17} />}
        {repeatMode !== 'off' && (
          <span
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
        )}
      </button>
    </div>
  );
};
