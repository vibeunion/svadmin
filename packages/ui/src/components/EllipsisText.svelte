<script lang="ts">
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core';
  import type { Snippet } from 'svelte';

  const i18n = useTranslation();

  export interface EllipsisTextProps {
    text?: string;
    maxLines?: number;
    expandable?: boolean;
    defaultExpanded?: boolean;
    expandText?: string;
    collapseText?: string;
    tooltip?: boolean | string;
    class?: string;
    children?: Snippet;
  }

  let {
    text = '',
    maxLines = 3,
    expandable = true,
    defaultExpanded = false,
    expandText,
    collapseText,
    tooltip = false,
    class: className = '',
    children,
  }: EllipsisTextProps = $props();

  let expandedState = $state<boolean | undefined>(undefined);
  const expanded = $derived(expandedState ?? defaultExpanded);

  const actualExpandText = $derived(expandText ?? i18n.t('common.expand'));
  const actualCollapseText = $derived(collapseText ?? i18n.t('common.collapse'));
  const tooltipText = $derived.by(() => {
    if (!tooltip) return undefined;
    if (typeof tooltip === 'string') return tooltip;
    return text || undefined;
  });

  function toggleExpand() {
    expandedState = !expanded;
  }
</script>

<div
  class={cn('relative text-sm text-foreground leading-relaxed', className)}
  data-svadmin-component="EllipsisText"
  data-expanded={expanded}
  title={!expanded ? tooltipText : undefined}
>
  <div
    class={cn(
      'transition-all duration-200',
      !expanded && 'overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:var(--line-clamp)] [display:-webkit-box]'
    )}
    style="--line-clamp: {maxLines};"
  >
    {#if children}
      {@render children()}
    {:else}
      {text}
    {/if}
  </div>

  {#if expandable}
    <button
      type="button"
      class="mt-1 inline-flex items-center text-xs font-medium text-primary hover:text-primary/80 transition-colors focus:outline-none focus-visible:underline"
      onclick={toggleExpand}
      aria-expanded={expanded}
    >
      {expanded ? actualCollapseText : actualExpandText}
    </button>
  {/if}
</div>
