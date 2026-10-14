import React, { useState, useMemo } from 'react';
import { Playlist } from '../../types/playlist';
import { Track } from '../../types/track';
import { TrackTable } from '../common/TrackTable';
import { formatTime } from '../../utils/formatters';
import {
  Play,
  Shuffle,
  Trash2,
  Edit2,
  ListMusic,
  Save,
  X,
  Sparkles,
  SlidersHorizontal,
  Copy,
} from 'lucide-react';
import {
  evaluateSmartPlaylist,
  describeSmartPlaylistRules,
} from '../../services/playlist/smartPlaylistEvaluator';

interface PlaylistDetailViewProps {
  playlist: Playlist;
  allTracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track, trackList: Track[]) => void;
  onTogglePlay: () => void;
  onToggleFavorite: (trackId: string) => void;
  onOpenContextMenu: (e: React.MouseEvent, track: Track) => void;
  onShufflePlaylist: (tracks: Track[]) => void;
  onUpdatePlaylist: (playlistId: string, updates: Partial<Playlist>) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  onEditSmartRules?: (playlist: Playlist) => void;
  onCreateStaticSnapshot?: (name: string, description: string, trackIds: string[]) => void;
}

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({
  playlist,
  allTracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onToggleFavorite,
  onOpenContextMenu,
  onShufflePlaylist,
  onUpdatePlaylist,
  onDeletePlaylist,
  onRemoveTrackFromPlaylist,
  onEditSmartRules,
  onCreateStaticSnapshot,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description || '');

  const isSmart = Boolean(playlist.isSmart);

  // Dynamically evaluate tracks if this is a smart playlist, otherwise resolve manual trackIds
  const playlistTracks = useMemo(() => {
    if (isSmart) {
      return evaluateSmartPlaylist(playlist.smartConfig, allTracks);
    }
    return playlist.trackIds
      .map((id) => allTracks.find((t) => t.id === id))
      .filter((t): t is Track => t !== undefined);
  }, [isSmart, playlist.smartConfig, playlist.trackIds, allTracks]);

  const totalDuration = useMemo(
    () => playlistTracks.reduce((acc, t) => acc + (t.duration || 0), 0),
    [playlistTracks]
  );

  const rulesSummary = useMemo(() => {
    if (!isSmart || !playlist.smartConfig) return null;
    return describeSmartPlaylistRules(playlist.smartConfig);
  }, [isSmart, playlist.smartConfig]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onUpdatePlaylist(playlist.id, {
      name: name.trim(),
      description: description.trim(),
    });
    setIsEditing(false);
  };

  const handleSnapshot = () => {
    if (onCreateStaticSnapshot) {
      const snapshotName = `${playlist.name} (Snapshot)`;
      const snapshotDesc = `Static snapshot of ${playlist.name} taken on ${new Date().toLocaleDateString()}`;
      onCreateStaticSnapshot(
        snapshotName,
        snapshotDesc,
        playlistTracks.map((t) => t.id)
      );
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Playlist Hero */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div className="flex items-start md:items-center gap-6">
          <div
            className={`w-32 h-32 rounded-2xl flex items-center justify-center shadow-2xl shrink-0 border ${
              isSmart
                ? 'bg-gradient-to-br from-brand-950 via-neutral-900 to-cyan-950 border-brand-500/30 text-brand-400'
                : 'bg-gradient-to-br from-neutral-800 to-neutral-900 border-white/10 text-brand-400'
            }`}
          >
            {isSmart ? (
              <Sparkles size={52} className="animate-pulse duration-1000" />
            ) : (
              <ListMusic size={52} />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isSmart
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                    : 'text-neutral-400'
                }`}
              >
                {isSmart ? '✨ Smart Playlist' : 'Standard Playlist'}
              </span>
              {isSmart && (
                <span className="text-[11px] text-neutral-400 font-medium">
                  Dynamic &amp; Auto-Updating
                </span>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="mt-2 space-y-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-neutral-900 border border-white/20 rounded px-3 py-1.5 text-xl font-bold text-white focus:outline-none focus:border-brand-500"
                  autoFocus
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Playlist description..."
                  rows={2}
                  className="w-full bg-neutral-900 border border-white/20 rounded p-2 text-xs text-neutral-300 focus:outline-none focus:border-brand-500 resize-none block"
                />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-3 py-1 bg-brand-500 text-neutral-950 font-semibold text-xs rounded hover:bg-brand-400 flex items-center gap-1 transition-colors"
                  >
                    <Save size={12} />
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 bg-white/10 text-neutral-300 text-xs rounded hover:bg-white/15 flex items-center gap-1 transition-colors"
                  >
                    <X size={12} />
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-1 truncate">
                  {playlist.name}
                </h1>
                {playlist.description && (
                  <p className="text-xs text-neutral-400 mt-2 max-w-xl leading-relaxed">
                    {playlist.description}
                  </p>
                )}
                <p className="text-xs text-neutral-400 mt-2 font-mono">
                  <span className="text-brand-400 font-bold">{playlistTracks.length} songs</span> ·{' '}
                  {formatTime(totalDuration)} total duration
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {playlistTracks.length > 0 && (
            <>
              <button
                onClick={() => onPlayTrack(playlistTracks[0], playlistTracks)}
                className="w-12 h-12 rounded-full bg-brand-500 text-neutral-950 flex items-center justify-center hover:scale-105 active:scale-95 shadow-xl transition-all shadow-brand-500/20"
                title="Play Playlist"
              >
                <Play size={22} className="fill-current ml-0.5" />
              </button>

              <button
                onClick={() => onShufflePlaylist(playlistTracks)}
                className="p-3 rounded-full bg-white/10 hover:bg-white/15 text-white transition-colors"
                title="Shuffle Playlist"
              >
                <Shuffle size={18} />
              </button>
            </>
          )}

          {isSmart && onEditSmartRules && (
            <button
              onClick={() => onEditSmartRules(playlist)}
              className="px-3.5 py-2.5 rounded-full bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 text-brand-400 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Edit Smart Playlist Rules"
            >
              <SlidersHorizontal size={14} />
              <span>Edit Rules</span>
            </button>
          )}

          {isSmart && onCreateStaticSnapshot && playlistTracks.length > 0 && (
            <button
              onClick={handleSnapshot}
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              title="Duplicate as Static Snapshot Playlist"
            >
              <Copy size={16} />
            </button>
          )}

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              title="Edit playlist title & description"
            >
              <Edit2 size={16} />
            </button>
          )}

          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete playlist "${playlist.name}"?`)) {
                onDeletePlaylist(playlist.id);
              }
            }}
            className="p-3 rounded-full bg-white/5 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 transition-colors"
            title="Delete Playlist"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Smart Playlist Rules Banner */}
      {isSmart && rulesSummary && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-brand-950/30 via-neutral-900/60 to-neutral-950/40 border border-brand-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles size={16} className="text-brand-400 shrink-0" />
            <div className="text-xs">
              <span className="text-neutral-400 font-medium">Active Rules: </span>
              <span className="text-brand-300 font-semibold">{rulesSummary}</span>
            </div>
          </div>
          {onEditSmartRules && (
            <button
              onClick={() => onEditSmartRules(playlist)}
              className="text-xs text-brand-400 hover:text-brand-300 font-semibold underline underline-offset-2 shrink-0 transition-colors"
            >
              Customize Rules
            </button>
          )}
        </div>
      )}

      {/* Playlist Track Table */}
      <div className="bg-neutral-900/30 rounded-xl border border-white/5 overflow-hidden">
        <TrackTable
          tracks={playlistTracks}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          onPlayTrack={onPlayTrack}
          onTogglePlay={onTogglePlay}
          onToggleFavorite={onToggleFavorite}
          onOpenContextMenu={onOpenContextMenu}
          emptyMessage={
            isSmart
              ? 'No songs in your library currently match these smart rules. Try broadening the conditions or importing more music!'
              : 'This playlist has no songs yet. Right-click any track in your library to add it here!'
          }
        />
      </div>
    </div>
  );
};
