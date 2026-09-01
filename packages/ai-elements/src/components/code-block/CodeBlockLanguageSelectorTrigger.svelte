<script lang="ts">
  import type { Snippet } from 'svelte'; import { ChevronDown } from '@lucide/svelte'; import { cn } from '../../utils.js'; import { useCodeBlockLanguageSelectorContext } from './context.svelte.js';
  let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props(); const context = useCodeBlockLanguageSelectorContext();
</script>
<button type="button" class={cn('inline-flex h-7 items-center gap-1 rounded-md border-0 bg-transparent px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', className)} aria-haspopup="listbox" aria-expanded={context.open} onclick={() => context.setOpen(!context.open)} {...rest}>{#if children}{@render children()}{:else}{context.value || 'Language'}{/if}<ChevronDown size={13} aria-hidden="true" /></button>
