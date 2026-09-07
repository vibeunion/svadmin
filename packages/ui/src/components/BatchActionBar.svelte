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
        'svadmin-batch-action-bar svadmin-batch-action-bar--floating',
        className
      )}
      role="region"
      aria-label="Batch Actions"
    >
      <div class="svadmin-batch-action-bar__selection">
        <CheckCircle2 class="svadmin-batch-action-bar__icon" aria-hidden="true" />
        <span class="svadmin-batch-action-bar__label">{displayText}</span>
      </div>

      {#if actions}
        <div class="svadmin-batch-action-bar__actions">
          {@render actions()}
        </div>
      {/if}

      {#if children}
        <div class="svadmin-batch-action-bar__actions">
          {@render children()}
        </div>
      {/if}

      {#if onclear}
        <Button
          variant="ghost"
          size="sm"
          class="svadmin-batch-action-bar__clear"
          onclick={onclear}
          aria-label={clearLabel}
        >
          <X class="svadmin-batch-action-bar__clear-icon" aria-hidden="true" />
          {clearLabel}
        </Button>
      {/if}
    </div>
  {:else}
    <div
      class={cn(
        'svadmin-batch-action-bar',
        variant === 'subtle' ? 'svadmin-batch-action-bar--subtle' : '',
        className
      )}
      role="region"
      aria-label="Batch Actions"
    >
      <div class="svadmin-batch-action-bar__selection">
        <Badge variant="secondary" class="svadmin-batch-action-bar__count">
          {selectedCount}
        </Badge>
        <span class="svadmin-batch-action-bar__label">{displayText}</span>
        {#if onclear}
          <button
            type="button"
            class="svadmin-batch-action-bar__clear"
            onclick={onclear}
          >
            {clearLabel}
          </button>
        {/if}
      </div>

      <div class="svadmin-batch-action-bar__actions">
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
