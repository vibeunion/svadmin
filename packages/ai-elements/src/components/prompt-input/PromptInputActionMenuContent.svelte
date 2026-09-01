<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { usePromptInputMenu } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; align?: 'start' | 'center' | 'end'; }
  let { class: className = '', children, align = 'start', ...rest }: Props = $props(); const menu = usePromptInputMenu();
</script>
{#if menu.open}<div {...rest} class={cn('absolute bottom-full z-30 mb-1 grid min-w-48 gap-0.5 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md', align === 'end' && 'right-0', align === 'center' && 'left-1/2 -translate-x-1/2', align === 'start' && 'left-0', className)} role="menu" data-slot="prompt-input-action-menu-content">{@render children?.()}</div>{/if}
