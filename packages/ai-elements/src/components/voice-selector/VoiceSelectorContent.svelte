<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { useVoiceSelector } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class' | 'title'> { class?: string; children?: Snippet; title?: string; }
  let { class: className = '', children, title = 'Voice Selector', ...rest }: Props = $props(); const selector = useVoiceSelector(); const titleId = $props.id();
</script>
{#if selector.open}<div {...rest} class={cn('absolute left-0 top-full z-40 mt-1 grid w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md', className)} role="dialog" aria-modal="false" aria-labelledby={`${titleId}-title`} data-slot="voice-selector-content"><h2 id={`${titleId}-title`} class="svadmin-ai__sr-only">{title}</h2>{@render children?.()}</div>{/if}
