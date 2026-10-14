export interface WordTiming {
  word: string;
  time: number; // in seconds
  duration?: number;
}

export interface LyricLine {
  id: string;
  time: number; // in seconds (float), or -1 for unsynced plain text
  text: string;
  words?: WordTiming[]; // optional word-level timing when available
  translation?: string; // Persian translation for this specific line
}

export interface LyricsDocument {
  id?: string;
  trackId?: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  offset: number; // in seconds
  lines: LyricLine[];
  isSynced: boolean;
  isInstrumental?: boolean;
  rawText: string;
  providerName?: string;
  providerId?: string;
  updatedAt?: number;
}

export interface LyricsMatchResult {
  id: string | number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  instrumental: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
  source: string;
  matchScore: number; // 0 to 100
  durationDiff: number; // absolute seconds difference
}

export interface LyricsProvider {
  readonly name: string;
  findLyrics(params: {
    title: string;
    artist: string;
    album?: string;
    duration?: number;
  }): Promise<LyricsMatchResult | null>;
  searchLyrics(
    query: string,
    trackInfo?: { title?: string; artist?: string; album?: string; duration?: number }
  ): Promise<LyricsMatchResult[]>;
}

export interface Translation {
  trackId: string;
  lyricsVersionHash: string;
  language: 'fa'; // Persian
  translations: Record<string, string>; // maps line id or index to Persian translation
  provider: string;
  updatedAt: number;
}

export interface TranslationProvider {
  readonly name: string;
  translateLines(
    lines: string[],
    targetLang: string,
    context?: { title?: string; artist?: string }
  ): Promise<string[]>;
}

export type LyricsDisplayMode = 'bilingual' | 'original' | 'translation';
export type LyricsFontSize = 'sm' | 'base' | 'lg' | 'xl';
