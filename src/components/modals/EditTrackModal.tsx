import React, { useState, useEffect } from 'react';
import { Track, TrackUpdateInput } from '../../types/track';
import { CoverArt } from '../common/CoverArt';
import { X, Save, Edit3 } from 'lucide-react';

interface EditTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  onSave: (trackId: string, updates: TrackUpdateInput) => void;
}

export const EditTrackModal: React.FC<EditTrackModalProps> = ({
  isOpen,
  onClose,
  track,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState<string>('');
  const [trackNumber, setTrackNumber] = useState<string>('');

  useEffect(() => {
    if (track) {
      setTitle(track.title || '');
      setArtist(track.artist || '');
      setAlbum(track.album || '');
      setGenre(track.genre || '');
      setYear(track.year ? String(track.year) : '');
      setTrackNumber(track.trackNumber ? String(track.trackNumber) : '');
    }
  }, [track]);

  if (!isOpen || !track) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(track.id, {
      title: title.trim() || 'Untitled Track',
      artist: artist.trim() || 'Unknown Artist',
      album: album.trim() || 'Unknown Album',
      genre: genre.trim() || undefined,
      year: year ? parseInt(year, 10) : undefined,
      trackNumber: trackNumber ? parseInt(trackNumber, 10) : undefined,
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
            <Edit3 size={18} className="text-emerald-400" />
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
              <p>Source: {track.sourceType === 'browser_file' ? 'Local Browser File' : 'System Demo'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Artist</label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Album</label>
              <input
                type="text"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Genre</label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Track #</label>
                <input
                  type="number"
                  value={trackNumber}
                  onChange={(e) => setTrackNumber(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500/50"
                />
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
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-neutral-950 hover:bg-emerald-400 flex items-center gap-1.5 shadow"
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
