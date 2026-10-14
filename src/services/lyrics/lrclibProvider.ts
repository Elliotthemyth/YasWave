import { LyricsProvider, LyricsMatchResult } from '../../types/lyrics';
import { calculateLyricsMatchScore } from './lyricsMatcher';

const LRCLIB_BASE_URL = 'https://lrclib.net/api';
const CLIENT_HEADER = 'YASWAVE/1.0.0 (Cross-Platform Music Player)';

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
        // Not found via direct /get -> try /search fallback
        const searchFallback = await this.searchLyrics(`${artist} ${title}`, params);
        if (searchFallback.length > 0 && searchFallback[0].matchScore >= 70) {
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
