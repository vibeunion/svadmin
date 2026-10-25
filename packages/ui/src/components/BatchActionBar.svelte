<script lang="ts">
  import type { Snippet } from 'svelte';
  import { CheckCircle2, X } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import { Badge } from './ui/badge/index.js';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core/i18n';

  const i18n = useTranslation();

  interface Props {
    selectedCount?: number;
    totalCount?: number;
    selectedLabel?: string;
    clearLabel?: string;
    ariaLabel?: string;
    pending?: boolean;
    pendingLabel?: string;
    /** 全量匹配等选择模式可在零计数时保留清除入口。 */
    forceVisible?: boolean;
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
    clearLabel,
    ariaLabel,
    pending = false,
    pendingLabel,
    forceVisible = false,
    variant = 'default',
    onclear,
    actions,
    children,
    class: className = '',
  }: Props = $props();

  const isVisible = $derived(selectedCount > 0 || pending || forceVisible);
  const clearText = $derived(clearLabel ?? i18n.t('common.clearSelection'));
  const regionLabel = $derived(ariaLabel ?? i18n.t('common.batchActions'));
  const busyText = $derived(pendingLabel ?? i18n.t('common.processing'));
  const displayText = $derived.by(() => {
    if (selectedLabel) {
      return selectedLabel.replace('{count}', String(selectedCount));
    }
    return totalCount !== undefined
      ? i18n.t('common.selectedOfTotal', { count: selectedCount, total: totalCount })
      : i18n.t('common.selectedCount', { count: selectedCount });
  });

  function handleClear() {
    if (!pending) onclear?.();
  }
</script>

<span class="svadmin-sr-only" role="status" aria-live="polite" aria-atomic="true">{pending ? busyText : ''}</span>

{#if isVisible}
  {#if variant === 'floating'}
    <div
      class={cn(
        'svadmin-batch-action-bar svadmin-batch-action-bar--floating',
        className
      )}
      role="region"
      aria-label={regionLabel}
      aria-busy={pending || undefined}
    >
      <div class="svadmin-batch-action-bar__selection">
        <CheckCircle2 class="svadmin-batch-action-bar__icon" aria-hidden="true" />
        <span class="svadmin-batch-action-bar__label">{displayText}</span>
        {#if pending}<span aria-hidden="true">{busyText}</span>{/if}
      </div>

      {#if actions}
        <div class="svadmin-batch-action-bar__actions" inert={pending}>
          {@render actions()}
        </div>
      {/if}

      {#if children}
        <div class="svadmin-batch-action-bar__actions" inert={pending}>
          {@render children()}
        </div>
      {/if}

      {#if onclear}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="svadmin-batch-action-bar__clear"
          onclick={handleClear}
          aria-label={clearText}
          disabled={pending}
        >
          <X class="svadmin-batch-action-bar__clear-icon" aria-hidden="true" />
          {clearText}
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
      aria-label={regionLabel}
      aria-busy={pending || undefined}
    >
      <div class="svadmin-batch-action-bar__selection">
        <Badge variant="secondary" class="svadmin-batch-action-bar__count">
          {selectedCount}
        </Badge>
        <span class="svadmin-batch-action-bar__label">{displayText}</span>
        {#if pending}<span aria-hidden="true">{busyText}</span>{/if}
        {#if onclear}
          <button
            type="button"
            class="svadmin-batch-action-bar__clear"
            onclick={handleClear}
            disabled={pending}
          >
            {clearText}
          </button>
        {/if}
      </div>

      <div class="svadmin-batch-action-bar__actions" inert={pending}>
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
