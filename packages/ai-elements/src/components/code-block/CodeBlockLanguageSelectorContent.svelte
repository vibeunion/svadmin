<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; import { useCodeBlockLanguageSelectorContext } from './context.svelte.js';
  let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props(); const context = useCodeBlockLanguageSelectorContext();
</script>
{#if context.open}<div class={cn('absolute right-0 z-50 mt-1 min-w-32 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md', className)} role="listbox" tabindex="-1" onkeydown={(event) => { if (event.key === 'Escape') context.setOpen(false); }} {...rest}>{@render children?.()}</div>{/if}
