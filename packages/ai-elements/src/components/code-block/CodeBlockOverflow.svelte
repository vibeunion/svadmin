<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  export interface CodeBlockOverflowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> {
    collapsed?: boolean;
    maxHeight?: number;
    expandLabel?: string;
    collapseLabel?: string;
    class?: string;
    children?: Snippet;
  }
</script>

<script lang="ts">
  import { ChevronDown, ChevronUp } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  let { collapsed = $bindable(true), maxHeight = 300, expandLabel = 'Expand', collapseLabel = 'Collapse', class: className = '', children, ...rest }: CodeBlockOverflowProps = $props();
</script>

<div {...rest} class={cn('svadmin-ai-code-overflow', className)} data-code-overflow data-collapsed={collapsed} style:max-height={collapsed ? `${maxHeight}px` : undefined}>
  {@render children?.()}
  <button type="button" class="svadmin-ai-code-overflow__toggle" aria-expanded={!collapsed} onclick={() => collapsed = !collapsed}>
    {#if collapsed}<ChevronDown size={14} aria-hidden="true" /> {expandLabel}{:else}<ChevronUp size={14} aria-hidden="true" /> {collapseLabel}{/if}
  </button>
</div>

<style>
  .svadmin-ai-code-overflow { position: relative; overflow: hidden; padding-bottom: 2.5rem; }
  .svadmin-ai-code-overflow[data-collapsed='true']::after { position: absolute; right: 0; bottom: 0; left: 0; height: 4rem; background: var(--background, Canvas); opacity: .88; content: ''; pointer-events: none; }
  .svadmin-ai-code-overflow__toggle { position: absolute; z-index: 1; bottom: .5rem; left: 50%; display: inline-flex; min-height: 1.75rem; align-items: center; gap: .25rem; transform: translateX(-50%); border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .375rem); padding: .25rem .625rem; background: var(--secondary, var(--background, Canvas)); color: var(--secondary-foreground, var(--foreground, currentColor)); font: inherit; font-size: .75rem; cursor: pointer; }
  .svadmin-ai-code-overflow__toggle:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
</style>
