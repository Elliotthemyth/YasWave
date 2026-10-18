/**
 * Audio Analyzer Service for YASWAVE
 * 
 * Provides client-side DSP algorithms for:
 * 1. BPM (Tempo) calculation via spectral energy flux & autocorrelation.
 * 2. Musical Key detection via Chromagram pitch class profiling and
 *    the Krumhansl-Schmuckler Key-Finding algorithm with Camelot Wheel mapping.
 */

export interface KeyResult {
  key: string;            // e.g. "C Major", "A Minor"
  keyShort: string;       // e.g. "C", "Am"
  mode: 'major' | 'minor';
  root: string;           // e.g. "C", "A"
  camelot: string;        // e.g. "8B", "8A"
  confidence: number;     // 0.0 to 1.0
}

export interface AudioAnalysisResult {
  bpm?: number;
  key?: string;
  keyShort?: string;
  keyCamelot?: string;
  mode?: 'major' | 'minor';
  confidence?: number;
}

// 12 Standard Pitch Classes
export const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type PitchClass = typeof PITCH_CLASSES[number];

// Camelot Wheel Mapping for DJ-style harmonic mixing
export const CAMELOT_KEYS: Record<string, string> = {
  'Ab Minor': '1A', 'G# Minor': '1A', 'B Major': '1B',
  'Eb Minor': '2A', 'D# Minor': '2A', 'F# Major': '2B', 'Gb Major': '2B',
  'Bb Minor': '3A', 'A# Minor': '3A', 'Db Major': '3B', 'C# Major': '3B',
  'F Minor': '4A', 'Ab Major': '4B', 'G# Major': '4B',
  'C Minor': '5A', 'Eb Major': '5B', 'D# Major': '5B',
  'G Minor': '6A', 'Bb Major': '6B', 'A# Major': '6B',
  'D Minor': '7A', 'F Major': '7B',
  'A Minor': '8A', 'C Major': '8B',
  'E Minor': '9A', 'G Major': '9B',
  'B Minor': '10A', 'D Major': '10B',
  'F# Minor': '11A', 'Gb Minor': '11A', 'A Major': '11B',
  'C# Minor': '12A', 'Db Minor': '12A', 'E Major': '12B',
};

// Krumhansl-Kessler Key Profiles (Cognitive psychology empirical probe tone ratings)
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/**
 * Compute Pearson correlation between two vectors of equal length
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    num += diffX * diffY;
    denX += diffX * diffX;
    denY += diffY * diffY;
  }

  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

/**
 * Calculate Goertzel energy at target frequency
 */
function goertzelPower(samples: Float32Array, targetFreq: number, sampleRate: number): number {
  const n = samples.length;
  if (n === 0) return 0;
  const k = Math.round((n * targetFreq) / sampleRate);
  const w = (2 * Math.PI * k) / n;
  const cosine = Math.cos(w);
  const coeff = 2 * cosine;

  let s0 = 0;
  let s1 = 0;
  let s2 = 0;

  for (let i = 0; i < n; i++) {
    s0 = samples[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }

  return s1 * s1 + s2 * s2 - coeff * s1 * s2;
}

/**
 * Calculate Musical Key from mono audio channel data using Chromagram analysis
 * and Krumhansl-Schmuckler key-finding algorithm.
 */
export function calculateKeyFromChannelData(
  channelData: Float32Array,
  sampleRate: number
): KeyResult {
  if (!channelData || channelData.length === 0 || sampleRate <= 0) {
    return {
      key: 'C Major',
      keyShort: 'C',
      mode: 'major',
      root: 'C',
      camelot: '8B',
      confidence: 0,
    };
  }

  // 12-element Chroma Vector (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
  const chroma = new Array(12).fill(0);

  // Analyze representative window (e.g. up to 30 seconds of audio)
  const windowLength = Math.min(channelData.length, sampleRate * 30);
  const blockSize = 4096;
  const numBlocks = Math.max(1, Math.min(24, Math.floor(windowLength / blockSize)));
  const step = Math.floor((windowLength - blockSize) / Math.max(1, numBlocks - 1));

  // Range of MIDI pitches to probe (C2 = 36 [65.4 Hz] up to B5 = 83 [987.77 Hz])
  const minMidi = 36;
  const maxMidi = 83;

  for (let b = 0; b < numBlocks; b++) {
    const offset = b * step;
    const block = channelData.subarray(offset, offset + blockSize);

    for (let midi = minMidi; midi <= maxMidi; midi++) {
      const pitchClassIndex = midi % 12;
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      if (freq < sampleRate / 2) {
        const power = goertzelPower(block, freq, sampleRate);
        chroma[pitchClassIndex] += power;
      }
    }
  }

  // Find best correlating key
  let bestScore = -Infinity;
  let bestRootIndex = 0;
  let bestMode: 'major' | 'minor' = 'major';

  for (let root = 0; root < 12; root++) {
    // Rotate major profile to root
    const rotatedMajor = new Array(12);
    const rotatedMinor = new Array(12);
    for (let i = 0; i < 12; i++) {
      rotatedMajor[i] = MAJOR_PROFILE[(i - root + 12) % 12];
      rotatedMinor[i] = MINOR_PROFILE[(i - root + 12) % 12];
    }

    const majorScore = pearsonCorrelation(chroma, rotatedMajor);
    if (majorScore > bestScore) {
      bestScore = majorScore;
      bestRootIndex = root;
      bestMode = 'major';
    }

    const minorScore = pearsonCorrelation(chroma, rotatedMinor);
    if (minorScore > bestScore) {
      bestScore = minorScore;
      bestRootIndex = root;
      bestMode = 'minor';
    }
  }

  const rootName = PITCH_CLASSES[bestRootIndex];
  const modeText = bestMode === 'major' ? 'Major' : 'Minor';
  const fullKey = `${rootName} ${modeText}`;
  const shortKey = bestMode === 'major' ? rootName : `${rootName}m`;
  const camelot = CAMELOT_KEYS[fullKey] || (bestMode === 'major' ? '8B' : '8A');

  return {
    key: fullKey,
    keyShort: shortKey,
    mode: bestMode,
    root: rootName,
    camelot,
    confidence: Math.max(0, Math.min(1, parseFloat(bestScore.toFixed(3)))),
  };
}

/**
 * Calculate BPM (Beats Per Minute) from audio channel data using
 * downsampled spectral energy flux and autocorrelation.
 */
export function calculateBpmFromChannelData(
  channelData: Float32Array,
  sampleRate: number,
  minBpm = 60,
  maxBpm = 180
): number {
  if (!channelData || channelData.length < sampleRate) {
    return 120; // Default sensible fallback
  }

  // 1. Take middle portion of track (up to 35 seconds) to avoid silent lead-ins
  const totalLength = channelData.length;
  const analyzeSeconds = 30;
  const analyzeSamples = Math.min(totalLength, sampleRate * analyzeSeconds);
  const startSample = totalLength > sampleRate * 10 ? sampleRate * 5 : 0;
  const audioSlice = channelData.subarray(startSample, startSample + analyzeSamples);

  // 2. Downsample to ~11025 Hz for high speed calculation
  const targetSampleRate = 11025;
  const decimate = Math.max(1, Math.floor(sampleRate / targetSampleRate));
  const downSampleRate = sampleRate / decimate;
  const downsampledLength = Math.floor(audioSlice.length / decimate);
  const downsampled = new Float32Array(downsampledLength);

  for (let i = 0; i < downsampledLength; i++) {
    downsampled[i] = audioSlice[i * decimate];
  }

  // 3. Compute energy envelope over overlapping frames
  const frameSize = 512;
  const hopSize = 256;
  const numFrames = Math.floor((downsampledLength - frameSize) / hopSize);
  if (numFrames < 10) return 120;

  const energy = new Float32Array(numFrames);
  for (let i = 0; i < numFrames; i++) {
    const offset = i * hopSize;
    let sum = 0;
    for (let j = 0; j < frameSize; j++) {
      const s = downsampled[offset + j];
      sum += s * s;
    }
    energy[i] = sum;
  }

  // 4. Compute spectral flux (onset strength: positive derivative of energy)
  const onsets = new Float32Array(numFrames);
  for (let i = 1; i < numFrames; i++) {
    const diff = energy[i] - energy[i - 1];
    onsets[i] = diff > 0 ? diff : 0;
  }

  // 5. Autocorrelation across BPM lags
  const frameRate = downSampleRate / hopSize;
  const bpmCandidates: { bpm: number; score: number }[] = [];

  for (let bpm = minBpm; bpm <= maxBpm; bpm += 1) {
    const lagInSeconds = 60 / bpm;
    const lagInFrames = Math.round(lagInSeconds * frameRate);
    if (lagInFrames <= 0 || lagInFrames >= numFrames) continue;

    let score = 0;
    let count = 0;
    for (let i = 0; i < numFrames - lagInFrames; i++) {
      score += onsets[i] * onsets[i + lagInFrames];
      count++;
    }

    if (count > 0) {
      bpmCandidates.push({ bpm, score: score / count });
    }
  }

  if (bpmCandidates.length === 0) return 120;

  // Find peak candidate
  bpmCandidates.sort((a, b) => b.score - a.score);
  let bestBpm = bpmCandidates[0].bpm;

  // 6. Octave check: If the top candidate is around 60-80 BPM, check if double-tempo
  // (120-160 BPM) has a strong presence, which is much more common in modern music.
  if (bestBpm < 85) {
    const doubleBpm = bestBpm * 2;
    const doubleCandidate = bpmCandidates.find((c) => Math.abs(c.bpm - doubleBpm) <= 2);
    if (doubleCandidate && doubleCandidate.score >= bpmCandidates[0].score * 0.7) {
      bestBpm = doubleCandidate.bpm;
    }
  } else if (bestBpm > 155) {
    const halfBpm = Math.round(bestBpm / 2);
    const halfCandidate = bpmCandidates.find((c) => Math.abs(c.bpm - halfBpm) <= 2);
    if (halfCandidate && halfCandidate.score >= bpmCandidates[0].score * 0.85) {
      bestBpm = halfCandidate.bpm;
    }
  }

  return Math.round(bestBpm);
}

/**
 * Decode audio File using the browser Web Audio API AudioContext / OfflineAudioContext
 */
export async function decodeAudioFromFile(file: File): Promise<Float32Array | null> {
  if (typeof window === 'undefined') return null;

  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtxClass) return null;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const ctx = new AudioCtxClass();
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    } finally {
      if (ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
    }

    // Downmix to mono channel data
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const mono = new Float32Array(length);

    if (numChannels === 1) {
      mono.set(audioBuffer.getChannelData(0));
    } else {
      const ch0 = audioBuffer.getChannelData(0);
      const ch1 = audioBuffer.getChannelData(1);
      for (let i = 0; i < length; i++) {
        mono[i] = (ch0[i] + ch1[i]) * 0.5;
      }
    }

    return mono;
  } catch (err) {
    console.warn(`Audio decoding skipped for ${file.name}:`, err);
    return null;
  }
}

/**
 * Full end-to-end analysis of an audio File during import.
 * Returns calculated BPM, Musical Key, and Camelot code.
 */
export async function calculateBpmAndKeyFromFile(
  file: File,
  knownBpm?: number,
  knownKey?: string
): Promise<AudioAnalysisResult> {
  // If metadata already provided both BPM and Key from ID3 tags, use them directly
  if (knownBpm && knownKey) {
    const camelot = CAMELOT_KEYS[knownKey] || '';
    return {
      bpm: knownBpm,
      key: knownKey,
      keyCamelot: camelot,
    };
  }

  try {
    const monoSamples = await decodeAudioFromFile(file);
    if (!monoSamples) {
      return {
        bpm: knownBpm,
        key: knownKey,
        keyCamelot: knownKey ? CAMELOT_KEYS[knownKey] : undefined,
      };
    }

    const sampleRate = 44100; // Standard decode rate
    const calculatedBpm = knownBpm || calculateBpmFromChannelData(monoSamples, sampleRate);
    const keyResult = knownKey
      ? {
          key: knownKey,
          keyShort: knownKey,
          camelot: CAMELOT_KEYS[knownKey] || '',
          mode: knownKey.toLowerCase().includes('minor') ? ('minor' as const) : ('major' as const),
          confidence: 1,
        }
      : calculateKeyFromChannelData(monoSamples, sampleRate);

    return {
      bpm: calculatedBpm,
      key: keyResult.key,
      keyShort: keyResult.keyShort,
      keyCamelot: keyResult.camelot,
      mode: keyResult.mode,
      confidence: keyResult.confidence,
    };
  } catch (err) {
    console.error('Error during BPM and Key calculation:', err);
    return {
      bpm: knownBpm,
      key: knownKey,
      keyCamelot: knownKey ? CAMELOT_KEYS[knownKey] : undefined,
    };
  }
}
