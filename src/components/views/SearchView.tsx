import React, { useState, useMemo } from 'react';
import { Track } from '../../types/track';
import { TrackTable } from '../common/TrackTable';
import { CoverArt } from '../common/CoverArt';
import { Search, Play, Disc3, Mic2, Music2 } from 'lucide-react';

interface SearchViewProps {
  tracks: Track[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track, trackList: Track[]) => void;
  onTogglePlay: () => void;
  onToggleFavorite: (trackId: string) => void;
  onOpenContextMenu: (e: React.MouseEvent, track: Track) => void;
}

type SearchFilterCategory = 'all' | 'tracks' | 'artists' | 'albums';

export const SearchView: React.FC<SearchViewProps> = ({
  tracks,
  searchQuery,
  onSearchChange,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onToggleFavorite,
  onOpenContextMenu,
}) => {
  const [category, setCategory] = useState<SearchFilterCategory>('all');

  const query = searchQuery.trim().toLowerCase();

  const matchingTracks = useMemo(() => {
    if (!query) return [];
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.artist.toLowerCase().includes(query) ||
        (t.album && t.album.toLowerCase().includes(query)) ||
        (t.genre && t.genre.toLowerCase().includes(query))
    );
  }, [tracks, query]);

  // Unique artists matching query
  const matchingArtists = useMemo(() => {
    if (!query) return [];
    const artistMap = new Map<string, Track[]>();
    tracks.forEach((t) => {
      if (t.artist.toLowerCase().includes(query)) {
        const list = artistMap.get(t.artist) || [];
        list.push(t);
        artistMap.set(t.artist, list);
      }
    });
    return Array.from(artistMap.entries()).map(([artist, trackList]) => ({
      artist,
      tracks: trackList,
    }));
  }, [tracks, query]);

  // Unique albums matching query
  const matchingAlbums = useMemo(() => {
    if (!query) return [];
    const albumMap = new Map<string, Track[]>();
    tracks.forEach((t) => {
      if (t.album && t.album.toLowerCase().includes(query)) {
        const list = albumMap.get(t.album) || [];
        list.push(t);
        albumMap.set(t.album, list);
      }
    });
    return Array.from(albumMap.entries()).map(([album, trackList]) => ({
      album,
      tracks: trackList,
      artist: trackList[0]?.artist || 'Unknown Artist',
      coverArtUrl: trackList[0]?.coverArtUrl,
    }));
  }, [tracks, query]);

  // Top result (best match)
  const topResult = matchingTracks[0] || null;

  return (
    <div className="px-4 py-4 md:px-8 md:py-6 max-w-5xl mx-auto space-y-4 select-none">
      {/* Search Input Field */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search songs, artists, albums, or genres..."
          className="w-full bg-neutral-900 border border-white/10 rounded-2xl pl-12 pr-10 py-3.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-brand-500/50 shadow-xl"
          autoFocus
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 text-neutral-300 hover:text-white flex items-center justify-center text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Categories */}
      {query && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {(['all', 'tracks', 'artists', 'albums'] as SearchFilterCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all active:scale-95 ${
                category === cat
                  ? 'bg-white text-neutral-950 shadow-md'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Search Content */}
      {!query ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-3xl bg-neutral-900/80 border border-white/10 flex items-center justify-center text-neutral-500 mb-4">
            <Search size={28} />
          </div>
          <p className="text-base font-semibold text-neutral-300">Search Your Library</p>
          <p className="text-xs text-neutral-500 mt-1 max-w-xs">
            Find any track, artist, album or genre in your local collection.
          </p>
        </div>
      ) : matchingTracks.length === 0 && matchingArtists.length === 0 && matchingAlbums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm font-medium text-neutral-400">No results found for &ldquo;{searchQuery}&rdquo;</p>
          <p className="text-xs text-neutral-500 mt-1">Check spelling or search for another term.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Result Card */}
          {topResult && (category === 'all' || category === 'tracks') && (
            <div>
              <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Top Result
              </h2>
              <div
                onClick={() => onPlayTrack(topResult, matchingTracks)}
                className="group p-4 rounded-2xl bg-neutral-900/80 hover:bg-neutral-900 border border-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center gap-4 active:scale-[0.99]"
              >
                <CoverArt
                  url={topResult.coverArtUrl}
                  title={topResult.title}
                  artist={topResult.artist}
                  size="md"
                  rounded="xl"
                  className="w-16 h-16 object-cover shadow-md"
                />
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="font-bold text-base text-white truncate">
                    {topResult.title}
                  </p>
                  <p dir="auto" className="text-sm text-neutral-400 truncate mt-0.5">
                    {topResult.artist} · {topResult.album || 'Single'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-brand-500 text-neutral-950 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
                  <Play size={18} className="fill-current ml-0.5" />
                </div>
              </div>
            </div>
          )}

          {/* Artists Match */}
          {matchingArtists.length > 0 && (category === 'all' || category === 'artists') && (
            <div>
              <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Artists
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {matchingArtists.map((a) => (
                  <div
                    key={a.artist}
                    onClick={() => onPlayTrack(a.tracks[0], a.tracks)}
                    className="p-3 rounded-2xl bg-neutral-900/60 hover:bg-neutral-900 border border-white/5 flex items-center gap-3 cursor-pointer active:scale-95 transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center shrink-0">
                      <Mic2 size={16} className="text-brand-400" />
                    </div>
                    <div className="min-w-0">
                      <p dir="auto" className="font-semibold text-xs text-white truncate">
                        {a.artist}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                        {a.tracks.length} {a.tracks.length === 1 ? 'song' : 'songs'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Albums Match */}
          {matchingAlbums.length > 0 && (category === 'all' || category === 'albums') && (
            <div>
              <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Albums
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {matchingAlbums.map((alb) => (
                  <div
                    key={alb.album}
                    onClick={() => onPlayTrack(alb.tracks[0], alb.tracks)}
                    className="p-3 rounded-2xl bg-neutral-900/60 hover:bg-neutral-900 border border-white/5 flex flex-col cursor-pointer active:scale-95 transition-all"
                  >
                    <div className="aspect-square w-full rounded-xl overflow-hidden mb-2">
                      <CoverArt
                        url={alb.coverArtUrl}
                        title={alb.album}
                        artist={alb.artist}
                        size="md"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p dir="auto" className="font-semibold text-xs text-white truncate">
                      {alb.album}
                    </p>
                    <p dir="auto" className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {alb.artist}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tracks List Match */}
          {matchingTracks.length > 0 && (category === 'all' || category === 'tracks') && (
            <div>
              <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Songs ({matchingTracks.length})
              </h2>
              <div className="bg-neutral-900/40 rounded-2xl border border-white/5 overflow-hidden p-1">
                <TrackTable
                  tracks={matchingTracks}
                  currentTrackId={currentTrackId}
                  isPlaying={isPlaying}
                  onPlayTrack={onPlayTrack}
                  onTogglePlay={onTogglePlay}
                  onToggleFavorite={onToggleFavorite}
                  onOpenContextMenu={onOpenContextMenu}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
