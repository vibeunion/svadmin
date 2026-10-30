<script module lang="ts">
  export interface LayoutAIAssistantProps {
    docked: boolean;
    scope: string;
    ownerScope: string;
  }
</script>

<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

/* eslint-disable svelte/no-useless-children-snippet */
  import type { Snippet } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import Sidebar from './Sidebar.svelte';
  import Header from './Header.svelte';
  import CommandPalette from './CommandPalette.svelte';
  import KeyboardShortcuts from './KeyboardShortcuts.svelte';
  import DevTools from './DevTools.svelte';
  import { useTranslation } from '@svadmin/core/i18n';

  import { captureAdminContext } from '@svadmin/core';
  import type { Identity, MenuItem } from '@svadmin/core';
  import { getPath } from '../router-state.svelte.js';
  import { Skeleton } from './ui/skeleton/index.js';
  import * as Sheet from './ui/sheet/index.js';
  import { Menu } from '@lucide/svelte';
  import { getComponentRegistry } from '../component-registry.svelte.js';
  import { Button } from './ui/button/index.js';
  import { cn } from '../utils.js';
  import { uiPreferences } from '../ui-preferences.svelte.js';
  import type { NotificationItem } from './NotificationCenter.svelte';

  const i18n = useTranslation();

  let commandOpen = $state(false);
  let shortcutsOpen = $state(false);
  let mobileMenuOpen = $state(false);

  interface Props {
    children: Snippet;
    title?: string;
    menu?: MenuItem[];
    siteUrl?: string;
    routeMode?: 'hash' | 'path' | 'auto';
    aiAssistant?: Snippet<[LayoutAIAssistantProps]>;
    notifications?: NotificationItem[];
    notificationUnreadCount?: number;
    onnotificationread?: (item: NotificationItem) => void | Promise<void>;
    onnotificationreadall?: () => void | Promise<void>;
    onnotificationopen?: (item: NotificationItem) => void | Promise<void>;
    class?: string;
  }

  let {
    children,
    title = 'Admin',
    menu,
    siteUrl,
    routeMode = 'auto',
    aiAssistant,
    notifications,
    notificationUnreadCount,
    onnotificationread,
    onnotificationreadall,
    onnotificationopen,
    class: className = '',
  }: Props = $props();
  const layoutId = $props.id();
  const layoutScope = `svadmin-layout-${layoutId}`;
  const mainContentId = `${layoutScope}-main`;
  const chatScope = `${layoutScope}-chat`;
  const adminContext = captureAdminContext();
  const navigation = $derived(uiPreferences.navigation);
  const showSidebar = $derived(navigation !== 'top');
  const showTopNavigation = $derived(navigation === 'top' || navigation === 'mix');
  const topLevelMenu = $derived((menu ?? []).filter((item) => !item.meta?.hidden));

  const auth = $derived(adminContext.authProvider);
  let loading = $state(true);
  let identity = $state<Identity | null>(null);
  const taskProvider = $derived(adminContext.taskProvider ?? undefined);
  const TaskQueueComponent = getComponentRegistry()?.TaskQueueDrawer;

  $effect(() => {
    const scopedAuth = auth;
    let cancelled = false;

    identity = null;
    loading = Boolean(scopedAuth);
    if (!scopedAuth) return;

    scopedAuth.getIdentity().then(id => {
      if (!cancelled) {
        identity = id;
        loading = false;
      }
    }).catch(() => {
      if (!cancelled) loading = false;
    });
    return () => { cancelled = true; };
  });

  async function handleLogout() {
    if (!auth) return;
    try {
      const result = await auth.logout();
      if (result.success) {
        await adminContext.navigate(result.redirectTo ?? '/login');
      }
    } catch {
      await adminContext.navigate('/login');
    }
  }

  function focusMainContent() {
    document.getElementById(mainContentId)?.focus();
  }

  function handleAskAI(query: string) {
    if (!aiAssistant || typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('svadmin:ask-ai', {
      detail: { query, scope: chatScope },
    }));
  }

  let collapsed = $state(false);

  // Swipe gesture for mobile menu
  let touchStartX = $state(0);
  let touchEndX = $state(0);

  function ownsLayoutEvent(event: Event): boolean {
    const target = event.target instanceof Element ? event.target : document.activeElement;
    const owner = target
      ?.closest<HTMLElement>('[data-svadmin-layout-scope]')
      ?.dataset['svadminLayoutScope'];
    if (owner) return owner === layoutScope;
    return document.querySelectorAll('[data-svadmin-layout-scope]').length === 1;
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    if (!ownsLayoutEvent(e)) return;
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.code === 'KeyK')) {
      e.preventDefault();
      commandOpen = true;
    }
    if (e.key === '?' && !(e.target instanceof Element && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName))) {
      e.preventDefault();
      shortcutsOpen = true;
    }
  }

  function handleTouchStart(e: TouchEvent) {
    if (!ownsLayoutEvent(e)) return;
    const touch = e.touches.item(0);
    if (e.touches.length === 1 && touch) {
      touchStartX = touch.clientX;
      touchEndX = touch.clientX;
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (!ownsLayoutEvent(e)) return;
    const touch = e.touches.item(0);
    if (e.touches.length === 1 && touch) {
      touchEndX = touch.clientX;
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    if (!ownsLayoutEvent(e)) return;
    // Only trigger swipe-to-open if starting near the left edge (e.g., within 30px)
    // and swiping right by at least 50px
    if (touchStartX < 30 && touchEndX - touchStartX > 50) {
      mobileMenuOpen = true;
    }
  }
</script>

<svelte:window 
  onkeydown={handleGlobalKeydown}
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
/>
{#if loading}
  <div
    data-svadmin-layout-scope={layoutScope}
    data-svadmin-layout
    data-svadmin-layout-state="loading"
    aria-busy="true"
    class={cn('flex h-screen', className)}
    in:fade={{ duration: 150 }}
  >
    <div class="svadmin-layout__desktop-sidebar w-[252px] bg-sidebar/80 p-4 space-y-4">
      <Skeleton class="h-8 w-32" />
      <div class="space-y-2 mt-6">
        {#each Array(5) as _, _i (_i)}
          <Skeleton class="h-9 w-full rounded-lg" />
        {/each}
      </div>
    </div>
    <div class="flex-1 p-8 space-y-6">
      <Skeleton class="h-8 w-48" />
      <div class="space-y-3">
        {#each Array(4) as _, _i (_i)}
          <Skeleton class="h-12 w-full" />
        {/each}
      </div>
    </div>
  </div>
  <div class="hidden" aria-hidden="true">
    <DevTools docked />
  </div>
{:else}
  <div
    data-svadmin-layout-scope={layoutScope}
    data-svadmin-layout
    data-svadmin-layout-state="ready"
    data-svadmin-navigation={navigation}
    data-svadmin-content-width={uiPreferences.contentWidth}
    aria-busy="false"
    class={cn('flex h-screen bg-background', className)}
    in:fade={{ duration: 200, delay: 50 }}
  >
    <button
      type="button"
      data-svadmin-skip-link={mainContentId}
      class="absolute left-3 top-3 z-[100] -translate-y-16 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      onclick={focusMainContent}
    >
      {i18n.t('common.skipToMainContent')}
    </button>

    <!-- Desktop sidebar -->
    {#if showSidebar}
      <div class="svadmin-layout__desktop-sidebar">
        <Sidebar {collapsed} {identity} {title} {...definedOptions({ "menu": menu })} {routeMode} onToggle={() => collapsed = !collapsed} onLogout={handleLogout} />
      </div>
    {/if}

    <!-- Mobile sidebar via Sheet -->
    <Sheet.Root
      bind:open={mobileMenuOpen}
      side="left"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${layoutScope}-mobile-navigation-title`}
    >
      <Sheet.Title id={`${layoutScope}-mobile-navigation-title`} class="sr-only">{title}</Sheet.Title>
      <div class="md:hidden">
        <Sidebar collapsed={false} {identity} {title} {...definedOptions({ "menu": menu })} {routeMode} onToggle={() => { mobileMenuOpen = false; }} onLogout={handleLogout} />
      </div>
    </Sheet.Root>

    <div
      class="flex-1 flex flex-col overflow-hidden transition-all duration-300"
      class:svadmin-sidebar-content-expanded={!collapsed}
      class:sidebar-content-expanded={!collapsed}
      class:svadmin-sidebar-content-collapsed={collapsed}
      class:sidebar-content-collapsed={collapsed}
    >
      <!-- Header with mobile hamburger -->
      <Header
        {...definedOptions({ "siteUrl": siteUrl })}
        {...definedOptions({ "menu": menu })}
        showSearch={true}
        showThemeToggle={true}
        notificationItems={notifications ?? []}
        {...(notificationUnreadCount === undefined ? {} : { notificationUnreadCount })}
        {...(onnotificationread ? { onnotificationread } : {})}
        {...(onnotificationreadall ? { onnotificationreadall } : {})}
        {...(onnotificationopen ? { onnotificationopen } : {})}
        onSearchClick={() => { commandOpen = true; }}
      >
        {#snippet children()}
          <!-- Mobile hamburger -->
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="md:hidden gap-1.5 px-2.5"
            aria-label={i18n.t('common.menu')}
            onclick={() => { mobileMenuOpen = true; }}
          >
            <Menu class="h-5 w-5" />
            <span class="text-xs">{i18n.t('common.menu')}</span>
          </Button>
        {/snippet}
        {#snippet rightActions()}
          {#if taskProvider}
            {#if TaskQueueComponent}
              <TaskQueueComponent {taskProvider} />
            {/if}
          {/if}
        {/snippet}
      </Header>

      {#if showTopNavigation}
        <nav class="svadmin-top-navigation" aria-label={title}>
          {#each topLevelMenu as item (item.name)}
            {@const active = item.href ? getPath().startsWith(item.href) : false}
            <a class="svadmin-top-navigation__item" class:is-active={active} href={item.href ?? '#'}>
              {item.label ?? i18n.t(`menu.${item.name}`)}
            </a>
          {/each}
        </nav>
      {/if}

      <!-- Content area: responsive padding + centered max-width container
           so wide screens don't stretch content indefinitely (avoids sparse layouts) -->
      <main id={mainContentId} tabindex="-1" data-svadmin-main data-svadmin-layout-content class="flex-1 overflow-y-auto bg-muted/30 px-4 py-5 sm:px-5 md:px-7.5 md:py-7">
        <div class="mx-auto w-full max-w-[1600px]">
          {#key getPath()}
            <!-- 路由切换立即释放旧页面，避免退出期间继续读取已失效的路由派生状态。 -->
            {#if uiPreferences.pageTransition && uiPreferences.motion !== 'reduced'}
              <div in:fly={{ x: 20, duration: 150 }}>
                {@render children()}
              </div>
            {:else}
              <div>
                {@render children()}
              </div>
            {/if}
          {/key}
        </div>
      </main>

      <footer data-svadmin-layout-footer class="flex min-h-14 shrink-0 items-center justify-end gap-2 border-t border-border/60 bg-background px-4 empty:hidden">
        <DevTools docked />
        {@render aiAssistant?.({ docked: true, scope: chatScope, ownerScope: layoutScope })}
      </footer>
    </div>
  </div>
  <CommandPalette
    bind:open={commandOpen}
    {...definedOptions({ "onAskAI": aiAssistant ? handleAskAI : undefined })}
  />
  <KeyboardShortcuts bind:open={shortcutsOpen} />
{/if}

<style>
  .svadmin-top-navigation {
    display: flex;
    align-items: center;
    gap: var(--svadmin-space-1);
    min-width: 0;
    padding: var(--svadmin-space-2) var(--svadmin-space-5);
    overflow-x: auto;
    border-block-end: 1px solid var(--border);
    background: var(--background);
  }
  .svadmin-top-navigation__item {
    flex: 0 0 auto;
    padding: var(--svadmin-space-2) var(--svadmin-space-3);
    border-radius: var(--radius-sm);
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-label);
    font-weight: 500;
    text-decoration: none;
    white-space: nowrap;
  }
  .svadmin-top-navigation__item:hover {
    background: var(--accent);
    color: var(--accent-foreground);
  }
  .svadmin-top-navigation__item.is-active {
    background: var(--accent);
    color: var(--accent-foreground);
    font-weight: 600;
  }
  :global([data-svadmin-layout][data-svadmin-content-width='fluid']) :global([data-svadmin-main] > div) {
    max-width: none;
  }
  :global([data-svadmin-layout][data-svadmin-content-width='wide']) :global([data-svadmin-main] > div) {
    max-width: 92rem;
  }
</style>
