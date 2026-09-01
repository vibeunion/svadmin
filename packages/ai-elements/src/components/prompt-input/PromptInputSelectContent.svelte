<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { usePromptInputSelect } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props(); const select = usePromptInputSelect();
</script>
{#if select.open}<div {...rest} class={cn('absolute bottom-full left-0 z-30 mb-1 grid min-w-40 gap-0.5 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md', className)} role="listbox" data-slot="prompt-input-select-content">{@render children?.()}</div>{/if}
