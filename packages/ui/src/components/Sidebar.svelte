<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

  import { captureAdminContext } from '@svadmin/core';
  import type { AccessControlProvider, Action, Identity, MenuItem } from '@svadmin/core';
  import { getPath } from '../router-state.svelte.js';
  import { useTranslation } from '@svadmin/core/i18n';

  import { toggleTheme, getResolvedTheme, getColorThemes, getColorTheme, setColorTheme } from '@svadmin/core';
  import { Button } from './ui/button/index.js';
  import TooltipButton from './TooltipButton.svelte';
  import * as Tooltip from './ui/tooltip/index.js';
  import SidebarItem from './SidebarItem.svelte';
  import SvadminLogo from './SvadminLogo.svelte';

  import { ScrollArea } from './ui/scroll-area/index.js';
  import * as Collapsible from './ui/collapsible/index.js';
  import { Avatar } from './ui/avatar/index.js';
  import {
    LayoutDashboard, FileText, Users, Settings, Home,
    ChevronLeft, ChevronRight, ChevronDown, LogOut, Sun, Moon, Palette,
    Image as ImageIcon, Layout, Folder, Type, Video,
    Download, ListTodo, TrendingUp, Sparkles, Images, Bot, Key, KeyRound, CreditCard, BookOpen, Wrench,
    Repeat, ClipboardCheck, SlidersHorizontal, AlertTriangle, Mail, Map as MapIcon, MessageSquare, Send, ShoppingBag, Star, Briefcase, Building2,
    Calendar, Bell, Clock, Tag, Trash2, Shield
  } from '@lucide/svelte';

  const i18n = useTranslation();

  let { collapsed, identity, title, onToggle, onLogout, menu, routeMode = 'auto' }: {
    collapsed: boolean;
    identity: Identity | null;
    title: string;
    onToggle: () => void;
    onLogout: () => void;
    menu?: MenuItem[];
    routeMode?: 'hash' | 'path' | 'auto';
  } = $props();
  const adminContext = captureAdminContext();
  const accessControlProvider = $derived(adminContext.accessControlProvider);

  const effectiveRouteMode = $derived(
    routeMode === 'auto'
      ? (typeof window !== 'undefined' && window.location.hash.startsWith('#/') ? 'hash' : 'path')
      : routeMode
  );

  function formatSidebarLink(path: string): string {
    if (adminContext.routerProvider) return adminContext.formatLink(path);
    return effectiveRouteMode === 'hash' ? `#${path}` : path;
  }

  const iconMap: Record<string, typeof LayoutDashboard> = {
    'dashboard': LayoutDashboard,
    'posts': FileText,
    'file': FileText,
    'users': Users,
    'settings': Settings,
    'home': Home,
    'palette': Palette,
    'image': ImageIcon,
    'layout': Layout,
    'folder': Folder,
    'type': Type,
    'video': Video,
    'download': Download,
    'list-todo': ListTodo,
    'trending-up': TrendingUp,
    'sparkles': Sparkles,
    'images': Images,
    'bot': Bot,
    'key': Key,
    'key-round': KeyRound,
    'credit-card': CreditCard,
    'book-open': BookOpen,
    'wrench': Wrench,
    'repeat': Repeat,
    'clipboard-check': ClipboardCheck,
    'sliders-horizontal': SlidersHorizontal,
    'alert-triangle': AlertTriangle,
    'mail': Mail,
    'map': MapIcon,
    'message-square': MessageSquare,
    'send': Send,
    'shopping-bag': ShoppingBag,
    'star': Star,
    'briefcase': Briefcase,
    'building': Building2,
    'calendar': Calendar,
    'bell': Bell,
    'clock': Clock,
    'tag': Tag,
    'trash': Trash2,
    'shield': Shield,
  };

  interface NavItem {
    path: string;
    label: string;
    Icon: typeof LayoutDashboard;
    group?: string;
  }

  interface NavGroup {
    name: string | null;
    items: NavItem[];
  }

  async function checkAccess(provider: AccessControlProvider | null, resource: string, action: Action): Promise<boolean> {
    if (!provider) return true;

    const result = await provider.can(definedOptions({
      resource,
      action,
      meta: adminContext.getProviderMeta(resource),
    }));
    return Array.isArray(result) ? (result[0]?.can ?? false) : result.can;
  }

  async function hasCustomMenuAccess(menuItem: MenuItem, provider: AccessControlProvider | null): Promise<boolean> {
    const resource = menuItem.meta?.resource;
    if (!resource) return true;

    try {
      return await checkAccess(provider, resource, menuItem.meta?.action ?? 'list');
    } catch {
      // Permission-provider failures must not expose protected navigation.
      return false;
    }
  }

  function isVisibleCustomMenuItem(candidate: MenuItem | null): candidate is MenuItem {
    return candidate !== null;
  }

  function snapshotCustomMenuItems(menuItems: MenuItem[]): MenuItem[] {
    return menuItems.map((menuItem) => (definedOptions({
      ...menuItem,
      meta: menuItem.meta ? { ...menuItem.meta } : undefined,
      children: menuItem.children ? snapshotCustomMenuItems(menuItem.children) : undefined,
    })));
  }

  async function visibleCustomMenuItem(menuItem: MenuItem, provider: AccessControlProvider | null): Promise<MenuItem | null> {
    if (menuItem.meta?.hidden || !await hasCustomMenuAccess(menuItem, provider)) return null;
    if (!menuItem.children) return menuItem;

    const children = await visibleCustomMenuItems(menuItem.children, provider);
    if (children.length === 0 && !menuItem.href) return null;
    return { ...menuItem, children };
  }

  async function visibleCustomMenuItems(menuItems: MenuItem[], provider: AccessControlProvider | null): Promise<MenuItem[]> {
    const filteredItems = await Promise.all(menuItems.map((menuItem) => visibleCustomMenuItem(menuItem, provider)));
    return filteredItems.filter(isVisibleCustomMenuItem);
  }

  let customMenuItems = $state.raw<MenuItem[]>([]);

  $effect(() => {
    const configuredMenu = menu?.length ? snapshotCustomMenuItems(menu) : [];
    const provider = accessControlProvider;
    customMenuItems = [];
    if (configuredMenu.length === 0) return;

    let cancelled = false;
    void visibleCustomMenuItems(configuredMenu, provider).then((visibleItems) => {
      if (!cancelled) customMenuItems = visibleItems;
    });

    return () => { cancelled = true; };
  });

  let navItems = $state.raw<NavItem[]>([]);

  $effect(() => {
    const homeLabel = i18n.t('common.home');
    const currentResources = adminContext.resources;
    const provider = accessControlProvider;
    let cancelled = false;

    Promise.all(currentResources.map(async (r) => {
      try {
        return { r, can: await checkAccess(provider, r.name, 'list') };
      } catch {
        return { r, can: false };
      }
    })).then(results => {
      if (cancelled) return;
      const items: NavItem[] = [{ path: '/', label: homeLabel, Icon: LayoutDashboard }];
      for (const { r, can } of results) {
        if (can) {
          items.push(definedOptions({
            path: `/${r.name}`,
            label: r.label,
            Icon: (typeof r.icon === 'string' ? iconMap[r.icon] : r.icon) ?? iconMap[r.name] ?? Settings,
            group: r.group,
          }));
        }
      }
      navItems = items;
    });

    return () => { cancelled = true; };
  });

  const LOCALE_STORAGE_KEY = 'svadmin-locale';

  function localeName(locale: string): string {
    if (locale === 'zh-CN') return '简体中文';
    if (locale === 'en') return 'English';
    return locale;
  }

  function selectLocale(locale: string): void {
    i18n.setLocale(locale);
    if (typeof window !== 'undefined') localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }

  $effect(() => {
    if (typeof window === 'undefined') return;
    const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (storedLocale && i18n.getAvailableLocales().includes(storedLocale)) {
      i18n.setLocale(storedLocale);
    }
  });

  const path = $derived(getPath());

  function isActive(itemPath: string): boolean {
    if (itemPath === '/') return path === '/';
    return path === itemPath || path.startsWith(itemPath + "/");
  }

  const navGroups = $derived.by((): NavGroup[] => {
    const groups: NavGroup[] = [];
    const groupMap = new Map<string | null, NavItem[]>();

    for (const item of navItems) {
      const key = item.group ?? null;
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
        groups.push({ name: key, items: groupMap.get(key) ?? [] });
      }
      (groupMap.get(key) ?? []).push(item);
    }

    return groups;
  });

  let openGroups = $state<Set<string>>(new Set());
  let colorPickerOpen = $state(false);
  let colorPickerRef = $state<HTMLDivElement | null>(null);
  let colorPickerOpenedAt = 0;

  let density = $state<'compact' | 'standard'>('standard');
  
  $effect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('svadmin-sidebar-density');
      if (stored === 'compact' || stored === 'standard') density = stored;
      
      const onDensityChange = (e: Event) => {
        const customEvent = e as CustomEvent<'compact' | 'standard'>;
        density = customEvent.detail;
      };
      window.addEventListener('svadmin-density-change', onDensityChange);
      return () => window.removeEventListener('svadmin-density-change', onDensityChange);
    }
  });

  const pyClass = $derived(density === 'compact' ? 'py-1' : 'py-[7px]');
  const pyClassGroupItem = $derived(density === 'compact' ? 'py-1' : 'py-[6px]');

  $effect(() => {
    if (!colorPickerOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (Date.now() - colorPickerOpenedAt < 200) return;
      if (colorPickerRef && !colorPickerRef.contains(e.target as Node)) {
        colorPickerOpen = false;
      }
    }
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  });
</script>

{#snippet languageMenu(collapsed: boolean)}
  <select
    aria-label={i18n.t('common.switchLanguage')}
    value={i18n.locale}
    onchange={(event) => selectLocale((event.target as HTMLSelectElement).value)}
    class={collapsed
      ? 'svadmin-u-ed8a5df7b2fb svadmin-u-23e1f628d033 svadmin-u-7e0b7cdf1a94 svadmin-u-c0980a65a70d appearance-none svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-d3aed606df1d svadmin-u-d8e0e382c67b svadmin-u-ca6bf63030aa svadmin-u-1dc571a3609f svadmin-u-e83a7042bc91 svadmin-u-4e5ca9623e22 svadmin-u-df37b1fd9495 svadmin-u-608dd26cd5ba svadmin-u-80b9d0ae125f'
      : 'svadmin-u-ed8a5df7b2fb svadmin-u-23e1f628d033 svadmin-u-7e0b7cdf1a94 svadmin-u-c0980a65a70d svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-d3aed606df1d svadmin-u-45d828117213 svadmin-u-d058ca6de60f svadmin-u-e83a7042bc91 svadmin-u-4e5ca9623e22 svadmin-u-df37b1fd9495 svadmin-u-608dd26cd5ba svadmin-u-80b9d0ae125f'}
  >
    {#each i18n.getAvailableLocales() as locale (locale)}
      <option value={locale}>{localeName(locale)}</option>
    {/each}
  </select>
{/snippet}



<aside
  data-svadmin-sidebar
  aria-label="Sidebar navigation"
  class="svadmin-u-7bc555991dba svadmin-u-5f89f14a26db svadmin-u-c78facc7a0a6 svadmin-u-0f2fff0ae96e svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d svadmin-u-0fe7d7d814d0 svadmin-u-7890552ecd63"
  style="background-color: var(--sidebar);"
  class:w-[252px]={!collapsed}
  class:w-[70px]={collapsed}
>
  <div class="svadmin-u-60fbb7713999 svadmin-u-07017cde3e97 svadmin-u-3960ffc248d9 svadmin-u-012fbd121f37" class:px-5={!collapsed} class:justify-center={collapsed}>
    {#if !collapsed}
      <a href={formatSidebarLink('/')} class="group svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-7e9a2a250cc3" onclick={(e) => { e.preventDefault(); adminContext.navigate('/'); }}>
        <SvadminLogo />
        <span class="svadmin-u-e83a7042bc91 svadmin-u-cff55289f8f2 svadmin-u-983fa003115f svadmin-u-a7a63217e098">{title}</span>
      </a>
    {:else}
      <a
        href={formatSidebarLink('/')}
        class="group"
        aria-label={title}
        onclick={(e) => { e.preventDefault(); adminContext.navigate('/'); }}
      >
        <SvadminLogo />
      </a>
    {/if}
  </div>

  <ScrollArea class="svadmin-u-36e579c0b41c sidebar-scroll">
  <nav aria-label="Main menu" class="svadmin-u-9fcd8a13827e" class:px-[10px]={!collapsed} class:px-2={collapsed}>
    {#if menu && menu.length > 0}
      <div class="svadmin-u-a26339f4b89e">
        {#each customMenuItems as item (item.name)}
          <SidebarItem {item} currentPath={path} {collapsed} depth={0} />
        {/each}
      </div>
    {:else}
    {#each navGroups as group, _i (_i)}
      {#if group.name && !collapsed}
        <Collapsible.Root open={openGroups.has(group.name)} onOpenChange={(isOpen) => {
          const next = new Set(openGroups);
          if (isOpen) next.add(group.name as string); else next.delete(group.name as string);
          openGroups = next;
        }}>
          <Collapsible.Trigger
            class="svadmin-u-60fbb7713999 svadmin-u-6da6a3c3f741 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-7597e11b4d4b svadmin-u-a139beb4e318 svadmin-u-0ab8667228fd svadmin-u-506a96403942 svadmin-u-b486a1ee45b0 svadmin-u-e83a7042bc91 svadmin-u-064e4b9e19c3 uppercase svadmin-u-5f1ff8fe8768 svadmin-u-71357b4a2f24 svadmin-u-ceb69a6b0e5f"
          >
            <span>{group.name}</span>
            <ChevronDown class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-eadef238231e svadmin-u-625a4c3fbeb2 {openGroups.has(group.name) ? 'svadmin-u-3350916b3513' : ''}" />
          </Collapsible.Trigger>
          <Collapsible.Content>
            <div class="svadmin-u-a26339f4b89e">
              {#each group.items as item, _i (_i)}
                {@const active = isActive(item.path)}
                <a
                  href={formatSidebarLink(item.path)}
                  onclick={(e) => { e.preventDefault(); adminContext.navigate(item.path); }}
                  class="sidebar-menu-item svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-7e9a2a250cc3 svadmin-u-421ac2be5045 svadmin-u-7597e11b4d4b {pyClassGroupItem} svadmin-u-a14daebf7748 svadmin-u-2689f3958069 svadmin-u-ceb69a6b0e5f svadmin-u-233c0494b485
                  {active
                    ? 'sidebar-menu-item-active svadmin-u-707e8e52f284 svadmin-u-20aaf08a7ed1'
                    : 'svadmin-u-4e5ca9623e22 svadmin-u-646e10356266 svadmin-u-55d1f8b9d318'}"
                >
                  <item.Icon class="svadmin-u-86171d20618e svadmin-u-10d7a2feb011 svadmin-u-2074a75bf2e7 {active ? 'svadmin-u-20aaf08a7ed1' : 'svadmin-u-68d55a736ff4'}" />
                  <span>{item.label}</span>
                </a>
              {/each}
            </div>
          </Collapsible.Content>
        </Collapsible.Root>
      {:else}
        {#each group.items as item, _i (_i)}
          {@const active = isActive(item.path)}
          {#if collapsed}
            <Tooltip.Root>
              <Tooltip.Trigger>
                {#snippet child({ props }: { props: Record<string, unknown> })}
                  <a
                    {...props}
                    href={formatSidebarLink(item.path)}
                    onclick={(e) => { e.preventDefault(); adminContext.navigate(item.path); }}
                    class="sidebar-menu-item svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-d5eab218aa34 {pyClass} svadmin-u-ceb69a6b0e5f svadmin-u-233c0494b485
                    {active
                      ? 'sidebar-menu-item-active svadmin-u-707e8e52f284 svadmin-u-20aaf08a7ed1'
                      : 'svadmin-u-68d55a736ff4 svadmin-u-55d1f8b9d318 svadmin-u-646e10356266'}"
                  >
                    <item.Icon class="svadmin-u-86171d20618e svadmin-u-10d7a2feb011 svadmin-u-2074a75bf2e7" />
                  </a>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content side="right">
                {item.label}
              </Tooltip.Content>
            </Tooltip.Root>
          {:else}
            <a
              href={formatSidebarLink(item.path)}
              onclick={(e) => { e.preventDefault(); adminContext.navigate(item.path); }}
              class="sidebar-menu-item svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-7e9a2a250cc3 svadmin-u-421ac2be5045 svadmin-u-7597e11b4d4b {pyClass} svadmin-u-a14daebf7748 svadmin-u-2689f3958069 svadmin-u-ceb69a6b0e5f svadmin-u-233c0494b485
              {active
                ? 'sidebar-menu-item-active svadmin-u-707e8e52f284 svadmin-u-20aaf08a7ed1'
                : 'svadmin-u-4e5ca9623e22 svadmin-u-55d1f8b9d318 svadmin-u-646e10356266'}"
            >
              <item.Icon class="svadmin-u-86171d20618e svadmin-u-10d7a2feb011 svadmin-u-2074a75bf2e7 {active ? 'svadmin-u-20aaf08a7ed1' : 'svadmin-u-68d55a736ff4'}" />
              <span>{item.label}</span>
            </a>
          {/if}
        {/each}
      {/if}
    {/each}
    {/if}
  </nav>
  </ScrollArea>

  <div class="svadmin-u-012fbd121f37 svadmin-u-b950dda299d3 svadmin-u-6ee2d41e2d2d">
    {#if !collapsed}
      <div class="svadmin-u-0e17f2bd9074 svadmin-u-ce335a8e4f56 svadmin-u-569eb16216dd">
        <div class="svadmin-u-d89972fe17d6" bind:this={colorPickerRef}>
          <button
            class="svadmin-u-60fbb7713999 svadmin-u-6da6a3c3f741 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-421ac2be5045 svadmin-u-d5eab218aa34 svadmin-u-ec0091ee009b svadmin-u-69cdf25ad1e4 svadmin-u-b4f9f7800899 svadmin-u-55d1f8b9d318 svadmin-u-646e10356266 svadmin-u-ceb69a6b0e5f"
            onclick={() => { if (!colorPickerOpen) colorPickerOpenedAt = Date.now(); colorPickerOpen = !colorPickerOpen; }}
          >
            <Palette class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            <span class="svadmin-u-36e579c0b41c svadmin-u-2eba0d65d059">{i18n.t('common.toggleTheme')}</span>
            <span
              class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-ac204c108886 svadmin-u-3daca9af0861 svadmin-u-823f000e740a svadmin-u-6f8ab8abb126"
              style="background-color: {getColorThemes().find(c => c.id === getColorTheme())?.color ?? '#6366f1'}; --tw-ring-color: {getColorThemes().find(c => c.id === getColorTheme())?.color ?? '#6366f1'}"
            ></span>
            <!-- The dot previews the user-selected runtime theme swatch; the hex
                 fallback only covers the case where no registered theme matches. -->
          </button>
          {#if colorPickerOpen}
            <div class="svadmin-u-da4dbfbc4fdc svadmin-u-3ee5df8c651f svadmin-u-c78facc7a0a6 svadmin-u-65281709dacf svadmin-u-181b286668b5 svadmin-u-84789e8a20cd svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-e541d86d1ec8 svadmin-u-eb6a3cef9686 svadmin-u-9b13e8ae5c9c svadmin-u-06bbb43166db svadmin-u-40137e897961 fade-in-0 zoom-in-95">
              {#each getColorThemes() as ct, _i (_i)}
                <button
                  class="svadmin-u-60fbb7713999 svadmin-u-6da6a3c3f741 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-421ac2be5045 svadmin-u-d5eab218aa34 svadmin-u-ec0091ee009b svadmin-u-fc7473ca09eb svadmin-u-0557b88819cd svadmin-u-3a99b2b8fbbe svadmin-u-ceb69a6b0e5f"
                  onclick={() => { setColorTheme(ct.id as typeof ct.id & import('@svadmin/core').ColorTheme); colorPickerOpen = false; }}
                >
                  <span
                    class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-ac204c108886 {getColorTheme() === ct.id ? 'svadmin-u-16b1efa5875e svadmin-u-823f000e740a svadmin-u-fecb6ec6cfa0' : 'svadmin-u-0c67ca474a69'}"
                    style="background-color: {ct.color}; {getColorTheme() === ct.id ? `--tw-ring-color: ${ct.color}` : ''}"
                  ></span>
                  <span class="svadmin-u-359090c2d529">{ct.label}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    {#if !collapsed && identity}
      <div class="svadmin-u-0e17f2bd9074 svadmin-u-7fcf9124b5df svadmin-u-6b7d6e21ccbd">
        <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-7e9a2a250cc3 svadmin-u-5f22e64f2282 svadmin-u-7660b450905a svadmin-u-ceb69a6b0e5f svadmin-u-ace81495deee svadmin-u-34516836730d">
          <Avatar
            src={(identity as Record<string, unknown>)['avatar'] as string | undefined}
            alt={identity.name ?? 'User'}
            fallback={identity.name?.charAt(0).toUpperCase() ?? 'U'}
            size="sm"
          />
          <div class="svadmin-u-36e579c0b41c svadmin-u-7e0b7cdf1a94">
            <p class="svadmin-u-f283ea9bea0e svadmin-u-a14daebf7748 svadmin-u-2689f3958069 svadmin-u-a7a63217e098">{identity.name}</p>
            <p class="svadmin-u-f283ea9bea0e svadmin-u-d058ca6de60f svadmin-u-5f1ff8fe8768">{((identity as Record<string, unknown>)['role'] || (identity as Record<string, unknown>)['roleName']) ?? 'User'}</p>          </div>
          <button
            class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-3e3534b4c5df svadmin-u-646e10356266 svadmin-u-0b48b877be2a svadmin-u-ceb69a6b0e5f"
            onclick={onLogout}
          >
            <LogOut class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
          </button>
        </div>
        <div class="svadmin-u-b6b02c0ebef6 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-d8e0e382c67b">
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-a3899220f90e">
            {@render languageMenu(false)}
            <TooltipButton tooltip={i18n.t('common.toggleTheme')} variant="ghost" size="icon-sm" onclick={toggleTheme} class="svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-421ac2be5045 svadmin-u-68d55a736ff4 svadmin-u-55d1f8b9d318 svadmin-u-646e10356266">
              {#if getResolvedTheme() === 'dark'}
                <Sun class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
              {:else}
                <Moon class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
              {/if}
            </TooltipButton>
            <TooltipButton tooltip={i18n.t('settings.title')} variant="ghost" size="icon-sm" onclick={() => adminContext.navigate('/settings')} class="svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-421ac2be5045 svadmin-u-68d55a736ff4 svadmin-u-55d1f8b9d318 svadmin-u-646e10356266">
              <Settings class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            </TooltipButton>
          </div>
          <TooltipButton tooltip={i18n.t('common.toggleSidebar')} variant="ghost" size="icon-sm" onclick={onToggle} class="svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-421ac2be5045 svadmin-u-68d55a736ff4 svadmin-u-55d1f8b9d318 svadmin-u-646e10356266">
            <ChevronLeft class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
          </TooltipButton>
        </div>
      </div>
    {:else if collapsed}
      <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-3960ffc248d9 svadmin-u-a3899220f90e svadmin-u-d8e0e382c67b svadmin-u-1b2d54a3fd12">
        {@render languageMenu(true)}
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props }: { props: Record<string, unknown> })}
              <Button {...props} variant="ghost" size="icon" onclick={toggleTheme} class="svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-421ac2be5045 svadmin-u-68d55a736ff4 svadmin-u-55d1f8b9d318 svadmin-u-646e10356266">
                {#if getResolvedTheme() === 'dark'}
                  <Sun class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
                {:else}
                  <Moon class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
                {/if}
              </Button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="right">{i18n.t('common.toggleTheme')}</Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props }: { props: Record<string, unknown> })}
              <Button {...props} variant="ghost" size="icon" onclick={onToggle} class="svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-421ac2be5045 svadmin-u-68d55a736ff4 svadmin-u-55d1f8b9d318 svadmin-u-646e10356266">
                <ChevronRight class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
              </Button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="right">{i18n.t('common.toggleSidebar')}</Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props }: { props: Record<string, unknown> })}
              <Button {...props} variant="ghost" size="icon" onclick={onLogout} class="svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-421ac2be5045 svadmin-u-68d55a736ff4 svadmin-u-55d1f8b9d318 svadmin-u-51e95020d6f2">
                <LogOut class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
              </Button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="right">{i18n.t('common.logout')}</Tooltip.Content>
        </Tooltip.Root>
      </div>
    {:else}
      <div class="svadmin-u-60fbb7713999 svadmin-u-86843cf1e227 svadmin-u-44ee8ba0a421 svadmin-u-eb6e8b881acd">
        {@render languageMenu(false)}
        <TooltipButton tooltip={i18n.t('common.toggleTheme')} variant="ghost" size="icon" onclick={toggleTheme} class="svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-421ac2be5045 svadmin-u-68d55a736ff4 svadmin-u-55d1f8b9d318 svadmin-u-646e10356266">
          {#if getResolvedTheme() === 'dark'}
            <Sun class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
          {:else}
            <Moon class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
          {/if}
        </TooltipButton>
      </div>
    {/if}
  </div>
</aside>
