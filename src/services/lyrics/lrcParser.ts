import { LyricLine, LyricsDocument, WordTiming } from '../../types/lyrics';

/**
 * Parse an LRC timestamp string (e.g. "01:23.45" or "00:04.5") into seconds
 */
export function parseLrcTimestamp(timestamp: string): number | null {
  const match = timestamp.trim().match(/^(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!match) return null;

  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const millisecondsRaw = match[3] || '0';

  let msFraction = 0;
  if (millisecondsRaw.length === 1) {
    msFraction = parseInt(millisecondsRaw, 10) / 10;
  } else if (millisecondsRaw.length === 2) {
    msFraction = parseInt(millisecondsRaw, 10) / 100;
  } else {
    msFraction = parseInt(millisecondsRaw.slice(0, 3), 10) / 1000;
  }

  return minutes * 60 + seconds + msFraction;
}

/**
 * Format seconds (e.g. 83.45) back into LRC timestamp [01:23.45]
 */
export function formatLrcTimestamp(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const hundredths = Math.floor((totalSeconds % 1) * 100);

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const xx = String(hundredths).padStart(2, '0');

  return `[${mm}:${ss}.${xx}]`;
}

/**
 * Extract word-level timestamps from enhanced LRC lines if present, e.g.:
 * "<00:01.20> Never <00:01.60> gonna <00:02.10> give"
 * Does NOT invent word timestamps if tags are absent.
 */
export function extractWordTimings(rawContent: string): { words?: WordTiming[]; cleanText: string } {
  const wordTagRegex = /<(\d{1,3}:\d{2}(?:\.\d{1,3})?)>([^<]*)/g;
  const words: WordTiming[] = [];
  let match: RegExpExecArray | null;

  while ((match = wordTagRegex.exec(rawContent)) !== null) {
    const time = parseLrcTimestamp(match[1]);
    const wordText = match[2].trim();
    if (time !== null && wordText) {
      words.push({
        time,
        word: wordText,
      });
    }
  }

  // Calculate durations between consecutive words
  for (let i = 0; i < words.length; i++) {
    if (i + 1 < words.length) {
      words[i].duration = Math.max(0.1, words[i + 1].time - words[i].time);
    } else {
      words[i].duration = 0.5;
    }
  }

  const cleanText = rawContent.replace(/<\d{1,3}:\d{2}(?:\.\d{1,3})?>/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    words: words.length > 0 ? words : undefined,
    cleanText,
  };
}

/**
 * Parse raw text into structured LyricsDocument
 */
export function parseLyrics(
  rawText: string,
  defaultOffset = 0,
  translationsMap?: Record<string, string>
): LyricsDocument {
  if (!rawText || !rawText.trim()) {
    return {
      offset: defaultOffset,
      lines: [],
      isSynced: false,
      rawText: '',
    };
  }

  const lines = rawText.split(/\r?\n/);
  const parsedLines: LyricLine[] = [];
  let title: string | undefined;
  let artist: string | undefined;
  let album: string | undefined;
  let offsetMs = defaultOffset * 1000;

  const timeRegex = /\[(\d{1,3}:\d{2}(?:\.\d{1,3})?)\]/g;
  let hasValidTimestamp = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for metadata tags like [ti:Title] or [offset:+500]
    const tagMatch = line.match(/^\[(ti|ar|al|offset|by):([^\]]*)\]$/i);
    if (tagMatch) {
      const tag = tagMatch[1].toLowerCase();
      const val = tagMatch[2].trim();
      if (tag === 'ti') title = val;
      if (tag === 'ar') artist = val;
      if (tag === 'al') album = val;
      if (tag === 'offset') {
        const parsedOffset = parseInt(val, 10);
        if (!isNaN(parsedOffset)) offsetMs += parsedOffset;
      }
      continue;
    }

    // Extract all timestamps on this line
    const timestamps: number[] = [];
    let match: RegExpExecArray | null;
    timeRegex.lastIndex = 0;

    while ((match = timeRegex.exec(line)) !== null) {
      const seconds = parseLrcTimestamp(match[1]);
      if (seconds !== null) {
        timestamps.push(seconds);
        hasValidTimestamp = true;
      }
    }

    // Strip line timestamps
    const rawContent = line.replace(/\[\d{1,3}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
    // Check for enhanced word-level timing
    const { words, cleanText } = extractWordTimings(rawContent);

    // Look up translation if available
    const translation =
      translationsMap?.[cleanText.toLowerCase()] ||
      translationsMap?.[`line-${i}`] ||
      undefined;

    if (timestamps.length > 0) {
      for (const time of timestamps) {
        parsedLines.push({
          id: `line-${i}-${time.toFixed(2)}`,
          time,
          text: cleanText,
          words,
          translation,
        });
      }
    } else {
      // Plain text line without timestamp
      parsedLines.push({
        id: `plain-${i}`,
        time: -1,
        text: cleanText,
        translation,
      });
    }
  }

  // If there are timestamps, sort chronologically
  if (hasValidTimestamp) {
    parsedLines.sort((a, b) => a.time - b.time);
  }

  return {
    title,
    artist,
    album,
    offset: offsetMs / 1000,
    lines: parsedLines,
    isSynced: hasValidTimestamp,
    rawText,
  };
}

/**
 * Finds the index of the currently active lyric line for the given playback time
 */
export function getActiveLyricIndex(
  lines: LyricLine[],
  currentTime: number,
  offset = 0
): number {
  if (!lines || lines.length === 0) return -1;

  const adjustedTime = currentTime - offset;
  let activeIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const lineTime = lines[i].time;
    if (lineTime < 0) continue; // skip non-timestamped lines

    if (adjustedTime >= lineTime) {
      activeIndex = i;
    } else {
      break;
    }
  }

  return activeIndex;
}

/**
 * Safely split line into word tokens preserving words, punctuation and RTL characters
 */
export function splitLineIntoTokens(text: string): string[] {
  if (!text) return [];
  // Split on whitespace while keeping tokens clean
  return text.trim().split(/\s+/).filter(Boolean);
}

/**
 * Serialize lines back to standard or enhanced LRC text
 */
export function formatLrcDocument(
  lines: LyricLine[],
  metadata?: { title?: string; artist?: string },
  options: { includeWordTags?: boolean } = {}
): string {
  const output: string[] = [];
  if (metadata?.title) output.push(`[ti:${metadata.title}]`);
  if (metadata?.artist) output.push(`[ar:${metadata.artist}]`);

  for (const line of lines) {
    if (line.time >= 0) {
      if (options.includeWordTags && line.words && line.words.length > 0) {
        // Enhanced LRC with word-level tags
        const wordParts = line.words.map((w) => `<${formatLrcTimestamp(w.time).slice(1, -1)}> ${w.word}`);
        output.push(`${formatLrcTimestamp(line.time)} ${wordParts.join(' ')}`);
      } else {
        output.push(`${formatLrcTimestamp(line.time)} ${line.text}`);
      }
    } else {
      output.push(line.text);
    }
  }
  return output.join('\n');
}
