import { getContext, hasContext, setContext } from 'svelte';

export interface AudioPlayerContextValue {
  readonly element: HTMLAudioElement | null;
  readonly currentTime: number;
  readonly duration: number;
  readonly volume: number;
  readonly playing: boolean;
  readonly muted: boolean;
  readonly loading: boolean;
  readonly error: boolean;
  register(element: HTMLAudioElement | null): void;
  togglePlayback(): void;
  seekTo(time: number): void;
  seekBy(offset: number): void;
  setVolume(volume: number): void;
  toggleMuted(): void;
}

const AUDIO_PLAYER_CONTEXT = Symbol('svadmin.ai-elements.audio-player');

export function provideAudioPlayerContext(value: AudioPlayerContextValue): void {
  setContext(AUDIO_PLAYER_CONTEXT, value);
}

export function useAudioPlayerContext(component = 'AudioPlayer component'): AudioPlayerContextValue {
  const value = hasContext(AUDIO_PLAYER_CONTEXT) ? getContext<AudioPlayerContextValue>(AUDIO_PLAYER_CONTEXT) : undefined;
  if (!value) throw new Error(`${component} must be used within AudioPlayer`);
  return value;
}

export function clampAudioTime(value: number, duration = 0): number {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  return duration > 0 ? Math.min(safe, duration) : safe;
}

export function clampAudioVolume(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
}

export function formatAudioTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}
