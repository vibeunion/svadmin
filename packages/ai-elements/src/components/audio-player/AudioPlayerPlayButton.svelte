<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLButtonAttributes } from 'svelte/elements'; import { LoaderCircle, Pause, Play } from '@lucide/svelte'; import { cn } from '../../utils.js'; import { useAudioPlayerContext } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class'> { class?: string; children?: Snippet<[boolean]>; }
  let { class: className = '', children, onclick, ...rest }: Props = $props(); const context = useAudioPlayerContext('AudioPlayerPlayButton');
  function click(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void { onclick?.(event); if (!event.defaultPrevented) context.togglePlayback(); }
</script>
<button {...rest} type="button" class={cn('svadmin-ai__button size-8 min-h-8 p-0', className)} aria-label={context.playing ? 'Pause audio' : 'Play audio'} aria-pressed={context.playing} data-slot="audio-player-play-button" onclick={click}>{#if children}{@render children(context.playing)}{:else if context.loading}<LoaderCircle class="animate-spin" size={15} aria-hidden="true" />{:else if context.playing}<Pause size={15} aria-hidden="true" />{:else}<Play size={15} aria-hidden="true" />{/if}</button>
