import React, { useState } from 'react';
import { Track } from '../../types/track';
import { RepeatMode } from '../../types/playback';
import { CoverArt } from '../common/CoverArt';
import { ProgressBar } from './ProgressBar';
import {
  ChevronDown,
  Heart,
  Shuffle,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Mic2,
  ListMusic,
  Activity,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface MobileFullPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  onTogglePlay: () => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeatMode: () => void;
  onToggleFavorite: (trackId: string) => void;
  onOpenLyrics: () => void;
  onOpenQueue: () => void;
  onOpenVisualizer: () => void;
  onOpenSyncStudio?: () => void;
  accentColor?: string;
}

export const MobileFullPlayerModal: React.FC<MobileFullPlayerModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  isLoading,
  currentTime,
  duration,
  volume,
  isMuted,
  repeatMode,
  isShuffle,
  onTogglePlay,
  onPlayNext,
  onPlayPrevious,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeatMode,
  onToggleFavorite,
  onOpenLyrics,
  onOpenQueue,
  onOpenVisualizer,
  onOpenSyncStudio,
  accentColor = '#19bebe',
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  if (!isOpen || !currentTrack) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50 bg-neutral-950 flex flex-col justify-between animate-in slide-in-from-bottom duration-300 select-none pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-[calc(0.5rem+env(safe-area-inset-top,0px))] px-6">
      {/* Top Header */}
      <div className="flex items-center justify-between py-2 shrink-0">
        <button
          onClick={onClose}
          className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 active:scale-95 transition-transform"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="text-center min-w-0 px-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-neutral-400">
            Playing From Library
          </span>
          <p className="text-xs text-neutral-300 font-medium truncate max-w-[200px]">
            {currentTrack.album || currentTrack.title}
          </p>
        </div>

        <button
          onClick={onOpenQueue}
          className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 active:scale-95 transition-transform"
        >
          <ListMusic className="w-5 h-5" />
        </button>
      </div>

      {/* Main Cover Art Card */}
      <div className="flex-1 flex flex-col items-center justify-center py-4 min-h-0">
        <div className="w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative group">
          <CoverArt
            url={currentTrack.coverArtUrl}
            title={currentTrack.title}
            artist={currentTrack.artist}
            size="xl"
            className="w-full h-full object-cover"
          />

          {/* Quick visualizer peek badge */}
          <button
            onClick={onOpenVisualizer}
            className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/60 backdrop-blur-md text-white border border-white/20 active:scale-90 transition-transform"
            title="Open Audio Visualizer"
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Track Meta & Favorite */}
      <div className="shrink-0 mb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-white truncate leading-tight">
              {currentTrack.title}
            </h1>
            <p className="text-sm font-medium text-neutral-400 truncate mt-0.5">
              {currentTrack.artist}
            </p>
            {currentTrack.bpm && (
              <p className="text-[11px] font-mono text-neutral-400 mt-1">
                {currentTrack.bpm} BPM · {currentTrack.keyCamelot || currentTrack.key}
              </p>
            )}
          </div>

          <button
            onClick={() => onToggleFavorite(currentTrack.id)}
            className="p-2.5 rounded-full hover:bg-white/10 active:scale-90 transition-transform shrink-0"
          >
            <Heart
              className={`w-6 h-6 transition-colors ${
                currentTrack.isFavorite ? 'text-rose-500 fill-rose-500' : 'text-neutral-400'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Progress & Scrub Bar */}
      <div className="shrink-0 mb-4">
        <ProgressBar
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
          accentColor={accentColor}
        />
      </div>

      {/* Primary Transport Controls */}
      <div className="shrink-0 flex items-center justify-between px-2 mb-6">
        <button
          onClick={onToggleShuffle}
          className={`p-3 rounded-full transition-colors active:scale-90 ${
            isShuffle ? 'text-white' : 'text-neutral-500'
          }`}
          style={isShuffle ? { color: accentColor } : undefined}
        >
          <Shuffle className="w-5 h-5" />
        </button>

        <button
          onClick={onPlayPrevious}
          className="p-3 text-white hover:text-neutral-300 active:scale-90 transition-transform"
        >
          <SkipBack className="w-7 h-7 fill-current" />
        </button>

        <button
          onClick={onTogglePlay}
          className="w-16 h-16 rounded-full flex items-center justify-center text-black font-bold shadow-xl active:scale-95 transition-transform"
          style={{ backgroundColor: accentColor }}
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 fill-current" />
          ) : (
            <Play className="w-8 h-8 fill-current ml-1" />
          )}
        </button>

        <button
          onClick={onPlayNext}
          className="p-3 text-white hover:text-neutral-300 active:scale-90 transition-transform"
        >
          <SkipForward className="w-7 h-7 fill-current" />
        </button>

        <button
          onClick={onCycleRepeatMode}
          className={`p-3 rounded-full transition-colors active:scale-90 ${
            repeatMode !== 'off' ? 'text-white' : 'text-neutral-500'
          }`}
          style={repeatMode !== 'off' ? { color: accentColor } : undefined}
        >
          {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
        </button>
      </div>

      {/* Bottom Utility Strip */}
      <div className="shrink-0 flex items-center justify-around pt-2 border-t border-neutral-900 text-neutral-400">
        <button
          onClick={onOpenLyrics}
          className="p-2 flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <Mic2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">Lyrics</span>
        </button>

        {onOpenSyncStudio && (
          <button
            onClick={onOpenSyncStudio}
            className="p-2 flex flex-col items-center gap-1 active:scale-95 transition-transform text-purple-400"
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">Studio</span>
          </button>
        )}

        <button
          onClick={onOpenVisualizer}
          className="p-2 flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px] font-medium">Visualizer</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowVolumeSlider((prev) => !prev)}
            className="p-2 flex flex-col items-center gap-1 active:scale-95 transition-transform"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            <span className="text-[10px] font-medium">Volume</span>
          </button>

          {showVolumeSlider && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 p-3 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col items-center gap-2 w-32">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <button
                onClick={onToggleMute}
                className="text-[11px] text-neutral-400 hover:text-white"
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
