<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import { ChevronRight, HelpCircle, Loader2 } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface ProCardTab {
    key: string;
    label: string;
    disabled?: boolean;
  }

  export interface ProCardProps {
    /** Title of the card header */
    title?: string | Snippet;
    /** Subtitle or secondary description */
    subTitle?: string | Snippet;
    /** Information tooltip description displayed next to the title */
    tooltip?: string;
    /** Extra actions or elements in the top right of the header */
    extra?: Snippet;
    /** Bottom actions slot */
    actions?: Snippet;
    /** Whether the card has an outer border */
    bordered?: boolean;
    /** Whether the card elevates on hover */
    hoverable?: boolean;
    /** Ghost mode: removes background, border, and padding for seamless grid nesting */
    ghost?: boolean;
    /** Whether the card can be collapsed */
    collapsible?: boolean;
    /** Controlled collapsed state */
    collapsed?: boolean;
    /** Initial default collapsed state */
    defaultCollapsed?: boolean;
    /** Callback when collapsed state toggles */
    oncollapse?: (collapsed: boolean) => void;
    /** Split layout for child elements */
    split?: 'vertical' | 'horizontal';
    /** Tab items displayed in the card header */
    tabs?: ProCardTab[];
    /** Controlled active tab key */
    activeTabKey?: string;
    /** Callback when active tab changes */
    ontabchange?: (key: string) => void;
    /** Size tier of the card */
    size?: 'default' | 'small';
    /** Loading indicator */
    loading?: boolean;
    /** Additional class names for header */
    headerClass?: string;
    /** Additional class names for card body */
    bodyClass?: string;
    /** Additional root class names */
    class?: string;
    /** Body content slot */
    children?: Snippet;
    [key: string]: unknown;
  }

  let {
    title,
    subTitle,
    tooltip,
    extra,
    actions,
    bordered = true,
    hoverable = false,
    ghost = false,
    collapsible = false,
    collapsed,
    defaultCollapsed = false,
    oncollapse,
    split,
    tabs,
    activeTabKey = $bindable(),
    ontabchange,
    size = 'default',
    loading = false,
    headerClass = '',
    bodyClass = '',
    class: className = '',
    children,
    ...restProps
  }: ProCardProps = $props();

  let internalCollapsed = $state(untrack(() => defaultCollapsed));
  const isCollapsed = $derived(collapsed !== undefined ? collapsed : internalCollapsed);

  let internalActiveTab = $state(untrack(() => activeTabKey ?? tabs?.[0]?.key));
  const currentTab = $derived(activeTabKey !== undefined ? activeTabKey : internalActiveTab);

  function toggleCollapse() {
    if (!collapsible) return;
    const next = !isCollapsed;
    if (collapsed === undefined) {
      internalCollapsed = next;
    }
    oncollapse?.(next);
  }

  function handleTabSelect(key: string, disabled?: boolean) {
    if (disabled) return;
    if (activeTabKey === undefined) {
      internalActiveTab = key;
    }
    activeTabKey = key;
    ontabchange?.(key);
  }

  const hasHeader = $derived(
    Boolean(title || subTitle || tooltip || extra || collapsible || (tabs && tabs.length > 0))
  );
</script>

<div
  data-svadmin-component="ProCard"
  data-ghost={ghost}
  data-collapsed={isCollapsed}
  data-size={size}
  class={cn(
    'relative flex flex-col transition-all duration-200',
    ghost
      ? 'bg-transparent border-0 shadow-none'
      : cn(
          'bg-card text-card-foreground rounded-[4px]',
          bordered && 'border border-border',
          hoverable && 'hover:shadow-md hover:border-primary/40 cursor-pointer'
        ),
    className
  )}
  {...restProps}
>
  {#if loading}
    <div
      role="status"
      aria-label="Loading"
      class="absolute inset-0 z-20 flex items-center justify-center bg-card/60 backdrop-blur-[1px] rounded-[4px]"
    >
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>
  {/if}

  {#if hasHeader}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class={cn(
        'flex items-center justify-between border-b border-border/60 transition-colors',
        size === 'small' ? 'px-3 py-2' : 'px-4 py-3',
        collapsible && 'cursor-pointer select-none hover:bg-muted/40',
        isCollapsed && 'border-b-0',
        headerClass
      )}
      onclick={collapsible ? toggleCollapse : undefined}
      onkeydown={(e) => {
        if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          toggleCollapse();
        }
      }}
      role={collapsible ? 'button' : undefined}
      tabindex={collapsible ? 0 : undefined}
      aria-expanded={collapsible ? !isCollapsed : undefined}
    >
      <!-- Title & Subtitle Section -->
      <div class="flex items-center gap-2 min-w-0">
        {#if collapsible}
          <ChevronRight
            class={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0',
              !isCollapsed && 'rotate-90'
            )}
          />
        {/if}

        <div class="flex items-center gap-1.5 flex-wrap">
          {#if title}
            <span class={cn('font-semibold text-foreground truncate', size === 'small' ? 'text-xs' : 'text-sm')}>
              {#if typeof title === 'string'}
                {title}
              {:else}
                {@render title()}
              {/if}
            </span>
          {/if}

          {#if subTitle}
            <span class="text-xs text-muted-foreground font-normal truncate">
              {#if typeof subTitle === 'string'}
                {subTitle}
              {:else}
                {@render subTitle()}
              {/if}
            </span>
          {/if}

          {#if tooltip}
            <span title={tooltip} class="inline-flex text-muted-foreground hover:text-foreground cursor-help">
              <HelpCircle class="h-3.5 w-3.5" />
            </span>
          {/if}
        </div>
      </div>

      <!-- Tabs or Extra Section -->
      <div class="flex items-center gap-2 shrink-0">
        {#if tabs && tabs.length > 0}
          <div class="flex items-center gap-1 bg-muted/60 p-0.5 rounded-[4px] border border-border/40">
            {#each tabs as tab (tab.key)}
              {@const active = currentTab === tab.key}
              <button
                type="button"
                disabled={tab.disabled}
                class={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-[2px] transition-colors',
                  active
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                  tab.disabled && 'opacity-50 cursor-not-allowed'
                )}
                onclick={(e) => {
                  e.stopPropagation();
                  handleTabSelect(tab.key, tab.disabled);
                }}
              >
                {tab.label}
              </button>
            {/each}
          </div>
        {/if}

        {#if extra}
          <div class="flex items-center gap-1.5 text-xs text-muted-foreground" onclick={(e) => e.stopPropagation()} role="none">
            {@render extra()}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Body Content -->
  {#if !isCollapsed}
    <div
      class={cn(
        'flex-1',
        ghost ? '' : (size === 'small' ? 'p-3' : 'p-4'),
        split === 'vertical' && 'flex flex-row divide-x divide-border',
        split === 'horizontal' && 'flex flex-col divide-y divide-border',
        bodyClass
      )}
    >
      {#if children}
        {@render children()}
      {/if}
    </div>

    {#if actions}
      <div
        class={cn(
          'border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2',
          size === 'small' ? 'px-3 py-2' : 'px-4 py-2.5'
        )}
      >
        {@render actions()}
      </div>
    {/if}
  {/if}
</div>
