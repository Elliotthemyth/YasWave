import React from 'react';
import { Track } from '../../types/track';
import { Playlist } from '../../types/playlist';
import { CoverArt } from '../common/CoverArt';
import { TrackTable } from '../common/TrackTable';
import { Play, Sparkles, FolderDown, Heart, Clock } from 'lucide-react';
import { ActiveView } from '../layout/Sidebar';
import { evaluateSmartPlaylist } from '../../services/playlist/smartPlaylistEvaluator';

interface HomeViewProps {
  tracks: Track[];
  playlists: Playlist[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track, trackList: Track[]) => void;
  onTogglePlay: () => void;
  onToggleFavorite: (trackId: string) => void;
  onOpenContextMenu: (e: React.MouseEvent, track: Track) => void;
  onSelectView: (view: ActiveView, playlistId?: string) => void;
  onOpenImportModal: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  tracks,
  playlists,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onToggleFavorite,
  onOpenContextMenu,
  onSelectView,
  onOpenImportModal,
}) => {
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const recentlyPlayed = [...tracks]
    .filter((t) => t.lastPlayedAt)
    .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0))
    .slice(0, 5);

  const recentlyAdded = [...tracks]
    .sort((a, b) => b.dateAdded - a.dateAdded)
    .slice(0, 6);

  const favoriteTracks = tracks.filter((t) => t.isFavorite);

  // Quick 6 cards on top of dashboard
  const quickCards = [
    ...(favoriteTracks.length > 0
      ? [
          {
            id: 'favs',
            title: 'Liked Songs',
            subtitle: `${favoriteTracks.length} tracks`,
            icon: <Heart size={20} className="text-rose-400 fill-rose-500/30" />,
            onClick: () => onSelectView('favorites'),
          },
        ]
      : []),
    ...playlists.slice(0, 5).map((pl) => {
      const isSmart = Boolean(pl.isSmart);
      let count = pl.trackIds.length;
      if (isSmart && pl.smartConfig) {
        count = evaluateSmartPlaylist(pl.smartConfig, tracks).length;
      }
      return {
        id: pl.id,
        title: pl.name,
        subtitle: `${count} tracks${isSmart ? ' · Smart' : ''}`,
        icon: isSmart ? <Sparkles size={18} className="text-brand-400" /> : undefined,
        onClick: () => onSelectView('playlist_detail', pl.id),
      };
    }),
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{greeting}</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Welcome to your local music sanctum. {tracks.length} tracks in your library.
          </p>
        </div>

        <button
          onClick={onOpenImportModal}
          className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center gap-2 border border-white/10 shadow-sm transition-all active:scale-95"
        >
          <FolderDown size={15} className="text-brand-400" />
          <span>Import Local Audio</span>
        </button>
      </div>

      {/* Quick Picks Cards Grid */}
      {quickCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickCards.map((card) => (
            <div
              key={card.id}
              onClick={card.onClick}
              className="group relative flex items-center gap-3.5 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all cursor-pointer shadow-sm"
            >
              <div className="w-12 h-12 rounded-md bg-neutral-900 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                {'icon' in card && card.icon ? (
                  card.icon
                ) : (
                  <Sparkles size={18} className="text-brand-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-neutral-100 text-sm truncate group-hover:text-brand-400 transition-colors">
                  {card.title}
                </p>
                <p className="text-xs text-neutral-400 truncate">{card.subtitle}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-brand-500 text-neutral-950 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 shrink-0 mr-1">
                <Play size={14} className="fill-current ml-0.5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recently Added Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-brand-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Recently Added</h2>
          </div>
          <button
            onClick={() => onSelectView('library')}
            className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
          >
            Show all
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {recentlyAdded.map((track) => (
            <div
              key={track.id}
              onClick={() => onPlayTrack(track, tracks)}
              onContextMenu={(e) => {
                e.preventDefault();
                onOpenContextMenu(e, track);
              }}
              className="group relative p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
            >
              <div className="relative aspect-square w-full rounded-lg overflow-hidden mb-3 shadow-md">
                <CoverArt
                  url={track.coverArtUrl}
                  title={track.title}
                  artist={track.artist}
                  size="xl"
                  className="w-full h-full"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentTrackId === track.id) {
                      onTogglePlay();
                    } else {
                      onPlayTrack(track, tracks);
                    }
                  }}
                  className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-brand-500 text-neutral-950 flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all"
                  title="Play"
                >
                  <Play size={18} className="fill-current ml-0.5" />
                </button>
              </div>

              <p className="font-semibold text-neutral-100 text-sm truncate">{track.title}</p>
              <p className="text-xs text-neutral-400 truncate mt-0.5">{track.artist}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Played or Top Tracks Section */}
      {recentlyPlayed.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white tracking-tight">Jump Back In</h2>
            <button
              onClick={() => onSelectView('recently_played')}
              className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
            >
              View history
            </button>
          </div>

          <div className="bg-neutral-900/40 rounded-xl border border-white/5 overflow-hidden">
            <TrackTable
              tracks={recentlyPlayed}
              currentTrackId={currentTrackId}
              isPlaying={isPlaying}
              onPlayTrack={onPlayTrack}
              onTogglePlay={onTogglePlay}
              onToggleFavorite={onToggleFavorite}
              onOpenContextMenu={onOpenContextMenu}
              showDateAdded={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};
