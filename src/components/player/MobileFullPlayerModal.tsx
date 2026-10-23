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
    <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col justify-between animate-in slide-in-from-bottom duration-300 select-none pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(0.5rem+env(safe-area-inset-top,0px))] px-6 overflow-hidden">
      {/* Android Bottom Sheet Drag Handle */}
      <div className="w-full flex flex-col items-center pt-1 pb-2">
        <div className="w-12 h-1.5 bg-white/20 rounded-full" />
      </div>

      {/* Top App Header */}
      <div className="flex items-center justify-between py-1 shrink-0">
        <button
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center text-neutral-400 hover:text-white rounded-full active:scale-95 transition-transform cursor-pointer"
          title="Dismiss"
        >
          <ChevronDown className="w-7 h-7" />
        </button>

        <div className="text-center min-w-0 px-2 flex-1">
          <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">
            Playing From Library
          </span>
          <p dir="auto" className="text-xs text-neutral-300 font-semibold truncate max-w-[220px] mx-auto mt-0.5">
            {currentTrack.album || currentTrack.title}
          </p>
        </div>

        <button
          onClick={onOpenQueue}
          className="w-11 h-11 flex items-center justify-center text-neutral-400 hover:text-white rounded-full active:scale-95 transition-transform cursor-pointer"
          title="Queue"
        >
          <ListMusic className="w-6 h-6" />
        </button>
      </div>

      {/* Main Cover Art Card */}
      <div className="flex-1 flex flex-col items-center justify-center py-4 min-h-0">
        <div className="w-full max-w-[320px] aspect-square rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative group">
          <CoverArt
            url={currentTrack.coverArtUrl}
            title={currentTrack.title}
            artist={currentTrack.artist}
            size="xl"
            rounded="3xl"
            className="w-full h-full object-cover"
          />

          {/* Quick visualizer peek badge */}
          <button
            onClick={onOpenVisualizer}
            className="absolute bottom-3.5 right-3.5 p-2.5 rounded-2xl bg-black/60 backdrop-blur-md text-white border border-white/20 active:scale-90 transition-transform cursor-pointer"
            title="Open Audio Visualizer"
          >
            <Activity className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Track Meta & Favorite */}
      <div className="shrink-0 mb-3 max-w-md w-full mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1
              dir="auto"
              className="text-xl sm:text-2xl font-black text-white truncate leading-tight tracking-tight"
            >
              {currentTrack.title}
            </h1>
            <p
              dir="auto"
              className="text-sm font-semibold text-neutral-400 truncate mt-1"
            >
              {currentTrack.artist}
            </p>
            {currentTrack.bpm ? (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                  {currentTrack.bpm} BPM
                </span>
                {currentTrack.keyCamelot && (
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/20 px-2 py-0.5 rounded-lg">
                    {currentTrack.keyCamelot} · {currentTrack.key}
                  </span>
                )}
              </div>
            ) : null}
          </div>

          <button
            onClick={() => onToggleFavorite(currentTrack.id)}
            className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90 transition-transform shrink-0 cursor-pointer"
            title={currentTrack.isFavorite ? 'Remove Favorite' : 'Save Favorite'}
          >
            <Heart
              className={`w-7 h-7 transition-colors ${
                currentTrack.isFavorite ? 'text-rose-500 fill-rose-500' : 'text-neutral-400'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Progress & Scrub Bar */}
      <div className="shrink-0 mb-3 max-w-md w-full mx-auto">
        <ProgressBar
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
          accentColor={accentColor}
        />
      </div>

      {/* Primary Transport Controls */}
      <div className="shrink-0 flex items-center justify-between max-w-md w-full mx-auto mb-4 px-2">
        <button
          onClick={onToggleShuffle}
          className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors active:scale-90 cursor-pointer ${
            isShuffle ? 'text-white' : 'text-neutral-500'
          }`}
          style={isShuffle ? { color: accentColor } : undefined}
          title="Shuffle"
        >
          <Shuffle className="w-5 h-5" />
        </button>

        <button
          onClick={onPlayPrevious}
          className="w-12 h-12 flex items-center justify-center text-white hover:text-neutral-300 active:scale-90 transition-transform cursor-pointer"
          title="Previous Track"
        >
          <SkipBack className="w-7 h-7 fill-current" />
        </button>

        <button
          onClick={onTogglePlay}
          className="w-16 h-16 rounded-full flex items-center justify-center text-neutral-950 font-bold shadow-2xl active:scale-95 transition-transform cursor-pointer"
          style={{ backgroundColor: accentColor }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 fill-current" />
          ) : (
            <Play className="w-8 h-8 fill-current ml-1" />
          )}
        </button>

        <button
          onClick={onPlayNext}
          className="w-12 h-12 flex items-center justify-center text-white hover:text-neutral-300 active:scale-90 transition-transform cursor-pointer"
          title="Next Track"
        >
          <SkipForward className="w-7 h-7 fill-current" />
        </button>

        <button
          onClick={onCycleRepeatMode}
          className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors active:scale-90 cursor-pointer ${
            repeatMode !== 'off' ? 'text-white' : 'text-neutral-500'
          }`}
          style={repeatMode !== 'off' ? { color: accentColor } : undefined}
          title={`Repeat: ${repeatMode}`}
        >
          {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
        </button>
      </div>

      {/* Bottom Utility Strip (Lyrics, Studio, Visualizer, Volume) */}
      <div className="shrink-0 flex items-center justify-around max-w-md w-full mx-auto pt-2 border-t border-neutral-900 text-neutral-400">
        <button
          onClick={onOpenLyrics}
          className="py-2 px-3 flex flex-col items-center gap-1 active:scale-95 transition-transform cursor-pointer hover:text-white"
        >
          <Mic2 className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Lyrics</span>
        </button>

        {onOpenSyncStudio && (
          <button
            onClick={onOpenSyncStudio}
            className="py-2 px-3 flex flex-col items-center gap-1 active:scale-95 transition-transform text-purple-400 cursor-pointer"
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Studio</span>
          </button>
        )}

        <button
          onClick={onOpenVisualizer}
          className="py-2 px-3 flex flex-col items-center gap-1 active:scale-95 transition-transform cursor-pointer hover:text-white"
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Visualizer</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowVolumeSlider((prev) => !prev)}
            className="py-2 px-3 flex flex-col items-center gap-1 active:scale-95 transition-transform cursor-pointer hover:text-white"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            <span className="text-[10px] font-semibold">Volume</span>
          </button>

          {showVolumeSlider && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 p-3 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col items-center gap-2 w-36 z-50">
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
                className="text-[11px] text-neutral-400 hover:text-white font-medium"
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
