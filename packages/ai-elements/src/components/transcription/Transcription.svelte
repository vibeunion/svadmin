<script module lang="ts">
  export interface TranscriptSegment {
    id?: string;
    text: string;
    start?: number;
    end?: number;
    startSecond?: number;
    endSecond?: number;
    speaker?: string;
    confidence?: number;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { Check, Copy, Search } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  interface Props extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'class' | 'title'> {
    segments?: TranscriptSegment[];
    text?: string;
    title?: string;
    activeSegmentId?: string;
    currentTime?: number;
    search?: string;
    class?: string;
    children?: Snippet<[TranscriptSegment, number]>;
    onseek?: (time: number) => void;
    onSeek?: (time: number) => void;
    onsegmentclick?: (segment: TranscriptSegment) => void;
  }

  interface IndexedSegment { segment: TranscriptSegment; index: number; key: string; }

  let {
    segments = [],
    text,
    title = 'Transcript',
    activeSegmentId = $bindable<string | undefined>(undefined),
    currentTime = $bindable(0),
    search = $bindable(''),
    class: className = '',
    children,
    onseek,
    onSeek,
    onsegmentclick,
    ...rest
  }: Props = $props();

  import { provideTranscriptionContext, segmentEnd, segmentStart } from './context.svelte.js';

  let copied = $state(false);
  const transcriptText = $derived(text ?? segments.map((segment) => segment.text).join(' '));
  const indexedSegments = $derived(segments.map((segment, index): IndexedSegment => ({ segment, index, key: `${segment.id ?? 'segment'}-${segmentStart(segment)}-${segmentEnd(segment)}-${index}` })));
  const activeIndex = $derived(activeSegmentId === undefined
    ? segments.findIndex((segment) => segmentStart(segment) <= currentTime && currentTime < segmentEnd(segment))
    : segments.findIndex((segment) => segment.id === activeSegmentId));
  const visibleSegments = $derived(search.trim()
    ? indexedSegments.filter(({ segment }) => segment.text.toLowerCase().includes(search.trim().toLowerCase()) || segment.speaker?.toLowerCase().includes(search.trim().toLowerCase()))
    : indexedSegments);

  function formatTime(value?: number): string {
    if (value === undefined || !Number.isFinite(value)) return '';
    return `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, '0')}`;
  }

  async function copyTranscript(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(transcriptText);
      copied = true;
      setTimeout(() => { copied = false; }, 1600);
    } catch {
      copied = false;
    }
  }

  function selectSegment(segment: TranscriptSegment): void {
    activeSegmentId = segment.id;
    currentTime = segmentStart(segment);
    onseek?.(segmentStart(segment));
    if (onSeek !== onseek) onSeek?.(segmentStart(segment));
    onsegmentclick?.(segment);
  }

  provideTranscriptionContext({
    get segments() { return segments; },
    get currentTime() { return currentTime; },
    get activeIndex() { return activeIndex; },
    seek(time) { currentTime = time; onseek?.(time); if (onSeek !== onseek) onSeek?.(time); },
    get canSeek() { return Boolean(onseek || onSeek); },
  });
</script>

<section aria-label={title} {...rest} class={cn('svadmin-ai-transcription', children && 'svadmin-ai-transcription--compound', className)} data-slot="transcription">
  {#if children}
    {#each indexedSegments.filter(({ segment }) => segment.text.trim()) as entry (entry.key)}
      {@render children(entry.segment, entry.index)}
    {/each}
  {:else}
  <header class="svadmin-ai-transcription__header">
    <div><h3>{title}</h3><span>{segments.length ? `${segments.length} segments` : `${transcriptText.length} characters`}</span></div>
    <button type="button" class="svadmin-ai-transcription__copy" aria-label={copied ? 'Transcript copied' : 'Copy transcript'} title={copied ? 'Copied' : 'Copy transcript'} onclick={() => void copyTranscript()} disabled={!transcriptText}>
      {#if copied}<Check size={14} aria-hidden="true" />{:else}<Copy size={14} aria-hidden="true" />{/if}<span class="svadmin-ai__sr-only">{copied ? 'Copied' : 'Copy transcript'}</span>
    </button>
  </header>
  <div class="svadmin-ai-transcription__toolbar">
    <label><Search size={14} aria-hidden="true" /><span class="svadmin-ai__sr-only">Search transcript</span><input class="svadmin-ai__input" type="search" bind:value={search} placeholder="Search transcript" /></label>
  </div>
  {#if segments.length}
    <ol class="svadmin-ai-transcription__segments" aria-label="Transcript segments">
      {#each visibleSegments as entry (entry.key)}
        <li class={cn('svadmin-ai-transcription__segment', activeIndex === entry.index && 'svadmin-ai-transcription__segment--active')}>
          <button type="button" onclick={() => selectSegment(entry.segment)} aria-current={activeIndex === entry.index ? 'true' : undefined}>
            <span class="svadmin-ai-transcription__time">{formatTime(segmentStart(entry.segment))}</span>
            <span class="svadmin-ai-transcription__segment-copy">{#if entry.segment.speaker}<strong>{entry.segment.speaker}</strong>{/if}<span>{entry.segment.text}</span></span>
            {#if entry.segment.confidence !== undefined}<span class="svadmin-ai-transcription__confidence" aria-label={`${Math.round(entry.segment.confidence * 100)} percent confidence`}>{Math.round(entry.segment.confidence * 100)}%</span>{/if}
          </button>
        </li>
      {:else}
        <li class="svadmin-ai-transcription__empty">No matching transcript segments.</li>
      {/each}
    </ol>
  {:else}
    <p class="svadmin-ai-transcription__plain">{transcriptText || 'No transcript available.'}</p>
  {/if}
  {/if}
</section>

<style>
  .svadmin-ai-transcription { display: grid; gap: .6rem; overflow: hidden; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--card, transparent); color: var(--card-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-transcription__header { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .7rem .8rem .15rem; }
  .svadmin-ai-transcription__header > div { display: grid; min-width: 0; gap: .15rem; }
  h3 { margin: 0; font-size: .82rem; font-weight: 650; }
  .svadmin-ai-transcription__header span { color: var(--muted-foreground, currentColor); font-size: .7rem; }
  .svadmin-ai-transcription__copy { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .35rem); background: transparent; color: inherit; cursor: pointer; }
  .svadmin-ai-transcription__copy:disabled { cursor: not-allowed; opacity: .45; }
  .svadmin-ai-transcription__copy:focus-visible, .svadmin-ai-transcription__segment button:focus-visible, .svadmin-ai__input:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-transcription__toolbar { padding: 0 .8rem; }
  .svadmin-ai-transcription__toolbar label { display: flex; align-items: center; gap: .4rem; color: var(--muted-foreground, currentColor); }
  .svadmin-ai__input { min-height: 2rem; padding: .35rem .55rem; font-size: .75rem; }
  .svadmin-ai-transcription__segments { display: grid; max-height: 24rem; overflow: auto; gap: .15rem; margin: 0; padding: 0 .5rem .55rem; list-style: none; }
  .svadmin-ai-transcription__segment { border-radius: min(var(--radius, .5rem), .35rem); }
  .svadmin-ai-transcription__segment--active { background: var(--accent, var(--muted, transparent)); }
  .svadmin-ai-transcription__segment button { display: grid; width: 100%; grid-template-columns: 3rem minmax(0, 1fr) auto; align-items: start; gap: .55rem; padding: .5rem; border: 0; border-radius: inherit; background: transparent; color: inherit; text-align: left; font: inherit; cursor: pointer; }
  .svadmin-ai-transcription__time, .svadmin-ai-transcription__confidence { color: var(--muted-foreground, currentColor); font-size: .68rem; font-variant-numeric: tabular-nums; }
  .svadmin-ai-transcription__segment-copy { display: grid; min-width: 0; gap: .12rem; line-height: 1.45; }
  .svadmin-ai-transcription__segment-copy strong { color: var(--primary, currentColor); font-size: .7rem; }
  .svadmin-ai-transcription__segment-copy span { overflow-wrap: anywhere; font-size: .78rem; }
  .svadmin-ai-transcription__empty, .svadmin-ai-transcription__plain { margin: 0; padding: .8rem; color: var(--muted-foreground, currentColor); font-size: .78rem; line-height: 1.55; }
  .svadmin-ai-transcription--compound { display: flex; flex-wrap: wrap; gap: .25rem; padding: .5rem; }
</style>
