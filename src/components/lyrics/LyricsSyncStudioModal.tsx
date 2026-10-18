import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Track } from '../../types/track';
import { LyricLine, WordTiming } from '../../types/lyrics';
import {
  parseLyrics,
  formatLrcDocument,
  formatLrcTimestamp,
  splitLineIntoTokens,
  getActiveLyricIndex,
} from '../../services/lyrics/lrcParser';
import {
  Play,
  Pause,
  RotateCcw,
  Undo2,
  Redo2,
  Save,
  X,
  ChevronRight,
  ChevronLeft,
  FastForward,
  Rewind,
  Sparkles,
  Sliders,
  Type,
  Mic2,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface LyricsSyncStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onSaveLyrics: (trackId: string, lrcContent: string) => void;
  initialLyricsText?: string;
  accentColor?: string;
}

export const LyricsSyncStudioModal: React.FC<LyricsSyncStudioModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  currentTime,
  duration,
  isPlaying,
  onTogglePlay,
  onSeek,
  onSaveLyrics,
  initialLyricsText,
  accentColor = '#19bebe',
}) => {
  const [mode, setMode] = useState<'line' | 'word'>('line');
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number>(0);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number>(0);

  // Undo / Redo history
  const [history, setHistory] = useState<LyricLine[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Auto-advance toggle
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);

  // Canvas waveform reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lineListRef = useRef<HTMLDivElement | null>(null);

  // Initialize lines when opened
  useEffect(() => {
    if (isOpen && currentTrack) {
      const textToParse = initialLyricsText ?? currentTrack.lyrics ?? '';
      const doc = parseLyrics(textToParse, currentTrack.lyricsOffset || 0, currentTrack.persianTranslations);

      let initialLines = doc.lines;
      // If no lines found, provide template
      if (initialLines.length === 0) {
        initialLines = [
          { id: '1', time: -1, text: `${currentTrack.title} - ${currentTrack.artist}` },
          { id: '2', time: -1, text: 'First verse starts here' },
          { id: '3', time: -1, text: 'Second verse line' },
        ];
      }

      setLines(initialLines);
      setHistory([initialLines]);
      setHistoryIndex(0);
      setSelectedLineIndex(0);
      setSelectedWordIndex(0);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, currentTrack, initialLyricsText]);

  // Push new state to undo/redo history
  const recordHistory = useCallback(
    (newLines: LyricLine[]) => {
      const upToCurrent = history.slice(0, historyIndex + 1);
      const nextHistory = [...upToCurrent, newLines];
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
      setLines(newLines);
      setHasUnsavedChanges(true);
    },
    [history, historyIndex]
  );

  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      setHistoryIndex(targetIndex);
      setLines(history[targetIndex]);
      setHasUnsavedChanges(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      setHistoryIndex(targetIndex);
      setLines(history[targetIndex]);
      setHasUnsavedChanges(true);
    }
  };

  // Stamp current playback time to selected line
  const handleStampCurrentLine = () => {
    if (selectedLineIndex < 0 || selectedLineIndex >= lines.length) return;

    const roundedTime = Math.round(currentTime * 100) / 100;
    const updated = lines.map((line, idx) => {
      if (idx === selectedLineIndex) {
        return {
          ...line,
          time: roundedTime,
        };
      }
      return line;
    });

    recordHistory(updated);

    // Auto advance to next line if enabled
    if (autoAdvance && selectedLineIndex < lines.length - 1) {
      setSelectedLineIndex((prev) => prev + 1);
      setSelectedWordIndex(0);
    }
  };

  // Nudge selected line timestamp
  const handleNudgeLine = (deltaSeconds: number) => {
    if (selectedLineIndex < 0 || selectedLineIndex >= lines.length) return;

    const updated = lines.map((line, idx) => {
      if (idx === selectedLineIndex) {
        const base = line.time >= 0 ? line.time : currentTime;
        const newTime = Math.max(0, Math.round((base + deltaSeconds) * 100) / 100);
        return { ...line, time: newTime };
      }
      return line;
    });

    recordHistory(updated);
  };

  // Initialize word tokens on current line if not already tokenized
  const getLineWords = (line: LyricLine): WordTiming[] => {
    if (line.words && line.words.length > 0) return line.words;
    const tokens = splitLineIntoTokens(line.text);
    return tokens.map((w) => ({
      word: w,
      time: -1,
      duration: 0.5,
    }));
  };

  // Stamp current playback time to selected word
  const handleStampCurrentWord = () => {
    if (selectedLineIndex < 0 || selectedLineIndex >= lines.length) return;
    const currentLine = lines[selectedLineIndex];
    const words = getLineWords(currentLine);
    if (selectedWordIndex < 0 || selectedWordIndex >= words.length) return;

    const roundedTime = Math.round(currentTime * 100) / 100;
    const updatedWords = words.map((w, idx) => {
      if (idx === selectedWordIndex) {
        return { ...w, time: roundedTime };
      }
      return w;
    });

    // Update word durations based on consecutive timestamps
    for (let i = 0; i < updatedWords.length; i++) {
      if (i + 1 < updatedWords.length && updatedWords[i].time >= 0 && updatedWords[i + 1].time >= 0) {
        updatedWords[i].duration = Math.max(0.1, updatedWords[i + 1].time - updatedWords[i].time);
      }
    }

    const updatedLines = lines.map((line, idx) => {
      if (idx === selectedLineIndex) {
        const minTime = updatedWords[0]?.time >= 0 ? updatedWords[0].time : line.time;
        return {
          ...line,
          time: line.time >= 0 ? line.time : minTime,
          words: updatedWords,
        };
      }
      return line;
    });

    recordHistory(updatedLines);

    // Auto advance to next word
    if (selectedWordIndex < words.length - 1) {
      setSelectedWordIndex((prev) => prev + 1);
    } else if (autoAdvance && selectedLineIndex < lines.length - 1) {
      setSelectedLineIndex((prev) => prev + 1);
      setSelectedWordIndex(0);
    }
  };

  // Nudge selected word timestamp
  const handleNudgeWord = (deltaSeconds: number) => {
    if (selectedLineIndex < 0 || selectedLineIndex >= lines.length) return;
    const currentLine = lines[selectedLineIndex];
    const words = getLineWords(currentLine);
    if (selectedWordIndex < 0 || selectedWordIndex >= words.length) return;

    const updatedWords = words.map((w, idx) => {
      if (idx === selectedWordIndex) {
        const base = w.time >= 0 ? w.time : currentTime;
        const newTime = Math.max(0, Math.round((base + deltaSeconds) * 100) / 100);
        return { ...w, time: newTime };
      }
      return w;
    });

    const updatedLines = lines.map((line, idx) => {
      if (idx === selectedLineIndex) {
        return { ...line, words: updatedWords };
      }
      return line;
    });

    recordHistory(updatedLines);
  };

  // Clear timestamps on current line
  const handleClearLineTime = () => {
    if (selectedLineIndex < 0 || selectedLineIndex >= lines.length) return;
    const updated = lines.map((line, idx) => {
      if (idx === selectedLineIndex) {
        return { ...line, time: -1, words: undefined };
      }
      return line;
    });
    recordHistory(updated);
  };

  // Save result to track
  const handleSave = () => {
    if (!currentTrack) return;
    const formattedLrc = formatLrcDocument(
      lines,
      { title: currentTrack.title, artist: currentTrack.artist },
      { includeWordTags: mode === 'word' }
    );
    onSaveLyrics(currentTrack.id, formattedLrc);
    setHasUnsavedChanges(false);
    onClose();
  };

  // Render visual timeline canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#171717';
    ctx.fillRect(0, 0, width, height);

    // Grid markers
    ctx.strokeStyle = '#262626';
    ctx.lineWidth = 1;
    const stepSeconds = duration > 120 ? 15 : 5;
    for (let t = 0; t <= duration; t += stepSeconds) {
      const x = (t / duration) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Line timestamp markers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.time >= 0) {
        const x = (line.time / duration) * width;
        ctx.fillStyle = i === selectedLineIndex ? accentColor : '#525252';
        ctx.fillRect(x - 1.5, 0, 3, height);
      }
    }

    // Current playhead
    const playheadX = (currentTime / duration) * width;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(playheadX - 1.5, 0, 3, height);
  }, [currentTime, duration, lines, selectedLineIndex, accentColor]);

  // Handle timeline seek on canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    onSeek(ratio * duration);
  };

  // Keyboard shortcut listener for space (stamp) and arrows (nudge)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'KeyT') {
        e.preventDefault();
        if (mode === 'line') handleStampCurrentLine();
        else handleStampCurrentWord();
      } else if (e.code === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (mode === 'line') handleNudgeLine(0.1);
        else handleNudgeWord(0.1);
      } else if (e.code === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (mode === 'line') handleNudgeLine(-0.1);
        else handleNudgeWord(-0.1);
      } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode, currentTime, selectedLineIndex, selectedWordIndex, lines]);

  if (!isOpen || !currentTrack) return null;

  const currentLine = lines[selectedLineIndex];
  const activeLyricIndex = getActiveLyricIndex(lines, currentTime);
  const currentWords = currentLine ? getLineWords(currentLine) : [];
  const timedLinesCount = lines.filter((l) => l.time >= 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-5xl h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Studio Bar */}
        <div className="p-3 sm:p-4 border-b border-neutral-800 flex items-center justify-between gap-3 bg-neutral-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
            >
              <Mic2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-white truncate">Lyrics Sync Studio</h2>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  {mode === 'line' ? 'Line Mode' : 'Word Mode'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 truncate">
                {currentTrack.title} · {currentTrack.artist} ({timedLinesCount}/{lines.length} lines timed)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mode Switch */}
            <div className="flex bg-neutral-800 p-0.5 rounded-lg">
              <button
                onClick={() => setMode('line')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  mode === 'line' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Line Timing
              </button>
              <button
                onClick={() => setMode('word')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  mode === 'word' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Word Timing
              </button>
            </div>

            {/* Undo / Redo */}
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Undo (Ctrl+Z)"
              className="p-1.5 text-neutral-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-neutral-800"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo (Ctrl+Shift+Z)"
              className="p-1.5 text-neutral-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-neutral-800"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Timeline Canvas Strip */}
        <div className="bg-neutral-950 p-2 sm:p-3 border-b border-neutral-800/80">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1 px-1 font-mono">
            <span>{formatLrcTimestamp(currentTime).slice(1, -1)}</span>
            <span>Click timeline to scrub playhead</span>
            <span>{formatLrcTimestamp(duration).slice(1, -1)}</span>
          </div>
          <canvas
            ref={canvasRef}
            width={800}
            height={36}
            onClick={handleCanvasClick}
            className="w-full h-9 rounded-lg cursor-pointer bg-neutral-900 border border-neutral-800 shadow-inner"
          />
        </div>

        {/* Main Work Area: Split View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Lyrics Lines List */}
          <div
            ref={lineListRef}
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5 border-b md:border-b-0 md:border-r border-neutral-800/80"
          >
            {lines.map((line, idx) => {
              const isSelected = idx === selectedLineIndex;
              const isCurrentPlaying = idx === activeLyricIndex;
              return (
                <div
                  key={line.id || idx}
                  onClick={() => {
                    setSelectedLineIndex(idx);
                    setSelectedWordIndex(0);
                    if (line.time >= 0) {
                      onSeek(line.time);
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-neutral-800 border-neutral-600 shadow-md ring-1 ring-neutral-500'
                      : isCurrentPlaying
                      ? 'bg-neutral-800/40 border-neutral-700'
                      : 'bg-neutral-950/40 border-neutral-800/60 hover:bg-neutral-800/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`text-[11px] font-mono shrink-0 px-2 py-0.5 rounded ${
                        line.time >= 0
                          ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {line.time >= 0 ? formatLrcTimestamp(line.time).slice(1, -1) : '--:--.--'}
                    </span>

                    <div className="min-w-0">
                      <div
                        className={`text-sm truncate ${
                          isSelected ? 'text-white font-semibold' : 'text-neutral-300'
                        }`}
                      >
                        {line.text}
                      </div>
                      {line.translation && (
                        <div dir="rtl" className="text-xs text-neutral-400 font-sans truncate">
                          {line.translation}
                        </div>
                      )}
                    </div>
                  </div>

                  {line.words && line.words.length > 0 && (
                    <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full shrink-0">
                      {line.words.filter((w) => w.time >= 0).length}/{line.words.length} words
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: Active Inspector & Precision Controls */}
          <div className="w-full md:w-88 lg:w-96 p-4 sm:p-5 flex flex-col justify-between bg-neutral-950/40 space-y-4 shrink-0 overflow-y-auto">
            {currentLine ? (
              <div className="space-y-4">
                {/* Active Line Display */}
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">
                    Current Line #{selectedLineIndex + 1}
                  </div>
                  <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
                    <p className="text-sm font-semibold text-white leading-relaxed">{currentLine.text}</p>
                    {currentLine.translation && (
                      <p dir="rtl" className="text-xs text-neutral-400 font-sans mt-1">
                        {currentLine.translation}
                      </p>
                    )}
                  </div>
                </div>

                {/* Word Mode Interactive Tokenizer */}
                {mode === 'word' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span>Tap word to select & timestamp:</span>
                      <span className="text-purple-400 font-mono text-[11px]">
                        Word {selectedWordIndex + 1}/{currentWords.length}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
                      {currentWords.map((w, wIdx) => {
                        const isWordSelected = wIdx === selectedWordIndex;
                        const hasTime = w.time >= 0;
                        return (
                          <button
                            key={wIdx}
                            onClick={() => setSelectedWordIndex(wIdx)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isWordSelected
                                ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400'
                                : hasTime
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                            }`}
                          >
                            <span>{w.word}</span>
                            {hasTime && (
                              <span className="ml-1 text-[9px] opacity-75 font-mono">
                                {w.time.toFixed(1)}s
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Primary Touch Stamp Action Button */}
                <div className="space-y-2">
                  <button
                    onClick={mode === 'line' ? handleStampCurrentLine : handleStampCurrentWord}
                    className="w-full py-4 px-4 rounded-xl font-bold text-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg hover:opacity-95 active:scale-[0.98] transition-all"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Mic2 className="w-5 h-5" />
                    <span>
                      {mode === 'line'
                        ? 'STAMP LINE TIME (T)'
                        : `STAMP WORD: "${currentWords[selectedWordIndex]?.word || ''}" (T)`}
                    </span>
                  </button>

                  <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoAdvance}
                        onChange={(e) => setAutoAdvance(e.target.checked)}
                        className="rounded bg-neutral-800 border-neutral-700 text-cyan-500 focus:ring-0"
                      />
                      <span>Auto-advance to next</span>
                    </label>

                    {currentLine.time >= 0 && (
                      <button
                        onClick={handleClearLineTime}
                        className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
                      >
                        Clear line timestamp
                      </button>
                    )}
                  </div>
                </div>

                {/* Precision Nudge Controls */}
                <div className="space-y-2">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                    Fine Nudge ({mode === 'line' ? 'Selected Line' : 'Selected Word'})
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() => (mode === 'line' ? handleNudgeLine(-0.5) : handleNudgeWord(-0.5))}
                      className="py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono rounded-lg"
                    >
                      -500ms
                    </button>
                    <button
                      onClick={() => (mode === 'line' ? handleNudgeLine(-0.1) : handleNudgeWord(-0.1))}
                      className="py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono rounded-lg"
                    >
                      -100ms
                    </button>
                    <button
                      onClick={() => (mode === 'line' ? handleNudgeLine(0.1) : handleNudgeWord(0.1))}
                      className="py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono rounded-lg"
                    >
                      +100ms
                    </button>
                    <button
                      onClick={() => (mode === 'line' ? handleNudgeLine(0.5) : handleNudgeWord(0.5))}
                      className="py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono rounded-lg"
                    >
                      +500ms
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-neutral-500">No line selected</div>
            )}

            {/* Bottom Transport Controls */}
            <div className="pt-3 border-t border-neutral-800/80 space-y-3">
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => onSeek(Math.max(0, currentTime - 5))}
                  className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
                  title="Rewind 5s"
                >
                  <Rewind className="w-5 h-5" />
                </button>

                <button
                  onClick={onTogglePlay}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-black font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
                  style={{ backgroundColor: accentColor }}
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>

                <button
                  onClick={() => onSeek(Math.min(duration, currentTime + 5))}
                  className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
                  title="Forward 5s"
                >
                  <FastForward className="w-5 h-5" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-3 text-xs font-medium text-neutral-300 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 px-3 text-xs font-bold text-black rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  style={{ backgroundColor: accentColor }}
                >
                  <Save className="w-4 h-4" />
                  <span>Save Studio Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
