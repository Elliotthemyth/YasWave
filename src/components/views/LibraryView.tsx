import React, { useState, useMemo } from 'react';
import { Track } from '../../types/track';
import { TrackTable } from '../common/TrackTable';
import { CoverArt } from '../common/CoverArt';
import { formatTime } from '../../utils/formatters';
import {
  Play,
  Shuffle,
  Search,
  FolderDown,
  Music2,
  Disc3,
  Mic2,
  Folder,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface LibraryViewProps {
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track, trackList: Track[]) => void;
  onTogglePlay: () => void;
  onToggleFavorite: (trackId: string) => void;
  onOpenContextMenu: (e: React.MouseEvent, track: Track) => void;
  onOpenImportModal: () => void;
  onShuffleAll: (tracks: Track[]) => void;
}

type LibraryTab = 'tracks' | 'albums' | 'artists' | 'folders';

export const LibraryView: React.FC<LibraryViewProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onToggleFavorite,
  onOpenContextMenu,
  onOpenImportModal,
  onShuffleAll,
}) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('tracks');
  const [filterText, setFilterText] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const totalDuration = useMemo(() => {
    return tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  }, [tracks]);

  // Derived Albums
  const albums = useMemo(() => {
    const map = new Map<string, { name: string; artist: string; coverArtUrl?: string; tracks: Track[] }>();
    tracks.forEach((t) => {
      const albumName = t.album || 'Unknown Album';
      const existing = map.get(albumName);
      if (existing) {
        existing.tracks.push(t);
        if (!existing.coverArtUrl && t.coverArtUrl) existing.coverArtUrl = t.coverArtUrl;
      } else {
        map.set(albumName, {
          name: albumName,
          artist: t.artist || 'Unknown Artist',
          coverArtUrl: t.coverArtUrl,
          tracks: [t],
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  // Derived Artists
  const artists = useMemo(() => {
    const map = new Map<string, { name: string; tracks: Track[]; coverArtUrl?: string }>();
    tracks.forEach((t) => {
      const artistName = t.artist || 'Unknown Artist';
      const existing = map.get(artistName);
      if (existing) {
        existing.tracks.push(t);
        if (!existing.coverArtUrl && t.coverArtUrl) existing.coverArtUrl = t.coverArtUrl;
      } else {
        map.set(artistName, {
          name: artistName,
          tracks: [t],
          coverArtUrl: t.coverArtUrl,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  // Derived Folders
  const folders = useMemo(() => {
    const map = new Map<string, { name: string; tracks: Track[] }>();
    tracks.forEach((t) => {
      let folderName = 'Local Library';
      if (t.filePath) {
        const parts = t.filePath.split(/[/\\]/);
        if (parts.length > 1) {
          folderName = parts[parts.length - 2];
        }
      }
      const existing = map.get(folderName);
      if (existing) {
        existing.tracks.push(t);
      } else {
        map.set(folderName, { name: folderName, tracks: [t] });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  // Filtered tracks
  const displayedTracks = useMemo(() => {
    let baseList = tracks;

    if (selectedAlbum) {
      baseList = baseList.filter((t) => (t.album || 'Unknown Album') === selectedAlbum);
    } else if (selectedArtist) {
      baseList = baseList.filter((t) => (t.artist || 'Unknown Artist') === selectedArtist);
    } else if (selectedFolder) {
      baseList = baseList.filter((t) => {
        if (!t.filePath) return selectedFolder === 'Local Library';
        const parts = t.filePath.split(/[/\\]/);
        const f = parts.length > 1 ? parts[parts.length - 2] : 'Local Library';
        return f === selectedFolder;
      });
    }

    if (!filterText.trim()) return baseList;
    const lower = filterText.toLowerCase();
    return baseList.filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        t.artist.toLowerCase().includes(lower) ||
        (t.album && t.album.toLowerCase().includes(lower)) ||
        (t.genre && t.genre.toLowerCase().includes(lower))
    );
  }, [tracks, selectedAlbum, selectedArtist, selectedFolder, filterText]);

  // If library is completely empty
  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center select-none">
        <div className="w-20 h-20 rounded-3xl bg-neutral-900 border border-white/10 flex items-center justify-center text-brand-400 mb-6 shadow-xl">
          <Music2 size={36} />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Your Music Library is Empty</h2>
        <p className="text-sm text-neutral-400 max-w-sm mt-2 leading-relaxed">
          Import your audio files (MP3, FLAC, M4A, OGG, WAV) to start listening with synchronized lyrics and audio analysis.
        </p>
        <button
          onClick={onOpenImportModal}
          className="mt-6 px-6 py-3 rounded-2xl bg-brand-500 text-neutral-950 font-semibold text-sm flex items-center gap-2 shadow-xl shadow-brand-500/20 active:scale-95 transition-all"
        >
          <FolderDown size={18} />
          <span>Import Audio Files</span>
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 md:px-8 md:py-6 max-w-5xl mx-auto space-y-4 select-none">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {selectedAlbum
              ? selectedAlbum
              : selectedArtist
              ? selectedArtist
              : selectedFolder
              ? selectedFolder
              : 'Your Library'}
          </h1>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
            <span>{displayedTracks.length} songs</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{formatTime(totalDuration)}</span>
            {(selectedAlbum || selectedArtist || selectedFolder) && (
              <button
                onClick={() => {
                  setSelectedAlbum(null);
                  setSelectedArtist(null);
                  setSelectedFolder(null);
                }}
                className="ml-2 text-brand-400 hover:text-brand-300 font-medium underline"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        {/* Quick Actions (Play All / Shuffle All / Import) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onPlayTrack(displayedTracks[0], displayedTracks)}
            className="h-10 px-4 rounded-xl bg-brand-500 text-neutral-950 font-semibold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-transform"
          >
            <Play size={15} className="fill-current ml-0.5" />
            <span>Play All</span>
          </button>

          <button
            onClick={() => onShuffleAll(displayedTracks)}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 text-white flex items-center justify-center active:scale-90 transition-transform"
            title="Shuffle Songs"
          >
            <Shuffle size={16} />
          </button>

          <button
            onClick={onOpenImportModal}
            className="h-10 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-1.5 border border-white/5 active:scale-95 transition-all"
            title="Import Music"
          >
            <FolderDown size={15} className="text-brand-400" />
            <span className="hidden sm:inline">Import</span>
          </button>
        </div>
      </div>

      {/* Android Segmented Tab Bar (Tracks | Albums | Artists | Folders) */}
      <div className="flex items-center gap-1.5 p-1 bg-neutral-900/90 border border-white/10 rounded-2xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => {
            setActiveTab('tracks');
            setSelectedAlbum(null);
            setSelectedArtist(null);
            setSelectedFolder(null);
          }}
          className={`flex-1 min-w-[72px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
            activeTab === 'tracks' && !selectedAlbum && !selectedArtist && !selectedFolder
              ? 'bg-white text-neutral-950 shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Music2 size={14} />
          <span>Tracks</span>
        </button>

        <button
          onClick={() => setActiveTab('albums')}
          className={`flex-1 min-w-[72px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
            activeTab === 'albums'
              ? 'bg-white text-neutral-950 shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Disc3 size={14} />
          <span>Albums ({albums.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('artists')}
          className={`flex-1 min-w-[72px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
            activeTab === 'artists'
              ? 'bg-white text-neutral-950 shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Mic2 size={14} />
          <span>Artists ({artists.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('folders')}
          className={`flex-1 min-w-[72px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
            activeTab === 'folders'
              ? 'bg-white text-neutral-950 shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Folder size={14} />
          <span>Folders ({folders.length})</span>
        </button>
      </div>

      {/* Filter search bar */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder={`Filter ${activeTab}...`}
          className="w-full bg-neutral-900/80 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-brand-500/50"
        />
        {filterText && (
          <button
            onClick={() => setFilterText('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tab Contents */}
      {activeTab === 'albums' && !selectedAlbum ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
          {albums
            .filter((a) => !filterText || a.name.toLowerCase().includes(filterText.toLowerCase()))
            .map((album) => (
              <div
                key={album.name}
                onClick={() => {
                  setSelectedAlbum(album.name);
                  setActiveTab('tracks');
                }}
                className="group p-2.5 rounded-2xl bg-neutral-900/60 hover:bg-neutral-900 border border-white/5 hover:border-white/15 transition-all cursor-pointer flex flex-col active:scale-[0.98]"
              >
                <div className="aspect-square w-full rounded-xl overflow-hidden mb-2 relative shadow-md">
                  <CoverArt
                    url={album.coverArtUrl}
                    title={album.name}
                    artist={album.artist}
                    size="xl"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-brand-500 text-neutral-950 flex items-center justify-center shadow-lg">
                      <Play size={16} className="fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
                <p dir="auto" className="font-semibold text-xs text-white truncate leading-snug">
                  {album.name}
                </p>
                <p dir="auto" className="text-[11px] text-neutral-400 truncate mt-0.5">
                  {album.artist}
                </p>
                <span className="text-[10px] text-neutral-500 mt-1 font-mono">
                  {album.tracks.length} {album.tracks.length === 1 ? 'song' : 'songs'}
                </span>
              </div>
            ))}
        </div>
      ) : activeTab === 'artists' && !selectedArtist ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
          {artists
            .filter((a) => !filterText || a.name.toLowerCase().includes(filterText.toLowerCase()))
            .map((artist) => (
              <div
                key={artist.name}
                onClick={() => {
                  setSelectedArtist(artist.name);
                  setActiveTab('tracks');
                }}
                className="group flex items-center justify-between p-3 rounded-2xl bg-neutral-900/60 hover:bg-neutral-900 border border-white/5 hover:border-white/15 transition-all cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-800 border border-white/10 shrink-0 shadow-sm flex items-center justify-center">
                    {artist.coverArtUrl ? (
                      <img
                        src={artist.coverArtUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Mic2 size={18} className="text-brand-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p dir="auto" className="font-semibold text-sm text-white truncate">
                      {artist.name}
                    </p>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">
                      {artist.tracks.length} {artist.tracks.length === 1 ? 'song' : 'songs'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-neutral-500 group-hover:text-white shrink-0" />
              </div>
            ))}
        </div>
      ) : activeTab === 'folders' && !selectedFolder ? (
        <div className="space-y-2 pt-2">
          {folders
            .filter((f) => !filterText || f.name.toLowerCase().includes(filterText.toLowerCase()))
            .map((folder) => (
              <div
                key={folder.name}
                onClick={() => {
                  setSelectedFolder(folder.name);
                  setActiveTab('tracks');
                }}
                className="group flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900/60 hover:bg-neutral-900 border border-white/5 hover:border-white/15 transition-all cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Folder size={18} />
                  </div>
                  <div className="min-w-0">
                    <p dir="auto" className="font-semibold text-sm text-white truncate">
                      {folder.name}
                    </p>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">
                      {folder.tracks.length} audio tracks
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-neutral-500 group-hover:text-white shrink-0" />
              </div>
            ))}
        </div>
      ) : (
        /* Tracks List (with TrackTable) */
        <div className="bg-neutral-900/40 rounded-2xl border border-white/5 overflow-hidden p-1">
          <TrackTable
            tracks={displayedTracks}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            onPlayTrack={onPlayTrack}
            onTogglePlay={onTogglePlay}
            onToggleFavorite={onToggleFavorite}
            onOpenContextMenu={onOpenContextMenu}
            emptyMessage={
              filterText
                ? 'No songs matched your filter.'
                : 'No tracks in this category.'
            }
          />
        </div>
      )}
    </div>
  );
};
