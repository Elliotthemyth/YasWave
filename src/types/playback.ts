import { Track } from './track';

export type RepeatMode = 'off' | 'all' | 'one';
export type VisualizerMode = 'bars' | 'wave' | 'circle';

export interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0.0 to 1.0
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  playbackRate: number;
  error: string | null;
}

export interface QueueState {
  queue: Track[];
  history: Track[];
  originalQueue: Track[]; // used when un-shuffling
  currentIndex: number;
}
