import React from 'react';
import { Track } from '../../types/track';
import { Playlist } from '../../types/playlist';
import { CoverArt } from '../common/CoverArt';
import { TrackTable } from '../common/TrackTable';
import { Play, Sparkles, FolderDown, Heart, Clock, Music2 } from 'lucide-react';
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
    .slice(0, 6);

  const recentlyAdded = [...tracks]
    .sort((a, b) => b.dateAdded - a.dateAdded)
    .slice(0, 8);

  const favoriteTracks = tracks.filter((t) => t.isFavorite);

  // Quick shortcut cards
  const quickCards = [
    ...(favoriteTracks.length > 0
      ? [
          {
            id: 'favs',
            title: 'Liked Songs',
            subtitle: `${favoriteTracks.length} tracks`,
            icon: <Heart size={18} className="text-rose-400 fill-rose-500/40" />,
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
        icon: isSmart ? <Sparkles size={16} className="text-brand-400" /> : undefined,
        onClick: () => onSelectView('playlist_detail', pl.id),
      };
    }),
  ];

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] px-4 text-center select-none">
        <div className="w-20 h-20 rounded-3xl bg-neutral-900 border border-white/10 flex items-center justify-center text-brand-400 mb-6 shadow-xl">
          <Music2 size={36} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Welcome to YASWAVE</h1>
        <p className="text-sm text-neutral-400 max-w-sm mt-2 leading-relaxed">
          Your Android-first local music sanctum. Import your audio library to start playing with synchronized lyrics, BPM detection, and offline playback.
        </p>
        <button
          onClick={onOpenImportModal}
          className="mt-6 px-6 py-3.5 rounded-2xl bg-brand-500 text-neutral-950 font-semibold text-sm flex items-center gap-2 shadow-xl shadow-brand-500/25 active:scale-95 transition-all cursor-pointer"
        >
          <FolderDown size={18} />
          <span>Import Local Music</span>
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 md:px-8 md:py-6 max-w-5xl mx-auto space-y-6 select-none">
      {/* Top Welcome Bar */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{greeting}</h1>
          <p className="text-xs text-neutral-400 mt-1">
            {tracks.length} tracks in your library
          </p>
        </div>

        <button
          onClick={onOpenImportModal}
          className="h-10 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center gap-2 border border-white/5 active:scale-95 transition-all"
        >
          <FolderDown size={15} className="text-brand-400" />
          <span>Import</span>
        </button>
      </div>

      {/* Quick Access Grid (Liked songs & top playlists) */}
      {quickCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {quickCards.map((card) => (
            <div
              key={card.id}
              onClick={card.onClick}
              className="group flex items-center gap-3 p-2.5 rounded-2xl bg-neutral-900/70 hover:bg-neutral-900 border border-white/5 hover:border-white/15 transition-all cursor-pointer active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-white/10 flex items-center justify-center shrink-0">
                {'icon' in card && card.icon ? (
                  card.icon
                ) : (
                  <Sparkles size={16} className="text-brand-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p dir="auto" className="font-semibold text-xs text-white truncate">
                  {card.title}
                </p>
                <p className="text-[10px] text-neutral-400 truncate mt-0.5">{card.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recently Added Carousel/Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-brand-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Recently Added</h2>
          </div>
          <button
            onClick={() => onSelectView('library')}
            className="text-xs font-semibold text-brand-400 hover:text-brand-300"
          >
            See all
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {recentlyAdded.map((track) => (
            <div
              key={track.id}
              onClick={() => onPlayTrack(track, tracks)}
              onContextMenu={(e) => {
                e.preventDefault();
                onOpenContextMenu(e, track);
              }}
              className="group p-2.5 rounded-2xl bg-neutral-900/60 hover:bg-neutral-900 border border-white/5 hover:border-white/15 transition-all cursor-pointer active:scale-[0.98]"
            >
              <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-2 shadow-md">
                <CoverArt
                  url={track.coverArtUrl}
                  title={track.title}
                  artist={track.artist}
                  size="xl"
                  className="w-full h-full object-cover"
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
                  className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-brand-500 text-neutral-950 flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Play"
                >
                  <Play size={15} className="fill-current ml-0.5" />
                </button>
              </div>
              <p dir="auto" className="font-semibold text-xs text-white truncate leading-snug">
                {track.title}
              </p>
              <p dir="auto" className="text-[11px] text-neutral-400 truncate mt-0.5">
                {track.artist}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Jump Back In / Recently Played */}
      {recentlyPlayed.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight">Jump Back In</h2>
            <button
              onClick={() => onSelectView('recently_played')}
              className="text-xs font-semibold text-brand-400 hover:text-brand-300"
            >
              History
            </button>
          </div>

          <div className="bg-neutral-900/40 rounded-2xl border border-white/5 overflow-hidden p-1">
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
