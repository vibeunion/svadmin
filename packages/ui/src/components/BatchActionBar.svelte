<script lang="ts">
  import type { Snippet } from 'svelte';
  import { CheckCircle2, X } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import { Badge } from './ui/badge/index.js';
  import { cn } from '../utils.js';

  interface Props {
    selectedCount?: number;
    totalCount?: number;
    selectedLabel?: string;
    clearLabel?: string;
    variant?: 'default' | 'floating' | 'subtle';
    onclear?: () => void;
    actions?: Snippet;
    children?: Snippet;
    class?: string;
  }

  let {
    selectedCount = 0,
    totalCount,
    selectedLabel,
    clearLabel = 'Clear',
    variant = 'default',
    onclear,
    actions,
    children,
    class: className = '',
  }: Props = $props();

  const isVisible = $derived(selectedCount > 0);
  const displayText = $derived.by(() => {
    if (selectedLabel) {
      return selectedLabel.replace('{count}', String(selectedCount));
    }
    return totalCount !== undefined
      ? `${selectedCount} of ${totalCount} selected`
      : `${selectedCount} selected`;
  });
</script>

{#if isVisible}
  {#if variant === 'floating'}
    <div
      class={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-lg border border-border/80 bg-background/95 px-4 py-2.5 shadow-2xl backdrop-blur-md transition-all duration-200 animate-in fade-in-0 slide-in-from-bottom-4 motion-reduce:animate-none',
        className
      )}
      role="region"
      aria-label="Batch Actions"
    >
      <div class="flex items-center gap-2 pr-2 border-r border-border/60">
        <CheckCircle2 class="h-4 w-4 text-primary" aria-hidden="true" />
        <span class="text-xs font-medium text-foreground tabular-nums">{displayText}</span>
      </div>

      {#if actions}
        <div class="flex items-center gap-1.5">
          {@render actions()}
        </div>
      {/if}

      {#if children}
        <div class="flex items-center gap-1.5">
          {@render children()}
        </div>
      {/if}

      {#if onclear}
        <Button
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onclick={onclear}
          aria-label={clearLabel}
        >
          <X class="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          {clearLabel}
        </Button>
      {/if}
    </div>
  {:else}
    <div
      class={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs transition-all duration-150',
        variant === 'subtle' ? 'border-border/60 bg-muted/40' : '',
        className
      )}
      role="region"
      aria-label="Batch Actions"
    >
      <div class="flex items-center gap-2">
        <Badge variant="secondary" class="h-5 px-1.5 font-semibold text-[11px] tabular-nums bg-primary/15 text-primary border-primary/20">
          {selectedCount}
        </Badge>
        <span class="font-medium text-foreground tabular-nums">{displayText}</span>
        {#if onclear}
          <button
            type="button"
            class="text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1 text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-xs"
            onclick={onclear}
          >
            {clearLabel}
          </button>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        {#if actions}
          {@render actions()}
        {/if}
        {#if children}
          {@render children()}
        {/if}
      </div>
    </div>
  {/if}
{/if}
