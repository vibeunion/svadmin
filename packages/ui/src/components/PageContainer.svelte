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

  let internalActiveTab = $state(activeTab || (tabs && tabs[0]?.key) || '');

  $effect(() => {
    if (activeTab !== undefined) {
      internalActiveTab = activeTab;
    }
  });

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
        return 'bg-[#E8FFEA] text-[#00B42A] border-[#AFF0B5] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
      case 'warning':
        return 'bg-[#FFF7E8] text-[#FF7D00] border-[#FFD8A8] dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
      case 'danger':
        return 'bg-[#FFECE8] text-[#F53F3F] border-[#FBACA3] dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
      case 'primary':
        return 'bg-[#E8F3FF] text-[#165DFF] border-[#BEDAFF] dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800';
      case 'neutral':
      default:
        return 'bg-[#F2F3F5] text-[#4E5969] border-[#E5E6EB] dark:bg-muted dark:text-muted-foreground dark:border-border';
    }
  }
</script>

<div
  data-svadmin-component="PageContainer"
  class={cn(
    'svadmin-page-container min-h-full w-full bg-[#F7F8FA] dark:bg-background',
    className
  )}
>
  <!-- Page Header Container -->
  {#if header}
    {@render header()}
  {:else if title || breadcrumbs || extra || tabs}
    <header
      class={cn(
        'svadmin-page-header border-b border-border bg-white px-6 pt-4 pb-0 transition-all dark:bg-card',
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
          <nav aria-label="Breadcrumb" class="mb-2 flex items-center gap-1.5 text-xs text-[#86909C] dark:text-muted-foreground">
            {#each breadcrumbs as item, index}
              {#if index > 0}
                <span class="text-[#C9CDD4] select-none dark:text-muted">/</span>
              {/if}
              {#if item.href}
                <a
                  href={item.href}
                  class="transition-colors hover:text-[#165DFF] focus-visible:outline-none"
                >
                  {item.label}
                </a>
              {:else}
                <span class="text-[#4E5969] font-normal dark:text-foreground">{item.label}</span>
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
                class="inline-flex h-7 w-7 items-center justify-center rounded-[4px] border border-border text-[#4E5969] transition-colors hover:bg-[#F2F3F5] hover:text-[#165DFF] active:bg-[#E5E6EB] dark:hover:bg-muted"
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
              <h1 class="text-lg font-semibold tracking-tight text-[#1D2129] dark:text-foreground">
                {title}
              </h1>
            {/if}

            {#if subTitle}
              <span class="hidden sm:inline-block border-l border-border pl-2.5 text-xs text-[#86909C] dark:text-muted-foreground">
                {subTitle}
              </span>
            {/if}

            {#if tags && tags.length > 0}
              <div class="ml-1 flex items-center gap-1.5">
                {#each tags as tag}
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
            {#each tabs as tab}
              <button
                type="button"
                role="tab"
                aria-selected={internalActiveTab === tab.key}
                disabled={tab.disabled}
                class={cn(
                  'relative py-2.5 text-xs font-medium transition-colors focus-visible:outline-none',
                  internalActiveTab === tab.key
                    ? 'text-[#165DFF] font-semibold dark:text-primary'
                    : 'text-[#4E5969] hover:text-[#165DFF] dark:text-muted-foreground dark:hover:text-foreground',
                  tab.disabled && 'cursor-not-allowed opacity-40 hover:text-inherit'
                )}
                onclick={() => handleTabClick(tab)}
              >
                {tab.label}
                {#if internalActiveTab === tab.key}
                  <span
                    class="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#165DFF] dark:bg-primary"
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
        !ghost && 'rounded-[4px] border border-border bg-white p-5 shadow-xs dark:bg-card'
      )}
    >
      {#if children}
        {@render children()}
      {/if}
    </div>
  </main>
</div>
