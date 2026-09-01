<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { useVoiceSelector } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class' | 'title'> { class?: string; children?: Snippet; title?: string; }
  let { class: className = '', children, title = 'Voice Selector', ...rest }: Props = $props(); const selector = useVoiceSelector(); const titleId = $props.id();
</script>
{#if selector.open}<div class="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) selector.setOpen(false); }}><div {...rest} class={cn('grid max-h-[min(32rem,calc(100dvh-2rem))] w-[min(32rem,100%)] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md', className)} role="dialog" aria-modal="true" aria-labelledby={`${titleId}-title`} data-slot="voice-selector-dialog"><h2 id={`${titleId}-title`} class="svadmin-ai__sr-only">{title}</h2>{@render children?.()}</div></div>{/if}
