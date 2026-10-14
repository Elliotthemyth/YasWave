import React, { useState, useMemo } from 'react';
import { Track } from '../../types/track';
import { TrackTable } from '../common/TrackTable';
import { CoverArt } from '../common/CoverArt';
import { Search, Play } from 'lucide-react';

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

  // Top result (best match)
  const topResult = matchingTracks[0] || null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 select-none">
      {/* Search Header */}
      <div className="space-y-4">
        <div className="relative max-w-xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, artist, album, or genre..."
            className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-brand-500/50 shadow-lg"
            autoFocus
          />
        </div>

        {/* Filter categories */}
        {query && (
          <div className="flex items-center gap-1.5">
            {(['all', 'tracks', 'artists', 'albums'] as SearchFilterCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                  category === cat
                    ? 'bg-white text-neutral-950 font-semibold shadow'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {!query ? (
        <div className="py-20 flex flex-col items-center justify-center text-center text-neutral-500 space-y-2">
          <Search size={40} className="stroke-1 text-neutral-600 mb-2" />
          <p className="text-base font-medium text-neutral-400">Search your music library</p>
          <p className="text-xs max-w-sm">
            Find songs by track title, artist name, album, or genre across your imported collection.
          </p>
        </div>
      ) : matchingTracks.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center text-neutral-400 space-y-2">
          <p className="text-base font-semibold text-neutral-300">
            No results found for &ldquo;{searchQuery}&rdquo;
          </p>
          <p className="text-xs text-neutral-500">
            Please check your spelling or import new audio files.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Result + Songs split (Spotify style) */}
          {(category === 'all' || category === 'tracks') && topResult && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Top Result Card */}
              <div className="lg:col-span-2 space-y-3">
                <h3 className="text-base font-bold text-white tracking-tight">Top Result</h3>
                <div
                  onClick={() => onPlayTrack(topResult, matchingTracks)}
                  className="group relative p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all cursor-pointer flex flex-col justify-between h-56 shadow-lg"
                >
                  <CoverArt
                    url={topResult.coverArtUrl}
                    title={topResult.title}
                    artist={topResult.artist}
                    size="lg"
                    rounded="lg"
                  />

                  <div>
                    <h4 className="text-xl font-bold text-white truncate group-hover:text-brand-400 transition-colors">
                      {topResult.title}
                    </h4>
                    <p className="text-xs text-neutral-400 mt-1">
                      Song · <span className="text-neutral-200">{topResult.artist}</span>
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayTrack(topResult, matchingTracks);
                    }}
                    className="absolute bottom-5 right-5 w-12 h-12 rounded-full bg-brand-500 text-neutral-950 flex items-center justify-center shadow-2xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all hover:scale-105"
                    title="Play"
                  >
                    <Play size={22} className="fill-current ml-0.5" />
                  </button>
                </div>
              </div>

              {/* Matching Songs Table */}
              <div className="lg:col-span-3 space-y-3">
                <h3 className="text-base font-bold text-white tracking-tight">Songs</h3>
                <div className="bg-neutral-900/40 rounded-xl border border-white/5 overflow-hidden">
                  <TrackTable
                    tracks={matchingTracks.slice(0, 5)}
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
            </div>
          )}

          {/* All Tracks Full List if 'all' or 'tracks' */}
          {category === 'tracks' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white tracking-tight">All Matching Tracks</h3>
              <div className="bg-neutral-900/40 rounded-xl border border-white/5 overflow-hidden">
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

          {/* Artists Section */}
          {(category === 'all' || category === 'artists') && matchingArtists.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white tracking-tight">Artists</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {matchingArtists.map((item) => (
                  <div
                    key={item.artist}
                    onClick={() => onPlayTrack(item.tracks[0], item.tracks)}
                    className="group p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all cursor-pointer flex flex-col items-center text-center"
                  >
                    <CoverArt
                      url={item.tracks[0]?.coverArtUrl}
                      title={item.artist}
                      artist={item.artist}
                      size="lg"
                      rounded="full"
                      className="mb-3 shadow-md group-hover:scale-105 transition-transform"
                    />
                    <p className="font-semibold text-neutral-100 text-sm truncate w-full">
                      {item.artist}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {item.tracks.length} {item.tracks.length === 1 ? 'song' : 'songs'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
