<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Check } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { useMicSelectorContext } from './context.svelte.js';
  type Props = { value: string; class?: string; children?: Snippet; disabled?: boolean };
  let { value, class: className = '', children, disabled = false }: Props = $props();
  const selector = useMicSelectorContext();
</script>

<button type="button" class={cn('flex min-h-9 w-full items-center gap-2 rounded border border-transparent px-2 text-left text-sm hover:bg-muted', className)} {disabled} aria-pressed={selector.value === value} onclick={() => selector.setValue(value)}>{#if selector.value === value}<Check size={14} aria-hidden="true" />{:else}<span class="size-3" aria-hidden="true"></span>{/if}{#if children}{@render children()}{:else}{value}{/if}</button>
