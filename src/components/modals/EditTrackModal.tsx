import React, { useState, useEffect } from 'react';
import { Track, TrackUpdateInput } from '../../types/track';
import { CoverArt } from '../common/CoverArt';
import { X, Save, Edit3, Activity, Key as KeyIcon, RefreshCw } from 'lucide-react';
import { CAMELOT_KEYS } from '../../services/audio/audioAnalyzer';

interface EditTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  onSave: (trackId: string, updates: TrackUpdateInput) => void;
  onAnalyzeAudio?: (trackId: string) => Promise<Track | null>;
}

export const EditTrackModal: React.FC<EditTrackModalProps> = ({
  isOpen,
  onClose,
  track,
  onSave,
  onAnalyzeAudio,
}) => {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState<string>('');
  const [trackNumber, setTrackNumber] = useState<string>('');
  const [bpm, setBpm] = useState<string>('');
  const [key, setKey] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (track) {
      setTitle(track.title || '');
      setArtist(track.artist || '');
      setAlbum(track.album || '');
      setGenre(track.genre || '');
      setYear(track.year ? String(track.year) : '');
      setTrackNumber(track.trackNumber ? String(track.trackNumber) : '');
      setBpm(track.bpm ? String(track.bpm) : '');
      setKey(track.key || '');
    }
  }, [track]);

  if (!isOpen || !track) return null;

  const handleAnalyzeClick = async () => {
    if (!onAnalyzeAudio) return;
    setIsAnalyzing(true);
    try {
      const updated = await onAnalyzeAudio(track.id);
      if (updated) {
        if (updated.bpm) setBpm(String(updated.bpm));
        if (updated.key) setKey(updated.key);
      }
    } catch (err) {
      console.error('Audio re-analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBpm = bpm.trim() ? parseInt(bpm.trim(), 10) : undefined;
    const cleanKey = key.trim() || undefined;
    const camelot = cleanKey ? CAMELOT_KEYS[cleanKey] : undefined;

    onSave(track.id, {
      title: title.trim() || 'Untitled Track',
      artist: artist.trim() || 'Unknown Artist',
      album: album.trim() || 'Unknown Album',
      genre: genre.trim() || undefined,
      year: year ? parseInt(year, 10) : undefined,
      trackNumber: trackNumber ? parseInt(trackNumber, 10) : undefined,
      bpm: parsedBpm && !isNaN(parsedBpm) ? parsedBpm : undefined,
      key: cleanKey,
      keyCamelot: camelot,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-14 px-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 size={18} className="text-brand-400" />
            <h3 className="font-semibold text-neutral-100 text-sm">Edit Track Information</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-center gap-4 pb-2 border-b border-white/5">
            <CoverArt url={track.coverArtUrl} title={track.title} artist={track.artist} size="lg" />
            <div className="min-w-0 flex-1 text-xs text-neutral-400">
              <p className="font-mono text-neutral-300 truncate">{track.fileName}</p>
              <p className="mt-1">Format: {track.fileType}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="inline-flex items-center gap-1 font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <Activity size={11} /> {track.bpm ? `${track.bpm} BPM` : 'No BPM'}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  <KeyIcon size={11} /> {track.key || 'No Key'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-brand-500/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Artist</label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-brand-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Album</label>
              <input
                type="text"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-brand-500/50"
              />
            </div>

            {/* Genre, Year, Track # */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Genre</label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-brand-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-brand-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Track #</label>
                <input
                  type="number"
                  value={trackNumber}
                  onChange={(e) => setTrackNumber(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-brand-500/50"
                />
              </div>
            </div>

            {/* Audio Analysis: BPM & Key */}
            <div className="pt-2 border-t border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Audio Rhythm & Harmony
                </span>
                {onAnalyzeAudio && (
                  <button
                    type="button"
                    onClick={handleAnalyzeClick}
                    disabled={isAnalyzing}
                    className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={11} className={isAnalyzing ? 'animate-spin' : ''} />
                    <span>{isAnalyzing ? 'Calculating...' : 'Re-calculate from Audio'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center gap-1">
                    <Activity size={12} className="text-emerald-400" />
                    <span>BPM (Tempo)</span>
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="250"
                    placeholder="e.g. 128"
                    value={bpm}
                    onChange={(e) => setBpm(e.target.value)}
                    className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-neutral-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center gap-1">
                    <KeyIcon size={12} className="text-cyan-400" />
                    <span>Musical Key</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A Minor, C Major"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-neutral-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-500 text-neutral-950 hover:bg-brand-400 flex items-center gap-1.5 shadow"
            >
              <Save size={14} />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
