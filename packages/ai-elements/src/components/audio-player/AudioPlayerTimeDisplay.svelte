<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { formatAudioTime, useAudioPlayerContext } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'class'> { class?: string; children?: Snippet<[number]>; }
  let { class: className = '', children, ...rest }: Props = $props(); const context = useAudioPlayerContext('AudioPlayerTimeDisplay');
</script>
<span {...rest} class={cn('min-w-10 text-center text-xs tabular-nums text-muted-foreground', className)} data-slot="audio-player-time-display">{#if children}{@render children(context.currentTime)}{:else}{formatAudioTime(context.currentTime)}{/if}</span>
