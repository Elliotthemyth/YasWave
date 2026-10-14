import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { Track } from '../../types/track';
import { LyricsDisplayMode, LyricsFontSize } from '../../types/lyrics';
import { parseLyrics, getActiveLyricIndex } from '../../services/lyrics/lrcParser';
import { lrclibProvider } from '../../services/lyrics/lrclibProvider';
import { persianTranslationService } from '../../services/lyrics/persianTranslationService';
import { formatTime } from '../../utils/formatters';
import {
  X,
  Edit3,
  Upload,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  Languages,
  Type,
  RefreshCw,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Search,
  Check,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
  onSeek: (seconds: number) => void;
  onUpdateTrackLyrics: (
    trackId: string,
    lyrics: string,
    offset?: number,
    persianTranslations?: Record<string, string>,
    provider?: string
  ) => void;
  onOpenLyricsEditor: (track: Track) => void;
  onOpenLyricsSearch: () => void;
  accentColor?: string;
}

export const LyricsModal: React.FC<LyricsModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  currentTime,
  duration,
  isPlaying,
  onTogglePlay,
  onPlayNext,
  onPlayPrevious,
  onSeek,
  onUpdateTrackLyrics,
  onOpenLyricsEditor,
  onOpenLyricsSearch,
  accentColor = '#10b981',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings
  const [offset, setOffset] = useState<number>(0);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [displayMode, setDisplayMode] = useState<LyricsDisplayMode>('bilingual');
  const [fontSize, setFontSize] = useState<LyricsFontSize>('lg');

  // Translation state
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [editingTranslationLine, setEditingTranslationLine] = useState<{ id: string; text: string; orig: string } | null>(null);

  // Discovery state
  const [isSearchingAuto, setIsSearchingAuto] = useState<boolean>(false);
  const [autoSearchNotice, setAutoSearchNotice] = useState<string | null>(null);

  // Sync offset and translations from track
  useEffect(() => {
    if (currentTrack) {
      setOffset(currentTrack.lyricsOffset || 0);
      setTranslations(currentTrack.persianTranslations || {});
      setAutoSearchNotice(null);
    }
  }, [currentTrack]);

  // Parse structured lyrics document
  const lyricsDoc = useMemo(() => {
    if (!currentTrack || !currentTrack.lyrics) return null;
    return parseLyrics(currentTrack.lyrics, offset, translations);
  }, [currentTrack, offset, translations]);

  // Determine active lyric line index
  const activeIndex = useMemo(() => {
    if (!lyricsDoc || !lyricsDoc.isSynced) return -1;
    return getActiveLyricIndex(lyricsDoc.lines, currentTime, offset);
  }, [lyricsDoc, currentTime, offset]);

  // Auto-scroll to active line
  useEffect(() => {
    if (isOpen && autoScroll && activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, isOpen, autoScroll]);

  // Auto-discover lyrics from LRCLIB if current track lacks lyrics
  const handleAutoDiscoverLyrics = useCallback(async () => {
    if (!currentTrack || isSearchingAuto) return;
    setIsSearchingAuto(true);
    setAutoSearchNotice('Checking LRCLIB for lyrics...');

    try {
      const match = await lrclibProvider.findLyrics({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        duration: currentTrack.duration,
      });

      if (match && (match.syncedLyrics || match.plainLyrics)) {
        const rawLyrics = match.syncedLyrics || match.plainLyrics || '';
        setAutoSearchNotice(`Found lyrics on LRCLIB (${match.matchScore}% confidence)`);

        // Automatically trigger Persian translation
        const parsed = parseLyrics(rawLyrics, 0);
        const linesToTranslate = parsed.lines.map((l) => l.text).filter((t) => t && t.length > 0);
        
        setIsTranslating(true);
        const translatedLines = await persianTranslationService.translateLines(
          linesToTranslate,
          'fa',
          { title: currentTrack.title, artist: currentTrack.artist }
        );

        const newTranslationsMap: Record<string, string> = {};
        linesToTranslate.forEach((orig, idx) => {
          if (translatedLines[idx]) {
            newTranslationsMap[orig.toLowerCase()] = translatedLines[idx];
          }
        });

        setTranslations(newTranslationsMap);
        onUpdateTrackLyrics(currentTrack.id, rawLyrics, 0, newTranslationsMap, 'LRCLIB');
        setIsTranslating(false);
      } else {
        setAutoSearchNotice('No verified lyrics found on LRCLIB. You can search manually or import a file.');
      }
    } catch (err) {
      setAutoSearchNotice('Could not reach lyrics provider.');
    } finally {
      setIsSearchingAuto(false);
    }
  }, [currentTrack, isSearchingAuto, onUpdateTrackLyrics]);

  // If track has lyrics but missing Persian translations, generate them
  const handleGeneratePersianTranslations = useCallback(async () => {
    if (!lyricsDoc || !currentTrack) return;
    setIsTranslating(true);

    try {
      const linesToTranslate = lyricsDoc.lines.map((l) => l.text).filter((t) => t && t.length > 0);
      const translated = await persianTranslationService.translateLines(linesToTranslate, 'fa', {
        title: currentTrack.title,
        artist: currentTrack.artist,
      });

      const updatedMap = { ...translations };
      linesToTranslate.forEach((orig, idx) => {
        if (translated[idx]) {
          updatedMap[orig.toLowerCase()] = translated[idx];
        }
      });

      setTranslations(updatedMap);
      onUpdateTrackLyrics(currentTrack.id, currentTrack.lyrics || '', offset, updatedMap);
    } catch (err) {
      console.warn('Persian translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  }, [lyricsDoc, currentTrack, translations, offset, onUpdateTrackLyrics]);

  // Auto-translate on mount if lyrics exist but translations are empty
  useEffect(() => {
    if (
      isOpen &&
      currentTrack &&
      currentTrack.lyrics &&
      (!currentTrack.persianTranslations || Object.keys(currentTrack.persianTranslations).length === 0) &&
      !isTranslating
    ) {
      handleGeneratePersianTranslations();
    }
  }, [isOpen, currentTrack]);

  if (!isOpen) return null;

  const handleAdjustOffset = (delta: number) => {
    const nextOffset = Math.round((offset + delta) * 10) / 10;
    setOffset(nextOffset);
    if (currentTrack) {
      onUpdateTrackLyrics(currentTrack.id, currentTrack.lyrics || '', nextOffset, translations);
    }
  };

  const handleImportLrcFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTrack) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        setOffset(0);
        onUpdateTrackLyrics(currentTrack.id, content, 0, {}, 'Local File');
        // Trigger translation
        const parsed = parseLyrics(content, 0);
        const linesToTranslate = parsed.lines.map((l) => l.text).filter((t) => t && t.length > 0);
        setIsTranslating(true);
        const translated = await persianTranslationService.translateLines(linesToTranslate, 'fa', {
          title: currentTrack.title,
          artist: currentTrack.artist,
        });
        const map: Record<string, string> = {};
        linesToTranslate.forEach((orig, idx) => {
          if (translated[idx]) map[orig.toLowerCase()] = translated[idx];
        });
        setTranslations(map);
        onUpdateTrackLyrics(currentTrack.id, content, 0, map, 'Local File');
        setIsTranslating(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveEditedLineTranslation = () => {
    if (!editingTranslationLine || !currentTrack) return;
    const key = editingTranslationLine.orig.toLowerCase();
    const updatedMap = {
      ...translations,
      [key]: editingTranslationLine.text.trim(),
    };
    setTranslations(updatedMap);
    persianTranslationService.setSingleLineTranslation(editingTranslationLine.orig, editingTranslationLine.text.trim());
    onUpdateTrackLyrics(currentTrack.id, currentTrack.lyrics || '', offset, updatedMap);
    setEditingTranslationLine(null);
  };

  // Font size classes
  const fontClasses = {
    sm: {
      orig: 'text-base md:text-lg',
      origActive: 'text-xl md:text-2xl font-bold',
      trans: 'text-xs md:text-sm',
      transActive: 'text-sm md:text-base font-semibold',
    },
    base: {
      orig: 'text-lg md:text-xl',
      origActive: 'text-2xl md:text-3xl font-extrabold',
      trans: 'text-sm md:text-base',
      transActive: 'text-base md:text-lg font-semibold',
    },
    lg: {
      orig: 'text-xl md:text-2xl',
      origActive: 'text-3xl md:text-4xl font-extrabold',
      trans: 'text-base md:text-lg',
      transActive: 'text-lg md:text-xl font-semibold',
    },
    xl: {
      orig: 'text-2xl md:text-3xl',
      origActive: 'text-4xl md:text-5xl font-black',
      trans: 'text-lg md:text-xl',
      transActive: 'text-xl md:text-2xl font-bold',
    },
  }[fontSize];

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-950/95 flex flex-col backdrop-blur-2xl animate-in fade-in duration-200 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header */}
      <header className="h-16 px-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-neutral-950/60 z-20">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-neutral-100 text-base">Synchronized Lyrics</h2>
              {currentTrack?.lyricsProvider && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  {currentTrack.lyricsProvider}
                </span>
              )}
            </div>
            {currentTrack ? (
              <p className="text-xs text-neutral-400 mt-0.5 truncate max-w-sm sm:max-w-md">
                {currentTrack.title} · {currentTrack.artist}
              </p>
            ) : (
              <p className="text-xs text-neutral-500 mt-0.5">No track selected</p>
            )}
          </div>
        </div>

        {/* Toolbar: Display Mode, Translation Toggle, Font Size, Sync Offset, Search, Close */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          {/* Display Mode Selector */}
          <div className="flex items-center p-1 bg-white/5 rounded-lg border border-white/10 text-xs">
            <button
              onClick={() => setDisplayMode('bilingual')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                displayMode === 'bilingual' ? 'bg-white/15 text-white font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
              title="Bilingual: Original + Persian"
            >
              Bilingual (دوزبانه)
            </button>
            <button
              onClick={() => setDisplayMode('original')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                displayMode === 'original' ? 'bg-white/15 text-white font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
              title="Original lyrics only"
            >
              Original
            </button>
            <button
              onClick={() => setDisplayMode('translation')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                displayMode === 'translation' ? 'bg-white/15 text-white font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
              title="Persian translation only"
            >
              فارسی
            </button>
          </div>

          {/* Font Size Selector */}
          <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg border border-white/10 text-xs text-neutral-400">
            <Type size={13} className="text-neutral-500 mr-0.5" />
            {(['sm', 'base', 'lg', 'xl'] as LyricsFontSize[]).map((size) => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                className={`w-6 h-6 rounded flex items-center justify-center uppercase font-mono text-[10px] transition-colors ${
                  fontSize === size ? 'bg-white/20 text-white font-bold' : 'hover:text-white'
                }`}
              >
                {size === 'base' ? 'md' : size}
              </button>
            ))}
          </div>

          {/* Sync Offset Fine-Tuning */}
          {lyricsDoc?.isSynced && (
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 text-xs text-neutral-300">
              <span className="text-neutral-500 mr-1 text-[11px]">Offset:</span>
              <button
                onClick={() => handleAdjustOffset(-0.2)}
                className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white"
                title="Shift earlier by 0.2s"
              >
                <Minus size={12} />
              </button>
              <span className="font-mono tabular-nums font-semibold w-11 text-center text-brand-400 text-[11px]">
                {offset > 0 ? `+${offset.toFixed(1)}s` : `${offset.toFixed(1)}s`}
              </span>
              <button
                onClick={() => handleAdjustOffset(0.2)}
                className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white"
                title="Shift later by 0.2s"
              >
                <Plus size={12} />
              </button>
              {offset !== 0 && (
                <button
                  onClick={() => handleAdjustOffset(-offset)}
                  className="p-1 rounded hover:bg-white/10 text-neutral-500 hover:text-white"
                  title="Reset offset to 0"
                >
                  <RotateCcw size={11} />
                </button>
              )}
            </div>
          )}

          {/* Find Online Lyrics Button */}
          <button
            onClick={onOpenLyricsSearch}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors border border-white/10"
            title="Search for lyrics on LRCLIB"
          >
            <Search size={13} className="text-brand-400" />
            <span className="hidden sm:inline">Find on LRCLIB</span>
          </button>

          {/* Translate Button / Refresh Translations */}
          <button
            onClick={handleGeneratePersianTranslations}
            disabled={isTranslating || !lyricsDoc || lyricsDoc.lines.length === 0}
            className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-indigo-500/30 disabled:opacity-50"
            title="Translate / Refresh Persian Translation"
          >
            <Languages size={13} className={isTranslating ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{isTranslating ? 'Translating...' : 'Translate to Persian'}</span>
          </button>

          {/* Hidden File Input for .LRC import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".lrc,.txt"
            onChange={handleImportLrcFile}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
            title="Import local .LRC file"
          >
            <Upload size={15} />
          </button>

          {currentTrack && (
            <button
              onClick={() => onOpenLyricsEditor(currentTrack)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              title="Edit Lyrics & Timestamps"
            >
              <Edit3 size={15} />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
            title="Close Lyrics (L or Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Notice Banner (Auto-search status, etc.) */}
      {autoSearchNotice && (
        <div className="bg-neutral-900 border-b border-white/5 px-6 py-2 flex items-center justify-between text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-brand-400" />
            <span>{autoSearchNotice}</span>
          </div>
          <button
            onClick={() => setAutoSearchNotice(null)}
            className="text-neutral-500 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Lyrics Scroll Area */}
      <main
        ref={containerRef}
        onWheel={() => setAutoScroll(false)}
        className="flex-1 overflow-y-auto px-6 py-24 flex flex-col items-center justify-start text-center space-y-8 select-text"
      >
        {!lyricsDoc || lyricsDoc.lines.length === 0 ? (
          <div className="my-auto flex flex-col items-center gap-4 text-neutral-400 max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-400 shadow-inner">
              <Sparkles size={26} />
            </div>

            <div>
              <p className="text-lg font-bold text-neutral-100">No lyrics loaded yet</p>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                YASWAVE can automatically search the community-curated <strong>LRCLIB</strong> database
                or you can import a local <code className="text-brand-400">.lrc</code> file.
              </p>
            </div>

            <div className="flex items-center gap-3 mt-2 flex-wrap justify-center">
              <button
                onClick={handleAutoDiscoverLyrics}
                disabled={isSearchingAuto || !currentTrack}
                className="px-4 py-2 rounded-full bg-brand-500 text-neutral-950 font-bold text-xs hover:bg-brand-400 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                {isSearchingAuto ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>Auto-Search LRCLIB</span>
              </button>

              <button
                onClick={onOpenLyricsSearch}
                className="px-4 py-2 rounded-full bg-white/10 text-white font-medium text-xs hover:bg-white/15 transition-all border border-white/10 flex items-center gap-1.5"
              >
                <Search size={14} />
                <span>Search Candidates</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-full bg-white/5 text-neutral-300 font-medium text-xs hover:bg-white/10 transition-all border border-white/10 flex items-center gap-1.5"
              >
                <Upload size={14} />
                <span>Import .LRC</span>
              </button>
            </div>
          </div>
        ) : (
          lyricsDoc.lines.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;

            // Persian translation for this line
            const persianText =
              line.translation ||
              translations[line.text.toLowerCase()] ||
              persianTranslationService.getSingleLineTranslation(line.text);

            return (
              <div
                key={line.id}
                ref={isActive ? activeLineRef : undefined}
                onClick={() => {
                  if (line.time >= 0) {
                    onSeek(line.time + offset);
                    setAutoScroll(true);
                  }
                }}
                className={`group relative transition-all duration-300 cursor-pointer max-w-4xl px-6 py-2.5 rounded-2xl ${
                  isActive
                    ? 'scale-105 bg-white/[0.07] border border-white/10 shadow-2xl'
                    : isPast
                    ? 'opacity-65 hover:opacity-100 hover:bg-white/[0.03]'
                    : 'opacity-40 hover:opacity-80 hover:bg-white/[0.03]'
                }`}
              >
                {/* 1. Original Lyric Line (LTR) */}
                {(displayMode === 'bilingual' || displayMode === 'original') && (
                  <p
                    dir="ltr"
                    className={`transition-colors duration-200 select-text ${
                      isActive
                        ? `${fontClasses.origActive} text-white drop-shadow`
                        : `${fontClasses.orig} text-neutral-300 font-medium`
                    }`}
                  >
                    {/* Word-level timing highlighting if present */}
                    {line.words && line.words.length > 0 ? (
                      line.words.map((w, wIdx) => {
                        const isWordActive =
                          currentTime >= w.time + offset &&
                          currentTime < w.time + offset + (w.duration || 0.6);
                        return (
                          <span
                            key={wIdx}
                            className={`transition-colors duration-150 inline-block mr-1.5 ${
                              isWordActive
                                ? 'text-brand-400 font-bold scale-105'
                                : isActive
                                ? 'text-white'
                                : 'text-neutral-400'
                            }`}
                          >
                            {w.word}
                          </span>
                        );
                      })
                    ) : (
                      line.text || '♪'
                    )}
                  </p>
                )}

                {/* 2. Persian Translation directly beneath original line (RTL, Vazirmatn font) */}
                {(displayMode === 'bilingual' || displayMode === 'translation') && (
                  <div className="mt-1.5 select-text">
                    {persianText ? (
                      <p
                        dir="rtl"
                        className={`transition-colors duration-200 leading-relaxed font-persian ${
                          isActive
                            ? `${fontClasses.transActive} text-brand-300 font-semibold drop-shadow-sm`
                            : `${fontClasses.trans} text-neutral-400 font-normal`
                        }`}
                        style={{ fontFamily: "'Vazirmatn', system-ui, sans-serif" }}
                      >
                        {persianText}
                      </p>
                    ) : isTranslating ? (
                      <span className="text-xs text-neutral-500 italic font-persian">
                        در حال ترجمه...
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTranslationLine({
                            id: line.id,
                            orig: line.text,
                            text: '',
                          });
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[11px] text-neutral-500 hover:text-brand-400 transition-opacity flex items-center gap-1 mx-auto font-persian"
                      >
                        <Plus size={11} />
                        <span>افزودن ترجمه فارسی</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Edit single line translation button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTranslationLine({
                      id: line.id,
                      orig: line.text,
                      text: persianText || '',
                    });
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit Persian line translation"
                >
                  <Edit3 size={13} />
                </button>
              </div>
            );
          })
        )}
      </main>

      {/* Floating Resume Auto-Scroll Button */}
      {!autoScroll && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={() => setAutoScroll(true)}
            className="px-4 py-2 rounded-full bg-neutral-900 border border-white/20 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-neutral-800 shadow-2xl transition-all"
          >
            Resume Auto-Scroll
          </button>
        </div>
      )}

      {/* Integrated Bottom Mini-Player Bar */}
      <footer className="h-20 w-full bg-neutral-950/90 border-t border-white/10 px-6 flex items-center justify-between shrink-0 select-none z-20 backdrop-blur-xl">
        <div className="w-1/4 min-w-[140px] text-xs font-mono text-neutral-400 flex items-center gap-2">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Center Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={onPlayPrevious}
            className="p-2 text-neutral-300 hover:text-white hover:scale-105 active:scale-95 transition-transform"
            title="Previous"
          >
            <SkipBack size={18} className="fill-current" />
          </button>

          <button
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-full bg-white text-neutral-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={18} className="fill-current" />
            ) : (
              <Play size={18} className="fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={onPlayNext}
            className="p-2 text-neutral-300 hover:text-white hover:scale-105 active:scale-95 transition-transform"
            title="Next"
          >
            <SkipForward size={18} className="fill-current" />
          </button>
        </div>

        {/* Right Info */}
        <div className="w-1/4 min-w-[140px] flex items-center justify-end gap-2 text-xs text-neutral-400">
          <Languages size={15} className="text-brand-400" />
          <span className="font-persian text-xs">فارسی و انگلیسی</span>
        </div>
      </footer>

      {/* Modal: Edit Single Line Translation */}
      {editingTranslationLine && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setEditingTranslationLine(null)}
        >
          <div
            className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-xl shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h4 className="font-semibold text-neutral-100 text-sm">Edit Persian Translation</h4>
              <button
                onClick={() => setEditingTranslationLine(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-mono">Original line:</label>
              <p className="p-2.5 rounded bg-neutral-950 border border-white/5 text-xs text-neutral-200">
                {editingTranslationLine.orig}
              </p>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-persian">
                ترجمه فارسی (Persian Translation):
              </label>
              <textarea
                dir="rtl"
                value={editingTranslationLine.text}
                onChange={(e) =>
                  setEditingTranslationLine({
                    ...editingTranslationLine,
                    text: e.target.value,
                  })
                }
                rows={2}
                placeholder="ترجمه روان این سطر را وارد کنید..."
                className="w-full bg-neutral-950 border border-white/10 rounded-lg p-2.5 text-sm text-neutral-100 focus:outline-none focus:border-brand-500/50 font-persian"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingTranslationLine(null)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedLineTranslation}
                className="px-4 py-1.5 rounded-lg bg-brand-500 text-neutral-950 font-semibold text-xs hover:bg-brand-400 shadow"
              >
                Save Translation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
