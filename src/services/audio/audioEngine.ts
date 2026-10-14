import { Track } from '../../types/track';
import { PlaybackState, QueueState, RepeatMode } from '../../types/playback';
import { getActiveFileAdapter } from '../filesystem/fileAdapter';
import { systemMediaSession } from '../platform/platformAdapter';

export type PlaybackListener = (state: PlaybackState, queue: QueueState) => void;

/**
 * Fisher-Yates array shuffle algorithm (pure function)
 */
export function shuffleArray<T>(array: T[], preserveFirstItemIndex = -1): T[] {
  const result = [...array];
  if (result.length <= 1) return result;

  let fixedItem: T | undefined;
  if (preserveFirstItemIndex >= 0 && preserveFirstItemIndex < result.length) {
    fixedItem = result.splice(preserveFirstItemIndex, 1)[0];
  }

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  if (fixedItem !== undefined) {
    result.unshift(fixedItem);
  }

  return result;
}

/**
 * Calculate the next index in a queue based on repeat mode and current position
 */
export function calculateNextIndex(
  currentIndex: number,
  queueLength: number,
  repeatMode: RepeatMode
): number | null {
  if (queueLength === 0) return null;
  if (repeatMode === 'one') return currentIndex;
  
  if (currentIndex + 1 < queueLength) {
    return currentIndex + 1;
  }

  if (repeatMode === 'all') {
    return 0;
  }

  return null; // reached end of queue and repeat is off
}

/**
 * Calculate the previous index in a queue
 */
export function calculatePreviousIndex(
  currentIndex: number,
  queueLength: number,
  currentTime: number
): number {
  if (queueLength === 0) return -1;
  // If we've played more than 3 seconds into the track, restart it
  if (currentTime > 3) {
    return currentIndex;
  }
  // Otherwise jump to previous track
  return currentIndex > 0 ? currentIndex - 1 : 0;
}

export class AudioEngine {
  private audio: HTMLAudioElement;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private isAudioGraphConnected = false;

  private currentPlayableUrl: string | null = null;
  private listeners: Set<PlaybackListener> = new Set();

  private state: PlaybackState = {
    currentTrack: null,
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    repeatMode: 'off',
    isShuffle: false,
    playbackRate: 1.0,
    error: null,
  };

  private queueState: QueueState = {
    queue: [],
    history: [],
    originalQueue: [],
    currentIndex: -1,
  };

  constructor() {
    if (typeof Audio !== 'undefined') {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.crossOrigin = 'anonymous';
      this.setupAudioListeners();
    } else {
      // Mock dummy audio element for Node.js test environments
      this.audio = {
        addEventListener: () => {},
        removeEventListener: () => {},
        play: async () => {},
        pause: () => {},
        load: () => {},
        currentTime: 0,
        duration: 0,
        volume: 1,
        playbackRate: 1,
      } as unknown as HTMLAudioElement;
    }
  }

  private setupAudioListeners(): void {
    systemMediaSession.registerActionHandlers({
      onPlay: () => this.play(),
      onPause: () => this.pause(),
      onNext: () => this.playNext(),
      onPrevious: () => this.playPrevious(),
      onSeek: (seconds) => this.seek(seconds),
    });

    this.audio.addEventListener('play', () => {
      this.updateState({ isPlaying: true, error: null });
    });

    this.audio.addEventListener('pause', () => {
      this.updateState({ isPlaying: false });
    });

    this.audio.addEventListener('timeupdate', () => {
      this.updateState({
        currentTime: this.audio.currentTime,
        duration: this.audio.duration && !isNaN(this.audio.duration) ? this.audio.duration : this.state.duration,
      });
    });

    this.audio.addEventListener('loadedmetadata', () => {
      const dur = this.audio.duration && !isNaN(this.audio.duration) ? this.audio.duration : this.state.duration;
      this.updateState({
        duration: dur,
        isLoading: false,
      });
    });

    this.audio.addEventListener('waiting', () => {
      this.updateState({ isLoading: true });
    });

    this.audio.addEventListener('canplay', () => {
      this.updateState({ isLoading: false });
    });

    this.audio.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    this.audio.addEventListener('error', () => {
      const errorMsg = this.audio.error?.message || 'Error decoding audio file. Format may be unsupported or corrupted.';
      this.updateState({
        isLoading: false,
        isPlaying: false,
        error: errorMsg,
      });
    });
  }

  /**
   * Lazily ensure Web Audio graph is constructed upon explicit user gesture
   */
  public async ensureAudioGraph(): Promise<void> {
    if (this.isAudioGraphConnected) {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
        } catch (e) {
          console.warn('Could not resume AudioContext:', e);
        }
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 1024;
      this.analyserNode.smoothingTimeConstant = 0.82;
      this.analyserNode.minDecibels = -90;
      this.analyserNode.maxDecibels = -10;

      this.gainNode = this.audioContext.createGain();

      this.sourceNode.connect(this.analyserNode);
      this.analyserNode.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.isAudioGraphConnected = true;

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (err) {
      console.warn('Web Audio initialization note (normal in some sandboxes):', err);
    }
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  public subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    listener(this.state, this.queueState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state, this.queueState);
    }
  }

  private updateState(partial: Partial<PlaybackState>): void {
    this.state = { ...this.state, ...partial };
    if (partial.isPlaying !== undefined) {
      systemMediaSession.setPlaybackState(partial.isPlaying);
    }
    this.notify();
  }

  public getState(): PlaybackState {
    return { ...this.state };
  }

  public getQueueState(): QueueState {
    return {
      queue: [...this.queueState.queue],
      history: [...this.queueState.history],
      originalQueue: [...this.queueState.originalQueue],
      currentIndex: this.queueState.currentIndex,
    };
  }

  /**
   * Play or Pause toggle
   */
  public async togglePlay(): Promise<void> {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      await this.play();
    }
  }

  public async play(): Promise<void> {
    if (!this.state.currentTrack && this.queueState.queue.length > 0) {
      await this.playTrackAtIndex(0);
      return;
    }

    if (!this.state.currentTrack) return;

    await this.ensureAudioGraph();
    try {
      await this.audio.play();
    } catch (err) {
      console.warn('Playback error / Autoplay blocked:', err);
      this.updateState({ isPlaying: false });
    }
  }

  public pause(): void {
    this.audio.pause();
  }

  public seek(seconds: number): void {
    const target = Math.max(0, Math.min(seconds, this.state.duration || this.audio.duration || 0));
    this.audio.currentTime = target;
    this.updateState({ currentTime: target });
  }

  public seekRelative(deltaSeconds: number): void {
    this.seek(this.state.currentTime + deltaSeconds);
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.audio.volume = this.state.isMuted ? 0 : clamped;
    this.updateState({ volume: clamped, isMuted: false });
  }

  public toggleMute(): void {
    const nextMuted = !this.state.isMuted;
    this.audio.volume = nextMuted ? 0 : this.state.volume;
    this.updateState({ isMuted: nextMuted });
  }

  public setPlaybackRate(rate: number): void {
    const clamped = Math.max(0.5, Math.min(2.0, rate));
    this.audio.playbackRate = clamped;
    this.updateState({ playbackRate: clamped });
  }

  public setRepeatMode(mode: RepeatMode): void {
    this.updateState({ repeatMode: mode });
  }

  public cycleRepeatMode(): void {
    const nextMode: RepeatMode =
      this.state.repeatMode === 'off' ? 'all' : this.state.repeatMode === 'all' ? 'one' : 'off';
    this.setRepeatMode(nextMode);
  }

  public toggleShuffle(): void {
    const nextShuffle = !this.state.isShuffle;
    if (nextShuffle) {
      // Turn on shuffle
      const currentTrack = this.state.currentTrack;
      const currentIdx = this.queueState.currentIndex;
      const shuffled = shuffleArray(this.queueState.originalQueue, currentIdx >= 0 ? currentIdx : 0);
      const newCurrentIdx = currentTrack ? shuffled.findIndex((t) => t.id === currentTrack.id) : 0;
      
      this.queueState = {
        ...this.queueState,
        queue: shuffled,
        currentIndex: newCurrentIdx >= 0 ? newCurrentIdx : 0,
      };
    } else {
      // Turn off shuffle, restore original order
      const currentTrack = this.state.currentTrack;
      const originalIdx = currentTrack ? this.queueState.originalQueue.findIndex((t) => t.id === currentTrack.id) : 0;
      
      this.queueState = {
        ...this.queueState,
        queue: [...this.queueState.originalQueue],
        currentIndex: originalIdx >= 0 ? originalIdx : 0,
      };
    }

    this.updateState({ isShuffle: nextShuffle });
  }

  /**
   * Set and play a queue of tracks
   */
  public async setQueue(tracks: Track[], startIndex = 0, autoPlay = true): Promise<void> {
    if (tracks.length === 0) return;

    const clampedIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
    this.queueState = {
      queue: [...tracks],
      originalQueue: [...tracks],
      history: [],
      currentIndex: clampedIndex,
    };

    if (this.state.isShuffle) {
      const currentTrack = tracks[clampedIndex];
      const shuffled = shuffleArray(tracks, clampedIndex);
      const newIndex = shuffled.findIndex((t) => t.id === currentTrack.id);
      this.queueState.queue = shuffled;
      this.queueState.currentIndex = newIndex >= 0 ? newIndex : 0;
    }

    await this.loadCurrentQueueTrack(autoPlay);
  }

  /**
   * Play track at specific index in queue
   */
  public async playTrackAtIndex(index: number, autoPlay = true): Promise<void> {
    if (index < 0 || index >= this.queueState.queue.length) return;

    if (this.state.currentTrack) {
      this.queueState.history.push(this.state.currentTrack);
    }
    this.queueState.currentIndex = index;
    await this.loadCurrentQueueTrack(autoPlay);
  }

  /**
   * Play next track according to queue and repeat mode
   */
  public async playNext(): Promise<void> {
    if (this.queueState.queue.length === 0) return;

    if (this.state.repeatMode === 'one') {
      this.seek(0);
      await this.play();
      return;
    }

    const nextIdx = calculateNextIndex(
      this.queueState.currentIndex,
      this.queueState.queue.length,
      this.state.repeatMode
    );

    if (nextIdx !== null) {
      await this.playTrackAtIndex(nextIdx, true);
    } else {
      // Reached the end of queue with repeat off
      this.pause();
      this.seek(0);
    }
  }

  /**
   * Play previous track
   */
  public async playPrevious(): Promise<void> {
    if (this.queueState.queue.length === 0) return;

    const prevIdx = calculatePreviousIndex(
      this.queueState.currentIndex,
      this.queueState.queue.length,
      this.state.currentTime
    );

    if (prevIdx >= 0) {
      if (prevIdx === this.queueState.currentIndex) {
        // Just restart the current track
        this.seek(0);
        await this.play();
      } else {
        await this.playTrackAtIndex(prevIdx, true);
      }
    }
  }

  private handleTrackEnded(): void {
    if (this.state.repeatMode === 'one') {
      this.seek(0);
      this.play();
    } else {
      this.playNext();
    }
  }

  /**
   * Add a single track to the end of the queue
   */
  public addToQueue(track: Track): void {
    const updatedQueue = [...this.queueState.queue, track];
    const updatedOriginal = [...this.queueState.originalQueue, track];
    this.queueState.queue = updatedQueue;
    this.queueState.originalQueue = updatedOriginal;
    this.notify();
  }

  /**
   * Play a track next right after the currently playing track
   */
  public playNextInQueue(track: Track): void {
    const insertIndex = this.queueState.currentIndex + 1;
    const newQueue = [...this.queueState.queue];
    newQueue.splice(insertIndex, 0, track);
    
    this.queueState.queue = newQueue;
    this.queueState.originalQueue.push(track);
    this.notify();
  }

  public removeFromQueue(index: number): void {
    if (index < 0 || index >= this.queueState.queue.length) return;
    
    // Don't remove currently playing track directly via this method
    const newQueue = [...this.queueState.queue];
    newQueue.splice(index, 1);

    let newCurrent = this.queueState.currentIndex;
    if (index < newCurrent) {
      newCurrent -= 1;
    }

    this.queueState.queue = newQueue;
    this.queueState.currentIndex = newCurrent;
    this.notify();
  }

  public reorderQueue(fromIndex: number, toIndex: number): void {
    if (
      fromIndex < 0 ||
      fromIndex >= this.queueState.queue.length ||
      toIndex < 0 ||
      toIndex >= this.queueState.queue.length
    ) {
      return;
    }

    const currentTrack = this.state.currentTrack;
    const newQueue = [...this.queueState.queue];
    const [moved] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, moved);

    const newCurrent = currentTrack ? newQueue.findIndex((t) => t.id === currentTrack.id) : 0;
    this.queueState.queue = newQueue;
    this.queueState.currentIndex = newCurrent;
    this.notify();
  }

  public clearQueue(): void {
    const current = this.state.currentTrack;
    if (current) {
      this.queueState.queue = [current];
      this.queueState.originalQueue = [current];
      this.queueState.currentIndex = 0;
    } else {
      this.queueState.queue = [];
      this.queueState.originalQueue = [];
      this.queueState.currentIndex = -1;
    }
    this.notify();
  }

  /**
   * Internal loader for the current track in queue
   */
  private async loadCurrentQueueTrack(autoPlay = true): Promise<void> {
    const track = this.queueState.queue[this.queueState.currentIndex];
    if (!track) return;

    this.updateState({
      currentTrack: track,
      isLoading: true,
      error: null,
      currentTime: 0,
      duration: track.duration || 0,
    });

    const adapter = getActiveFileAdapter();

    try {
      // Revoke previous session object URL if one was created
      if (this.currentPlayableUrl && this.currentPlayableUrl.startsWith('blob:')) {
        adapter.revokePlayableUrl(this.currentPlayableUrl);
      }

      const playableUrl = await adapter.getPlayableUrl(track);
      this.currentPlayableUrl = playableUrl;

      this.audio.src = playableUrl;
      this.audio.load();

      if (autoPlay) {
        await this.ensureAudioGraph();
        await this.audio.play();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.updateState({
        isLoading: false,
        isPlaying: false,
        error: errorMessage,
      });
    }
  }

  public destroy(): void {
    this.audio.pause();
    this.audio.src = '';
    if (this.currentPlayableUrl) {
      getActiveFileAdapter().revokePlayableUrl(this.currentPlayableUrl);
      this.currentPlayableUrl = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.listeners.clear();
  }
}

// Global audio engine singleton
export const audioEngine = new AudioEngine();
