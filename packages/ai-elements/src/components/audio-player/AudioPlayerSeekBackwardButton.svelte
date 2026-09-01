<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLButtonAttributes } from 'svelte/elements'; import { RotateCcw } from '@lucide/svelte'; import { cn } from '../../utils.js'; import { useAudioPlayerContext } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class'> { class?: string; children?: Snippet<[number]>; seekOffset?: number; }
  let { class: className = '', children, seekOffset = 10, onclick, ...rest }: Props = $props(); const context = useAudioPlayerContext('AudioPlayerSeekBackwardButton');
  function click(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void { onclick?.(event); if (!event.defaultPrevented) context.seekBy(-Math.abs(seekOffset)); }
</script>
<button {...rest} type="button" class={cn('svadmin-ai__button svadmin-ai__button--ghost size-8 min-h-8 p-0', className)} aria-label={`Seek backward ${seekOffset} seconds`} data-slot="audio-player-seek-backward-button" onclick={click}>{#if children}{@render children(seekOffset)}{:else}<RotateCcw size={15} aria-hidden="true" />{/if}</button>
