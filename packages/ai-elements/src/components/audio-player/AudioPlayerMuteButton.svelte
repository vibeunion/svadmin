<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLButtonAttributes } from 'svelte/elements'; import { Volume2, VolumeX } from '@lucide/svelte'; import { cn } from '../../utils.js'; import { useAudioPlayerContext } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class'> { class?: string; children?: Snippet<[boolean]>; }
  let { class: className = '', children, onclick, ...rest }: Props = $props(); const context = useAudioPlayerContext('AudioPlayerMuteButton');
  function click(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void { onclick?.(event); if (!event.defaultPrevented) context.toggleMuted(); }
</script>
<button {...rest} type="button" class={cn('svadmin-ai__button svadmin-ai__button--ghost size-8 min-h-8 p-0', className)} aria-label={context.muted ? 'Unmute audio' : 'Mute audio'} aria-pressed={context.muted} data-slot="audio-player-mute-button" onclick={click}>{#if children}{@render children(context.muted)}{:else if context.muted}<VolumeX size={15} aria-hidden="true" />{:else}<Volume2 size={15} aria-hidden="true" />{/if}</button>
