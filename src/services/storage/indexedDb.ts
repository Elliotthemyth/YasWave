import { APP_CONFIG } from '../../config/appConfig';
import { Track } from '../../types/track';
import { Playlist } from '../../types/playlist';
import { UserPreferences, DEFAULT_PREFERENCES } from '../../types/settings';

const DB_NAME = APP_CONFIG.dbName;
const DB_VERSION = APP_CONFIG.dbVersion;

const STORE_TRACKS = 'tracks';
const STORE_PLAYLISTS = 'playlists';
const STORE_PREFERENCES = 'preferences';

let dbInstance: IDBDatabase | null = null;

export async function getDb(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        const trackStore = db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
        trackStore.createIndex('title', 'title', { unique: false });
        trackStore.createIndex('artist', 'artist', { unique: false });
        trackStore.createIndex('album', 'album', { unique: false });
        trackStore.createIndex('isFavorite', 'isFavorite', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
        db.createObjectStore(STORE_PLAYLISTS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_PREFERENCES)) {
        db.createObjectStore(STORE_PREFERENCES, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
    };
  });
}

export async function idbGetAllTracks(): Promise<Track[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const store = tx.objectStore(STORE_TRACKS);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function idbSaveTrack(track: Track): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    
    // Sanitize track so we don't accidentally serialize expired blob: URLs into permanent storage
    const sanitized = { ...track };
    if (sanitized.coverArtUrl?.startsWith('blob:')) {
      // Don't keep expired session blob url
      sanitized.coverArtUrl = undefined;
    }

    const request = store.put(sanitized);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function idbSaveTracks(tracks: Track[]): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);

    for (const track of tracks) {
      const sanitized = { ...track };
      if (sanitized.coverArtUrl?.startsWith('blob:')) {
        sanitized.coverArtUrl = undefined;
      }
      store.put(sanitized);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDeleteTrack(id: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function idbGetAllPlaylists(): Promise<Playlist[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAYLISTS, 'readonly');
    const store = tx.objectStore(STORE_PLAYLISTS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function idbSavePlaylist(playlist: Playlist): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAYLISTS, 'readwrite');
    const store = tx.objectStore(STORE_PLAYLISTS);
    const request = store.put(playlist);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function idbDeletePlaylist(id: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAYLISTS, 'readwrite');
    const store = tx.objectStore(STORE_PLAYLISTS);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function idbGetPreferences(): Promise<UserPreferences> {
  const db = await getDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_PREFERENCES, 'readonly');
    const store = tx.objectStore(STORE_PREFERENCES);
    const request = store.get('app_preferences');
    request.onsuccess = () => {
      if (request.result && request.result.value) {
        resolve({ ...DEFAULT_PREFERENCES, ...request.result.value });
      } else {
        resolve(DEFAULT_PREFERENCES);
      }
    };
    request.onerror = () => resolve(DEFAULT_PREFERENCES);
  });
}

export async function idbSavePreferences(prefs: UserPreferences): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PREFERENCES, 'readwrite');
    const store = tx.objectStore(STORE_PREFERENCES);
    const request = store.put({ key: 'app_preferences', value: prefs });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function idbClearAll(): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRACKS, STORE_PLAYLISTS, STORE_PREFERENCES], 'readwrite');
    tx.objectStore(STORE_TRACKS).clear();
    tx.objectStore(STORE_PLAYLISTS).clear();
    tx.objectStore(STORE_PREFERENCES).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
