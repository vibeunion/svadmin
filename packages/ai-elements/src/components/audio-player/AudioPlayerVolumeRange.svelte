<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { useAudioPlayerContext } from './context.svelte.js';
  let { class: className = '', oninput, ...rest }: Omit<HTMLInputAttributes, 'class' | 'type' | 'value' | 'min' | 'max'> & { class?: string } = $props(); const context = useAudioPlayerContext('AudioPlayerVolumeRange');
  function input(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void { context.setVolume(Number(event.currentTarget.value)); oninput?.(event); }
</script>
<input {...rest} class={cn('w-20 accent-primary', className)} type="range" min="0" max="1" step="0.01" value={context.muted ? 0 : context.volume} aria-label={rest['aria-label'] ?? 'Volume'} data-slot="audio-player-volume-range" oninput={input} />
