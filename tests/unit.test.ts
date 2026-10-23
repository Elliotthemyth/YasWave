import { describe, it, expect } from 'vitest';
import {
  parseLrcTimestamp,
  formatLrcTimestamp,
  parseLyrics,
  getActiveLyricIndex,
  extractWordTimings,
} from '../src/services/lyrics/lrcParser';
import { shuffleArray, calculateNextIndex, calculatePreviousIndex } from '../src/services/audio/audioEngine';
import { cleanFileNameToTitle } from '../src/services/metadata/metadataParser';
import { calculateLyricsMatchScore, stringSimilarity } from '../src/services/lyrics/lyricsMatcher';
import { persianTranslationService } from '../src/services/lyrics/persianTranslationService';
import { lrclibProvider } from '../src/services/lyrics/lrclibProvider';
import {
  calculateBpmFromChannelData,
  calculateKeyFromChannelData,
} from '../src/services/audio/audioAnalyzer';
import { evaluateSmartRule } from '../src/services/playlist/smartPlaylistEvaluator';
import { SmartRule } from '../src/types/playlist';

describe('LRC Parser and Synchronizer', () => {
  it('parses timestamps in mm:ss.xx and mm:ss.xxx format', () => {
    expect(parseLrcTimestamp('01:23.45')).toBeCloseTo(83.45, 2);
    expect(parseLrcTimestamp('00:04.5')).toBeCloseTo(4.5, 2);
    expect(parseLrcTimestamp('02:00.000')).toBe(120);
    expect(parseLrcTimestamp('invalid')).toBeNull();
  });

  it('formats seconds into LRC timestamp', () => {
    expect(formatLrcTimestamp(83.45)).toBe('[01:23.45]');
    expect(formatLrcTimestamp(0)).toBe('[00:00.00]');
  });

  it('parses full LRC documents with metadata and multiple timestamps', () => {
    const raw = `[ti:Test Title]
[ar:Test Artist]
[al:Test Album]
[00:01.00]First line
[00:04.00][00:08.00]Repeated line`;
    const doc = parseLyrics(raw);
    expect(doc.title).toBe('Test Title');
    expect(doc.artist).toBe('Test Artist');
    expect(doc.album).toBe('Test Album');
    expect(doc.isSynced).toBe(true);
    // Should have 3 parsed lines: 1s, 4s, 8s
    expect(doc.lines.length).toBe(3);
    expect(doc.lines[0].text).toBe('First line');
    expect(doc.lines[1].time).toBe(4);
    expect(doc.lines[2].time).toBe(8);
  });

  it('extracts word-level timings when available without inventing fake timestamps', () => {
    const lineWithWords = '<00:01.00> Hello <00:01.50> world <00:02.00> again';
    const result = extractWordTimings(lineWithWords);
    expect(result.words).toBeDefined();
    expect(result.words?.length).toBe(3);
    expect(result.words?.[0].word).toBe('Hello');
    expect(result.words?.[0].time).toBe(1.0);
    expect(result.words?.[1].word).toBe('world');
    expect(result.words?.[1].time).toBe(1.5);
    expect(result.cleanText).toBe('Hello world again');

    const lineWithoutWords = 'Plain line without word timings';
    const result2 = extractWordTimings(lineWithoutWords);
    expect(result2.words).toBeUndefined();
    expect(result2.cleanText).toBe('Plain line without word timings');
  });

  it('finds active lyric line taking sync offset into account', () => {
    const doc = parseLyrics('[00:02.00] Line 1\n[00:05.00] Line 2\n[00:10.00] Line 3');
    // At 3.0s, line 1 is active
    expect(getActiveLyricIndex(doc.lines, 3.0, 0)).toBe(0);
    // At 6.0s, line 2 is active
    expect(getActiveLyricIndex(doc.lines, 6.0, 0)).toBe(1);
    // With offset +2s (lyrics delayed by 2s): at 6.0s (adjusted 4.0s) -> line 1
    expect(getActiveLyricIndex(doc.lines, 6.0, 2.0)).toBe(0);
    // With negative offset -1s: at 4.0s (adjusted 5.0s) -> line 2
    expect(getActiveLyricIndex(doc.lines, 4.0, -1.0)).toBe(1);
  });

  it('splits multilingual lines into tokens preserving Persian and English words', async () => {
    const { splitLineIntoTokens, formatLrcDocument } = await import('../src/services/lyrics/lrcParser');
    const englishTokens = splitLineIntoTokens('Hello world again');
    expect(englishTokens).toEqual(['Hello', 'world', 'again']);

    const persianTokens = splitLineIntoTokens('در ژرفای سکوت شب');
    expect(persianTokens).toEqual(['در', 'ژرفای', 'سکوت', 'شب']);

    // Enhanced LRC formatting test
    const testLines = [
      {
        id: '1',
        time: 5.5,
        text: 'Hello world',
        words: [
          { word: 'Hello', time: 5.5, duration: 0.5 },
          { word: 'world', time: 6.0, duration: 0.5 },
        ],
      },
    ];

    const enhancedOutput = formatLrcDocument(testLines, { title: 'Test' }, { includeWordTags: true });
    expect(enhancedOutput).toContain('[00:05.50] <00:05.50> Hello <00:06.00> world');

    const standardOutput = formatLrcDocument(testLines, { title: 'Test' }, { includeWordTags: false });
    expect(standardOutput).toContain('[00:05.50] Hello world');
  });
});

describe('Lyrics Candidate Scoring and Verification', () => {
  it('computes high match score for exact metadata and duration', () => {
    const match = calculateLyricsMatchScore({
      trackTitle: 'Midnight Reverie',
      trackArtist: 'Kaelen Vance',
      trackAlbum: 'Nocturnal Echoes',
      trackDuration: 36,
      candidateTitle: 'Midnight Reverie',
      candidateArtist: 'Kaelen Vance',
      candidateAlbum: 'Nocturnal Echoes',
      candidateDuration: 36,
      hasSyncedLyrics: true,
      isInstrumental: false,
    });

    expect(match.score).toBeGreaterThanOrEqual(90);
    expect(match.isConfident).toBe(true);
    expect(match.durationDiff).toBe(0);
  });

  it('penalizes candidates with mismatched titles or large duration differences', () => {
    const mismatch = calculateLyricsMatchScore({
      trackTitle: 'Midnight Reverie',
      trackArtist: 'Kaelen Vance',
      trackDuration: 180,
      candidateTitle: 'Completely Different Song',
      candidateArtist: 'Different Artist',
      candidateDuration: 240,
      hasSyncedLyrics: false,
      isInstrumental: false,
    });

    expect(mismatch.score).toBeLessThan(40);
    expect(mismatch.isConfident).toBe(false);
    expect(mismatch.durationDiff).toBe(60);
  });

  it('correctly handles fuzzy string similarity with punctuation and accents', () => {
    expect(stringSimilarity('Don\'t Stop Believin\'', 'Dont Stop Believin')).toBe(1.0);
    expect(stringSimilarity('Track One (Live)', 'Track One')).toBeGreaterThan(0.6);
  });
});

describe('Persian Translation Service and Association', () => {
  it('translates known offline song phrases accurately to natural Persian', async () => {
    const lines = [
      'deep in the quiet of the night',
      'screen glow replaces fading light',
      'compiling thoughts into a stream',
    ];
    const translations = await persianTranslationService.translateLines(lines, 'fa');
    expect(translations[0]).toBe('در ژرفای سکوت شب');
    expect(translations[1]).toBe('درخشش نمایشگر، جایگزین نورِ محو شونده می‌شود');
    expect(translations[2]).toBe('کامپایل کردن افکار در جریانی پیوسته');
  });

  it('associates translations with structured parsed lyric lines', () => {
    const raw = '[00:04.50] Deep in the quiet of the night\n[00:09.00] Screen glow replaces fading light';
    const translationsMap = {
      'deep in the quiet of the night': 'در ژرفای سکوت شب',
      'screen glow replaces fading light': 'درخشش نمایشگر، جایگزین نورِ محو شونده می‌شود',
    };
    const doc = parseLyrics(raw, 0, translationsMap);
    expect(doc.lines[0].translation).toBe('در ژرفای سکوت شب');
    expect(doc.lines[1].translation).toBe('درخشش نمایشگر، جایگزین نورِ محو شونده می‌شود');
  });

  it('allows manual override of single line translation', () => {
    persianTranslationService.setSingleLineTranslation('Hello World', 'درود جهان');
    expect(persianTranslationService.getSingleLineTranslation('Hello World')).toBe('درود جهان');
  });
});

describe('Playback Engine Queue and Shuffle Logic', () => {
  it('calculates next index for repeat OFF, ALL, ONE', () => {
    expect(calculateNextIndex(0, 3, 'off')).toBe(1);
    expect(calculateNextIndex(1, 3, 'off')).toBe(2);
    expect(calculateNextIndex(2, 3, 'off')).toBeNull(); // end of queue

    expect(calculateNextIndex(2, 3, 'all')).toBe(0); // loops to start
    expect(calculateNextIndex(1, 3, 'one')).toBe(1); // repeats current
  });

  it('calculates previous index restarting if > 3s', () => {
    expect(calculatePreviousIndex(2, 5, 10)).toBe(2); // restart track
    expect(calculatePreviousIndex(2, 5, 1.5)).toBe(1); // jump to prev
    expect(calculatePreviousIndex(0, 5, 0.5)).toBe(0); // clamp at start
  });

  it('shuffles queue preserving specified item index', () => {
    const tracks = ['track1', 'track2', 'track3', 'track4', 'track5'];
    const shuffled = shuffleArray(tracks, 1);
    expect(shuffled.length).toBe(tracks.length);
    expect(shuffled[0]).toBe('track2'); // preserved at top
    for (const item of tracks) {
      expect(shuffled).toContain(item);
    }
  });
});

describe('Metadata Fallback Cleaners', () => {
  it('cleans track filenames properly', () => {
    const res1 = cleanFileNameToTitle('01 - Daft Punk - One More Time.mp3');
    expect(res1.artist).toBe('Daft Punk');
    expect(res1.title).toBe('One More Time');

    const res2 = cleanFileNameToTitle('lofi_chill_beats_night.flac');
    expect(res2.title).toBe('lofi chill beats night');
    expect(res2.artist).toBe('Unknown Artist');
  });
});

describe('Audio Analyzer — BPM & Musical Key Detection', () => {
  it('detects tempo accurately from synthetic rhythmic beat pulses', () => {
    const sampleRate = 44100;
    const duration = 12; // seconds
    const totalSamples = sampleRate * duration;
    const samples = new Float32Array(totalSamples);

    // 120 BPM = 2 beats per second = 1 beat every 0.5s = 22,050 samples
    const beatIntervalSamples = Math.round(sampleRate * (60 / 120));
    for (let beat = 0; beat < duration * 2; beat++) {
      const beatStart = beat * beatIntervalSamples;
      // 40ms kick burst at 100Hz
      const burstLength = Math.round(sampleRate * 0.04);
      for (let j = 0; j < burstLength && beatStart + j < totalSamples; j++) {
        const t = j / sampleRate;
        const envelope = 1 - j / burstLength;
        samples[beatStart + j] = Math.sin(2 * Math.PI * 100 * t) * envelope;
      }
    }

    const bpm = calculateBpmFromChannelData(samples, sampleRate);
    expect(Math.abs(bpm - 120)).toBeLessThanOrEqual(2);
  });

  it('detects C Major musical key and 8B Camelot code from C-E-G triad harmonic tones', () => {
    const sampleRate = 44100;
    const duration = 4;
    const totalSamples = sampleRate * duration;
    const samples = new Float32Array(totalSamples);

    // C Major triad: C4 (261.63Hz), E4 (329.63Hz), G4 (392.00Hz)
    const fC = 261.63;
    const fE = 329.63;
    const fG = 392.00;

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      samples[i] =
        0.4 * Math.sin(2 * Math.PI * fC * t) +
        0.3 * Math.sin(2 * Math.PI * fE * t) +
        0.3 * Math.sin(2 * Math.PI * fG * t);
    }

    const result = calculateKeyFromChannelData(samples, sampleRate);
    expect(result.key).toBe('C Major');
    expect(result.mode).toBe('major');
    expect(result.camelot).toBe('8B');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('detects A Minor musical key and 8A Camelot code from A-C-E triad harmonic tones', () => {
    const sampleRate = 44100;
    const duration = 4;
    const totalSamples = sampleRate * duration;
    const samples = new Float32Array(totalSamples);

    // A Minor triad: A3 (220.00Hz), C4 (261.63Hz), E4 (329.63Hz)
    const fA = 220.00;
    const fC = 261.63;
    const fE = 329.63;

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      samples[i] =
        0.4 * Math.sin(2 * Math.PI * fA * t) +
        0.3 * Math.sin(2 * Math.PI * fC * t) +
        0.3 * Math.sin(2 * Math.PI * fE * t);
    }

    const result = calculateKeyFromChannelData(samples, sampleRate);
    expect(result.key).toBe('A Minor');
    expect(result.mode).toBe('minor');
    expect(result.camelot).toBe('8A');
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});

describe('Smart Playlist Filtering by BPM and Key', () => {
  it('filters tracks by BPM threshold and Key string', () => {
    const trackHighBpm = {
      id: 't-1',
      title: 'Techno Beat',
      artist: 'DJ Pulse',
      album: 'Club Tracks',
      duration: 180,
      fileName: 'techno.mp3',
      fileSize: 1000,
      fileType: 'audio/mpeg',
      dateAdded: Date.now(),
      playCount: 5,
      isFavorite: false,
      sourceType: 'browser_file' as const,
      bpm: 130,
      key: 'A Minor',
      keyCamelot: '8A',
    };

    const trackLowBpm = {
      id: 't-2',
      title: 'Ambient Chill',
      artist: 'Sleep Waves',
      album: 'Dreams',
      duration: 200,
      fileName: 'ambient.mp3',
      fileSize: 1000,
      fileType: 'audio/mpeg',
      dateAdded: Date.now(),
      playCount: 1,
      isFavorite: false,
      sourceType: 'browser_file' as const,
      bpm: 75,
      key: 'C Major',
      keyCamelot: '8B',
    };

    // BPM > 120
    const ruleBpm: SmartRule = { id: 'r1', field: 'bpm', operator: 'greater_than', value: 120 };
    expect(evaluateSmartRule(trackHighBpm, ruleBpm)).toBe(true);
    expect(evaluateSmartRule(trackLowBpm, ruleBpm)).toBe(false);

    // Key is 'A Minor' or Camelot '8A'
    const ruleKey: SmartRule = { id: 'r2', field: 'key', operator: 'contains', value: 'Minor' };
    expect(evaluateSmartRule(trackHighBpm, ruleKey)).toBe(true);
    expect(evaluateSmartRule(trackLowBpm, ruleKey)).toBe(false);

    const ruleCamelot: SmartRule = { id: 'r3', field: 'key', operator: 'is', value: '8b' };
    expect(evaluateSmartRule(trackLowBpm, ruleCamelot)).toBe(true);
    expect(evaluateSmartRule(trackHighBpm, ruleCamelot)).toBe(false);
  });
});

describe('Metadata & File Persistence Validation', () => {
  it('correctly handles filename parsing and strips leading track numbers', () => {
    const parsed1 = cleanFileNameToTitle('01 - Daft Punk - One More Time.mp3');
    expect(parsed1.artist).toBe('Daft Punk');
    expect(parsed1.title).toBe('One More Time');

    const parsed2 = cleanFileNameToTitle('05. Moonlight Sonata.flac');
    expect(parsed2.artist).toBe('Unknown Artist');
    expect(parsed2.title).toBe('Moonlight Sonata');

    const parsed3 = cleanFileNameToTitle('Artist_Name - Track_Title.wav');
    expect(parsed3.artist).toBe('Artist Name');
    expect(parsed3.title).toBe('Track Title');
  });

  it('validates supported audio file types in BrowserFileAdapter', async () => {
    const { browserFileAdapter } = await import('../src/services/filesystem/browserFileAdapter');
    const dummyMp3 = new File([''], 'song.mp3', { type: 'audio/mpeg' });
    const dummyFlac = new File([''], 'song.flac', { type: 'audio/flac' });
    const dummyWav = new File([''], 'song.wav', { type: 'audio/wav' });
    const dummyTxt = new File([''], 'notes.txt', { type: 'text/plain' });

    expect(browserFileAdapter.isAudioFile(dummyMp3)).toBe(true);
    expect(browserFileAdapter.isAudioFile(dummyFlac)).toBe(true);
    expect(browserFileAdapter.isAudioFile(dummyWav)).toBe(true);
    expect(browserFileAdapter.isAudioFile(dummyTxt)).toBe(false);
  });

  it('provides searchCandidates on lrclibProvider interface', async () => {
    expect(typeof lrclibProvider.searchCandidates).toBe('function');
  });
});

describe('Android Core Systems & Integration', () => {
  it('extracts embedded lyrics from common.lyrics and ID3 USLT native frames', async () => {
    const { extractEmbeddedLyrics } = await import('../src/services/metadata/metadataParser');

    // Case 1: common.lyrics string array
    const mockCommonMetadata: any = {
      common: {
        lyrics: ['[00:01.00] First lyric line', '[00:05.00] Second lyric line'],
      },
    };
    expect(extractEmbeddedLyrics(mockCommonMetadata)).toBe(
      '[00:01.00] First lyric line\n[00:05.00] Second lyric line'
    );

    // Case 2: native ID3v2 USLT frame
    const mockNativeMetadata: any = {
      common: {},
      native: {
        'ID3v2.3': [
          {
            id: 'USLT',
            value: {
              language: 'eng',
              description: '',
              text: 'Unsynchronized lyric text from USLT frame',
            },
          },
        ],
      },
    };
    expect(extractEmbeddedLyrics(mockNativeMetadata)).toBe(
      'Unsynchronized lyric text from USLT frame'
    );

    // Case 3: Empty metadata
    const mockEmptyMetadata: any = { common: {} };
    expect(extractEmbeddedLyrics(mockEmptyMetadata)).toBeUndefined();
  });

  it('cleans search query for high-accuracy LRCLIB queries', async () => {
    const { cleanSearchQuery } = await import('../src/services/lyrics/lrclibProvider');

    expect(cleanSearchQuery('One More Time (Official Video)', 'Daft Punk')).toBe(
      'Daft Punk One More Time'
    );
    expect(cleanSearchQuery('Song Title [Remastered 2021]', 'Artist (feat. Guest)')).toBe(
      'Artist Song Title'
    );
    expect(cleanSearchQuery('My Song - Single Version', 'Unknown Artist')).toBe(
      'My Song'
    );
  });

  it('manages back button stack with LIFO order and fallback to navigation', async () => {
    const { backButtonManager } = await import('../src/services/platform/backButtonManager');

    let modalClosed = false;
    let overlayClosed = false;
    let navigationTriggered = false;

    backButtonManager.setNavigationFallback(() => {
      navigationTriggered = true;
      return true;
    });

    const unregOverlay = backButtonManager.registerHandler('overlay', () => {
      overlayClosed = true;
      return true;
    });

    const unregModal = backButtonManager.registerHandler('modal', () => {
      modalClosed = true;
      return true;
    });

    // 1st back press should close the topmost 'modal'
    const step1 = backButtonManager.triggerBack();
    expect(step1).toBe(true);
    expect(modalClosed).toBe(true);
    expect(overlayClosed).toBe(false);

    // 2nd back press should close the 'overlay'
    const step2 = backButtonManager.triggerBack();
    expect(step2).toBe(true);
    expect(overlayClosed).toBe(true);

    // 3rd back press (no modals open) should trigger navigation fallback
    const step3 = backButtonManager.triggerBack();
    expect(step3).toBe(true);
    expect(navigationTriggered).toBe(true);

    unregModal();
    unregOverlay();
  });

  it('updates currentTrack in audioEngine and synchronizes queue state', async () => {
    const { audioEngine } = await import('../src/services/audio/audioEngine');

    const sampleTrack: any = {
      id: 'test-track-1',
      title: 'Original Title',
      artist: 'Original Artist',
      album: 'Original Album',
      duration: 120,
      fileName: 'test.mp3',
      fileSize: 1000,
      fileType: 'audio/mpeg',
      dateAdded: Date.now(),
      playCount: 0,
      isFavorite: false,
      sourceType: 'browser_file',
    };

    await audioEngine.setQueue([sampleTrack], 0, false);
    expect(audioEngine.getState().currentTrack?.title).toBe('Original Title');

    // Update with newly discovered lyrics
    audioEngine.updateCurrentTrack('test-track-1', {
      lyrics: '[00:01.00] New lyric',
      lyricsProvider: 'LRCLIB',
    });

    const updated = audioEngine.getState().currentTrack;
    expect(updated?.lyrics).toBe('[00:01.00] New lyric');
    expect(updated?.lyricsProvider).toBe('LRCLIB');
    expect(audioEngine.getQueueState().queue[0].lyrics).toBe('[00:01.00] New lyric');
  });

  it('records, collects, and exports metadata diagnostics in dev mode without exposing audio binary data', async () => {
    const {
      recordMetadataDiagnostic,
      getMetadataDiagnostics,
      clearMetadataDiagnostics,
      exportDiagnosticsJson,
    } = await import('../src/services/metadata/metadataDiagnostics');

    clearMetadataDiagnostics();
    expect(getMetadataDiagnostics().length).toBe(0);

    recordMetadataDiagnostic({
      timestamp: Date.now(),
      fileName: '04 - Track Four.mp3',
      fileExtension: '.mp3',
      fileSize: 4500123,
      fileType: 'audio/mpeg',
      common: {
        artist: '4',
        artists: ['4'],
        albumartist: undefined,
        title: 'Track Four',
        album: 'Album Four',
        track: { no: 4, of: 10 },
        genre: ['Disco'],
        year: 2024,
      },
      nativeFormatTypes: ['ID3v2.3'],
      relevantFrames: {
        'ID3v2.3:TRCK': '4',
        'ID3v2.3:TCON': '4',
        'ID3v2.3:TPE1': '4',
      },
      allNativeFramesSummary: {
        'ID3v2.3': [
          { id: 'TRCK', value: '4' },
          { id: 'TCON', value: '4' },
          { id: 'TPE1', value: '4' },
        ],
      },
      finalResolvedArtist: '4',
      finalResolvedTitle: 'Track Four',
    });

    const entries = getMetadataDiagnostics();
    expect(entries.length).toBe(1);
    expect(entries[0].fileName).toBe('04 - Track Four.mp3');
    expect(entries[0].common.artist).toBe('4');
    expect(entries[0].relevantFrames['ID3v2.3:TRCK']).toBe('4');

    const json = exportDiagnosticsJson();
    expect(json).toContain('"fileName": "04 - Track Four.mp3"');
    expect(json).toContain('"finalResolvedArtist": "4"');
    // Ensure no audio binary data or blob URLs exist in the export
    expect(json).not.toContain('blob:');
    expect(json).not.toContain('ArrayBuffer');

    clearMetadataDiagnostics();
    expect(getMetadataDiagnostics().length).toBe(0);
  });
});


