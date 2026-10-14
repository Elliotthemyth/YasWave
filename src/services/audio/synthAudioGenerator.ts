/**
 * Client-side Web Audio synthesizer that generates short ambient/lo-fi audio tracks
 * as offline WAV Blobs. Completely offline, zero remote network calls, pure math.
 */

// Encode float audio buffer to 16-bit PCM WAV Blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(wavBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + length, true);
  /* RIFF type */
  writeString(8, 'WAVE');
  /* format chunk identifier */
  writeString(12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(36, 'data');
  /* data chunk length */
  view.setUint32(40, length, true);

  // Write interleaved PCM samples
  let offset = 44;
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      // Clamp between -1.0 and 1.0
      sample = Math.max(-1, Math.min(1, sample));
      // Scale to 16-bit signed integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

export type SynthSongType = 'midnight_reverie' | 'linux_kernel_lofi' | 'neon_drift';

export async function generateSynthesizedTrack(type: SynthSongType): Promise<Blob> {
  const sampleRate = 44100;
  // 36 seconds duration (loops cleanly)
  const duration = 36;
  const numSamples = sampleRate * duration;
  
  const ctx = new OfflineAudioContext(2, numSamples, sampleRate);

  if (type === 'midnight_reverie') {
    // Warm Rhodes-like ambient progression: Dm9 -> G13 -> Cmaj9 -> Am9
    const chords = [
      [146.83, 220.0, 261.63, 329.63, 392.0], // Dm9
      [196.0, 246.94, 329.63, 392.0, 440.0],  // G13
      [130.81, 196.0, 246.94, 329.63, 392.0], // Cmaj9
      [110.0, 164.81, 220.0, 261.63, 329.63], // Am9
    ];

    const chordDuration = 9; // 4 chords * 9s = 36s
    chords.forEach((chord, chordIdx) => {
      const startTime = chordIdx * chordDuration;
      chord.forEach((freq, noteIdx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = noteIdx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        
        // Soft vibrato
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 4.5;
        lfoGain.gain.value = 1.2;
        lfo.connect(osc.frequency);
        lfo.start(startTime);
        lfo.stop(startTime + chordDuration);

        // Envelope
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.08 / chord.length, startTime + 0.8);
        gain.gain.setValueAtTime(0.07 / chord.length, startTime + chordDuration - 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + chordDuration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + chordDuration);
      });
    });

    // Subtle bass pulse on downbeats
    for (let beat = 0; beat < 16; beat++) {
      const beatTime = beat * 2.25;
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(beat % 4 === 0 ? 55 : 73.42, beatTime);

      bassGain.gain.setValueAtTime(0.18, beatTime);
      bassGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 1.2);

      bassOsc.connect(bassGain);
      bassGain.connect(ctx.destination);

      bassOsc.start(beatTime);
      bassOsc.stop(beatTime + 1.3);
    }
  } else if (type === 'linux_kernel_lofi') {
    // Mellow lo-fi groove with kick, rim and dusty electric keys
    const notes = [220.0, 261.63, 329.63, 392.0, 440.0, 523.25];
    for (let step = 0; step < 72; step++) {
      const stepTime = step * 0.5;
      // Keys arp
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const freq = notes[step % notes.length];
      osc.frequency.setValueAtTime(freq, stepTime);

      gain.gain.setValueAtTime(0.05, stepTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, stepTime + 0.42);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(stepTime);
      osc.stop(stepTime + 0.45);

      // Lo-fi kick on 1 and 3
      if (step % 4 === 0) {
        const kick = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(120, stepTime);
        kick.frequency.exponentialRampToValueAtTime(45, stepTime + 0.15);

        kickGain.gain.setValueAtTime(0.25, stepTime);
        kickGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.3);

        kick.connect(kickGain);
        kickGain.connect(ctx.destination);
        kick.start(stepTime);
        kick.stop(stepTime + 0.32);
      }
    }
  } else {
    // Neon Drift: Synthwave bassline with shimmering upper fifths
    const bassline = [65.41, 65.41, 77.78, 87.31, 98.0, 98.0, 87.31, 77.78];
    for (let i = 0; i < 48; i++) {
      const t = i * 0.75;
      const freq = bassline[i % bassline.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      // Lowpass filter for smooth synthwave warmth
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, t);
      filter.frequency.exponentialRampToValueAtTime(200, t + 0.5);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.7);
    }
  }

  const renderedBuffer = await ctx.startRendering();
  return audioBufferToWav(renderedBuffer);
}
