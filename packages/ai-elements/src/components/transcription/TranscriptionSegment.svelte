<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import type { TranscriptSegment } from './Transcription.svelte';
  import { segmentEnd, segmentStart, useTranscriptionContext } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class'> { segment: TranscriptSegment; index: number; class?: string; children?: Snippet<[TranscriptSegment, boolean, boolean]>; }
  let { segment, index, class: className = '', children, onclick, type = 'button', ...rest }: Props = $props();
  const transcription = useTranscriptionContext('TranscriptionSegment');
  const active = $derived(transcription.activeIndex === index);
  const past = $derived(transcription.currentTime >= segmentEnd(segment));
  function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void { onclick?.(event); if (!event.defaultPrevented && transcription.canSeek) transcription.seek(segmentStart(segment)); }
</script>
<button {...rest} {type} class={cn('svadmin-ai-transcription-part__segment', active && 'svadmin-ai-transcription-part__segment--active', past && 'svadmin-ai-transcription-part__segment--past', className)} data-active={active} data-index={index} data-slot="transcription-segment" aria-current={active ? 'true' : undefined} onclick={handleClick}>
  {#if children}{@render children(segment, active, past)}{:else}{segment.text}{/if}
</button>
<style>
  .svadmin-ai-transcription-part__segment { display: inline; border: 0; padding: .15rem .2rem; border-radius: min(var(--radius, .5rem), .25rem); background: transparent; color: color-mix(in srgb, var(--muted-foreground, currentColor) 60%, transparent); text-align: left; font: inherit; font-size: .8rem; line-height: 1.55; cursor: default; }
  .svadmin-ai-transcription-part__segment--active { background: var(--accent, var(--muted, transparent)); color: var(--primary, currentColor); }
  .svadmin-ai-transcription-part__segment--past { color: var(--muted-foreground, currentColor); }
  .svadmin-ai-transcription-part__segment:not(:disabled):hover { color: var(--foreground, currentColor); cursor: pointer; }
  .svadmin-ai-transcription-part__segment:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
</style>
