import * as mm from 'music-metadata-browser';
import { TrackMetadata } from '../../types/track';
import { calculateBpmAndKeyFromFile } from '../audio/audioAnalyzer';

/**
 * Clean up audio filename into a readable title fallback
 */
export function cleanFileNameToTitle(fileName: string): { title: string; artist: string } {
  // Remove file extension
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  
  // Clean underscores and excess hyphens
  const cleaned = baseName.replace(/_/g, ' ').trim();

  // Check for common patterns like "Artist - Title" or "01 - Artist - Title" or "01. Title"
  const trackNumMatch = cleaned.match(/^\d+[\.\-\s]+(.*)$/);
  const withoutLeadingNumber = trackNumMatch ? trackNumMatch[1].trim() : cleaned;

  if (withoutLeadingNumber.includes(' - ')) {
    const parts = withoutLeadingNumber.split(' - ');
    if (parts.length >= 2) {
      return {
        artist: parts[0].trim() || 'Unknown Artist',
        title: parts.slice(1).join(' - ').trim() || withoutLeadingNumber,
      };
    }
  }

  return {
    artist: 'Unknown Artist',
    title: withoutLeadingNumber || 'Untitled Track',
  };
}

/**
 * Measure duration using an in-memory HTMLAudioElement fallback
 */
export function probeAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';

    const cleanUp = () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('error', onError);
      URL.revokeObjectURL(url);
    };

    const onLoaded = () => {
      const dur = audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) ? audio.duration : 0;
      cleanUp();
      resolve(dur);
    };

    const onError = () => {
      cleanUp();
      resolve(0);
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('error', onError);
    audio.src = url;
  });
}

/**
 * Extract comprehensive metadata from an audio File using music-metadata-browser
 * with audio analysis for BPM and Musical Key detection.
 */
export async function extractMetadata(file: File): Promise<TrackMetadata> {
  const fallbackInfo = cleanFileNameToTitle(file.name);
  let duration = 0;
  let title = fallbackInfo.title;
  let artist = fallbackInfo.artist;
  let album = 'Unknown Album';
  let albumArtist: string | undefined;
  let year: number | undefined;
  let trackNumber: number | undefined;
  let genre: string | undefined;
  let coverArtUrl: string | undefined;
  let hasEmbeddedCover = false;
  let tagBpm: number | undefined;
  let tagKey: string | undefined;

  try {
    const parsed = await mm.parseBlob(file, { duration: true, skipCovers: false });
    const common = parsed.common;

    if (common.title && common.title.trim().length > 0) {
      title = common.title.trim();
    }
    if (common.artist && common.artist.trim().length > 0) {
      artist = common.artist.trim();
    }
    if (common.album && common.album.trim().length > 0) {
      album = common.album.trim();
    }
    if (common.albumartist) {
      albumArtist = common.albumartist.trim();
    }
    if (common.year) {
      year = common.year;
    }
    if (common.track && common.track.no) {
      trackNumber = common.track.no;
    }
    if (common.genre && common.genre.length > 0) {
      genre = common.genre[0];
    }
    if (common.bpm) {
      tagBpm = Math.round(common.bpm);
    }
    if (common.key) {
      tagKey = common.key.trim();
    }
    if (parsed.format.duration && !isNaN(parsed.format.duration)) {
      duration = Math.round(parsed.format.duration);
    }

    // Extract album cover picture if present
    if (common.picture && common.picture.length > 0) {
      const pic = common.picture[0];
      const uint8 = new Uint8Array(pic.data);
      const blob = new Blob([uint8], { type: pic.format });
      coverArtUrl = URL.createObjectURL(blob);
      hasEmbeddedCover = true;
    }
  } catch (err) {
    console.warn(`music-metadata parsing skipped for ${file.name}, using audio element probe:`, err);
  }

  // If duration wasn't extracted from metadata header, probe audio directly
  if (duration <= 0) {
    duration = await probeAudioDuration(file);
  }

  // Calculate BPM and Musical Key via Web Audio DSP analysis
  const audioAnalysis = await calculateBpmAndKeyFromFile(file, tagBpm, tagKey);

  return {
    title,
    artist,
    album,
    albumArtist,
    year,
    trackNumber,
    genre,
    duration: Math.round(duration),
    coverArtUrl,
    hasEmbeddedCover,
    bpm: audioAnalysis.bpm,
    key: audioAnalysis.key,
    keyCamelot: audioAnalysis.keyCamelot,
  };
}
