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

  import { captureAdminContext, getAuthProvider, getTaskProvider } from '@svadmin/core';
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
  const adminContext = captureAdminContext();

  let auth: ReturnType<typeof getAuthProvider> | null = null;
  try {
    auth = getAuthProvider();
  } catch { /* Auth is optional for public layouts. */ }
  let loading = $state(true);
  let identity = $state<Identity | null>(null);
  const taskProvider = getTaskProvider({ optional: true }) as TaskProvider<TaskRecord> | undefined;
  const TaskQueueComponent = getComponentRegistry()?.TaskQueueDrawer;

  $effect(() => {
    let cancelled = false;
    if (!auth) {
      if (!cancelled) loading = false;
      return;
    }
    auth.getIdentity().then(id => {
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

  let collapsed = $state(false);

  // Swipe gesture for mobile menu
  let touchStartX = $state(0);
  let touchEndX = $state(0);

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchEndX = e.touches[0].clientX;
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (e.touches.length === 1) {
      touchEndX = e.touches[0].clientX;
    }
  }

  function handleTouchEnd() {
    // Only trigger swipe-to-open if starting near the left edge (e.g., within 30px)
    // and swiping right by at least 50px
    if (touchStartX < 30 && touchEndX - touchStartX > 50) {
      mobileMenuOpen = true;
    }
  }
</script>

<svelte:window 
  onkeydown={(e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); commandOpen = true; }
    if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) { e.preventDefault(); shortcutsOpen = true; }
  }}
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
/>
{#if loading}
  <div class="flex h-screen" in:fade={{ duration: 150 }}>
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
  <div class="flex h-screen bg-background" in:fade={{ duration: 200, delay: 50 }}>
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
      <main class="flex-1 overflow-y-auto bg-muted/30 px-4 py-5 sm:px-5 md:px-7.5 md:py-7">
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
        <ChatDialog docked />
      </footer>
    </div>
  </div>
  <CommandPalette 
    bind:open={commandOpen} 
    onAskAI={(q) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('svadmin:ask-ai', { detail: q }));
      }
    }}
  />
  <KeyboardShortcuts bind:open={shortcutsOpen} />
{/if}
