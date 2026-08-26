<script lang="ts">
/* eslint-disable svelte/no-useless-children-snippet */
  import type { Snippet } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import Sidebar from './Sidebar.svelte';
  import Header from './Header.svelte';
  import CommandPalette from './CommandPalette.svelte';
  import KeyboardShortcuts from './KeyboardShortcuts.svelte';
  import ChatDialog from './ChatDialog.svelte';
  import DevTools from './DevTools.svelte';
  import { useTranslation } from '@svadmin/core/i18n';

  import { captureAdminContext } from '@svadmin/core';
  import type { Identity, MenuItem, TaskProvider, TaskRecord } from '@svadmin/core';
  import { getPath } from '../router-state.svelte.js';
  import { Skeleton } from './ui/skeleton/index.js';
  import * as Sheet from './ui/sheet/index.js';
  import { Menu } from '@lucide/svelte';
  import { getComponentRegistry } from '../component-registry.svelte.js';
  import { Button } from './ui/button/index.js';

  const i18n = useTranslation();

  let commandOpen = $state(false);
  let shortcutsOpen = $state(false);
  let mobileMenuOpen = $state(false);

  let { children, title = 'Admin', menu, siteUrl, routeMode = 'auto' }: { children: Snippet; title?: string; menu?: MenuItem[]; siteUrl?: string; routeMode?: 'hash' | 'path' | 'auto' } = $props();
  const layoutId = $props.id();
  const layoutScope = `svadmin-layout-${layoutId}`;
  const mainContentId = `${layoutScope}-main`;
  const chatScope = `${layoutScope}-chat`;
  const adminContext = captureAdminContext();

  const auth = $derived(adminContext.authProvider);
  let loading = $state(true);
  let identity = $state<Identity | null>(null);
  const taskProvider = $derived(adminContext.taskProvider as TaskProvider<TaskRecord> | undefined);
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

  let collapsed = $state(false);

  // Swipe gesture for mobile menu
  let touchStartX = $state(0);
  let touchEndX = $state(0);

  function ownsLayoutEvent(event: Event): boolean {
    const target = event.target instanceof HTMLElement ? event.target : document.activeElement as HTMLElement | null;
    const owner = target
      ?.closest<HTMLElement>('[data-svadmin-layout-scope]')
      ?.dataset.svadminLayoutScope;
    if (owner) return owner === layoutScope;
    return document.querySelectorAll('[data-svadmin-layout-scope]').length === 1;
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    if (!ownsLayoutEvent(e)) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      commandOpen = true;
    }
    if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
      e.preventDefault();
      shortcutsOpen = true;
    }
  }

  function handleTouchStart(e: TouchEvent) {
    if (!ownsLayoutEvent(e)) return;
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchEndX = e.touches[0].clientX;
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (!ownsLayoutEvent(e)) return;
    if (e.touches.length === 1) {
      touchEndX = e.touches[0].clientX;
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
  <div data-svadmin-layout-scope={layoutScope} class="flex h-screen" in:fade={{ duration: 150 }}>
    <div class="hidden md:block w-[252px] bg-sidebar/80 p-4 space-y-4">
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
  <div data-svadmin-layout-scope={layoutScope} class="flex h-screen bg-background" in:fade={{ duration: 200, delay: 50 }}>
    <button
      type="button"
      data-svadmin-skip-link={mainContentId}
      class="absolute left-3 top-3 z-[100] -translate-y-16 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      onclick={focusMainContent}
    >
      {i18n.t('common.skipToMainContent')}
    </button>

    <!-- Desktop sidebar -->
    <div class="hidden md:block">
      <Sidebar {collapsed} {identity} {title} {menu} {routeMode} onToggle={() => collapsed = !collapsed} onLogout={handleLogout} />
    </div>

    <!-- Mobile sidebar via Sheet -->
    <Sheet.Root bind:open={mobileMenuOpen} side="left">
      <div class="md:hidden">
        <Sidebar collapsed={false} {identity} {title} {menu} {routeMode} onToggle={() => { mobileMenuOpen = false; }} onLogout={handleLogout} />
      </div>
    </Sheet.Root>

    <div
      class="flex-1 flex flex-col overflow-hidden transition-all duration-300"
      class:md:ml-[252px]={!collapsed}
      class:sidebar-content-expanded={!collapsed}
      class:md:ml-[70px]={collapsed}
      class:sidebar-content-collapsed={collapsed}
    >
      <!-- Header with mobile hamburger -->
      <Header
        {siteUrl}
        {menu}
        showSearch={true}
        showThemeToggle={true}
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

      <!-- Content area: responsive padding + centered max-width container
           so wide screens don't stretch content indefinitely (avoids sparse layouts) -->
      <main id={mainContentId} tabindex="-1" data-svadmin-main class="flex-1 overflow-y-auto bg-muted/30 px-4 py-5 sm:px-5 md:px-7.5 md:py-7">
        <div class="mx-auto w-full max-w-[1600px]">
          {#key getPath()}
            <div in:fly={{ x: 20, duration: 150 }} out:fade={{ duration: 80 }}>
              {@render children()}
            </div>
          {/key}
        </div>
      </main>

      <footer class="flex min-h-14 shrink-0 items-center justify-end gap-2 border-t border-border/60 bg-background px-4 empty:hidden">
        <DevTools docked />
        <ChatDialog docked scope={chatScope} ownerScope={layoutScope} />
      </footer>
    </div>
  </div>
  <CommandPalette 
    bind:open={commandOpen} 
    onAskAI={(q) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('svadmin:ask-ai', {
          detail: { query: q, scope: chatScope },
        }));
      }
    }}
  />
  <KeyboardShortcuts bind:open={shortcutsOpen} />
{/if}
