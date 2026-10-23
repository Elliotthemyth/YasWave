import * as mm from 'music-metadata-browser';
import { TrackMetadata } from '../../types/track';
import { calculateBpmAndKeyFromFile } from '../audio/audioAnalyzer';
import { recordMetadataDiagnostic } from './metadataDiagnostics';

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
 * Extract embedded synchronized or unsynchronized lyrics from metadata (USLT, SYLT, Vorbis, iTunes)
 */
export function extractEmbeddedLyrics(parsed: mm.IAudioMetadata): string | undefined {
  if (!parsed) return undefined;

  // 1. Check parsed.common.lyrics (common tag parsed by music-metadata)
  if (parsed.common && parsed.common.lyrics) {
    if (Array.isArray(parsed.common.lyrics) && parsed.common.lyrics.length > 0) {
      const joined = parsed.common.lyrics
        .map((item) => (typeof item === 'string' ? item : (item as { text?: string })?.text || ''))
        .filter(Boolean)
        .join('\n');
      if (joined.trim().length > 0) return joined.trim();
    } else if (typeof parsed.common.lyrics === 'string' && (parsed.common.lyrics as string).trim().length > 0) {
      return (parsed.common.lyrics as string).trim();
    }
  }

  // 2. Search native tag frames (ID3 USLT, Vorbis LYRICS, iTunes ©lyr)
  if (parsed.native) {
    for (const tagType of Object.keys(parsed.native)) {
      const tags = parsed.native[tagType];
      if (!Array.isArray(tags)) continue;
      for (const tag of tags) {
        const id = tag.id?.toUpperCase();
        if (id === 'USLT' || id === 'SYLT' || id === 'LYRICS' || id === 'UNSYNCEDLYRICS' || id === '©LYR') {
          if (typeof tag.value === 'string' && tag.value.trim().length > 0) {
            return tag.value.trim();
          } else if (tag.value && typeof tag.value === 'object' && 'text' in tag.value && typeof (tag.value as { text?: string }).text === 'string') {
            const txt = (tag.value as { text?: string }).text?.trim();
            if (txt && txt.length > 0) return txt;
          }
        }
      }
    }
  }

  return undefined;
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
  let embeddedLyrics: string | undefined;

  try {
    const parsed = await mm.parseBlob(file, { duration: true, skipCovers: false });
    const common = parsed.common;

    if (common.title && typeof common.title === 'string' && common.title.trim().length > 0) {
      title = common.title.trim();
    }

    // Robust Artist Resolution:
    // Some encoders mistakenly store the track number or ID3 genre index as the artist.
    // Also support common.artists array if common.artist is empty.
    let candidateArtist: string | undefined;
    if (typeof common.artist === 'string' && common.artist.trim().length > 0) {
      candidateArtist = common.artist.trim();
    } else if (Array.isArray(common.artists) && common.artists.length > 0) {
      const valid = common.artists.filter((a) => typeof a === 'string' && a.trim().length > 0);
      if (valid.length > 0) {
        candidateArtist = valid.join(', ');
      }
    }

    if (candidateArtist) {
      // If the artist tag is purely numbers (e.g., track number or genre code erroneously placed in artist field)
      if (/^\d+$/.test(candidateArtist)) {
        if (common.albumartist && typeof common.albumartist === 'string' && !/^\d+$/.test(common.albumartist.trim())) {
          artist = common.albumartist.trim();
        } else if (fallbackInfo.artist && fallbackInfo.artist !== 'Unknown Artist' && !/^\d+$/.test(fallbackInfo.artist)) {
          artist = fallbackInfo.artist;
        } else {
          artist = candidateArtist;
        }
      } else {
        artist = candidateArtist;
      }
    }

    if (common.album && typeof common.album === 'string' && common.album.trim().length > 0) {
      album = common.album.trim();
    }
    if (common.albumartist && typeof common.albumartist === 'string') {
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
    if (common.key && typeof common.key === 'string') {
      tagKey = common.key.trim();
    }
    if (parsed.format.duration && !isNaN(parsed.format.duration)) {
      duration = Math.round(parsed.format.duration);
    }

    // Extract embedded lyrics if available
    embeddedLyrics = extractEmbeddedLyrics(parsed);

    // Development-only: Collect relevant native frames (TPE1, TPE2, TCON, TRCK, etc.) for diagnostic inspection
    if (import.meta.env.DEV) {
      const relevantFrames: Record<string, any> = {};
      const allNativeFramesSummary: Record<string, Array<{ id: string; value: any }>> = {};

      if (parsed.native) {
        for (const format of Object.keys(parsed.native)) {
          const frames = parsed.native[format];
          if (Array.isArray(frames)) {
            allNativeFramesSummary[format] = frames.map((f) => ({
              id: f.id,
              value:
                typeof f.value === 'object' && f.value !== null
                  ? 'text' in f.value
                    ? f.value.text
                    : 'description' in f.value
                    ? f.value.description
                    : JSON.stringify(f.value).substring(0, 100)
                  : f.value,
            }));

            for (const f of frames) {
              const idUpper = (f.id || '').toUpperCase();
              if (
                [
                  'TPE1',
                  'TPE2',
                  'TPE3',
                  'TPE4',
                  'TCON',
                  'TRCK',
                  'TIT2',
                  'TALB',
                  'TYER',
                  'TDRC',
                  'TP1',
                  'TP2',
                  'TRK',
                  '©ART',
                  'AART',
                  'TRKN',
                  'GNRE',
                  'ARTIST',
                  'ALBUMARTIST',
                  'TRACKNUMBER',
                  'GENRE',
                ].some((k) => idUpper.includes(k))
              ) {
                relevantFrames[`${format}:${f.id}`] =
                  typeof f.value === 'object' && f.value !== null && 'text' in f.value
                    ? f.value.text
                    : f.value;
              }
            }
          }
        }
      }

      recordMetadataDiagnostic({
        timestamp: Date.now(),
        fileName: file.name,
        fileExtension: '.' + file.name.split('.').pop()?.toLowerCase(),
        fileSize: file.size,
        fileType: file.type || 'audio/mpeg',
        common: {
          artist: common.artist,
          artists: common.artists,
          albumartist: common.albumartist,
          title: common.title,
          album: common.album,
          track: common.track,
          genre: common.genre,
          year: common.year,
        },
        nativeFormatTypes: Object.keys(parsed.native || {}),
        relevantFrames,
        allNativeFramesSummary,
        finalResolvedArtist: artist,
        finalResolvedTitle: title,
      });
    }

    // Extract album cover picture if present and persist as Base64 Data URL
    // This ensures album artwork survives app restarts, device reboots, and storage reloads.
    if (common.picture && common.picture.length > 0) {
      const pic = common.picture[0];
      const uint8 = new Uint8Array(pic.data);
      const mime = pic.format || 'image/jpeg';
      try {
        let binary = '';
        const len = uint8.byteLength;
        const chunkSize = 8192;
        for (let i = 0; i < len; i += chunkSize) {
          const chunk = uint8.subarray(i, Math.min(i + chunkSize, len));
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        coverArtUrl = `data:${mime};base64,${btoa(binary)}`;
        hasEmbeddedCover = true;
      } catch {
        const blob = new Blob([uint8], { type: mime });
        coverArtUrl = URL.createObjectURL(blob);
        hasEmbeddedCover = true;
      }
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
    lyrics: embeddedLyrics,
    lyricsProvider: embeddedLyrics ? 'embedded' : undefined,
  };
}
