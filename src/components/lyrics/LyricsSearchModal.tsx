import React, { useState, useEffect } from 'react';
import { Track } from '../../types/track';
import { LyricsMatchResult } from '../../types/lyrics';
import { lrclibProvider } from '../../services/lyrics/lrclibProvider';
import { formatTime } from '../../utils/formatters';
import {
  Search,
  X,
  Sparkles,
  Music,
  Check,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface LyricsSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  onSelectCandidate: (candidate: LyricsMatchResult) => void;
}

export const LyricsSearchModal: React.FC<LyricsSearchModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  onSelectCandidate,
}) => {
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<LyricsMatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<LyricsMatchResult | null>(null);

  useEffect(() => {
    if (isOpen && currentTrack) {
      const defaultQuery = `${currentTrack.artist} ${currentTrack.title}`.trim();
      setQuery(defaultQuery);
      performSearch(defaultQuery);
    }
  }, [isOpen, currentTrack]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setError(null);
    setPreviewItem(null);

    try {
      const results = await lrclibProvider.searchLyrics(searchQuery, {
        title: currentTrack?.title,
        artist: currentTrack?.artist,
        album: currentTrack?.album,
        duration: currentTrack?.duration,
      });

      setCandidates(results);
      if (results.length === 0) {
        setError('No lyrics found for this query on LRCLIB. Try searching with different keywords.');
      }
    } catch (err) {
      setError('Failed to reach lyrics service. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-md select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-neutral-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-100 text-sm">Find Lyrics on LRCLIB</h3>
              <p className="text-xs text-neutral-400">
                Search verified synchronized and plain lyrics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={handleSearchSubmit} className="p-4 border-b border-white/5 bg-neutral-950/20 shrink-0">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search song title and artist..."
                className="w-full bg-neutral-950 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-brand-500/50"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-4 py-2.5 rounded-xl bg-brand-500 text-neutral-950 font-semibold text-xs hover:bg-brand-400 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              <span>Search</span>
            </button>
          </div>
        </form>

        {/* Content list / Preview */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && (
            <div className="py-16 flex flex-col items-center justify-center text-neutral-400 gap-3">
              <RefreshCw size={24} className="animate-spin text-brand-400" />
              <span className="text-xs">Searching LRCLIB database...</span>
            </div>
          )}

          {!isLoading && error && (
            <div className="p-4 rounded-xl bg-neutral-950 border border-white/5 flex items-start gap-3 text-xs text-neutral-400">
              <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {!isLoading &&
            candidates.map((cand) => {
              const isSelectedPreview = previewItem?.id === cand.id;
              const hasSynced = Boolean(cand.syncedLyrics);

              return (
                <div
                  key={cand.id}
                  className={`p-3.5 rounded-xl border transition-all text-xs ${
                    isSelectedPreview
                      ? 'border-brand-500/40 bg-brand-500/5'
                      : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-neutral-100 text-sm truncate">
                          {cand.trackName}
                        </span>
                        {hasSynced && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                            Synced LRC
                          </span>
                        )}
                        {cand.instrumental && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Instrumental
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            cand.matchScore >= 80
                              ? 'bg-brand-500/10 text-brand-400'
                              : cand.matchScore >= 60
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {cand.matchScore}% Match
                        </span>
                      </div>

                      <p className="text-neutral-400 mt-1">
                        <span className="text-neutral-200 font-medium">{cand.artistName}</span>
                        {cand.albumName && <span> · {cand.albumName}</span>}
                      </p>

                      <div className="flex items-center gap-3 text-neutral-500 text-[11px] mt-1.5 font-mono">
                        {cand.duration && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{formatTime(cand.duration)}</span>
                            {cand.durationDiff > 0 && (
                              <span className="text-neutral-400">
                                (Δ {cand.durationDiff}s)
                              </span>
                            )}
                          </span>
                        )}
                        <span>Source: {cand.source}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setPreviewItem(isSelectedPreview ? null : cand)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
                      >
                        {isSelectedPreview ? 'Hide Preview' : 'Preview'}
                      </button>

                      <button
                        onClick={() => {
                          onSelectCandidate(cand);
                          onClose();
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-neutral-950 font-semibold transition-colors flex items-center gap-1 shadow"
                      >
                        <Check size={14} />
                        <span>Use Lyrics</span>
                      </button>
                    </div>
                  </div>

                  {/* Expandable Preview Section */}
                  {isSelectedPreview && (
                    <div className="mt-3 pt-3 border-t border-white/5 max-h-48 overflow-y-auto bg-neutral-950/60 p-3 rounded-lg font-mono text-[11px] text-neutral-300 whitespace-pre-wrap leading-relaxed select-text">
                      {cand.syncedLyrics || cand.plainLyrics || '(No lyric text available)'}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-neutral-950/60 border-t border-white/10 flex items-center justify-between text-xs text-neutral-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-brand-400" />
            <span>Community-verified database · Free & Open API</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
