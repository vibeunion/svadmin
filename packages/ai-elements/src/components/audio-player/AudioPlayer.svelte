<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  export type AudioPreload = 'none' | 'metadata' | 'auto';
  export interface AudioData { base64: string; mediaType: string; }
  export interface AudioPlayerProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'class'> {
    src?: string; data?: AudioData; title?: string; mimeType?: string; preload?: AudioPreload; duration?: number;
    currentTime?: number; volume?: number; playing?: boolean; muted?: boolean; showDownload?: boolean; class?: string; children?: Snippet;
    onplay?: () => void; onpause?: () => void; onended?: () => void; onerror?: (event: Event) => void;
  }
</script>

<script lang="ts">
  import { Download, Pause, Play, Volume2, VolumeX } from '@lucide/svelte';
  import { cn, safeResourceUrl } from '../../utils.js';
  import { clampAudioTime, clampAudioVolume, formatAudioTime, provideAudioPlayerContext } from './context.svelte.js';

  let { src, data, title = 'Audio', mimeType: _mimeType, preload = 'metadata', duration: providedDuration, currentTime = $bindable(0), volume = $bindable(1), playing = $bindable(false), muted = $bindable(false), showDownload = true, class: className = '', children, onplay, onpause, onended, onerror, ...rest }: AudioPlayerProps = $props();
  let element = $state<HTMLAudioElement | null>(null);
  let metadataDuration = $state(0);
  let loading = $state(false);
  let error = $state(false);
  let registeredElement: HTMLAudioElement | null = null;
  let cleanupRegistered: (() => void) | undefined;
  let appliedPlaying: boolean | undefined;
  let loadedElement: HTMLAudioElement | null = null;
  let loadedSource: string | undefined;
  const resolvedSrc = $derived(src ?? (data ? `data:${data.mediaType};base64,${data.base64}` : undefined));
  const totalDuration = $derived(metadataDuration > 0 ? metadataDuration : Math.max(0, providedDuration ?? 0));
  const progress = $derived(totalDuration > 0 ? Math.min(100, Math.max(0, currentTime / totalDuration * 100)) : 0);

  function applyTime(target: HTMLAudioElement, time: number): void {
    try { target.currentTime = time; }
    catch (caught) { if (!(caught instanceof DOMException) || caught.name !== 'InvalidStateError') throw caught; }
  }

  function isExpectedPlaybackRejection(caught: unknown): boolean {
    return caught instanceof DOMException
      && (caught.name === 'NotAllowedError' || caught.name === 'AbortError');
  }

  function reportError(event: Event): void {
    error = true;
    loading = false;
    onerror?.(event);
  }

  function reportPlaybackError(caught: unknown): void {
    const cause = caught instanceof Error ? caught : new Error('Audio playback failed.');
    reportError(new ErrorEvent('error', { error: cause, message: cause.message }));
  }

  async function requestPlayback(target: HTMLAudioElement): Promise<void> {
    try { await target.play(); }
    catch (caught) {
      if (element === target) {
        appliedPlaying = false;
        playing = false;
      }
      if (!isExpectedPlaybackRejection(caught)) reportPlaybackError(caught);
    }
  }

  function togglePlayback(): void {
    if (!element) return;
    if (playing || !element.paused) element.pause(); else void requestPlayback(element);
  }

  function seekTo(time: number): void {
    currentTime = clampAudioTime(time, totalDuration);
    if (element) applyTime(element, currentTime);
  }

  function setVolume(next: number): void {
    volume = clampAudioVolume(next);
    if (element) element.volume = volume;
    if (volume > 0 && muted) { muted = false; if (element) element.muted = false; }
  }

  function toggleMuted(): void { muted = !muted; if (element) element.muted = muted; }

  function register(target: HTMLAudioElement | null): void {
    if (registeredElement === target) return;
    cleanupRegistered?.(); registeredElement = target; element = target; appliedPlaying = undefined;
    if (!target) return;
    const metadata = () => { metadataDuration = Number.isFinite(target.duration) && target.duration > 0 ? target.duration : 0; seekTo(currentTime); loading = false; };
    const time = () => { currentTime = clampAudioTime(target.currentTime, totalDuration); };
    const volumeChange = () => { volume = clampAudioVolume(target.volume); muted = target.muted; };
    const play = () => { appliedPlaying = true; playing = true; loading = false; onplay?.(); };
    const pause = () => { appliedPlaying = false; playing = false; onpause?.(); };
    const ended = () => { appliedPlaying = false; playing = false; onended?.(); };
    const waiting = () => { loading = true; };
    const canPlay = () => { loading = false; };
    const failed = (event: Event) => { reportError(event); };
    target.addEventListener('loadedmetadata', metadata); target.addEventListener('timeupdate', time); target.addEventListener('volumechange', volumeChange); target.addEventListener('play', play); target.addEventListener('pause', pause); target.addEventListener('ended', ended); target.addEventListener('waiting', waiting); target.addEventListener('canplay', canPlay); target.addEventListener('error', failed);
    cleanupRegistered = () => { target.removeEventListener('loadedmetadata', metadata); target.removeEventListener('timeupdate', time); target.removeEventListener('volumechange', volumeChange); target.removeEventListener('play', play); target.removeEventListener('pause', pause); target.removeEventListener('ended', ended); target.removeEventListener('waiting', waiting); target.removeEventListener('canplay', canPlay); target.removeEventListener('error', failed); };
  }

  provideAudioPlayerContext({
    get element() { return element; }, get currentTime() { return currentTime; }, get duration() { return totalDuration; },
    get volume() { return volume; }, get playing() { return playing; }, get muted() { return muted; },
    get loading() { return loading; }, get error() { return error; }, register, togglePlayback, seekTo,
    seekBy(offset) { seekTo(currentTime + offset); }, setVolume, toggleMuted,
  });

  $effect(() => { if (!children) register(element); });
  $effect(() => { const target = element; const source = resolvedSrc; if (!target || (loadedElement === target && loadedSource === source)) return; loadedElement = target; loadedSource = source; error = false; metadataDuration = 0; target.load(); });
  $effect(() => { const target = element; const next = clampAudioVolume(volume); if (next !== volume) volume = next; if (target && Math.abs(target.volume - next) > .001) target.volume = next; });
  $effect(() => { const target = element; const next = clampAudioTime(currentTime, totalDuration); if (next !== currentTime) currentTime = next; if (target && Math.abs(target.currentTime - next) > .01) applyTime(target, next); });
  $effect(() => { if (element && element.muted !== muted) element.muted = muted; });
  $effect(() => { const target = element; const shouldPlay = playing; if (!target || appliedPlaying === shouldPlay) return; const previous = appliedPlaying; appliedPlaying = shouldPlay; if (shouldPlay) void requestPlayback(target); else if (previous === true || !target.paused) target.pause(); });
  $effect(() => () => cleanupRegistered?.());

  function downloadAudio(): void {
    const url = safeResourceUrl(resolvedSrc);
    if (!url || typeof document === 'undefined') return;
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = title || 'audio'; anchor.rel = 'noreferrer'; anchor.click();
  }
</script>

<section {...rest} class={cn('svadmin-ai-audio-player', className)} aria-label={title} data-slot="audio-player">
  {#if children}{@render children()}{:else}
    <div class="svadmin-ai-audio-player__heading"><div class="svadmin-ai-audio-player__title"><Volume2 size={16} aria-hidden="true" /><strong>{title}</strong></div>{#if showDownload}<button type="button" class="svadmin-ai-audio-player__icon-button" aria-label="Download audio" title="Download audio" onclick={downloadAudio}><Download size={15} aria-hidden="true" /></button>{/if}</div>
    <audio bind:this={element} {preload} aria-label={title}><source src={resolvedSrc} type={data?.mediaType ?? _mimeType} /></audio>
    <div class="svadmin-ai-audio-player__controls" role="group" aria-label="Audio controls">
      <button type="button" class="svadmin-ai-audio-player__play" aria-label={playing ? 'Pause audio' : 'Play audio'} onclick={togglePlayback}>{#if playing}<Pause size={15} aria-hidden="true" />{:else}<Play size={15} aria-hidden="true" />{/if}</button>
      <span class="svadmin-ai-audio-player__time">{formatAudioTime(currentTime)}</span>
      <input class="svadmin-ai-audio-player__seek" type="range" min="0" max={totalDuration || 0} step="0.01" value={currentTime} aria-label="Audio position" aria-valuetext={`${formatAudioTime(currentTime)} of ${formatAudioTime(totalDuration)}`} style={`--audio-progress: ${progress}%`} oninput={(event) => seekTo(Number(event.currentTarget.value))} disabled={!totalDuration} />
      <span class="svadmin-ai-audio-player__time">{formatAudioTime(totalDuration)}</span>
      <button type="button" class="svadmin-ai-audio-player__icon-button" aria-label={muted ? 'Unmute audio' : 'Mute audio'} onclick={toggleMuted}>{#if muted}<VolumeX size={14} aria-hidden="true" />{:else}<Volume2 size={14} aria-hidden="true" />{/if}</button>
      <input class="svadmin-ai-audio-player__volume" type="range" min="0" max="1" step="0.01" value={volume} aria-label="Volume" oninput={(event) => setVolume(Number(event.currentTarget.value))} />
    </div>
    {#if loading}<p class="svadmin-ai__muted text-xs" role="status">Loading audio…</p>{/if}{#if error}<p class="text-destructive text-xs" role="alert">Unable to load this audio.</p>{/if}
  {/if}
</section>

<style>
  .svadmin-ai-audio-player { display: grid; gap: .65rem; padding: .8rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--card, transparent); color: var(--card-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-audio-player__heading,.svadmin-ai-audio-player__title,.svadmin-ai-audio-player__controls { display: flex; align-items: center; } .svadmin-ai-audio-player__heading { justify-content: space-between; gap: .75rem; } .svadmin-ai-audio-player__title { min-width: 0; gap: .45rem; font-size: .82rem; }
  audio { display: none; } .svadmin-ai-audio-player__controls { gap: .5rem; } .svadmin-ai-audio-player__icon-button,.svadmin-ai-audio-player__play { display: inline-flex; width: 2rem; height: 2rem; flex: none; align-items: center; justify-content: center; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .35rem); background: transparent; color: inherit; cursor: pointer; } .svadmin-ai-audio-player__play { background: var(--primary, currentColor); color: var(--primary-foreground, Canvas); }
  button:focus-visible,input:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; } .svadmin-ai-audio-player__time { min-width: 2.35rem; color: var(--muted-foreground, currentColor); font-size: .68rem; font-variant-numeric: tabular-nums; text-align: center; } .svadmin-ai-audio-player__seek { min-width: 4rem; flex: 1; accent-color: var(--primary, currentColor); } .svadmin-ai-audio-player__volume { width: 4.5rem; accent-color: var(--primary, currentColor); }
  @media (max-width: 40rem) { .svadmin-ai-audio-player__volume { display: none; } }
</style>
