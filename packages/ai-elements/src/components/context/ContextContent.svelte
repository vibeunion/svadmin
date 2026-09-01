<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { useContextContext } from './context-state.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props(); const context = useContextContext('ContextContent');
</script>
{#if context.open}<div {...rest} class={cn('svadmin-ai-context-part__content', className)} data-slot="context-content">{@render children?.()}</div>{/if}
<style>.svadmin-ai-context-part__content { min-width: 15rem; overflow: hidden; border-top: 1px solid var(--border, currentColor); }</style>
