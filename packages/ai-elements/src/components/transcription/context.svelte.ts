import { createContext } from 'svelte';
import type { TranscriptSegment } from './Transcription.svelte';

export interface TranscriptionContextValue {
  readonly segments: TranscriptSegment[];
  readonly currentTime: number;
  readonly activeIndex: number;
  seek(time: number): void;
  readonly canSeek: boolean;
}

const [getTranscriptionContext, setTranscriptionContext] = createContext<TranscriptionContextValue>();

export function provideTranscriptionContext(value: TranscriptionContextValue): TranscriptionContextValue {
  setTranscriptionContext(value);
  return value;
}

export function useTranscriptionContext(component = 'Transcription component'): TranscriptionContextValue {
  try { return getTranscriptionContext(); } catch { throw new Error(`${component} must be used within Transcription`); }
}

export function segmentStart(segment: TranscriptSegment): number {
  return segment.startSecond ?? segment.start ?? 0;
}

export function segmentEnd(segment: TranscriptSegment): number {
  return segment.endSecond ?? segment.end ?? Number.POSITIVE_INFINITY;
}
