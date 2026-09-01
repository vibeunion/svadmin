<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { formatAudioTime, useAudioPlayerContext } from './context.svelte.js';
  let { class: className = '', oninput, ...rest }: Omit<HTMLInputAttributes, 'class' | 'type' | 'value' | 'min' | 'max'> & { class?: string } = $props(); const context = useAudioPlayerContext('AudioPlayerTimeRange');
  function input(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void { context.seekTo(Number(event.currentTarget.value)); oninput?.(event); }
</script>
<input {...rest} class={cn('min-w-20 flex-1 accent-primary', className)} type="range" min="0" max={context.duration || 0} step="0.01" value={context.currentTime} disabled={rest.disabled || context.duration <= 0} aria-label={rest['aria-label'] ?? 'Audio position'} aria-valuetext={`${formatAudioTime(context.currentTime)} of ${formatAudioTime(context.duration)}`} data-slot="audio-player-time-range" oninput={input} />
