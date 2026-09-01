<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLButtonAttributes } from 'svelte/elements'; import { LoaderCircle, Pause, Play } from '@lucide/svelte'; import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class'> { class?: string; children?: Snippet<[boolean, boolean]>; playing?: boolean; loading?: boolean; onPlay?: () => void; onplay?: () => void; }
  let { class: className = '', children, playing = false, loading = false, onPlay, onplay, onclick, ...rest }: Props = $props();
  function click(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void { event.stopPropagation(); onclick?.(event); if (!event.defaultPrevented) { onPlay?.(); onplay?.(); } }
</script>
<button {...rest} type="button" class={cn('svadmin-ai__button svadmin-ai__button--ghost size-7 min-h-7 p-0', className)} aria-label={playing ? 'Pause preview' : 'Play preview'} disabled={loading || rest.disabled} data-slot="voice-selector-preview" onclick={click}>{#if children}{@render children(playing, loading)}{:else if loading}<LoaderCircle class="animate-spin" size={13} aria-hidden="true" />{:else if playing}<Pause size={13} aria-hidden="true" />{:else}<Play size={13} aria-hidden="true" />{/if}</button>
