<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils';

  export interface QueryFilterProps {
    /** Number of columns in the grid layout (1 - 4, default: 3) */
    cols?: 1 | 2 | 3 | 4;
    /** Initial collapsed state when uncontrolled */
    defaultCollapsed?: boolean;
    /** Controlled collapsed state */
    collapsed?: boolean;
    /** Callback triggered when collapsed state changes */
    oncollapse?: (collapsed: boolean) => void;
    /** Callback triggered when search/filter form is submitted */
    onsubmit?: (event?: SubmitEvent) => void;
    /** Callback triggered when reset button is clicked */
    onreset?: () => void;
    /** Label text for search button (default: '查询') */
    searchBtnText?: string;
    /** Label text for reset button (default: '重置') */
    resetBtnText?: string;
    /** Whether to show the expand/collapse toggle button (default: true) */
    showCollapseButton?: boolean;
    /** Whether to show the reset button (default: true) */
    showResetButton?: boolean;
    /** Label layout mode: horizontal, vertical, or inline (default: 'horizontal') */
    layout?: 'horizontal' | 'vertical' | 'inline';
    /** Content slot containing form filter items */
    children?: Snippet;
    /** Custom extra action buttons slot next to search/reset */
    extra?: Snippet;
    /** Custom class for the wrapper container */
    class?: string;
  }

  let {
    cols = 3,
    defaultCollapsed = true,
    collapsed = $bindable(),
    oncollapse,
    onsubmit,
    onreset,
    searchBtnText = '查询',
    resetBtnText = '重置',
    showCollapseButton = true,
    showResetButton = true,
    layout = 'horizontal',
    children,
    extra,
    class: className = '',
  }: QueryFilterProps = $props();

  // Internal collapsed state if not externally controlled
  let internalCollapsed = $state(collapsed !== undefined ? collapsed : defaultCollapsed);

  $effect(() => {
    if (collapsed !== undefined) {
      internalCollapsed = collapsed;
    }
  });

  function toggleCollapse() {
    const next = !internalCollapsed;
    internalCollapsed = next;
    collapsed = next;
    oncollapse?.(next);
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    onsubmit?.(event);
  }

  function handleReset() {
    onreset?.();
  }

  let gridColsClass = $derived.by(() => {
    switch (cols) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 md:grid-cols-2';
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4';
      case 3:
      default:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    }
  });
</script>

<form
  role="search"
  aria-label="Query filter form"
  data-svadmin-component="QueryFilter"
  class={cn(
    'svadmin-query-filter group/qf relative rounded-[4px] border border-border bg-card p-4 text-card-foreground shadow-xs transition-all duration-200',
    className
  )}
  onsubmit={handleSubmit}
>
  <div
    class={cn(
      'svadmin-query-filter-grid grid gap-x-4 gap-y-3.5',
      gridColsClass,
      layout === 'vertical' && 'items-start',
      layout === 'horizontal' && 'items-center',
      layout === 'inline' && 'flex flex-wrap items-center'
    )}
  >
    {#if children}
      {@render children()}
    {/if}

    <!-- Actions area -->
    <div
      class={cn(
        'svadmin-query-filter-actions flex items-center justify-end gap-2.5 pt-1 sm:pt-0',
        cols === 1 ? 'col-span-1' : '',
        cols === 2 ? 'col-span-1 md:col-span-2' : '',
        cols === 3 ? 'col-span-1 sm:col-span-2 lg:col-span-3' : '',
        cols === 4 ? 'col-span-1 sm:col-span-2 md:col-span-3 xl:col-span-4' : ''
      )}
    >
      {#if showResetButton}
        <button
          type="button"
          aria-label={resetBtnText}
          class="svadmin-btn-reset inline-flex h-8 items-center justify-center rounded-[4px] border border-[#E5E6EB] bg-transparent px-3 text-xs font-normal text-[#4E5969] transition-colors hover:bg-[#F2F3F5] active:bg-[#E5E6EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#165DFF]/20 dark:border-border dark:text-muted-foreground dark:hover:bg-muted"
          onclick={handleReset}
        >
          <svg
            class="mr-1.5 h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          {resetBtnText}
        </button>
      {/if}

      <button
        type="submit"
        aria-label={searchBtnText}
        class="svadmin-btn-search inline-flex h-8 items-center justify-center rounded-[4px] bg-[#165DFF] px-3.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-[#4080FF] active:bg-[#0E42D2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#165DFF]/40"
      >
        <svg
          class="mr-1.5 h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        {searchBtnText}
      </button>

      {#if extra}
        {@render extra()}
      {/if}

      {#if showCollapseButton}
        <button
          type="button"
          aria-expanded={!internalCollapsed}
          aria-label={internalCollapsed ? '展开筛选' : '收起筛选'}
          class="svadmin-btn-collapse ml-1 inline-flex items-center text-xs font-normal text-[#165DFF] transition-colors hover:text-[#4080FF] focus-visible:outline-none"
          onclick={toggleCollapse}
        >
          <span>{internalCollapsed ? '展开' : '收起'}</span>
          <svg
            class={cn(
              'ml-1 h-3.5 w-3.5 transition-transform duration-200',
              !internalCollapsed ? 'rotate-180' : ''
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      {/if}
    </div>
  </div>
</form>
