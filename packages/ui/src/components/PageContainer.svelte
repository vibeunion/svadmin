<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils';

  export interface PageContainerTab {
    key: string;
    label: string;
    disabled?: boolean;
  }

  export interface PageContainerTag {
    label: string;
    tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  }

  export interface PageContainerBreadcrumb {
    label: string;
    href?: string;
  }

  export interface PageContainerProps {
    /** Main page title text */
    title?: string;
    /** Subtitle or secondary description text */
    subTitle?: string;
    /** Breadcrumb trail items */
    breadcrumbs?: PageContainerBreadcrumb[];
    /** Whether to show back navigation button */
    backIcon?: boolean;
    /** Callback when back button is clicked */
    onback?: () => void;
    /** Status tags or badges displayed next to the title */
    tags?: PageContainerTag[];
    /** Header tabs navigation items */
    tabs?: PageContainerTab[];
    /** Currently active tab key */
    activeTab?: string;
    /** Callback triggered when a tab is selected */
    ontabchange?: (key: string) => void;
    /** If true, content has no card wrapper background (transparent) */
    ghost?: boolean;
    /** Content container width layout ('fluid' or 'fixed') */
    contentWidth?: 'fluid' | 'fixed';
    /** Whether header is fixed at top */
    fixedHeader?: boolean;
    /** Main content body */
    children?: Snippet;
    /** Custom complete header slot */
    header?: Snippet;
    /** Extra actions slot placed on top right */
    extra?: Snippet;
    /** Footer slot for header (below tabs or extra info) */
    footer?: Snippet;
    /** Additional classes */
    class?: string;
  }

  let {
    title,
    subTitle,
    breadcrumbs,
    backIcon = false,
    onback,
    tags,
    tabs,
    activeTab = $bindable(),
    ontabchange,
    ghost = false,
    contentWidth = 'fluid',
    fixedHeader = false,
    children,
    header,
    extra,
    footer,
    class: className = '',
  }: PageContainerProps = $props();

  let internalActiveTab = $derived(activeTab ?? tabs?.[0]?.key ?? '');

  function handleTabClick(tab: PageContainerTab) {
    if (tab.disabled) return;
    internalActiveTab = tab.key;
    activeTab = tab.key;
    ontabchange?.(tab.key);
  }

  function handleBack() {
    onback?.();
  }

  function getTagToneClasses(tone?: PageContainerTag['tone']): string {
    switch (tone) {
      case 'success':
        return 'bg-success/10 text-success border-success/30';
      case 'warning':
        return 'bg-warning/10 text-warning border-warning/30';
      case 'danger':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'primary':
        return 'bg-primary/10 text-primary border-primary/30';
      case 'neutral':
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  }
</script>

<div
  data-svadmin-component="PageContainer"
  class={cn(
    'svadmin-page-container min-h-full w-full bg-background',
    className
  )}
>
  <!-- Page Header Container -->
  {#if header}
    {@render header()}
  {:else if title || breadcrumbs || extra || tabs}
    <header
      class={cn(
        'svadmin-page-header border-b border-border bg-card px-6 pt-4 pb-0 transition-all',
        fixedHeader && 'sticky top-0 z-20 shadow-xs'
      )}
    >
      <div
        class={cn(
          'mx-auto w-full',
          contentWidth === 'fixed' && 'max-w-7xl'
        )}
      >
        <!-- Breadcrumb row -->
        {#if breadcrumbs && breadcrumbs.length > 0}
          <nav aria-label="Breadcrumb" class="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            {#each breadcrumbs as item, index (item.href ?? `${item.label}-${index}`)}
              {#if index > 0}
                <span class="text-muted select-none">/</span>
              {/if}
              {#if item.href}
                <a
                  href={item.href}
                  class="transition-colors hover:text-primary focus-visible:outline-none"
                >
                  {item.label}
                </a>
              {:else}
                <span class="text-foreground font-normal">{item.label}</span>
              {/if}
            {/each}
          </nav>
        {/if}

        <!-- Title & Extra row -->
        <div class="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div class="flex flex-wrap items-center gap-2.5">
            {#if backIcon || onback}
              <button
                type="button"
                aria-label="返回上一页"
                class="inline-flex h-7 w-7 items-center justify-center rounded-[4px] border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-primary active:bg-accent"
                onclick={handleBack}
              >
                <svg
                  class="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
            {/if}

            {#if title}
              <h1 class="text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h1>
            {/if}

            {#if subTitle}
              <span class="hidden sm:inline-block border-l border-border pl-2.5 text-xs text-muted-foreground">
                {subTitle}
              </span>
            {/if}

            {#if tags && tags.length > 0}
              <div class="ml-1 flex items-center gap-1.5">
                {#each tags as tag (tag.label)}
                  <span
                    class={cn(
                      'inline-flex items-center rounded-[2px] border px-2 py-0.5 text-[11px] font-medium leading-none select-none',
                      getTagToneClasses(tag.tone)
                    )}
                  >
                    {tag.label}
                  </span>
                {/each}
              </div>
            {/if}
          </div>

          {#if extra}
            <div class="flex items-center gap-2">
              {@render extra()}
            </div>
          {/if}
        </div>

        <!-- Header Tabs -->
        {#if tabs && tabs.length > 0}
          <div role="tablist" class="flex items-center gap-6 border-t border-border/60 -mb-[1px]">
            {#each tabs as tab (tab.key)}
              <button
                type="button"
                role="tab"
                aria-selected={internalActiveTab === tab.key}
                disabled={tab.disabled}
                class={cn(
                  'relative py-2.5 text-xs font-medium transition-colors focus-visible:outline-none',
                  internalActiveTab === tab.key
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground hover:text-primary',
                  tab.disabled && 'cursor-not-allowed opacity-40 hover:text-inherit'
                )}
                onclick={() => handleTabClick(tab)}
              >
                {tab.label}
                {#if internalActiveTab === tab.key}
                  <span
                    class="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-primary"
                  ></span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}

        {#if footer}
          <div class="pt-2 pb-3">
            {@render footer()}
          </div>
        {/if}
      </div>
    </header>
  {/if}

  <!-- Content Container -->
  <main class="w-full p-5 sm:p-6">
    <div
      class={cn(
        'mx-auto w-full transition-all',
        contentWidth === 'fixed' && 'max-w-7xl',
        !ghost && 'rounded-[4px] border border-border bg-card p-5 shadow-xs'
      )}
    >
      {#if children}
        {@render children()}
      {/if}
    </div>
  </main>
</div>
