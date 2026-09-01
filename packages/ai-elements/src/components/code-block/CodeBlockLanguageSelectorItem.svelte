<script lang="ts">
  import type { Snippet } from 'svelte'; import { Check } from '@lucide/svelte'; import { cn } from '../../utils.js'; import { useCodeBlockLanguageSelectorContext } from './context.svelte.js';
  let { value, class: className = '', children, disabled = false, ...rest }: { value: string; class?: string; children?: Snippet; disabled?: boolean; [key: string]: unknown } = $props(); const context = useCodeBlockLanguageSelectorContext(); const selected = $derived(context.value === value);
</script>
<button type="button" role="option" aria-selected={selected} class={cn('flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50', className)} {disabled} onclick={() => context.setValue(value)} {...rest}><span>{#if children}{@render children()}{:else}{value}{/if}</span>{#if selected}<Check size={13} aria-hidden="true" />{/if}</button>
