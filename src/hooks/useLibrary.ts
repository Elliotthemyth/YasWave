import { useState, useEffect, useCallback } from 'react';
import { Track, TrackUpdateInput } from '../types/track';
import { Playlist } from '../types/playlist';
import { defaultRepository } from '../services/storage/libraryRepository';
import { DEMO_TRACKS } from '../config/defaultTracks';
import { extractMetadata } from '../services/metadata/metadataParser';
import { browserFileAdapter } from '../services/filesystem/browserFileAdapter';

export function useLibrary() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);

  // Load initial data from persistence
  const reloadData = useCallback(async () => {
    try {
      setIsLoading(true);
      await defaultRepository.init();
      
      let storedTracks = await defaultRepository.getAllTracks();
      let storedPlaylists = await defaultRepository.getAllPlaylists();

      // First run: seed with built-in ambient demo tracks
      if (storedTracks.length === 0) {
        const seedTracks = DEMO_TRACKS.map((d) => d.track);
        await defaultRepository.saveTracks(seedTracks);
        storedTracks = seedTracks;

        // Create default starter playlist
        const defaultPlaylist: Playlist = {
          id: 'playlist-chill-ambient',
          name: 'Late Night Coding',
          description: 'Atmospheric electronic rhythms and lo-fi melodies.',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          trackIds: seedTracks.map((t) => t.id),
        };
        await defaultRepository.savePlaylist(defaultPlaylist);

        // Create default starter smart playlist: Recently Added
        const starterSmartPlaylist: Playlist = {
          id: 'playlist-smart-recent',
          name: 'Recently Added',
          description: 'Dynamic smart playlist showing the latest audio tracks imported to your library.',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          trackIds: [],
          isSmart: true,
          smartConfig: {
            matchStrategy: 'all',
            rules: [
              {
                id: 'rule-ra-init',
                field: 'dateAdded',
                operator: 'in_last_days',
                value: 60,
              },
            ],
            sortBy: 'dateAdded',
            sortDirection: 'desc',
            limit: 50,
          },
        };
        await defaultRepository.savePlaylist(starterSmartPlaylist);
        storedPlaylists = [defaultPlaylist, starterSmartPlaylist];
      }

      setTracks(storedTracks);
      setPlaylists(storedPlaylists);
    } catch (err) {
      console.error('Failed to load library data from IndexedDB:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  /**
   * Import multiple audio files into the library
   */
  const importFiles = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) return [];
    
    setIsImporting(true);
    const newTracks: Track[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setImportProgress({
        current: i + 1,
        total: files.length,
        fileName: file.name,
      });

      try {
        const metadata = await extractMetadata(file);
        const trackId = `track-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        // Register in browser session file adapter
        browserFileAdapter.registerFile(trackId, file);

        const newTrack: Track = {
          id: trackId,
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album,
          albumArtist: metadata.albumArtist,
          year: metadata.year,
          trackNumber: metadata.trackNumber,
          genre: metadata.genre,
          duration: metadata.duration,
          coverArtUrl: metadata.coverArtUrl,
          hasEmbeddedCover: metadata.hasEmbeddedCover,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'audio/mpeg',
          dateAdded: Date.now(),
          playCount: 0,
          isFavorite: false,
          sourceType: 'browser_file',
          lyricsOffset: 0,
        };

        newTracks.push(newTrack);
      } catch (err) {
        console.error(`Error processing audio file ${file.name}:`, err);
      }
    }

    if (newTracks.length > 0) {
      await defaultRepository.saveTracks(newTracks);
      setTracks((prev) => [...newTracks, ...prev]);
    }

    setIsImporting(false);
    setImportProgress(null);
    return newTracks;
  }, []);

  /**
   * Toggle favorite state for a track
   */
  const toggleFavorite = useCallback(async (trackId: string) => {
    setTracks((prev) => {
      const target = prev.find((t) => t.id === trackId);
      if (!target) return prev;

      const updated = { ...target, isFavorite: !target.isFavorite };
      defaultRepository.saveTrack(updated).catch(console.error);

      return prev.map((t) => (t.id === trackId ? updated : t));
    });
  }, []);

  /**
   * Update track metadata
   */
  const updateTrack = useCallback(async (trackId: string, updates: TrackUpdateInput) => {
    setTracks((prev) => {
      const target = prev.find((t) => t.id === trackId);
      if (!target) return prev;

      const updated: Track = {
        ...target,
        ...updates,
      };

      defaultRepository.saveTrack(updated).catch(console.error);
      return prev.map((t) => (t.id === trackId ? updated : t));
    });
  }, []);

  /**
   * Delete track from library
   */
  const deleteTrack = useCallback(async (trackId: string) => {
    await defaultRepository.deleteTrack(trackId);
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    // Also remove from any playlists containing it
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.trackIds.includes(trackId)) {
          const updatedPl = {
            ...pl,
            trackIds: pl.trackIds.filter((id) => id !== trackId),
            updatedAt: Date.now(),
          };
          defaultRepository.savePlaylist(updatedPl).catch(console.error);
          return updatedPl;
        }
        return pl;
      })
    );
  }, []);

  /**
   * Increment track play count
   */
  const recordTrackPlayed = useCallback(async (trackId: string) => {
    setTracks((prev) => {
      const target = prev.find((t) => t.id === trackId);
      if (!target) return prev;

      const updated = {
        ...target,
        playCount: (target.playCount || 0) + 1,
        lastPlayedAt: Date.now(),
      };
      defaultRepository.saveTrack(updated).catch(console.error);

      return prev.map((t) => (t.id === trackId ? updated : t));
    });
  }, []);

  /**
   * Playlist operations
   */
  const createPlaylist = useCallback(async (name: string, description?: string): Promise<Playlist> => {
    const newPlaylist: Playlist = {
      id: `playlist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim() || 'New Playlist',
      description: description?.trim() || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      trackIds: [],
    };

    await defaultRepository.savePlaylist(newPlaylist);
    setPlaylists((prev) => [newPlaylist, ...prev]);
    return newPlaylist;
  }, []);

  const createSmartPlaylist = useCallback(
    async (
      name: string,
      description?: string,
      smartConfig?: import('../types/playlist').SmartPlaylistConfig
    ): Promise<Playlist> => {
      const newPlaylist: Playlist = {
        id: `playlist-smart-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: name.trim() || 'New Smart Playlist',
        description: description?.trim() || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        trackIds: [],
        isSmart: true,
        smartConfig: smartConfig || {
          matchStrategy: 'all',
          rules: [],
          sortBy: 'dateAdded',
          sortDirection: 'desc',
          limit: 50,
        },
      };

      await defaultRepository.savePlaylist(newPlaylist);
      setPlaylists((prev) => [newPlaylist, ...prev]);
      return newPlaylist;
    },
    []
  );

  const updatePlaylist = useCallback(async (playlistId: string, updates: Partial<Playlist>) => {
    setPlaylists((prev) => {
      const target = prev.find((pl) => pl.id === playlistId);
      if (!target) return prev;

      const updated = {
        ...target,
        ...updates,
        updatedAt: Date.now(),
      };

      defaultRepository.savePlaylist(updated).catch(console.error);
      return prev.map((pl) => (pl.id === playlistId ? updated : pl));
    });
  }, []);

  const deletePlaylist = useCallback(async (playlistId: string) => {
    await defaultRepository.deletePlaylist(playlistId);
    setPlaylists((prev) => prev.filter((pl) => pl.id !== playlistId));
  }, []);

  const addTrackToPlaylist = useCallback(async (playlistId: string, trackId: string) => {
    setPlaylists((prev) => {
      const target = prev.find((pl) => pl.id === playlistId);
      if (!target) return prev;

      if (target.trackIds.includes(trackId)) {
        return prev; // already present
      }

      const updated = {
        ...target,
        trackIds: [...target.trackIds, trackId],
        updatedAt: Date.now(),
      };

      defaultRepository.savePlaylist(updated).catch(console.error);
      return prev.map((pl) => (pl.id === playlistId ? updated : pl));
    });
  }, []);

  const removeTrackFromPlaylist = useCallback(async (playlistId: string, trackId: string) => {
    setPlaylists((prev) => {
      const target = prev.find((pl) => pl.id === playlistId);
      if (!target) return prev;

      const updated = {
        ...target,
        trackIds: target.trackIds.filter((id) => id !== trackId),
        updatedAt: Date.now(),
      };

      defaultRepository.savePlaylist(updated).catch(console.error);
      return prev.map((pl) => (pl.id === playlistId ? updated : pl));
    });
  }, []);

  return {
    tracks,
    playlists,
    isLoading,
    isImporting,
    importProgress,
    importFiles,
    toggleFavorite,
    updateTrack,
    deleteTrack,
    recordTrackPlayed,
    createPlaylist,
    createSmartPlaylist,
    updatePlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    reloadData,
  };
}
