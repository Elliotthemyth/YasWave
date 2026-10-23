import * as mm from 'music-metadata-browser';
import { Track, TrackMetadata } from '../../types/track';
import { calculateBpmAndKeyFromFile } from '../audio/audioAnalyzer';
import { recordMetadataDiagnostic } from './metadataDiagnostics';

/**
 * Normalizes text for comparison (case-insensitive, accents/punctuation trimmed)
 */
export function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .trim();
}

/**
 * Checks whether an artist or title candidate is a suspicious numeric artifact
 * (e.g. "4", "04", "2", "3", "12", "2024", "4/10" mistakenly placed into tag fields).
 */
export function isSuspiciousNumeric(val: string | undefined): boolean {
  if (!val) return true;
  const trimmed = val.trim();
  if (trimmed.length === 0) return true;
  // Pure numeric strings (e.g. "4", "04", "2", "3", "12")
  if (/^\d+$/.test(trimmed)) {
    return true;
  }
  // Fraction format like "4/12"
  if (/^\d+\s*\/\s*\d+$/.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Curated list of well-known artists to assist in safe order disambiguation
 * when no embedded metadata exists to distinguish "Artist - Title" vs "Title - Artist".
 */
const KNOWN_ARTISTS = new Set([
  'daft punk',
  'the beatles',
  'radiohead',
  'pink floyd',
  'queen',
  'led zeppelin',
  'nirvana',
  'coldplay',
  'eminem',
  'metallica',
  'michael jackson',
  'madonna',
  'david bowie',
  'the rolling stones',
  'rolling stones',
  'bob dylan',
  'u2',
  'ac/dc',
  'fleetwood mac',
  'arctic monkeys',
  'oasis',
  'gorillaz',
  'depeche mode',
  'linkin park',
]);

/**
 * Capitalizes a string if it is entirely lowercase (e.g. "high and dry" -> "High and Dry")
 */
function capitalizeWordsIfLower(str: string): string {
  if (!str) return str;
  if (str === str.toLowerCase() && /[a-z]/.test(str)) {
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return str;
}

export interface FilenameParseHints {
  parsedTitle?: string;
  albumArtist?: string;
  trackNumber?: number;
}

export interface ParsedFilenameMetadata {
  title: string;
  artist: string;
  trackNumber?: number;
  isConfident: boolean;
}

/**
 * Parses artist and title from audio filename with intelligent track-number stripping,
 * separator detection, and safe order disambiguation.
 */
export function parseFilenameArtistAndTitle(
  fileName: string,
  hints?: FilenameParseHints
): ParsedFilenameMetadata {
  // 1. Remove directory prefix and file extension
  const baseName = fileName.split(/[/\\]/).pop() || fileName;
  const withoutExt = baseName.replace(/\.[a-zA-Z0-9]+$/i, '').trim();

  // 2. Normalize underscores and excess whitespace
  const normalized = withoutExt.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

  // 3. Strip optional leading track number (1 to 3 digits followed by separator or space)
  // Avoids stripping 4-digit years or titles like "1979 - Smashing Pumpkins"
  let trackNum = hints?.trackNumber;
  let remainder = normalized;
  const trackNumMatch = normalized.match(/^(\d{1,3})(?:[\.\-_]\s*|\s+-\s*|\s+)(.*)$/);
  if (trackNumMatch) {
    const parsedNum = parseInt(trackNumMatch[1], 10);
    if (!isNaN(parsedNum) && parsedNum > 0 && parsedNum <= 999 && trackNumMatch[2].trim().length > 0) {
      if (trackNum === undefined) {
        trackNum = parsedNum;
      }
      remainder = trackNumMatch[2].trim();
    }
  }

  // 4. Separator detection:
  // Must preserve names containing hyphens without spaces (e.g. "Jay-Z", "Blink-182", "Post-Rock")
  // Only split on hyphens surrounded by spaces or distinct dashes ( - , – , — , ~ )
  const hasDistinctSeparator = /\s+[-–—~]\s+/.test(remainder);
  if (!hasDistinctSeparator) {
    return {
      title: capitalizeWordsIfLower(remainder) || 'Untitled Track',
      artist: 'Unknown Artist',
      trackNumber: trackNum,
      isConfident: false,
    };
  }

  const parts = remainder.split(/\s+[-–—~]\s+/).map((p) => p.trim()).filter(Boolean);

  if (parts.length === 1) {
    return {
      title: capitalizeWordsIfLower(parts[0]) || 'Untitled Track',
      artist: 'Unknown Artist',
      trackNumber: trackNum,
      isConfident: false,
    };
  }

  if (parts.length === 2) {
    let partA = parts[0];
    let partB = parts[1];

    // If one of the parts is purely numeric, do not treat it as an artist name
    if (isSuspiciousNumeric(partA) && !isSuspiciousNumeric(partB)) {
      return {
        title: capitalizeWordsIfLower(partB),
        artist: 'Unknown Artist',
        trackNumber: trackNum,
        isConfident: false,
      };
    }
    if (isSuspiciousNumeric(partB) && !isSuspiciousNumeric(partA)) {
      return {
        title: capitalizeWordsIfLower(partA),
        artist: 'Unknown Artist',
        trackNumber: trackNum,
        isConfident: false,
      };
    }

    // Disambiguate Title vs Artist safely using hints:
    // A. Match against known embedded title
    if (hints?.parsedTitle && !isSuspiciousNumeric(hints.parsedTitle)) {
      const normHintTitle = normalizeForComparison(hints.parsedTitle);
      if (normalizeForComparison(partA) === normHintTitle) {
        // partA is the Title -> partB is the Artist
        return {
          title: hints.parsedTitle,
          artist: partB,
          trackNumber: trackNum,
          isConfident: true,
        };
      }
      if (normalizeForComparison(partB) === normHintTitle) {
        // partB is the Title -> partA is the Artist
        return {
          title: hints.parsedTitle,
          artist: partA,
          trackNumber: trackNum,
          isConfident: true,
        };
      }
    }

    // B. Match against known album artist
    if (hints?.albumArtist && !isSuspiciousNumeric(hints.albumArtist)) {
      const normAlbumArtist = normalizeForComparison(hints.albumArtist);
      if (normalizeForComparison(partA) === normAlbumArtist) {
        // partA is Artist -> partB is Title
        return {
          title: capitalizeWordsIfLower(partB),
          artist: hints.albumArtist,
          trackNumber: trackNum,
          isConfident: true,
        };
      }
      if (normalizeForComparison(partB) === normAlbumArtist) {
        // partB is Artist -> partA is Title
        return {
          title: capitalizeWordsIfLower(partA),
          artist: hints.albumArtist,
          trackNumber: trackNum,
          isConfident: true,
        };
      }
    }

    // C. Check known artists directory
    const normA = normalizeForComparison(partA);
    const normB = normalizeForComparison(partB);
    if (KNOWN_ARTISTS.has(normA) && !KNOWN_ARTISTS.has(normB)) {
      // Safely resolved as Artist - Title (e.g. "Daft Punk - One More Time")
      return {
        title: capitalizeWordsIfLower(partB),
        artist: partA,
        trackNumber: trackNum,
        isConfident: true,
      };
    }
    if (KNOWN_ARTISTS.has(normB) && !KNOWN_ARTISTS.has(normA)) {
      // Safely resolved as Title - Artist (e.g. "High and Dry - Radiohead")
      return {
        title: capitalizeWordsIfLower(partA),
        artist: partB,
        trackNumber: trackNum,
        isConfident: true,
      };
    }

    // D. Default unambiguous convention: Title - Artist
    // e.g. "High and Dry - Radiohead.mp3" -> Title: "High and Dry", Artist: "Radiohead"
    return {
      title: capitalizeWordsIfLower(partA),
      artist: partB,
      trackNumber: trackNum,
      isConfident: true,
    };
  }

  // If there are more than 2 parts separated by " - ", check if one matches parsed title
  if (hints?.parsedTitle && !isSuspiciousNumeric(hints.parsedTitle)) {
    const normHintTitle = normalizeForComparison(hints.parsedTitle);
    const matchIdx = parts.findIndex((p) => normalizeForComparison(p) === normHintTitle);
    if (matchIdx !== -1) {
      const nonTitleParts = parts.filter((_, idx) => idx !== matchIdx);
      const possibleArtist = nonTitleParts.find((p) => !isSuspiciousNumeric(p));
      return {
        title: hints.parsedTitle,
        artist: possibleArtist || 'Unknown Artist',
        trackNumber: trackNum,
        isConfident: true,
      };
    }
  }

  // Preserve ambiguous names containing multiple hyphens without guessing
  return {
    title: capitalizeWordsIfLower(remainder),
    artist: 'Unknown Artist',
    trackNumber: trackNum,
    isConfident: false,
  };
}

/**
 * Clean up audio filename into a readable title fallback
 */
export function cleanFileNameToTitle(
  fileName: string,
  hints?: FilenameParseHints
): { title: string; artist: string } {
  const result = parseFilenameArtistAndTitle(fileName, hints);
  return {
    title: result.title,
    artist: result.artist,
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
}

export interface ArtistResolutionInput {
  commonArtist?: string;
  commonArtists?: string[];
  commonAlbumArtist?: string;
  nativeTags?: Record<string, Array<{ id: string; value: any }>>;
  trackNumber?: number;
  fileName: string;
  parsedTitle?: string;
}

/**
 * Resolves artist and title by prioritizing valid embedded metadata while
 * recovering from tag collisions where numeric values or track numbers contaminate the artist field.
 */
export function resolveArtistAndTitle(input: ArtistResolutionInput): { artist: string; title: string } {
  const hasValidParsedTitle =
    input.parsedTitle &&
    input.parsedTitle.trim().length > 0 &&
    !isSuspiciousNumeric(input.parsedTitle);

  const fileFallback = parseFilenameArtistAndTitle(input.fileName, {
    parsedTitle: hasValidParsedTitle ? input.parsedTitle : undefined,
    albumArtist: input.commonAlbumArtist,
    trackNumber: input.trackNumber,
  });

  let resolvedTitle = hasValidParsedTitle
    ? input.parsedTitle!.trim()
    : fileFallback.title || 'Untitled Track';

  let validArtist: string | undefined;

  // 1. Check common.artist if it is a legitimate non-numeric string
  if (input.commonArtist && !isSuspiciousNumeric(input.commonArtist)) {
    validArtist = input.commonArtist.trim();
  }

  // 2. Check common.artists array for any non-numeric artist candidate
  if (!validArtist && Array.isArray(input.commonArtists)) {
    const valid = input.commonArtists
      .map((a) => (typeof a === 'string' ? a.trim() : ''))
      .filter((a) => a.length > 0 && !isSuspiciousNumeric(a));
    if (valid.length > 0) {
      validArtist = valid.join(', ');
    }
  }

  // 3. Check common.albumartist (TPE2 / Band / Album Artist)
  if (!validArtist && input.commonAlbumArtist && !isSuspiciousNumeric(input.commonAlbumArtist)) {
    validArtist = input.commonAlbumArtist.trim();
  }

  // 4. Check native frames (TPE1, TPE2, TPE3, ARTIST, ALBUMARTIST, ©ART, AART, TP1, TP2)
  if (!validArtist && input.nativeTags) {
    for (const format of Object.keys(input.nativeTags)) {
      const frames = input.nativeTags[format];
      if (!Array.isArray(frames)) continue;
      for (const f of frames) {
        const idUpper = (f.id || '').toUpperCase();
        if (
          ['TPE1', 'TPE2', 'TPE3', 'TPE4', 'ARTIST', 'ALBUMARTIST', '©ART', 'AART', 'TP1', 'TP2'].some((k) =>
            idUpper.includes(k)
          )
        ) {
          let strVal: string | undefined;
          if (typeof f.value === 'string') {
            strVal = f.value;
          } else if (f.value && typeof f.value === 'object' && 'text' in f.value && typeof f.value.text === 'string') {
            strVal = f.value.text;
          }
          if (strVal && !isSuspiciousNumeric(strVal)) {
            validArtist = strVal.trim();
            break;
          }
        }
      }
      if (validArtist) break;
    }
  }

  // 5. If title contains "Title - Artist" or "Artist - Title", and artist was numeric or missing
  if (!validArtist && resolvedTitle.includes(' - ')) {
    const titleParsed = parseFilenameArtistAndTitle(resolvedTitle, {
      albumArtist: input.commonAlbumArtist,
    });
    if (titleParsed.artist && titleParsed.artist !== 'Unknown Artist' && !isSuspiciousNumeric(titleParsed.artist)) {
      validArtist = titleParsed.artist;
      resolvedTitle = titleParsed.title;
    }
  }

  // 6. Check fallback extracted from file name
  if (
    !validArtist &&
    fileFallback.artist &&
    fileFallback.artist !== 'Unknown Artist' &&
    !isSuspiciousNumeric(fileFallback.artist)
  ) {
    validArtist = fileFallback.artist;
    if (!hasValidParsedTitle && fileFallback.title) {
      resolvedTitle = fileFallback.title;
    }
  }

  return {
    artist: validArtist || 'Unknown Artist',
    title: resolvedTitle,
  };
}

/**
 * Reprocesses metadata for a track already in the library, correcting suspicious
 * numeric artists without touching playlists, favorites, play history, or audio data.
 */
export function reprocessTrackMetadata(track: Track): { track: Track; changed: boolean } {
  const isArtistNumericOrUnknown =
    !track.artist ||
    track.artist.trim().length === 0 ||
    track.artist === 'Unknown Artist' ||
    isSuspiciousNumeric(track.artist);

  if (!isArtistNumericOrUnknown && track.title && track.title !== 'Untitled Track') {
    return { track, changed: false };
  }

  const resolved = resolveArtistAndTitle({
    fileName: track.fileName || '',
    parsedTitle: isSuspiciousNumeric(track.title) ? undefined : track.title,
    commonArtist: isSuspiciousNumeric(track.artist) ? undefined : track.artist,
    commonAlbumArtist: track.albumArtist,
    trackNumber: track.trackNumber,
  });

  if (resolved.artist !== track.artist || resolved.title !== track.title) {
    return {
      track: {
        ...track,
        artist: resolved.artist,
        title: resolved.title,
      },
      changed: true,
    };
  }

  return { track, changed: false };
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

    // Resolve artist & title with robust collision checks
    const resolved = resolveArtistAndTitle({
      commonArtist: common.artist,
      commonArtists: common.artists,
      commonAlbumArtist: common.albumartist,
      nativeTags: parsed.native,
      trackNumber,
      fileName: file.name,
      parsedTitle: common.title,
    });
    artist = resolved.artist;
    title = resolved.title;
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
