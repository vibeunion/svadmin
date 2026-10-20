<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Menu, X } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';

  type Width = 'narrow' | 'default' | 'wide' | 'full';

  interface Props {
    /** Page content; typically a `PagePattern` or `ContentPageShell`. */
    children: Snippet;
    /** Navigation region. The host owns links and routing; the shell owns layout. */
    sidebar?: Snippet;
    /** Leading topbar region, rendered before the mobile navigation trigger. */
    topbarStart?: Snippet;
    /** Topbar region between the leading and trailing slots (search, breadcrumbs…). */
    topbar?: Snippet;
    /** Trailing topbar actions (account menu, notifications…). */
    topbarEnd?: Snippet;
    /** Optional secondary column for detail/workspace pages. */
    aside?: Snippet;
    footer?: Snippet;
    width?: Width;
    /** Collapses the navigation rail to icons. Host-controlled, presentation only. */
    collapsed?: boolean;
    /** Open state of the below-breakpoint navigation drawer. */
    mobileOpen?: boolean;
    /** Accessible name for the primary landmark. */
    label?: string;
    skipLabel?: string;
    contentId?: string;
    class?: string;
  }

  let {
    children,
    sidebar,
    topbarStart,
    topbar,
    topbarEnd,
    aside,
    footer,
    width = 'default',
    collapsed = false,
    mobileOpen = $bindable(false),
    label,
    skipLabel,
    contentId,
    class: className = '',
  }: Props = $props();

  const generatedId = $props.id();
  const i18n = useTranslation();
  const mainId = $derived(contentId ?? generatedId);
  const sidebarId = $derived(`${generatedId}-sidebar`);
  // 未提供可读名称时退回通用文案，避免出现没有可访问名的 <main>。
  const resolvedLabel = $derived(label ?? i18n.t('common.mainNavigation'));
  const resolvedSkipLabel = $derived(skipLabel ?? i18n.t('common.skipToMainContent'));

  function closeMobileNav() {
    mobileOpen = false;
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && mobileOpen) closeMobileNav();
  }

  // 宿主常用 hash 路由，不能让跳转链接把 #main 当成一次路由跳转。
  function focusMain(event: MouseEvent) {
    const target = document.getElementById(mainId);
    if (!target) return;
    event.preventDefault();
    target.focus();
    target.scrollIntoView?.({ block: 'start' });
  }
</script>

<svelte:window onkeydown={onKeydown} />

<a class="svadmin-app-shell__skip" href="#{mainId}" onclick={focusMain}>{resolvedSkipLabel}</a>

<div
  class={cn('svadmin-app-shell', className)}
  data-sidebar={sidebar ? 'true' : undefined}
  data-aside={aside ? 'true' : undefined}
  data-collapsed={collapsed ? 'true' : undefined}
  data-mobile-open={mobileOpen ? 'true' : undefined}
  data-width={width}
>
  <header class="svadmin-app-shell__topbar" data-slot="app-shell-topbar">
    {#if sidebar}
      <button
        type="button"
        class="svadmin-app-shell__mobile-toggle"
        data-slot="app-shell-mobile-toggle"
        aria-controls={sidebarId}
        aria-expanded={mobileOpen ? 'true' : 'false'}
        aria-label={mobileOpen ? i18n.t('common.close') : i18n.t('common.menu')}
        onclick={() => (mobileOpen = !mobileOpen)}
      >
        {#if mobileOpen}
          <X aria-hidden="true" size={18} />
        {:else}
          <Menu aria-hidden="true" size={18} />
        {/if}
      </button>
    {/if}
    {#if topbarStart}
      <div class="svadmin-app-shell__topbar-start">{@render topbarStart()}</div>
    {/if}
    <div class="svadmin-app-shell__topbar-main">{@render topbar?.()}</div>
    {#if topbarEnd}
      <div class="svadmin-app-shell__topbar-end">{@render topbarEnd()}</div>
    {/if}
  </header>

  {#if sidebar}
    <nav id={sidebarId} class="svadmin-app-shell__sidebar" aria-label={resolvedLabel} data-slot="app-shell-sidebar">
      <div class="svadmin-app-shell__sidebar-inner">{@render sidebar()}</div>
    </nav>
    <button
      type="button"
      class="svadmin-app-shell__scrim"
      tabindex="-1"
      aria-hidden="true"
      data-slot="app-shell-scrim"
      onclick={closeMobileNav}
    ></button>
  {/if}

  <main id={mainId} class="svadmin-app-shell__main" tabindex="-1">
    <div class="svadmin-app-shell__body" data-slot="app-shell-body">
      <div class="svadmin-app-shell__content" data-slot="app-shell-content">
        {@render children()}
      </div>
      {#if aside}
        <aside class="svadmin-app-shell__aside" data-slot="app-shell-aside">{@render aside()}</aside>
      {/if}
    </div>
  </main>

  {#if footer}
    <footer class="svadmin-app-shell__footer" data-slot="app-shell-footer">{@render footer()}</footer>
  {/if}
</div>

<style>
  /* Layout-only overrides. Sizes, colors and radii stay in app-shell.css so a
   * host override of the token layer reaches this component too. */
  .svadmin-app-shell__mobile-toggle {
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    height: var(--svadmin-control-h);
    width: var(--svadmin-control-h);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--background);
    color: var(--foreground);
    cursor: pointer;
  }
  .svadmin-app-shell__mobile-toggle:hover {
    background: var(--muted);
  }
  .svadmin-app-shell__mobile-toggle:focus-visible {
    outline: var(--svadmin-focus-width) solid var(--ring);
    outline-offset: var(--svadmin-focus-offset);
  }
  .svadmin-app-shell__main:focus-visible {
    outline: none;
  }
</style>
