import React from 'react';
import { Track } from '../../types/track';
import { RepeatMode } from '../../types/playback';
import { CoverArt } from '../common/CoverArt';
import { PlaybackControls } from './PlaybackControls';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';
import { Heart, ListMusic, Mic2, Activity, AlertCircle, Play, Pause, SkipForward } from 'lucide-react';

interface NowPlayingBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  error: string | null;
  onTogglePlay: () => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeatMode: () => void;
  onToggleFavorite: (trackId: string) => void;
  onToggleQueue: () => void;
  onToggleLyrics: () => void;
  onToggleVisualizer: () => void;
  onExpandMobilePlayer?: () => void;
  isQueueOpen: boolean;
  isLyricsOpen: boolean;
  isVisualizerOpen: boolean;
  accentColor?: string;
}

export const NowPlayingBar: React.FC<NowPlayingBarProps> = ({
  currentTrack,
  isPlaying,
  isLoading,
  currentTime,
  duration,
  volume,
  isMuted,
  repeatMode,
  isShuffle,
  error,
  onTogglePlay,
  onPlayNext,
  onPlayPrevious,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeatMode,
  onToggleFavorite,
  onToggleQueue,
  onToggleLyrics,
  onToggleVisualizer,
  onExpandMobilePlayer,
  isQueueOpen,
  isLyricsOpen,
  isVisualizerOpen,
  accentColor = '#19bebe',
}) => {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!currentTrack && !error) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-3 right-3 max-w-xl mx-auto md:bottom-4 md:right-6 md:left-auto md:max-w-md md:w-full z-30 select-none">
      {/* Playback Error Alert */}
      {error && (
        <div className="mb-2 px-3 py-1.5 bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs rounded-xl flex items-center gap-1.5 shadow-xl animate-in fade-in duration-200">
          <AlertCircle size={14} className="text-rose-400 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Floating Android Mini-Player Card */}
      {currentTrack && (
        <div
          onClick={onExpandMobilePlayer}
          className="bg-neutral-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 relative overflow-hidden flex items-center justify-between gap-3 active:scale-[0.99] transition-transform cursor-pointer"
        >
          {/* Top Micro Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
            <div
              className="h-full transition-all duration-200"
              style={{ width: `${progressPercent}%`, backgroundColor: accentColor }}
            />
          </div>

          {/* Left Track Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1 pl-1">
            <CoverArt
              url={currentTrack.coverArtUrl}
              title={currentTrack.title}
              artist={currentTrack.artist}
              size="sm"
              rounded="xl"
              className="w-11 h-11 rounded-xl shrink-0 object-cover shadow-sm"
            />
            <div className="min-w-0 flex-1">
              <p dir="auto" className="text-xs sm:text-sm font-semibold text-white truncate leading-snug">
                {currentTrack.title}
              </p>
              <p dir="auto" className="text-[11px] text-neutral-400 truncate mt-0.5">
                {currentTrack.artist}
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1 shrink-0 pr-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onTogglePlay}
              className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-950 font-bold active:scale-95 transition-transform cursor-pointer shadow-md"
              style={{ backgroundColor: accentColor }}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={onPlayNext}
              className="w-10 h-10 flex items-center justify-center text-neutral-300 hover:text-white active:scale-90 transition-transform cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
