<script lang="ts">
  import { captureAdminContext, getResources, canAccessAsync } from '@svadmin/core';
  import type { Identity, MenuItem } from '@svadmin/core';
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

  async function hasCustomMenuAccess(menuItem: MenuItem): Promise<boolean> {
    const resource = menuItem.meta?.resource;
    if (!resource) return true;

    try {
      const { can } = await canAccessAsync(resource, menuItem.meta?.action ?? 'list');
      return can;
    } catch {
      // Permission-provider failures must not expose protected navigation.
      return false;
    }
  }

  function isVisibleCustomMenuItem(candidate: MenuItem | null): candidate is MenuItem {
    return candidate !== null;
  }

  async function visibleCustomMenuItem(menuItem: MenuItem): Promise<MenuItem | null> {
    if (menuItem.meta?.hidden || !await hasCustomMenuAccess(menuItem)) return null;
    if (!menuItem.children) return menuItem;

    const children = await visibleCustomMenuItems(menuItem.children);
    if (children.length === 0 && !menuItem.href) return null;
    return { ...menuItem, children };
  }

  async function visibleCustomMenuItems(menuItems: MenuItem[]): Promise<MenuItem[]> {
    const filteredItems = await Promise.all(menuItems.map(visibleCustomMenuItem));
    return filteredItems.filter(isVisibleCustomMenuItem);
  }

  let customMenuItems = $state.raw<MenuItem[]>([]);

  $effect(() => {
    const configuredMenu = menu;
    customMenuItems = [];
    if (!configuredMenu?.length) return;

    let cancelled = false;
    void visibleCustomMenuItems(configuredMenu).then((visibleItems) => {
      if (!cancelled) customMenuItems = visibleItems;
    });

    return () => { cancelled = true; };
  });

  let navItems = $state.raw<NavItem[]>([]);

  $effect(() => {
    const homeLabel = i18n.t('common.home');
    const currentResources = getResources();
    let cancelled = false;

    Promise.all(currentResources.map(async (r) => {
      try {
        const { can } = await canAccessAsync(r.name, 'list');
        return { r, can };
      } catch {
        return { r, can: false };
      }
    })).then(results => {
      if (cancelled) return;
      const items: NavItem[] = [{ path: '/', label: homeLabel, Icon: LayoutDashboard }];
      for (const { r, can } of results) {
        if (can) {
          items.push({
            path: `/${r.name}`,
            label: r.label,
            Icon: (typeof r.icon === 'string' ? iconMap[r.icon] : r.icon) ?? iconMap[r.name] ?? Settings,
            group: r.group,
          });
        }
      }
      navItems = items;
    });

    return () => { cancelled = true; };
  });

  function toggleLocale() {
    const locales = i18n.getAvailableLocales();
    const current = i18n.locale;
    const idx = locales.indexOf(current);
    const next = locales[(idx + 1) % locales.length];
    i18n.setLocale(next);
  }

  const localeLabel = $derived(i18n.locale === 'zh-CN' ? '中' : 'EN');

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



<aside
  aria-label="Sidebar navigation"
  class="fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border/40 transition-all duration-300"
  style="background-color: var(--sidebar);"
  class:w-[252px]={!collapsed}
  class:w-[70px]={collapsed}
>
  <div class="flex h-[70px] items-center shrink-0" class:px-5={!collapsed} class:justify-center={collapsed}>
    {#if !collapsed}
      <a href={formatSidebarLink('/')} class="group flex items-center gap-2.5" onclick={(e) => { e.preventDefault(); adminContext.navigate('/'); }}>
        <SvadminLogo />
        <span class="font-semibold text-[15px] tracking-[-0.01em] text-sidebar-foreground">{title}</span>
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

  <ScrollArea class="flex-1 sidebar-scroll">
  <nav aria-label="Main menu" class="pb-4" class:px-[10px]={!collapsed} class:px-2={collapsed}>
    {#if menu && menu.length > 0}
      <div class="space-y-[2px]">
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
            class="flex w-full items-center justify-between px-[10px] py-[6px] mt-4 mb-[2px] text-[10.5px] font-semibold tracking-[0.06em] uppercase text-sidebar-foreground/45 hover:text-sidebar-foreground/70 transition-colors"
          >
            <span>{group.name}</span>
            <ChevronDown class="h-3 w-3 transition-transform duration-200 {openGroups.has(group.name) ? 'rotate-180' : ''}" />
          </Collapsible.Trigger>
          <Collapsible.Content>
            <div class="space-y-[2px]">
              {#each group.items as item, _i (_i)}
                {@const active = isActive(item.path)}
                <a
                  href={formatSidebarLink(item.path)}
                  onclick={(e) => { e.preventDefault(); adminContext.navigate(item.path); }}
                  class="sidebar-menu-item flex items-center gap-2.5 rounded-md px-[10px] {pyClassGroupItem} text-[13px] font-medium transition-colors duration-150
                  {active
                    ? 'sidebar-menu-item-active bg-sidebar-accent text-primary'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}"
                >
                  <item.Icon class="h-[18px] w-[18px] flex-shrink-0 {active ? 'text-primary' : 'text-sidebar-foreground/50'}" />
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
                    class="sidebar-menu-item flex items-center justify-center rounded-md px-2 {pyClass} transition-colors duration-150
                    {active
                      ? 'sidebar-menu-item-active bg-sidebar-accent text-primary'
                      : 'text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}"
                  >
                    <item.Icon class="h-[18px] w-[18px] flex-shrink-0" />
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
              class="sidebar-menu-item flex items-center gap-2.5 rounded-md px-[10px] {pyClass} text-[13px] font-medium transition-colors duration-150
              {active
                ? 'sidebar-menu-item-active bg-sidebar-accent text-primary'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}"
            >
              <item.Icon class="h-[18px] w-[18px] flex-shrink-0 {active ? 'text-primary' : 'text-sidebar-foreground/50'}" />
              <span>{item.label}</span>
            </a>
          {/if}
        {/each}
      {/if}
    {/each}
    {/if}
  </nav>
  </ScrollArea>

  <div class="shrink-0 border-t border-border/40">
    {#if !collapsed}
      <div class="px-3 pt-3 pb-1">
        <div class="relative" bind:this={colorPickerRef}>
          <button
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
            onclick={() => { if (!colorPickerOpen) colorPickerOpenedAt = Date.now(); colorPickerOpen = !colorPickerOpen; }}
          >
            <Palette class="h-3.5 w-3.5" />
            <span class="flex-1 text-left">{i18n.t('common.toggleTheme')}</span>
            <span
              class="h-3 w-3 rounded-full ring-1 ring-offset-1 ring-offset-sidebar"
              style="background-color: {getColorThemes().find(c => c.id === getColorTheme())?.color ?? '#6366f1'}; --tw-ring-color: {getColorThemes().find(c => c.id === getColorTheme())?.color ?? '#6366f1'}"
            ></span>
          </button>
          {#if colorPickerOpen}
            <div class="absolute bottom-full left-0 mb-1 z-50 w-40 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95">
              {#each getColorThemes() as ct, _i (_i)}
                <button
                  class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  onclick={() => { setColorTheme(ct.id as typeof ct.id & import('@svadmin/core').ColorTheme); colorPickerOpen = false; }}
                >
                  <span
                    class="h-3 w-3 rounded-full {getColorTheme() === ct.id ? 'ring-2 ring-offset-1 scale-110' : 'opacity-70'}"
                    style="background-color: {ct.color}; {getColorTheme() === ct.id ? `--tw-ring-color: ${ct.color}` : ''}"
                  ></span>
                  <span class="text-xs">{ct.label}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    {#if !collapsed && identity}
      <div class="px-3 pb-3 pt-1">
        <div class="flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-sidebar-accent/40 cursor-pointer">
          <Avatar
            src={(identity as Record<string, unknown>).avatar as string | undefined}
            alt={identity.name ?? 'User'}
            fallback={identity.name?.charAt(0).toUpperCase() ?? 'U'}
            size="sm"
          />
          <div class="flex-1 min-w-0">
            <p class="truncate text-[13px] font-medium text-sidebar-foreground">{identity.name}</p>
            <p class="truncate text-[11px] text-sidebar-foreground/45">{((identity as Record<string, unknown>).role || (identity as Record<string, unknown>).roleName) ?? 'User'}</p>
          </div>
          <button
            class="h-7 w-7 flex items-center justify-center rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
            onclick={onLogout}
          >
            <LogOut class="h-3.5 w-3.5" />
          </button>
        </div>
        <div class="mt-1 flex items-center justify-between px-1">
          <div class="flex items-center gap-0.5">
            <TooltipButton tooltip={i18n.t('common.switchLanguage')} variant="ghost" size="icon-sm" onclick={toggleLocale} class="h-8 w-8 rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
              <span class="text-[11px] font-semibold">{localeLabel}</span>
            </TooltipButton>
            <TooltipButton tooltip={i18n.t('common.toggleTheme')} variant="ghost" size="icon-sm" onclick={toggleTheme} class="h-8 w-8 rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
              {#if getResolvedTheme() === 'dark'}
                <Sun class="h-3.5 w-3.5" />
              {:else}
                <Moon class="h-3.5 w-3.5" />
              {/if}
            </TooltipButton>
            <TooltipButton tooltip={i18n.t('settings.title')} variant="ghost" size="icon-sm" onclick={() => adminContext.navigate('/settings')} class="h-8 w-8 rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
              <Settings class="h-3.5 w-3.5" />
            </TooltipButton>
          </div>
          <TooltipButton tooltip={i18n.t('common.toggleSidebar')} variant="ghost" size="icon-sm" onclick={onToggle} class="h-8 w-8 rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
            <ChevronLeft class="h-3.5 w-3.5" />
          </TooltipButton>
        </div>
      </div>
    {:else if collapsed}
      <div class="flex flex-col items-center gap-0.5 px-2 py-3">
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props }: { props: Record<string, unknown> })}
              <Button {...props} variant="ghost" size="icon" onclick={toggleLocale} class="h-8 w-8 rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
                <span class="text-[11px] font-semibold">{localeLabel}</span>
              </Button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="right">{i18n.t('common.switchLanguage')}</Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props }: { props: Record<string, unknown> })}
              <Button {...props} variant="ghost" size="icon" onclick={toggleTheme} class="h-8 w-8 rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
                {#if getResolvedTheme() === 'dark'}
                  <Sun class="h-3.5 w-3.5" />
                {:else}
                  <Moon class="h-3.5 w-3.5" />
                {/if}
              </Button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="right">{i18n.t('common.toggleTheme')}</Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props }: { props: Record<string, unknown> })}
              <Button {...props} variant="ghost" size="icon" onclick={onToggle} class="h-8 w-8 rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
                <ChevronRight class="h-3.5 w-3.5" />
              </Button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="right">{i18n.t('common.toggleSidebar')}</Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props }: { props: Record<string, unknown> })}
              <Button {...props} variant="ghost" size="icon" onclick={onLogout} class="h-8 w-8 rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-destructive">
                <LogOut class="h-3.5 w-3.5" />
              </Button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="right">{i18n.t('common.logout')}</Tooltip.Content>
        </Tooltip.Root>
      </div>
    {:else}
      <div class="flex justify-center gap-1 p-3">
        <TooltipButton tooltip={i18n.t('common.switchLanguage')} variant="ghost" size="icon" onclick={toggleLocale} class="h-8 w-8 rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
          <span class="text-[11px] font-semibold">{localeLabel}</span>
        </TooltipButton>
        <TooltipButton tooltip={i18n.t('common.toggleTheme')} variant="ghost" size="icon" onclick={toggleTheme} class="h-8 w-8 rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
          {#if getResolvedTheme() === 'dark'}
            <Sun class="h-3.5 w-3.5" />
          {:else}
            <Moon class="h-3.5 w-3.5" />
          {/if}
        </TooltipButton>
      </div>
    {/if}
  </div>
</aside>
