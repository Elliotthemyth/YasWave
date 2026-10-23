import { LyricsProvider, LyricsMatchResult } from '../../types/lyrics';
import { calculateLyricsMatchScore } from './lyricsMatcher';

const LRCLIB_BASE_URL = 'https://lrclib.net/api';
const CLIENT_HEADER = 'YASWAVE/1.0.0 (Cross-Platform Music Player)';

/**
 * Clean up noisy search terms from track title (e.g. [Official Video], (Remastered 2021), feat., etc.)
 * to maximize match probability on community lyrics databases.
 */
export function cleanSearchQuery(title: string, artist?: string): string {
  const cleanTitle = (title || '')
    .replace(/\s*[\(\[](?:official\s*(?:music\s*)?video|audio|lyrics?|hd|hq|remaster(?:ed)?(?:\s*\d{4})?|deluxe|bonus\s*track|feat\.|ft\.)[^\)\]]*[\)\]]/gi, '')
    .replace(/\s*-(?:\s*remaster(?:ed)?|\s*single|\s*edit).*$/i, '')
    .trim();

  const cleanArtist = (artist || '')
    .replace(/\s*[\(\[](?:feat\.|ft\.)[^\)\]]*[\)\]]/gi, '')
    .replace(/^unknown artist$/i, '')
    .trim();

  return [cleanArtist, cleanTitle].filter(Boolean).join(' ');
}

export class LrclibProvider implements LyricsProvider {
  readonly name = 'LRCLIB';

  // In-memory cache for the current session: key -> candidate result or null
  private memoryCache = new Map<string, LyricsMatchResult | null>();
  // Search results cache: queryKey -> array of candidates
  private searchCache = new Map<string, LyricsMatchResult[]>();
  // Rate limit cooldown timestamp
  private rateLimitUntil = 0;

  private makeCacheKey(title: string, artist: string, duration?: number): string {
    const dur = duration ? Math.round(duration) : 0;
    return `${title.toLowerCase().trim()}_${artist.toLowerCase().trim()}_${dur}`;
  }

  /**
   * Look up exact lyrics using /api/get
   */
  async findLyrics(params: {
    title: string;
    artist: string;
    album?: string;
    duration?: number;
  }): Promise<LyricsMatchResult | null> {
    const { title, artist, album, duration } = params;
    if (!title || !artist || title === 'Untitled Track' || artist === 'Unknown Artist') {
      return null;
    }

    const cacheKey = this.makeCacheKey(title, artist, duration);
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey) || null;
    }

    // Check rate limit cooldown
    if (Date.now() < this.rateLimitUntil) {
      console.warn('LRCLIB: Rate limit cooldown active, skipping request.');
      return null;
    }

    try {
      const url = new URL(`${LRCLIB_BASE_URL}/get`);
      url.searchParams.set('track_name', title);
      url.searchParams.set('artist_name', artist);
      if (album && album !== 'Unknown Album') {
        url.searchParams.set('album_name', album);
      }
      if (duration && duration > 0) {
        url.searchParams.set('duration', Math.round(duration).toString());
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url.toString(), {
        headers: {
          'Lrclib-Client': CLIENT_HEADER,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        // Not found via direct /get -> try /search fallback with primary query
        let searchFallback = await this.searchLyrics(`${artist} ${title}`, params);
        if (searchFallback.length === 0) {
          const cleaned = cleanSearchQuery(title, artist);
          if (cleaned && cleaned !== `${artist} ${title}`) {
            searchFallback = await this.searchLyrics(cleaned, params);
          }
        }

        if (searchFallback.length > 0 && searchFallback[0].matchScore >= 60) {
          const topMatch = searchFallback[0];
          this.memoryCache.set(cacheKey, topMatch);
          return topMatch;
        }

        this.memoryCache.set(cacheKey, null);
        return null;
      }

      if (response.status === 429) {
        this.rateLimitUntil = Date.now() + 30000; // 30s cooldown
        console.warn('LRCLIB: 429 Too Many Requests received. Cooling down for 30s.');
        return null;
      }

      if (!response.ok) {
        console.warn(`LRCLIB returned HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();
      const matchResult = this.normalizeResult(data, params);

      this.memoryCache.set(cacheKey, matchResult);
      return matchResult;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('LRCLIB request timed out after 8s');
      } else {
        console.warn('LRCLIB fetch error:', err);
      }
      return null;
    }
  }

  /**
   * Search candidate matches for a specific track (used by the discovery modal).
   */
  async searchCandidates(params: {
    title: string;
    artist?: string;
    duration?: number;
  }): Promise<LyricsMatchResult[]> {
    const { title, artist, duration } = params;
    const query = [artist, title]
      .filter((part): part is string => Boolean(part && part.trim()))
      .join(' ')
      .trim();
    if (!query) return [];
    return this.searchLyrics(query, { title, artist, duration });
  }

  /**
   * Search multiple candidates using /api/search
   */
  async searchLyrics(
    query: string,
    trackInfo?: { title?: string; artist?: string; album?: string; duration?: number }
  ): Promise<LyricsMatchResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const searchKey = `${cleanQuery.toLowerCase()}_${trackInfo?.duration || 0}`;
    if (this.searchCache.has(searchKey)) {
      return this.searchCache.get(searchKey)!;
    }

    if (Date.now() < this.rateLimitUntil) {
      return [];
    }

    try {
      const url = new URL(`${LRCLIB_BASE_URL}/search`);
      url.searchParams.set('q', cleanQuery);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url.toString(), {
        headers: {
          'Lrclib-Client': CLIENT_HEADER,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        this.rateLimitUntil = Date.now() + 30000;
        return [];
      }

      if (!response.ok) {
        return [];
      }

      const results = await response.json();
      if (!Array.isArray(results)) return [];

      const parsedCandidates: LyricsMatchResult[] = results.map((item) =>
        this.normalizeResult(item, {
          title: trackInfo?.title || item.trackName || item.name || '',
          artist: trackInfo?.artist || item.artistName || '',
          album: trackInfo?.album || item.albumName,
          duration: trackInfo?.duration,
        })
      );

      // Sort by match score descending
      parsedCandidates.sort((a, b) => b.matchScore - a.matchScore);

      this.searchCache.set(searchKey, parsedCandidates);
      return parsedCandidates;
    } catch (err) {
      console.warn('LRCLIB search error:', err);
      return [];
    }
  }

  /**
   * Search candidates by title, artist, duration with clean fallback
   */
  async searchCandidates(params: {
    title: string;
    artist?: string;
    album?: string;
    duration?: number;
  }): Promise<LyricsMatchResult[]> {
    const rawQuery = [params.artist, params.title].filter(Boolean).join(' ');
    let results = await this.searchLyrics(rawQuery, params);
    
    // If no direct results, retry with cleaned keywords (stripping feat, official video, remaster, etc.)
    if (results.length === 0) {
      const cleaned = cleanSearchQuery(params.title, params.artist);
      if (cleaned && cleaned !== rawQuery) {
        results = await this.searchLyrics(cleaned, params);
      }
    }
    return results;
  }

  private normalizeResult(
    raw: {
      id: string | number;
      name?: string;
      trackName?: string;
      artistName?: string;
      albumName?: string;
      duration?: number;
      instrumental?: boolean;
      plainLyrics?: string;
      syncedLyrics?: string;
    },
    reference: {
      title: string;
      artist: string;
      album?: string;
      duration?: number;
    }
  ): LyricsMatchResult {
    const candidateTitle = raw.trackName || raw.name || '';
    const candidateArtist = raw.artistName || '';
    const candidateAlbum = raw.albumName;
    const candidateDuration = raw.duration;
    const isInstrumental = Boolean(raw.instrumental);
    const hasSynced = Boolean(raw.syncedLyrics && raw.syncedLyrics.trim().length > 0);

    const { score, durationDiff } = calculateLyricsMatchScore({
      trackTitle: reference.title,
      trackArtist: reference.artist,
      trackAlbum: reference.album,
      trackDuration: reference.duration,
      candidateTitle,
      candidateArtist,
      candidateAlbum,
      candidateDuration,
      hasSyncedLyrics: hasSynced,
      isInstrumental,
    });

    return {
      id: raw.id,
      trackName: candidateTitle,
      artistName: candidateArtist,
      albumName: candidateAlbum,
      duration: candidateDuration,
      instrumental: isInstrumental,
      plainLyrics: raw.plainLyrics || undefined,
      syncedLyrics: raw.syncedLyrics || undefined,
      source: 'LRCLIB',
      matchScore: score,
      durationDiff,
    };
  }

  clearCache(): void {
    this.memoryCache.clear();
    this.searchCache.clear();
  }
}

export const lrclibProvider = new LrclibProvider();
