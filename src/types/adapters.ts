import { Track } from './track';
import { Playlist } from './playlist';
import { UserPreferences } from './settings';

export interface ImportedAudioFile {
  file: File;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  webkitRelativePath?: string;
}

export interface FileAdapter {
  readonly mode: 'browser' | 'tauri';
  selectFiles(options?: { multiple?: boolean; accept?: string }): Promise<File[]>;
  selectFolder(): Promise<File[]>;
  getPlayableUrl(track: Track): Promise<string>;
  revokePlayableUrl(url: string): void;
  isAvailable(): boolean;
}

export interface LibraryRepository {
  init(): Promise<void>;
  getAllTracks(): Promise<Track[]>;
  getTrack(id: string): Promise<Track | undefined>;
  saveTrack(track: Track): Promise<void>;
  saveTracks(tracks: Track[]): Promise<void>;
  deleteTrack(id: string): Promise<void>;
  
  getAllPlaylists(): Promise<Playlist[]>;
  savePlaylist(playlist: Playlist): Promise<void>;
  deletePlaylist(id: string): Promise<void>;
  
  getPreferences(): Promise<UserPreferences>;
  savePreferences(prefs: UserPreferences): Promise<void>;

  clearAllData(): Promise<void>;
}
