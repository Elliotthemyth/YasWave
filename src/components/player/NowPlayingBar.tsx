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

  return (
    <>
      {/* ============================================================== */}
      {/* 1. MOBILE FLOATING MINI-PLAYER BAR (Screens < 768px)          */}
      {/* ============================================================== */}
      <div className="md:hidden fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] left-2.5 right-2.5 z-30 select-none">
        {error && (
          <div className="mb-1 px-3 py-1 bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs rounded-lg flex items-center gap-1.5 shadow-lg">
            <AlertCircle size={13} className="text-rose-400 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        {currentTrack && (
          <div
            onClick={onExpandMobilePlayer}
            className="bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-xl shadow-2xl p-2 relative overflow-hidden flex items-center justify-between gap-3 active:scale-[0.99] transition-transform cursor-pointer"
          >
            {/* Top Micro Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-neutral-800">
              <div
                className="h-full transition-all duration-200"
                style={{ width: `${progressPercent}%`, backgroundColor: accentColor }}
              />
            </div>

            {/* Left Track Info */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <CoverArt
                url={currentTrack.coverArtUrl}
                title={currentTrack.title}
                artist={currentTrack.artist}
                size="sm"
                className="w-10 h-10 rounded-lg shrink-0 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">
                  {currentTrack.title}
                </p>
                <p className="text-[11px] text-neutral-400 truncate">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            {/* Right Mini Controls */}
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={onTogglePlay}
                className="w-9 h-9 rounded-full flex items-center justify-center text-black font-bold active:scale-95 transition-transform"
                style={{ backgroundColor: accentColor }}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <button
                onClick={onPlayNext}
                className="p-2 text-neutral-300 hover:text-white active:scale-90 transition-transform"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. DESKTOP FULL NOW PLAYING BAR (Screens >= 768px)            */}
      {/* ============================================================== */}
      <footer className="hidden md:flex h-20 w-full bg-neutral-950/95 border-t border-white/10 px-4 items-center justify-between shrink-0 select-none z-30 backdrop-blur-xl relative">
        {/* Error notification banner if playback failed */}
        {error && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs rounded-full flex items-center gap-2 shadow-xl animate-in fade-in-50 duration-200">
            <AlertCircle size={14} className="text-rose-400 shrink-0" />
            <span className="truncate max-w-md">{error}</span>
          </div>
        )}

        {/* Left zone: Current track information */}
        <div className="flex items-center gap-3 w-1/4 min-w-[200px] max-w-[320px]">
          {currentTrack ? (
            <>
              <div
                className="cursor-pointer group relative"
                onClick={onToggleVisualizer}
                title="Click to toggle visualizer"
              >
                <CoverArt
                  url={currentTrack.coverArtUrl}
                  title={currentTrack.title}
                  artist={currentTrack.artist}
                  size="md"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-md flex items-center justify-center transition-opacity">
                  <Activity size={16} className="text-white" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-100 truncate hover:underline cursor-pointer">
                  {currentTrack.title}
                </p>
                <p className="text-xs text-neutral-400 truncate hover:text-neutral-200 cursor-pointer">
                  {currentTrack.artist}
                </p>
              </div>

              <button
                onClick={() => onToggleFavorite(currentTrack.id)}
                className="p-1 rounded text-neutral-400 hover:text-white hover:scale-110 active:scale-95 transition-transform shrink-0"
                title={currentTrack.isFavorite ? 'Remove from favorites' : 'Save to favorites'}
              >
                <Heart
                  size={17}
                  className={
                    currentTrack.isFavorite
                      ? 'text-rose-500 fill-rose-500'
                      : 'text-neutral-400 hover:text-white'
                  }
                />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 text-neutral-500 text-xs italic">
              <div className="w-12 h-12 rounded-md bg-white/5 border border-white/5 flex items-center justify-center">
                ♪
              </div>
              <span>No track playing</span>
            </div>
          )}
        </div>

        {/* Center zone: Playback controls and seek bar */}
        <div className="flex flex-col items-center justify-center max-w-2xl w-2/4 px-4">
          <PlaybackControls
            isPlaying={isPlaying}
            isLoading={isLoading}
            isShuffle={isShuffle}
            repeatMode={repeatMode}
            onTogglePlay={onTogglePlay}
            onPlayNext={onPlayNext}
            onPlayPrevious={onPlayPrevious}
            onToggleShuffle={onToggleShuffle}
            onCycleRepeatMode={onCycleRepeatMode}
            accentColor={accentColor}
          />

          <div className="w-full mt-1">
            <ProgressBar
              currentTime={currentTime}
              duration={duration}
              onSeek={onSeek}
              accentColor={accentColor}
            />
          </div>
        </div>

        {/* Right zone: Utilities (Lyrics, Visualizer, Queue, Volume) */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
          {/* Lyrics Button */}
          <button
            onClick={onToggleLyrics}
            className={`p-1.5 rounded-full transition-colors ${
              isLyricsOpen ? 'text-brand-400 bg-white/10' : 'text-neutral-400 hover:text-white'
            }`}
            title="Toggle Lyrics (L)"
          >
            <Mic2 size={18} />
          </button>

          {/* Visualizer Button */}
          <button
            onClick={onToggleVisualizer}
            className={`p-1.5 rounded-full transition-colors ${
              isVisualizerOpen ? 'text-brand-400 bg-white/10' : 'text-neutral-400 hover:text-white'
            }`}
            title="Toggle Visualizer (V)"
          >
            <Activity size={18} />
          </button>

          {/* Queue Button */}
          <button
            onClick={onToggleQueue}
            className={`p-1.5 rounded-full transition-colors ${
              isQueueOpen ? 'text-brand-400 bg-white/10' : 'text-neutral-400 hover:text-white'
            }`}
            title="Play Queue"
          >
            <ListMusic size={18} />
          </button>

          {/* Volume Slider */}
          <VolumeControl
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={onVolumeChange}
            onToggleMute={onToggleMute}
            accentColor={accentColor}
          />
        </div>
      </footer>
    </>
  );
};
