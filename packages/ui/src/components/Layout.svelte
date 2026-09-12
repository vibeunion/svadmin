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

  const i18n = useTranslation();

  let commandOpen = $state(false);
  let shortcutsOpen = $state(false);
  let mobileMenuOpen = $state(false);

  let { children, title = 'Admin', menu, siteUrl, routeMode = 'auto', aiAssistant }: { children: Snippet; title?: string; menu?: MenuItem[]; siteUrl?: string; routeMode?: 'hash' | 'path' | 'auto'; aiAssistant?: Snippet<[LayoutAIAssistantProps]> } = $props();
  const layoutId = $props.id();
  const layoutScope = `svadmin-layout-${layoutId}`;
  const mainContentId = `${layoutScope}-main`;
  const chatScope = `${layoutScope}-chat`;
  const adminContext = captureAdminContext();

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
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
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
  <div data-svadmin-layout-scope={layoutScope} class="svadmin-u-60fbb7713999 svadmin-u-ef114b5f5ad1" in:fade={{ duration: 150 }}>
    <div class="svadmin-u-99d72c7fc3e2 svadmin-u-9d60be3a6d80 svadmin-u-e2fe2012a697 svadmin-u-ac402894e356 svadmin-u-8e63407b5ceb svadmin-u-3e7ce58d64fa">
      <Skeleton class="svadmin-u-ed8a5df7b2fb svadmin-u-516b03df0b7c" />
      <div class="svadmin-u-6f7e013d6499 svadmin-u-31f2553311b6">
        {#each Array(5) as _, _i (_i)}
          <Skeleton class="svadmin-u-e7a768f922d2 svadmin-u-6da6a3c3f741 svadmin-u-5f22e64f2282" />
        {/each}
      </div>
    </div>
    <div class="svadmin-u-36e579c0b41c svadmin-u-845f53365c8d svadmin-u-b3542e058833">
      <Skeleton class="svadmin-u-ed8a5df7b2fb svadmin-u-74b2435a1d40" />
      <div class="svadmin-u-6ed543e2fbbb">
        {#each Array(4) as _, _i (_i)}
          <Skeleton class="svadmin-u-508ebf85b1c9 svadmin-u-6da6a3c3f741" />
        {/each}
      </div>
    </div>
  </div>
  <div class="svadmin-u-99d72c7fc3e2" aria-hidden="true">
    <DevTools docked />
  </div>
{:else}
  <div data-svadmin-layout-scope={layoutScope} class="svadmin-u-60fbb7713999 svadmin-u-ef114b5f5ad1 svadmin-u-e6f9e383a762" in:fade={{ duration: 200, delay: 50 }}>
    <button
      type="button"
      data-svadmin-skip-link={mainContentId}
      class="svadmin-u-da4dbfbc4fdc svadmin-u-22e59b722111 svadmin-u-8782d84cc906 svadmin-u-db5a366a0e21 svadmin-u-306d283a53fe svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-e6f9e383a762 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-438b2237b8d6 svadmin-u-eadef238231e svadmin-u-beab17f53576 svadmin-u-55d048ebfb1c svadmin-u-608dd26cd5ba svadmin-u-80b9d0ae125f svadmin-u-6b22a22a9752"
      onclick={focusMainContent}
    >
      {i18n.t('common.skipToMainContent')}
    </button>

    <!-- Desktop sidebar -->
    <div class="svadmin-u-99d72c7fc3e2 svadmin-u-9d60be3a6d80">
      <Sidebar {collapsed} {identity} {title} {...definedOptions({ "menu": menu })} {routeMode} onToggle={() => collapsed = !collapsed} onLogout={handleLogout} />    </div>

    <!-- Mobile sidebar via Sheet -->
    <Sheet.Root
      bind:open={mobileMenuOpen}
      side="left"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${layoutScope}-mobile-navigation-title`}
    >
      <Sheet.Title id={`${layoutScope}-mobile-navigation-title`} class="svadmin-u-2daa8e5e2f2e">{title}</Sheet.Title>
      <div class="svadmin-u-e477a6af4cb6">
        <Sidebar collapsed={false} {identity} {title} {...definedOptions({ "menu": menu })} {routeMode} onToggle={() => { mobileMenuOpen = false; }} onLogout={handleLogout} />      </div>
    </Sheet.Root>

    <div
      class="svadmin-u-36e579c0b41c svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-2cd02d11d1af svadmin-u-0fe7d7d814d0 svadmin-u-7890552ecd63"
      class:md:ml-[252px]={!collapsed}
      class:sidebar-content-expanded={!collapsed}
      class:md:ml-[70px]={collapsed}
      class:sidebar-content-collapsed={collapsed}
    >
      <!-- Header with mobile hamburger -->
      <Header
        {...definedOptions({ "siteUrl": siteUrl })}
        {...definedOptions({ "menu": menu })}
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
            class="svadmin-u-e477a6af4cb6 svadmin-u-58284b4ea568 svadmin-u-0b91436debbd"
            aria-label={i18n.t('common.menu')}
            onclick={() => { mobileMenuOpen = true; }}
          >
            <Menu class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e" />
            <span class="svadmin-u-359090c2d529">{i18n.t('common.menu')}</span>
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
      <main id={mainContentId} tabindex="-1" data-svadmin-main class="svadmin-u-36e579c0b41c svadmin-u-92bf82f493b1 svadmin-u-2859c861d7de svadmin-u-f0faeb26d656 svadmin-u-c9b99cd93450 svadmin-u-cc06a6575385 svadmin-u-daf5dc5fac2b svadmin-u-e86fadb84483">
        <div class="svadmin-u-0e12dc7de920 svadmin-u-6da6a3c3f741 svadmin-u-9e3dc30c26a3">
          {#key getPath()}
            <div in:fly={{ x: 20, duration: 150 }} out:fade={{ duration: 80 }}>
              {@render children()}
            </div>
          {/key}
        </div>
      </main>

      <footer class="svadmin-u-60fbb7713999 svadmin-u-0cfe3fb5e434 svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-77c08e015d14 svadmin-u-77a2a20e90d4 svadmin-u-b950dda299d3 svadmin-u-05faf5c801ff svadmin-u-e6f9e383a762 svadmin-u-f0faeb26d656 svadmin-u-472f43d3a27b">
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
