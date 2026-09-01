<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { ChevronLeft } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { useMessageBranch } from './context.svelte.js';

  type Props = Omit<HTMLButtonAttributes, 'children' | 'class' | 'onclick'> & { class?: string; children?: Snippet; onclick?: (event: MouseEvent) => void };
  let { class: className = '', children, onclick, type = 'button', disabled, ...rest }: Props = $props();
  const branch = useMessageBranch('MessageBranchPrevious');

  function previous(event: MouseEvent): void {
    onclick?.(event);
    if (!event.defaultPrevented) branch.goToPrevious();
  }
</script>

<button {...rest} {type} class={cn('svadmin-ai-message-branch-button', className)} data-slot="message-branch-previous" aria-label="Previous branch" disabled={disabled || branch.totalBranches <= 1} onclick={previous}>
  {#if children}{@render children()}{:else}<ChevronLeft size={14} aria-hidden="true" />{/if}
</button>

<style>
  .svadmin-ai-message-branch-button { display: inline-flex; width: 2rem; height: 2rem; align-items: center; justify-content: center; border: 0; border-radius: min(var(--radius, 0.5rem), 0.375rem); background: transparent; color: var(--muted-foreground, currentColor); cursor: pointer; }
  .svadmin-ai-message-branch-button:hover:not(:disabled) { background: var(--muted, transparent); color: var(--foreground, currentColor); }
  .svadmin-ai-message-branch-button:disabled { cursor: not-allowed; opacity: 0.5; }
  .svadmin-ai-message-branch-button:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 1px; }
</style>
