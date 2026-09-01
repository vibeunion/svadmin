<script module lang="ts">
  export interface SpeechRecognitionAlternativeLike { transcript: string; confidence?: number }
  export interface SpeechRecognitionResultLike extends ArrayLike<SpeechRecognitionAlternativeLike> { isFinal: boolean }
  export interface SpeechRecognitionEventLike extends Event { results: ArrayLike<SpeechRecognitionResultLike>; resultIndex: number }
  export interface SpeechRecognitionLike extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onstart: ((event: Event) => void) | null;
    onend: ((event: Event) => void) | null;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: Event) => void) | null;
  }
  export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
  export type SpeechInputProps = {
    lang?: string;
    disabled?: boolean;
    class?: string;
    ontranscriptionchange?: (text: string) => void;
    onaudiorecorded?: (audio: Blob) => Promise<string>;
    onstart?: () => void;
    onend?: () => void;
    onerror?: (error: Error) => void;
  };
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { LoaderCircle, Mic, Square } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  let {
    lang = 'en-US',
    disabled = false,
    class: className = '',
    ontranscriptionchange,
    onaudiorecorded,
    onstart,
    onend,
    onerror,
  }: SpeechInputProps = $props();

  let listening = $state(false);
  let processing = $state(false);
  let supported = $state(false);
  let recognition = $state<SpeechRecognitionLike | null>(null);
  let recorder = $state<MediaRecorder | null>(null);
  let stream = $state<MediaStream | null>(null);
  let recordedChunks: Blob[] = [];
  let disposed = false;

  const transcriptionHandler = (text: string): void => {
    if (disposed) return;
    ontranscriptionchange?.(text);
  };

  function getRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
    if (typeof globalThis === 'undefined') return undefined;
    const source = globalThis as typeof globalThis & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    return source.SpeechRecognition ?? source.webkitSpeechRecognition;
  }

  function fail(error: unknown): void {
    if (disposed) return;
    const normalized = error instanceof Error ? error : new Error('Speech input failed.');
    listening = false;
    processing = false;
    onerror?.(normalized);
    onend?.();
  }

  function stopTracks(): void {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  function stopRecognition(): void {
    recognition?.stop();
  }

  function stopRecorder(): void {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }

  function disposeRecognition(): void {
    const activeRecognition = recognition;
    recognition = null;
    if (!activeRecognition) return;
    activeRecognition.onstart = null;
    activeRecognition.onend = null;
    activeRecognition.onresult = null;
    activeRecognition.onerror = null;
    activeRecognition.stop();
  }

  function disposeRecorder(): void {
    const activeRecorder = recorder;
    recorder = null;
    if (!activeRecorder) return;
    activeRecorder.ondataavailable = null;
    activeRecorder.onstop = null;
    if (activeRecorder.state !== 'inactive') activeRecorder.stop();
  }

  async function transcribeRecording(activeRecorder: MediaRecorder): Promise<void> {
    const audio = new Blob(recordedChunks, { type: activeRecorder.mimeType || 'audio/webm' });
    stopTracks();
    if (recorder === activeRecorder) recorder = null;
    if (disposed) return;
    if (!onaudiorecorded) {
      fail(new Error('An audio transcription callback is required.'));
      return;
    }
    processing = true;
    try {
      const text = await onaudiorecorded(audio);
      if (disposed) return;
      transcriptionHandler(text);
      listening = false;
      processing = false;
      onend?.();
    } catch (error) {
      fail(error);
    }
  }

  async function startRecorder(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      fail(new Error('Speech input is unavailable in this browser.'));
      return;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (disposed) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = mediaStream;
      recordedChunks = [];
      const activeRecorder = new MediaRecorder(mediaStream);
      recorder = activeRecorder;
      activeRecorder.ondataavailable = (event) => { if (event.data.size > 0) recordedChunks.push(event.data); };
      activeRecorder.onstop = () => { void transcribeRecording(activeRecorder); };
      activeRecorder.start();
      listening = true;
      onstart?.();
    } catch (error) {
      stopTracks();
      fail(error);
    }
  }

  function startRecognition(): void {
    const Constructor = getRecognitionConstructor();
    if (!Constructor) { void startRecorder(); return; }
    const instance = new Constructor();
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = lang;
    instance.onstart = () => {
      if (disposed) return;
      listening = true;
      onstart?.();
    };
    instance.onresult = (event) => {
      if (disposed) return;
      let finalText = '';
      const firstChangedResult = Math.max(0, event.resultIndex);
      for (let index = firstChangedResult; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal) finalText += result[0]?.transcript ?? '';
      }
      if (finalText) transcriptionHandler(finalText);
    };
    instance.onerror = () => {
      instance.onend = null;
      if (recognition === instance) recognition = null;
      fail(new Error('Speech recognition failed.'));
    };
    instance.onend = () => {
      if (recognition === instance) recognition = null;
      if (disposed) return;
      listening = false;
      onend?.();
    };
    recognition = instance;
    try {
      instance.start();
    } catch (error) {
      recognition = null;
      fail(error);
    }
  }

  function toggle(): void {
    if (disabled || processing) return;
    if (listening) { stopRecognition(); stopRecorder(); return; }
    startRecognition();
  }

  onMount(() => {
    disposed = false;
    supported = Boolean(getRecognitionConstructor() || (typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function' && typeof MediaRecorder !== 'undefined'));
    return () => {
      disposed = true;
      disposeRecognition();
      disposeRecorder();
      stopTracks();
    };
  });
</script>

<button type="button" class={cn('svadmin-ai__button svadmin-ai__button--ghost', listening && 'svadmin-ai__button--danger', className)} disabled={disabled || !supported || processing} aria-label={processing ? 'Processing speech' : listening ? 'Stop speech input' : 'Start speech input'} aria-pressed={listening} onclick={toggle}>
  {#if processing}<LoaderCircle size={15} class="animate-spin" aria-hidden="true" /> Processing{:else if listening}<Square size={14} fill="currentColor" aria-hidden="true" /> Stop{:else}<Mic size={15} aria-hidden="true" /> Speak{/if}
</button>
