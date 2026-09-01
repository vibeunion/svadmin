<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../utils.js';
  import { provideMessageBranchContext } from './message/context.svelte.js';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & {
    index?: number;
    currentBranch?: number;
    defaultBranch?: number;
    total?: number;
    onprevious?: () => void;
    onnext?: () => void;
    onBranchChange?: (branchIndex: number) => void;
    children?: Snippet;
    class?: string;
  };

  let {
    index,
    currentBranch = $bindable(index ?? 0),
    defaultBranch,
    total = 1,
    onprevious,
    onnext,
    onBranchChange,
    children,
    class: className = '',
    ...rest
  }: Props = $props();

  let totalBranches = $state(untrack(() => Math.max(0, total)));
  untrack(() => {
    if (defaultBranch !== undefined && index === undefined) currentBranch = defaultBranch;
  });

  function selectBranch(nextBranch: number): void {
    const normalized = totalBranches > 0
      ? (nextBranch + totalBranches) % totalBranches
      : 0;
    currentBranch = normalized;
    onBranchChange?.(normalized);
  }

  function goToPrevious(): void {
    selectBranch(currentBranch - 1);
    onprevious?.();
  }

  function goToNext(): void {
    selectBranch(currentBranch + 1);
    onnext?.();
  }

  function setTotalBranches(nextTotal: number): void {
    totalBranches = Math.max(0, nextTotal);
    if (totalBranches > 0 && currentBranch >= totalBranches) selectBranch(totalBranches - 1);
  }

  provideMessageBranchContext({
    get currentBranch() { return currentBranch; },
    get totalBranches() { return totalBranches; },
    goToPrevious,
    goToNext,
    setTotalBranches,
  });
</script>

<div {...rest} class={cn('svadmin-ai-message-branch', className)} data-slot="message-branch">
  {#if children}
    {@render children()}
  {:else}
    <button type="button" class="svadmin-ai__button svadmin-ai__button--ghost min-h-7 px-2" aria-label="Previous message branch" disabled={totalBranches <= 1} onclick={goToPrevious}>‹</button>
    <span aria-live="polite">{currentBranch + 1} / {totalBranches}</span>
    <button type="button" class="svadmin-ai__button svadmin-ai__button--ghost min-h-7 px-2" aria-label="Next message branch" disabled={totalBranches <= 1} onclick={goToNext}>›</button>
  {/if}
</div>

<style>
  .svadmin-ai-message-branch { display: grid; width: 100%; gap: 0.5rem; color: var(--muted-foreground, currentColor); font-size: 0.75rem; }
</style>
