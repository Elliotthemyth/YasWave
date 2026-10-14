import React, { useState } from 'react';
import { ListPlus, Sparkles, X } from 'lucide-react';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => void;
  onOpenSmartPlaylist?: () => void;
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  onOpenSmartPlaylist,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim());
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-14 px-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListPlus size={18} className="text-brand-400" />
            <h3 className="font-semibold text-neutral-100 text-sm">Create New Playlist</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Promo for Smart Playlists */}
        {onOpenSmartPlaylist && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles size={16} className="text-brand-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-brand-300 block">Want a dynamic Smart Playlist?</span>
                <span className="text-[11px] text-neutral-400 block">Auto-generate from genres, play counts, or recently added</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSmartPlaylist();
              }}
              className="px-2.5 py-1 rounded bg-brand-500 text-neutral-950 font-bold text-[11px] hover:bg-brand-400 transition-colors shrink-0 ml-2 shadow"
            >
              Smart Builder
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Standard Playlist Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Focus & Coding, Midnight Drives"
              className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-brand-500/50"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give your playlist a description..."
              rows={3}
              className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-brand-500/50 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-500 text-neutral-950 hover:bg-brand-400 disabled:opacity-50 transition-colors shadow"
            >
              Create Standard Playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
