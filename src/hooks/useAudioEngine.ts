import { useState, useEffect, useCallback } from 'react';
import { audioEngine } from '../services/audio/audioEngine';
import { PlaybackState, QueueState, RepeatMode } from '../types/playback';
import { Track } from '../types/track';

export function useAudioEngine() {
  const [playbackState, setPlaybackState] = useState<PlaybackState>(() => audioEngine.getState());
  const [queueState, setQueueState] = useState<QueueState>(() => audioEngine.getQueueState());

  useEffect(() => {
    const unsubscribe = audioEngine.subscribe((newPlaybackState, newQueueState) => {
      setPlaybackState(newPlaybackState);
      setQueueState(newQueueState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const play = useCallback(() => audioEngine.play(), []);
  const pause = useCallback(() => audioEngine.pause(), []);
  const togglePlay = useCallback(() => audioEngine.togglePlay(), []);
  const seek = useCallback((seconds: number) => audioEngine.seek(seconds), []);
  const seekRelative = useCallback((delta: number) => audioEngine.seekRelative(delta), []);
  const setVolume = useCallback((vol: number) => audioEngine.setVolume(vol), []);
  const toggleMute = useCallback(() => audioEngine.toggleMute(), []);
  const setRepeatMode = useCallback((mode: RepeatMode) => audioEngine.setRepeatMode(mode), []);
  const cycleRepeatMode = useCallback(() => audioEngine.cycleRepeatMode(), []);
  const toggleShuffle = useCallback(() => audioEngine.toggleShuffle(), []);
  const playNext = useCallback(() => audioEngine.playNext(), []);
  const playPrevious = useCallback(() => audioEngine.playPrevious(), []);
  const setQueue = useCallback((tracks: Track[], startIndex = 0, autoPlay = true) => {
    return audioEngine.setQueue(tracks, startIndex, autoPlay);
  }, []);
  const playTrackAtIndex = useCallback((index: number) => audioEngine.playTrackAtIndex(index), []);
  const addToQueue = useCallback((track: Track) => audioEngine.addToQueue(track), []);
  const playNextInQueue = useCallback((track: Track) => audioEngine.playNextInQueue(track), []);
  const removeFromQueue = useCallback((index: number) => audioEngine.removeFromQueue(index), []);
  const reorderQueue = useCallback((from: number, to: number) => audioEngine.reorderQueue(from, to), []);
  const clearQueue = useCallback(() => audioEngine.clearQueue(), []);
  const updateCurrentTrack = useCallback((trackId: string, updates: Partial<Track>) => {
    audioEngine.updateCurrentTrack(trackId, updates);
  }, []);

  return {
    ...playbackState,
    ...queueState,
    play,
    pause,
    togglePlay,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    setRepeatMode,
    cycleRepeatMode,
    toggleShuffle,
    playNext,
    playPrevious,
    setQueue,
    playTrackAtIndex,
    addToQueue,
    playNextInQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    updateCurrentTrack,
    audioEngine,
  };
}
