import React, { useState, useEffect } from 'react';
import { Track } from '../../types/track';
import { lrclibProvider } from '../../services/lyrics/lrclibProvider';
import { parseLyrics, formatLrcDocument } from '../../services/lyrics/lrcParser';
import { persianTranslationService } from '../../services/lyrics/persianTranslationService';
import {
  Search,
  Globe,
  ClipboardPaste,
  Check,
  X,
  ExternalLink,
  Sparkles,
  SlidersHorizontal,
  Clock,
  Music2,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface LyricsDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  onSaveLyrics: (trackId: string, lrcText: string, persianTranslations?: Record<string, string>) => void;
  onOpenSyncStudio?: (track: Track, initialText: string) => void;
  accentColor?: string;
}

export const LyricsDiscoveryModal: React.FC<LyricsDiscoveryModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  onSaveLyrics,
  onOpenSyncStudio,
  accentColor = '#19bebe',
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'paste' | 'preview'>('search');
  const [searchTitle, setSearchTitle] = useState('');
  const [searchArtist, setSearchArtist] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Raw lyrics in the paste/edit area
  const [lyricsContent, setLyricsContent] = useState('');
  const [persianTranslationMap, setPersianTranslationMap] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    if (isOpen && currentTrack) {
      setSearchTitle(currentTrack.title || '');
      setSearchArtist(currentTrack.artist || '');
      setLyricsContent(currentTrack.lyrics || '');
      setPersianTranslationMap(currentTrack.persianTranslations || {});
      setSearchResults([]);
      setSearchError(null);
      // Auto search if track has title
      if (currentTrack.title) {
        handleSearch(currentTrack.title, currentTrack.artist || '', currentTrack.duration);
      }
    }
  }, [isOpen, currentTrack]);

  if (!isOpen || !currentTrack) return null;

  const handleSearch = async (title: string, artist: string, duration?: number) => {
    if (!title.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const candidates = await lrclibProvider.searchCandidates({
        title,
        artist,
        duration,
      });
      setSearchResults(candidates);
      if (candidates.length === 0) {
        setSearchError('No direct matches found on LRCLIB. You can paste lyrics from the web below or use external search.');
      }
    } catch (err) {
      setSearchError('Failed to connect to lyrics provider. Please check network or paste lyrics manually.');
      console.warn('Lyrics search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCandidate = (candidate: any) => {
    const raw = candidate.syncedLyrics || candidate.plainLyrics || '';
    setLyricsContent(raw);
    setActiveTab('preview');
  };

  const handleCleanLyrics = () => {
    // Strip common copy-paste artifacts: contributor lines, chorus tags, extra empty lines
    const cleaned = lyricsContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => !l.match(/^(embed|lyrics|contributor|verse \d+|chorus|bridge|intro|outro)\]?$/i))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    setLyricsContent(cleaned);
  };

  const handleTranslateToPersian = async () => {
    const parsed = parseLyrics(lyricsContent);
    const textLines = parsed.lines.map((l) => l.text).filter((t) => t.trim().length > 0);
    if (textLines.length === 0) return;

    setIsTranslating(true);
    setTranslationProgress({ current: 0, total: textLines.length });

    try {
      const newMap: Record<string, string> = { ...persianTranslationMap };
      await persianTranslationService.translateLines(
        textLines,
        'fa',
        { title: currentTrack.title, artist: currentTrack.artist },
        (progress) => {
          setTranslationProgress({ current: progress.current, total: progress.total });
        }
      );

      for (const line of textLines) {
        const tr = persianTranslationService.getSingleLineTranslation(line);
        if (tr) {
          newMap[line.toLowerCase()] = tr;
        }
      }
      setPersianTranslationMap(newMap);
    } catch (err) {
      console.warn('Batch translation error:', err);
    } finally {
      setIsTranslating(false);
      setTranslationProgress(null);
    }
  };

  const handleSave = () => {
    onSaveLyrics(currentTrack.id, lyricsContent, persianTranslationMap);
    onClose();
  };

  const handleSendToStudio = () => {
    if (onOpenSyncStudio) {
      onOpenSyncStudio(currentTrack, lyricsContent);
      onClose();
    }
  };

  const parsedPreview = parseLyrics(lyricsContent, 0, persianTranslationMap);

  // Web search queries for external browser assistance
  const googleLyricsUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `${searchTitle} ${searchArtist} lyrics`
  )}`;
  const geniusUrl = `https://genius.com/search?q=${encodeURIComponent(`${searchTitle} ${searchArtist}`)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
            >
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-white truncate">Lyrics Discovery & Import</h2>
              <p className="text-xs text-neutral-400 truncate">
                {currentTrack.title} · {currentTrack.artist}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 p-1.5 gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'search'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Online Search</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'paste'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>Paste / Edit</span>
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'preview'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Preview & Translate</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'search' && (
            <div className="space-y-4">
              {/* Search Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Song Title</label>
                  <input
                    type="text"
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:border-neutral-700"
                    placeholder="Title"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Artist</label>
                  <input
                    type="text"
                    value={searchArtist}
                    onChange={(e) => setSearchArtist(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:border-neutral-700"
                    placeholder="Artist"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => handleSearch(searchTitle, searchArtist, currentTrack.duration)}
                  disabled={isSearching}
                  className="px-4 py-2 text-xs sm:text-sm font-medium rounded-lg text-black font-semibold flex items-center gap-2 transition-opacity"
                  style={{ backgroundColor: accentColor }}
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Search LRCLIB</span>
                </button>

                <a
                  href={googleLyricsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs sm:text-sm text-neutral-300 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Google Lyrics</span>
                </a>

                <a
                  href={geniusUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs sm:text-sm text-neutral-300 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Genius</span>
                </a>
              </div>

              {/* Search Results */}
              <div className="space-y-2 mt-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-neutral-400">Search Results</h3>
                {isSearching && (
                  <div className="p-8 text-center text-neutral-400 flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
                    <p className="text-sm">Searching global lyrics database...</p>
                  </div>
                )}

                {searchError && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs sm:text-sm flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>{searchError}</div>
                  </div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((res, idx) => (
                      <div
                        key={res.id || idx}
                        onClick={() => handleSelectCandidate(res)}
                        className="p-3 bg-neutral-950/60 hover:bg-neutral-800/80 border border-neutral-800/70 hover:border-neutral-700 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="text-sm font-medium text-white truncate">{res.trackName}</div>
                          <div className="text-xs text-neutral-400 truncate">
                            {res.artistName} {res.albumName ? `· ${res.albumName}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {res.syncedLyrics ? (
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              Synced LRC
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
                              Plain Text
                            </span>
                          )}
                          <button
                            className="px-2.5 py-1 text-xs font-medium rounded-lg text-white bg-neutral-800 hover:bg-neutral-700"
                          >
                            Load
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">
                  Paste plain text or timestamped LRC (`[00:12.30] Line text`)
                </span>
                <button
                  onClick={handleCleanLyrics}
                  className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 hover:underline"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Clean text
                </button>
              </div>

              <textarea
                value={lyricsContent}
                onChange={(e) => setLyricsContent(e.target.value)}
                placeholder="[00:12.00] First lyric line&#10;[00:18.50] Second lyric line..."
                rows={12}
                className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm font-mono text-neutral-200 focus:outline-none focus:border-neutral-700"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-neutral-400">
                  {lyricsContent.split('\n').filter(Boolean).length} lines detected
                </span>
                <button
                  onClick={() => setActiveTab('preview')}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg text-black"
                  style={{ backgroundColor: accentColor }}
                >
                  Continue to Preview →
                </button>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-neutral-950/80 rounded-xl border border-neutral-800/80">
                <div className="text-xs text-neutral-300">
                  Status: {parsedPreview.isSynced ? (
                    <span className="text-emerald-400 font-medium">Synchronized LRC ({parsedPreview.lines.length} lines)</span>
                  ) : (
                    <span className="text-amber-400 font-medium">Unsynchronized Plain Text</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTranslateToPersian}
                    disabled={isTranslating}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center gap-1.5 transition-colors"
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Translating ({translationProgress?.current}/{translationProgress?.total})...</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-3.5 h-3.5" />
                        <span>Translate to Persian</span>
                      </>
                    )}
                  </button>

                  {!parsedPreview.isSynced && onOpenSyncStudio && (
                    <button
                      onClick={handleSendToStudio}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 flex items-center gap-1.5 transition-colors"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Open in Sync Studio</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Preview List */}
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {parsedPreview.lines.map((line, idx) => {
                  const translation = persianTranslationMap[line.text.toLowerCase()] || line.translation;
                  return (
                    <div
                      key={line.id || idx}
                      className="p-2.5 bg-neutral-950/40 border border-neutral-800/60 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {line.time >= 0 && (
                          <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                            [{Math.floor(line.time / 60)}:{(line.time % 60).toFixed(1).padStart(4, '0')}]
                          </span>
                        )}
                        <span className="text-white font-medium truncate">{line.text}</span>
                      </div>

                      {translation && (
                        <div
                          dir="rtl"
                          className="text-right text-neutral-400 font-sans text-xs shrink-0 max-w-sm truncate"
                        >
                          {translation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!parsedPreview.isSynced && onOpenSyncStudio && (
              <button
                onClick={handleSendToStudio}
                className="px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white rounded-lg hover:bg-neutral-800 flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                <span>Sync with Music</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-neutral-300 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg text-black transition-opacity flex items-center gap-1.5"
              style={{ backgroundColor: accentColor }}
            >
              <Check className="w-4 h-4" />
              <span>Save & Apply Lyrics</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
