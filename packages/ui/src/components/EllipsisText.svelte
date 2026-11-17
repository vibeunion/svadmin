<script lang="ts">
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core';
  import type { Snippet } from 'svelte';

  const i18n = useTranslation();

  export interface EllipsisTextProps {
    text?: string;
    maxLines?: number;
    /** Rows alias for maxLines */
    rows?: number;
    expandable?: boolean;
    defaultExpanded?: boolean;
    /** Controlled expanded state */
    expanded?: boolean;
    expandText?: string;
    collapseText?: string;
    tooltip?: boolean | string;
    /** Optional suffix text after ellipsis content */
    suffix?: string;
    class?: string;
    children?: Snippet;
    onchange?: (expanded: boolean) => void;
    onExpand?: (expanded: boolean) => void;
  }

  let {
    text = '',
    maxLines = 3,
    rows,
    expandable = true,
    defaultExpanded = false,
    expanded: controlledExpanded,
    expandText,
    collapseText,
    tooltip = false,
    suffix,
    class: className = '',
    children,
    onchange,
    onExpand,
  }: EllipsisTextProps = $props();

  let expandedState = $state<boolean | undefined>(undefined);
  const isControlled = $derived(controlledExpanded !== undefined);
  const currentExpanded = $derived(isControlled ? controlledExpanded! : (expandedState ?? defaultExpanded));

  const effectiveLines = $derived(rows ?? maxLines);
  const actualExpandText = $derived(expandText ?? i18n.t('common.expand'));
  const actualCollapseText = $derived(collapseText ?? i18n.t('common.collapse'));
  const tooltipText = $derived.by(() => {
    if (!tooltip) return undefined;
    if (typeof tooltip === 'string') return tooltip;
    return text || undefined;
  });

  function toggleExpand() {
    const next = !currentExpanded;
    if (!isControlled) {
      expandedState = next;
    }
    onchange?.(next);
    onExpand?.(next);
  }
</script>

<div
  class={cn('relative text-sm text-foreground leading-relaxed', className)}
  data-svadmin-component="EllipsisText"
  data-expanded={currentExpanded}
  title={!currentExpanded ? tooltipText : undefined}
>
  <div
    class={cn(
      'transition-all duration-200',
      !currentExpanded && 'overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:var(--line-clamp)] [display:-webkit-box]'
    )}
    style="--line-clamp: {effectiveLines};"
  >
    {#if children}
      {@render children()}
    {:else}
      {text}
    {/if}
    {#if suffix}
      <span class="inline-block shrink-0 ms-1 text-muted-foreground">{suffix}</span>
    {/if}
  </div>

  {#if expandable}
    <button
      type="button"
      class="mt-1 inline-flex items-center text-xs font-medium text-primary hover:text-primary/80 transition-colors focus:outline-none focus-visible:underline"
      onclick={toggleExpand}
      aria-expanded={currentExpanded}
    >
      {currentExpanded ? actualCollapseText : actualExpandText}
    </button>
  {/if}
</div>
