export type AudioFormat = 'mp3' | 'flac' | 'wav' | 'ogg' | 'm4a' | 'aac' | 'opus' | 'weba' | 'unknown';

export interface TrackMetadata {
  title: string;
  artist: string;
  album: string;
  albumArtist?: string;
  year?: number;
  trackNumber?: number;
  genre?: string;
  duration: number; // in seconds
  coverArtUrl?: string; // object URL or data URL
  hasEmbeddedCover?: boolean;
  bpm?: number; // Beats Per Minute
  key?: string; // e.g. 'C Major', 'A Minor'
  keyCamelot?: string; // e.g. '8B', '8A'
}

export interface Track extends TrackMetadata {
  id: string; // UUID or unique hash
  fileName: string;
  fileSize: number; // in bytes
  fileType: string; // mime type
  dateAdded: number; // timestamp
  playCount: number;
  lastPlayedAt?: number;
  isFavorite: boolean;
  sourceType: 'browser_file' | 'tauri_fs' | 'synth_demo';
  filePath?: string; // used in Tauri mode
  fileHandleId?: string; // reference to file
  lyrics?: string; // LRC or plain text lyrics
  lyricsOffset?: number; // synchronization offset in seconds
  persianTranslations?: Record<string, string>; // cached Persian line translations
  lyricsProvider?: string; // e.g. 'LRCLIB' or 'local'
  bpm?: number;
  key?: string;
  keyCamelot?: string;
}

export interface TrackUpdateInput {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string;
  trackNumber?: number;
  lyrics?: string;
  lyricsOffset?: number;
  coverArtUrl?: string;
  persianTranslations?: Record<string, string>;
  lyricsProvider?: string;
  bpm?: number;
  key?: string;
  keyCamelot?: string;
}
