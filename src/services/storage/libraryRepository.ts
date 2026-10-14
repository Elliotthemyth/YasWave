import { LibraryRepository } from '../../types/adapters';
import { Track } from '../../types/track';
import { Playlist } from '../../types/playlist';
import { UserPreferences } from '../../types/settings';
import {
  getDb,
  idbGetAllTracks,
  idbSaveTrack,
  idbSaveTracks,
  idbDeleteTrack,
  idbGetAllPlaylists,
  idbSavePlaylist,
  idbDeletePlaylist,
  idbGetPreferences,
  idbSavePreferences,
  idbClearAll,
} from './indexedDb';

/**
 * Browser IndexedDB implementation of LibraryRepository.
 * Compatible with future Tauri desktop SQLite repository.
 */
export class BrowserLibraryRepository implements LibraryRepository {
  async init(): Promise<void> {
    await getDb();
  }

  async getAllTracks(): Promise<Track[]> {
    return idbGetAllTracks();
  }

  async getTrack(id: string): Promise<Track | undefined> {
    const tracks = await idbGetAllTracks();
    return tracks.find((t) => t.id === id);
  }

  async saveTrack(track: Track): Promise<void> {
    return idbSaveTrack(track);
  }

  async saveTracks(tracks: Track[]): Promise<void> {
    return idbSaveTracks(tracks);
  }

  async deleteTrack(id: string): Promise<void> {
    return idbDeleteTrack(id);
  }

  async getAllPlaylists(): Promise<Playlist[]> {
    return idbGetAllPlaylists();
  }

  async savePlaylist(playlist: Playlist): Promise<void> {
    return idbSavePlaylist(playlist);
  }

  async deletePlaylist(id: string): Promise<void> {
    return idbDeletePlaylist(id);
  }

  async getPreferences(): Promise<UserPreferences> {
    return idbGetPreferences();
  }

  async savePreferences(prefs: UserPreferences): Promise<void> {
    return idbSavePreferences(prefs);
  }

  async clearAllData(): Promise<void> {
    return idbClearAll();
  }
}

export const defaultRepository = new BrowserLibraryRepository();
