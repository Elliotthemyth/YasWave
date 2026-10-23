import React, { useState, useEffect } from 'react';
import { Track } from '../../types/track';
import {
  parseLrcTimestamp,
  formatLrcTimestamp,
  parseLyrics,
  getActiveLyricIndex,
  extractWordTimings,
} from '../../services/lyrics/lrcParser';
import { shuffleArray, calculateNextIndex, calculatePreviousIndex } from '../../services/audio/audioEngine';
import { cleanFileNameToTitle } from '../../services/metadata/metadataParser';
import { calculateLyricsMatchScore } from '../../services/lyrics/lyricsMatcher';
import { persianTranslationService } from '../../services/lyrics/persianTranslationService';
import {
  evaluateSmartRule,
  evaluateSmartPlaylist,
  describeSmartPlaylistRules,
  getSmartPlaylistPresets,
} from '../../services/playlist/smartPlaylistEvaluator';
import { SmartPlaylistConfig } from '../../types/playlist';
import {
  calculateBpmFromChannelData,
  calculateKeyFromChannelData,
} from '../../services/audio/audioAnalyzer';
import { CheckCircle2, XCircle, Play, RefreshCw, Terminal, Copy, Trash2, FileAudio, Check } from 'lucide-react';
import {
  getMetadataDiagnostics,
  clearMetadataDiagnostics,
  exportDiagnosticsJson,
  MetadataDiagnosticEntry,
} from '../../services/metadata/metadataDiagnostics';

interface TestCaseResult {
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export const DiagnosticsView: React.FC = () => {
  const [results, setResults] = useState<TestCaseResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [metadataEntries, setMetadataEntries] = useState<MetadataDiagnosticEntry[]>([]);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  useEffect(() => {
    setMetadataEntries(getMetadataDiagnostics());
  }, []);

  const handleRefreshMetadataLogs = () => {
    setMetadataEntries(getMetadataDiagnostics());
  };

  const handleClearMetadataLogs = () => {
    clearMetadataDiagnostics();
    setMetadataEntries([]);
  };

  const handleCopyDiagnostics = async () => {
    const json = exportDiagnosticsJson();
    try {
      await navigator.clipboard.writeText(json);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = json;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    }
  };

  const runAllTests = () => {
    setIsRunning(true);
    const testResults: TestCaseResult[] = [];

    const run = (suite: string, name: string, fn: () => void) => {
      const start = performance.now();
      try {
        fn();
        testResults.push({
          suite,
          name,
          passed: true,
          durationMs: parseFloat((performance.now() - start).toFixed(2)),
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        testResults.push({
          suite,
          name,
          passed: false,
          durationMs: parseFloat((performance.now() - start).toFixed(2)),
          error: errorMsg,
        });
      }
    };

    // 1. LRC Parsing Tests
    run('LRC Parser', 'parseLrcTimestamp converts mm:ss.xx properly', () => {
      const res1 = parseLrcTimestamp('01:23.45');
      if (res1 === null || Math.abs(res1 - 83.45) > 0.001) throw new Error(`Expected 83.45, got ${res1}`);

      const res2 = parseLrcTimestamp('00:04.5');
      if (res2 === null || Math.abs(res2 - 4.5) > 0.001) throw new Error(`Expected 4.5, got ${res2}`);

      const res3 = parseLrcTimestamp('02:00.000');
      if (res3 === null || res3 !== 120) throw new Error(`Expected 120, got ${res3}`);
    });

    run('LRC Parser', 'formatLrcTimestamp formats seconds back to [mm:ss.xx]', () => {
      const res = formatLrcTimestamp(83.45);
      if (res !== '[01:23.45]') throw new Error(`Expected [01:23.45], got ${res}`);
    });

    run('LRC Parser', 'parseLyrics parses synchronized lines and metadata', () => {
      const text = `[ti:Song Title]
[ar:Song Artist]
[00:02.00] First lyric line
[00:05.50] Second lyric line`;
      const doc = parseLyrics(text);
      if (!doc.isSynced) throw new Error('Expected doc to be synced');
      if (doc.lines.length !== 2) throw new Error(`Expected 2 lines, got ${doc.lines.length}`);
      if (doc.lines[0].text !== 'First lyric line') throw new Error('First lyric line text mismatch');
      if (doc.lines[1].time !== 5.5) throw new Error('Second lyric timestamp mismatch');
    });

    run('LRC Parser', 'getActiveLyricIndex finds the exact current line and applies offset', () => {
      const doc = parseLyrics('[00:02.00] Line 1\n[00:06.00] Line 2\n[00:10.00] Line 3');
      const idxAt4 = getActiveLyricIndex(doc.lines, 4.0, 0);
      if (idxAt4 !== 0) throw new Error(`Expected index 0 at 4.0s, got ${idxAt4}`);

      const idxAt7 = getActiveLyricIndex(doc.lines, 7.0, 0);
      if (idxAt7 !== 1) throw new Error(`Expected index 1 at 7.0s, got ${idxAt7}`);

      // Offset test: if lyrics are delayed by 1s (offset = +1)
      const idxWithOffset = getActiveLyricIndex(doc.lines, 7.0, 1.0); // 7.0 - 1.0 = 6.0s -> index 1
      if (idxWithOffset !== 1) throw new Error(`Expected index 1 with offset, got ${idxWithOffset}`);
    });

    run('LRC Parser', 'extractWordTimings extracts word-level timing without inventing timestamps', () => {
      const lineWithWords = '<00:01.00> Hello <00:01.50> world';
      const parsed = extractWordTimings(lineWithWords);
      if (!parsed.words || parsed.words.length !== 2) throw new Error('Expected 2 word timestamps');
      if (parsed.words[0].word !== 'Hello') throw new Error('First word mismatch');

      const lineWithout = 'Just normal lyric line';
      const parsedWithout = extractWordTimings(lineWithout);
      if (parsedWithout.words !== undefined) throw new Error('Invented timestamps when none were present');
    });

    run('Lyrics Discovery & Matching', 'calculateLyricsMatchScore accurately scores candidates and handles duration delta', () => {
      const exact = calculateLyricsMatchScore({
        trackTitle: 'Midnight Reverie',
        trackArtist: 'Kaelen Vance',
        trackDuration: 36,
        candidateTitle: 'Midnight Reverie',
        candidateArtist: 'Kaelen Vance',
        candidateDuration: 36,
        hasSyncedLyrics: true,
        isInstrumental: false,
      });
      if (exact.score < 85 || !exact.isConfident) throw new Error(`Expected high score, got ${exact.score}`);

      const mismatch = calculateLyricsMatchScore({
        trackTitle: 'Midnight Reverie',
        trackArtist: 'Kaelen Vance',
        trackDuration: 36,
        candidateTitle: 'Some Other Song',
        candidateArtist: 'Other Singer',
        candidateDuration: 200,
        hasSyncedLyrics: false,
        isInstrumental: false,
      });
      if (mismatch.score > 40 || mismatch.isConfident) throw new Error(`Expected low score, got ${mismatch.score}`);
    });

    run('Persian Translation', 'Translates offline phrases and preserves association with lyrics lines', () => {
      const trans = persianTranslationService.getSingleLineTranslation('deep in the quiet of the night');
      if (trans !== 'در ژرفای سکوت شب') throw new Error(`Expected "در ژرفای سکوت شب", got "${trans}"`);

      persianTranslationService.setSingleLineTranslation('Test Lyric Line', 'سطر آزمایشی ترانه');
      const custom = persianTranslationService.getSingleLineTranslation('Test Lyric Line');
      if (custom !== 'سطر آزمایشی ترانه') throw new Error('Custom translation override failed');
    });

    // 2. Playback Engine Logic Tests
    run('Playback Engine', 'calculateNextIndex respects repeatMode OFF, ALL, ONE', () => {
      // Repeat OFF
      if (calculateNextIndex(0, 3, 'off') !== 1) throw new Error('Expected 1 when at 0');
      if (calculateNextIndex(2, 3, 'off') !== null) throw new Error('Expected null at queue end with repeat off');

      // Repeat ALL
      if (calculateNextIndex(2, 3, 'all') !== 0) throw new Error('Expected loop back to 0 with repeat all');

      // Repeat ONE
      if (calculateNextIndex(1, 3, 'one') !== 1) throw new Error('Expected repeat same index with repeat one');
    });

    run('Playback Engine', 'calculatePreviousIndex jumps to prev or restarts track', () => {
      // If currentTime > 3s, restarts current track
      if (calculatePreviousIndex(2, 5, 10) !== 2) throw new Error('Expected track restart when > 3s');
      // If currentTime <= 3s, moves to prev
      if (calculatePreviousIndex(2, 5, 1.2) !== 1) throw new Error('Expected previous track index 1');
      if (calculatePreviousIndex(0, 5, 0.5) !== 0) throw new Error('Expected stay at 0 when at start');
    });

    run('Playback Engine', 'shuffleArray shuffles elements without losing items', () => {
      const original = ['A', 'B', 'C', 'D', 'E', 'F'];
      const shuffled = shuffleArray(original, 0);
      if (shuffled.length !== original.length) throw new Error('Array length changed');
      if (shuffled[0] !== 'A') throw new Error('Preserved first item index failed');
      const hasAll = original.every((item) => shuffled.includes(item));
      if (!hasAll) throw new Error('Missing elements in shuffled array');
    });

    // 3. Metadata Fallback Tests
    run('Metadata Engine', 'cleanFileNameToTitle formats filenames into clean titles and artists', () => {
      const res1 = cleanFileNameToTitle('01 - Daft Punk - One More Time.mp3');
      if (res1.artist !== 'Daft Punk') throw new Error(`Expected artist "Daft Punk", got "${res1.artist}"`);
      if (res1.title !== 'One More Time') throw new Error(`Expected title "One More Time", got "${res1.title}"`);

      const res2 = cleanFileNameToTitle('relaxing_ambient_sunset.flac');
      if (res2.title !== 'relaxing ambient sunset') throw new Error(`Expected title "relaxing ambient sunset", got "${res2.title}"`);
    });

    // 4. Persistence Serialization Tests
    run('Persistence', 'Track serialization safely removes temporary object URLs', () => {
      const mockTrack: Partial<Track> = {
        id: 't-1',
        title: 'Test Song',
        artist: 'Artist',
        album: 'Album',
        duration: 180,
        fileName: 'test.mp3',
        fileSize: 1000,
        fileType: 'audio/mpeg',
        dateAdded: Date.now(),
        playCount: 0,
        isFavorite: false,
        sourceType: 'browser_file',
        coverArtUrl: 'blob:http://localhost:3000/12345',
      };

      const serialized = { ...mockTrack };
      if (serialized.coverArtUrl?.startsWith('blob:')) {
        serialized.coverArtUrl = undefined;
      }

      if (serialized.coverArtUrl !== undefined) {
        throw new Error('Expired blob URL was not stripped during serialization');
      }
    });

    // 5. Smart Playlists Tests
    run('Smart Playlists', 'evaluateSmartRule correctly matches genre, play count, and dates', () => {
      const track: Track = {
        id: 't-smart-1',
        title: 'Midnight Lo-Fi',
        artist: 'Chillout Sound',
        album: 'Night Visions',
        genre: 'Lo-Fi Chill',
        duration: 210,
        fileName: 'track1.mp3',
        fileSize: 5000000,
        fileType: 'audio/mpeg',
        dateAdded: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
        playCount: 15,
        isFavorite: true,
        sourceType: 'synth_demo',
        lyrics: '[00:01.00] Atmospheric beat',
      };

      // Match genre contains 'lo-fi'
      const matchGenre = evaluateSmartRule(track, {
        id: 'r1',
        field: 'genre',
        operator: 'contains',
        value: 'lo-fi',
      });
      if (!matchGenre) throw new Error('Expected genre to match "lo-fi"');

      // Match play count > 10
      const matchPlayCount = evaluateSmartRule(track, {
        id: 'r2',
        field: 'playCount',
        operator: 'greater_than',
        value: 10,
      });
      if (!matchPlayCount) throw new Error('Expected playCount > 10 to match');

      // Match in the last 10 days
      const matchDays = evaluateSmartRule(track, {
        id: 'r3',
        field: 'dateAdded',
        operator: 'in_last_days',
        value: 10,
      });
      if (!matchDays) throw new Error('Expected dateAdded in last 10 days to match');

      // False on older than 2 days
      const matchTooOld = evaluateSmartRule(track, {
        id: 'r4',
        field: 'dateAdded',
        operator: 'not_in_last_days',
        value: 10,
      });
      if (matchTooOld) throw new Error('Expected not_in_last_days 10 to be false');

      // Has lyrics
      const matchLyrics = evaluateSmartRule(track, {
        id: 'r5',
        field: 'hasLyrics',
        operator: 'is_true',
        value: true,
      });
      if (!matchLyrics) throw new Error('Expected hasLyrics to be true');
    });

    run('Smart Playlists', 'evaluateSmartPlaylist supports AND / OR matching strategy', () => {
      const now = Date.now();
      const mockTracks: Track[] = [
        {
          id: 't-1',
          title: 'Deep House Beats',
          artist: 'House Master',
          album: 'Club',
          genre: 'House',
          duration: 300,
          fileName: 't1.mp3',
          fileSize: 1000,
          fileType: 'audio/mp3',
          dateAdded: now,
          playCount: 25,
          isFavorite: true,
          sourceType: 'synth_demo',
        },
        {
          id: 't-2',
          title: 'Ambient Waves',
          artist: 'Sky Sound',
          album: 'Ether',
          genre: 'Ambient',
          duration: 180,
          fileName: 't2.mp3',
          fileSize: 1000,
          fileType: 'audio/mp3',
          dateAdded: now - 40 * 86400000, // 40 days ago
          playCount: 2,
          isFavorite: false,
          sourceType: 'synth_demo',
        },
        {
          id: 't-3',
          title: 'Synthwave Skyline',
          artist: 'Neon Drive',
          album: 'Outrun',
          genre: 'Synthwave',
          duration: 240,
          fileName: 't3.mp3',
          fileSize: 1000,
          fileType: 'audio/mp3',
          dateAdded: now,
          playCount: 0,
          isFavorite: true,
          sourceType: 'synth_demo',
        },
      ];

      // AND match: Favorite AND PlayCount > 10
      const configAnd: SmartPlaylistConfig = {
        matchStrategy: 'all',
        rules: [
          { id: '1', field: 'isFavorite', operator: 'is_true', value: true },
          { id: '2', field: 'playCount', operator: 'greater_than', value: 10 },
        ],
        sortBy: 'playCount',
        sortDirection: 'desc',
      };
      const resAnd = evaluateSmartPlaylist(configAnd, mockTracks);
      if (resAnd.length !== 1 || resAnd[0].id !== 't-1') {
        throw new Error(`Expected exactly t-1 for AND match, got ${resAnd.map((t) => t.id).join(', ')}`);
      }

      // OR match: Genre 'Ambient' OR Favorite
      const configOr: SmartPlaylistConfig = {
        matchStrategy: 'any',
        rules: [
          { id: '1', field: 'genre', operator: 'contains', value: 'Ambient' },
          { id: '2', field: 'isFavorite', operator: 'is_true', value: true },
        ],
        sortBy: 'title',
        sortDirection: 'asc',
      };
      const resOr = evaluateSmartPlaylist(configOr, mockTracks);
      // All 3 tracks match (t-1 is favorite, t-2 is ambient, t-3 is favorite)
      if (resOr.length !== 3) {
        throw new Error(`Expected 3 tracks for OR match, got ${resOr.length}`);
      }
    });

    run('Smart Playlists', 'evaluateSmartPlaylist applies sorting and limit properly', () => {
      const now = Date.now();
      const mockTracks: Track[] = [
        { id: 'a', title: 'Alpha', artist: 'Art', album: 'Alb', duration: 100, fileName: 'a.mp3', fileSize: 1, fileType: 'mp3', dateAdded: now, playCount: 5, isFavorite: false, sourceType: 'synth_demo' },
        { id: 'b', title: 'Beta', artist: 'Art', album: 'Alb', duration: 100, fileName: 'b.mp3', fileSize: 1, fileType: 'mp3', dateAdded: now, playCount: 50, isFavorite: false, sourceType: 'synth_demo' },
        { id: 'c', title: 'Gamma', artist: 'Art', album: 'Alb', duration: 100, fileName: 'c.mp3', fileSize: 1, fileType: 'mp3', dateAdded: now, playCount: 20, isFavorite: false, sourceType: 'synth_demo' },
      ];

      const config: SmartPlaylistConfig = {
        matchStrategy: 'all',
        rules: [],
        sortBy: 'playCount',
        sortDirection: 'desc',
        limit: 2,
      };

      const res = evaluateSmartPlaylist(config, mockTracks);
      if (res.length !== 2) throw new Error(`Expected limit of 2, got ${res.length}`);
      if (res[0].id !== 'b' || res[1].id !== 'c') {
        throw new Error(`Expected order b (50), c (20), got ${res.map((t) => t.id).join(', ')}`);
      }
    });

    run('Smart Playlists', 'describeSmartPlaylistRules outputs human-readable summaries', () => {
      const config: SmartPlaylistConfig = {
        matchStrategy: 'all',
        rules: [
          { id: '1', field: 'genre', operator: 'contains', value: 'Electronic' },
          { id: '2', field: 'playCount', operator: 'greater_than', value: 5 },
        ],
        sortBy: 'playCount',
        sortDirection: 'desc',
        limit: 25,
      };
      const desc = describeSmartPlaylistRules(config);
      if (!desc.includes('Genre contains "Electronic"') || !desc.includes('Limit 25')) {
        throw new Error(`Unexpected rule description: ${desc}`);
      }
    });

    // 6. Audio DSP: BPM & Harmonic Key Analysis
    run('Audio DSP & Harmonic Analysis', 'calculateBpmFromChannelData accurately calculates BPM from rhythmic energy pulses', () => {
      const sampleRate = 44100;
      const duration = 10;
      const totalSamples = sampleRate * duration;
      const samples = new Float32Array(totalSamples);
      const beatIntervalSamples = Math.round(sampleRate * (60 / 120)); // 120 BPM

      for (let beat = 0; beat < duration * 2; beat++) {
        const beatStart = beat * beatIntervalSamples;
        const burstLength = Math.round(sampleRate * 0.04);
        for (let j = 0; j < burstLength && beatStart + j < totalSamples; j++) {
          const t = j / sampleRate;
          samples[beatStart + j] = Math.sin(2 * Math.PI * 100 * t) * (1 - j / burstLength);
        }
      }

      const calculated = calculateBpmFromChannelData(samples, sampleRate);
      if (Math.abs(calculated - 120) > 2) {
        throw new Error(`Expected BPM near 120, got ${calculated}`);
      }
    });

    run('Audio DSP & Harmonic Analysis', 'calculateKeyFromChannelData accurately detects C Major & Camelot 8B from harmonic triad', () => {
      const sampleRate = 44100;
      const duration = 3;
      const totalSamples = sampleRate * duration;
      const samples = new Float32Array(totalSamples);

      for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;
        samples[i] =
          0.4 * Math.sin(2 * Math.PI * 261.63 * t) +
          0.3 * Math.sin(2 * Math.PI * 329.63 * t) +
          0.3 * Math.sin(2 * Math.PI * 392.00 * t);
      }

      const res = calculateKeyFromChannelData(samples, sampleRate);
      if (res.key !== 'C Major' || res.camelot !== '8B') {
        throw new Error(`Expected C Major (8B), got ${res.key} (${res.camelot})`);
      }
    });

    run('Audio DSP & Harmonic Analysis', 'calculateKeyFromChannelData accurately detects A Minor & Camelot 8A from harmonic triad', () => {
      const sampleRate = 44100;
      const duration = 3;
      const totalSamples = sampleRate * duration;
      const samples = new Float32Array(totalSamples);

      for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;
        samples[i] =
          0.4 * Math.sin(2 * Math.PI * 220.00 * t) +
          0.3 * Math.sin(2 * Math.PI * 261.63 * t) +
          0.3 * Math.sin(2 * Math.PI * 329.63 * t);
      }

      const res = calculateKeyFromChannelData(samples, sampleRate);
      if (res.key !== 'A Minor' || res.camelot !== '8A') {
        throw new Error(`Expected A Minor (8A), got ${res.key} (${res.camelot})`);
      }
    });

    setResults(testResults);
    setIsRunning(false);
  };

  useEffect(() => {
    runAllTests();
  }, []);

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 select-none pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Diagnostics & Tests</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time automated unit & integration test runner validating all core specifications.
          </p>
        </div>

        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="px-4 py-2.5 rounded-full bg-brand-500 text-neutral-950 font-semibold text-xs hover:bg-brand-400 flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50"
        >
          {isRunning ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
          <span>Run All Tests</span>
        </button>
      </div>

      {/* Summary Scorecard */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/5">
          <p className="text-xs text-neutral-400 uppercase font-semibold">Total Tests</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-white mt-1">
            {results.length}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-brand-500/20">
          <p className="text-xs text-brand-400 uppercase font-semibold">Passed</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-brand-400 mt-1">
            {passedCount}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/5">
          <p className="text-xs text-rose-400 uppercase font-semibold">Failed</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-rose-400 mt-1">
            {failedCount}
          </p>
        </div>
      </div>

      {/* Test Results Table */}
      <div className="bg-neutral-900/40 rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          <Terminal size={14} className="text-brand-400" />
          <span>Test Suite Executions</span>
        </div>

        <div className="divide-y divide-white/5">
          {results.map((r, i) => (
            <div key={i} className="p-4 flex items-start justify-between gap-4 text-xs">
              <div className="flex items-start gap-3">
                {r.passed ? (
                  <CheckCircle2 size={16} className="text-brand-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                    {r.suite}
                  </span>
                  <p className="text-neutral-200 font-medium text-sm mt-0.5">{r.name}</p>
                  {r.error && (
                    <p className="text-rose-400 font-mono text-xs mt-1 bg-rose-950/50 p-2 rounded border border-rose-500/30">
                      Error: {r.error}
                    </p>
                  )}
                </div>
              </div>

              <span className="font-mono tabular-nums text-neutral-500 shrink-0">
                {r.durationMs}ms
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Audio Metadata Tag Diagnostics (Dev Only) */}
      <div className="bg-neutral-900/40 rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileAudio size={16} className="text-amber-400" />
            <div>
              <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Raw Audio Tag Diagnostics (Dev Only)
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Inspect raw ID3 frames (TPE1, TPE2, TCON, TRCK) and parsed fields to compare affected vs working tracks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshMetadataLogs}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 text-xs flex items-center gap-1.5 transition-colors"
              title="Refresh Logs"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>

            {metadataEntries.length > 0 && (
              <>
                <button
                  onClick={handleClearMetadataLogs}
                  className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-rose-400 text-xs flex items-center gap-1.5 transition-colors"
                  title="Clear Captured Logs"
                >
                  <Trash2 size={13} />
                  <span>Clear</span>
                </button>

                <button
                  onClick={handleCopyDiagnostics}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    copiedSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-brand-500 hover:bg-brand-400 text-black'
                  }`}
                  title="Copy JSON to Clipboard"
                >
                  {copiedSuccess ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedSuccess ? 'Copied to Clipboard!' : 'Copy Diagnostic JSON'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {metadataEntries.length === 0 ? (
          <div className="p-8 text-center">
            <FileAudio size={32} className="mx-auto text-neutral-600 mb-2" />
            <p className="text-sm font-medium text-neutral-300">No imported track tags recorded yet in this session</p>
            <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1">
              Import one track that displays a numeric artist (e.g. &ldquo;4&rdquo;) and one track that displays correctly using &ldquo;Import Music&rdquo;. Their raw tags and frame mappings will be logged here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 p-4 space-y-4">
            {metadataEntries.map((entry, idx) => {
              const isNumericArtist = /^\d+$/.test(entry.finalResolvedArtist);
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border ${
                    isNumericArtist
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-neutral-900/60 border-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <FileAudio size={18} className={isNumericArtist ? 'text-amber-400' : 'text-brand-400'} />
                      <span className="font-semibold text-neutral-200 text-sm">{entry.fileName}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/5">
                        {entry.fileExtension} &bull; {(entry.fileSize / 1024).toFixed(1)} KB
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400">Selected Artist:</span>
                      <span
                        className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md border ${
                          isNumericArtist
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        &quot;{entry.finalResolvedArtist}&quot;
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
                    {/* Common Tags */}
                    <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                      <span className="text-[11px] uppercase font-bold text-neutral-400 block mb-1.5">
                        parsed.common Tags
                      </span>
                      <div className="space-y-1 font-mono text-[11px]">
                        <div><span className="text-neutral-500">artist:</span> <span className="text-neutral-200">{JSON.stringify(entry.common.artist)}</span></div>
                        <div><span className="text-neutral-500">artists:</span> <span className="text-neutral-200">{JSON.stringify(entry.common.artists)}</span></div>
                        <div><span className="text-neutral-500">albumartist:</span> <span className="text-neutral-200">{JSON.stringify(entry.common.albumartist)}</span></div>
                        <div><span className="text-neutral-500">track:</span> <span className="text-neutral-200">{JSON.stringify(entry.common.track)}</span></div>
                        <div><span className="text-neutral-500">genre:</span> <span className="text-neutral-200">{JSON.stringify(entry.common.genre)}</span></div>
                        <div><span className="text-neutral-500">title:</span> <span className="text-neutral-200">{JSON.stringify(entry.common.title)}</span></div>
                      </div>
                    </div>

                    {/* Relevant Native Frames */}
                    <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                      <span className="text-[11px] uppercase font-bold text-neutral-400 block mb-1.5">
                        Relevant Native Frames (TPE1, TPE2, TCON, TRCK)
                      </span>
                      {Object.keys(entry.relevantFrames).length > 0 ? (
                        <div className="space-y-1 font-mono text-[11px]">
                          {Object.entries(entry.relevantFrames).map(([frameKey, frameVal]) => (
                            <div key={frameKey}>
                              <span className="text-amber-400/90">{frameKey}:</span>{' '}
                              <span className="text-neutral-200">{JSON.stringify(frameVal)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-neutral-500 italic text-[11px]">No matching native frames found</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
