import React, { useEffect, useRef, useState } from 'react';
import { VisualizerEngine } from '../../services/audio/visualizerEngine';
import { VisualizerMode } from '../../types/playback';
import { Track } from '../../types/track';
import { audioEngine } from '../../services/audio/audioEngine';
import { X, BarChart3, Waves, Disc } from 'lucide-react';

interface VisualizerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  accentColor?: string;
}

export const VisualizerOverlay: React.FC<VisualizerOverlayProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  accentColor = '#10b981',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<VisualizerEngine | null>(null);
  const [mode, setMode] = useState<VisualizerMode>('bars');
  const [isAudioContextSuspended, setIsAudioContextSuspended] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      if (visualizerRef.current) {
        visualizerRef.current.stop();
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const engine = new VisualizerEngine();
    visualizerRef.current = engine;

    const analyser = audioEngine.getAnalyserNode();
    const ctx = audioEngine.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      setIsAudioContextSuspended(true);
    } else {
      setIsAudioContextSuspended(false);
    }

    engine.start({
      canvas,
      analyser,
      mode,
      accentColor,
      isPlaying,
    });

    const handleResize = () => {
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.stop();
    };
  }, [isOpen]);

  // Update options dynamically when mode, isPlaying or accentColor change
  useEffect(() => {
    if (visualizerRef.current) {
      visualizerRef.current.updateOptions({
        mode,
        accentColor,
        isPlaying,
        analyser: audioEngine.getAnalyserNode(),
      });
    }
  }, [mode, accentColor, isPlaying]);

  if (!isOpen) return null;

  const handleResumeAudio = async () => {
    await audioEngine.ensureAudioGraph();
    setIsAudioContextSuspended(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-950/95 flex flex-col backdrop-blur-2xl animate-in fade-in duration-200 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header */}
      <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-bold text-neutral-100 text-lg">Real-Time Audio Visualizer</h2>
          {currentTrack ? (
            <p className="text-xs text-neutral-400 mt-0.5">
              Analyzing &ldquo;{currentTrack.title}&rdquo; by {currentTrack.artist}
            </p>
          ) : (
            <p className="text-xs text-neutral-500 mt-0.5">Start playback to see live audio analysis</p>
          )}
        </div>

        {/* Mode Selector Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-lg border border-white/5">
          <button
            onClick={() => setMode('bars')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'bars' ? 'bg-white/15 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <BarChart3 size={14} />
            <span>Frequency Bars</span>
          </button>

          <button
            onClick={() => setMode('wave')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'wave' ? 'bg-white/15 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Waves size={14} />
            <span>Waveform</span>
          </button>

          <button
            onClick={() => setMode('circle')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'circle' ? 'bg-white/15 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Disc size={14} />
            <span>Radial Spectrum</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Close Visualizer (V)"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative p-6 flex flex-col items-center justify-center">
        {isAudioContextSuspended && (
          <div className="absolute top-8 z-10 px-4 py-2 bg-neutral-900 border border-emerald-500/40 rounded-full flex items-center gap-3 shadow-2xl">
            <span className="text-xs text-neutral-300">
              Web Audio analysis suspended until gesture.
            </span>
            <button
              onClick={handleResumeAudio}
              className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-500 text-neutral-950 hover:bg-emerald-400 transition-colors"
            >
              Enable AudioContext
            </button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="w-full h-full max-h-[75vh] rounded-2xl bg-neutral-900/40 border border-white/5 shadow-2xl"
        />
      </div>
    </div>
  );
};
