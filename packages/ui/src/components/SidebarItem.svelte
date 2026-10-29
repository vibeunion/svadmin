<script lang="ts">
  import { captureAdminContext, type MenuItem } from '@svadmin/core';
  import * as Collapsible from './ui/collapsible/index.js';
  import * as Tooltip from './ui/tooltip/index.js';
  import { Badge } from './ui/badge/index.js';
  import SidebarItem from './SidebarItem.svelte';
  import {
    LayoutDashboard, FileText, Users, Settings, Home,
    ChevronDown, Folder, ExternalLink, Repeat, ClipboardCheck, SlidersHorizontal, AlertTriangle,
    Mail, Map as MapIcon, MessageSquare, Send, ShoppingBag, Star, Briefcase, Building2, Calendar, Bell, Clock, Tag, Trash2, Palette, Layout,
    Download, ListTodo, TrendingUp, Sparkles, Images, Bot, Key, KeyRound, CreditCard, BookOpen, Wrench, Shield,
    Circle,
  } from '@lucide/svelte';


  let { item, currentPath, collapsed = false, depth = 0 }: {
    item: MenuItem;
    currentPath: string;
    collapsed?: boolean;
    depth?: number;
  } = $props();
  const adminContext = captureAdminContext();

  const iconMap: Record<string, typeof LayoutDashboard> = {
    dashboard: LayoutDashboard,
    posts: FileText,
    file: FileText,
    users: Users,
    settings: Settings,
    home: Home,
    folder: Folder,
    repeat: Repeat,
    'clipboard-check': ClipboardCheck,
    'sliders-horizontal': SlidersHorizontal,
    'alert-triangle': AlertTriangle,
    mail: Mail,
    map: MapIcon,
    'message-square': MessageSquare,
    send: Send,
    'shopping-bag': ShoppingBag,
    star: Star,
    briefcase: Briefcase,
    building: Building2,
    calendar: Calendar,
    bell: Bell,
    clock: Clock,
    tag: Tag,
    trash: Trash2,
    palette: Palette,
    layout: Layout,
    download: Download,
    'list-todo': ListTodo,
    'trending-up': TrendingUp,
    sparkles: Sparkles,
    images: Images,
    bot: Bot,
    key: Key,
    'key-round': KeyRound,
    'credit-card': CreditCard,
    'book-open': BookOpen,
    wrench: Wrench,
    shield: Shield,
  };

  function getIcon(name?: unknown): typeof LayoutDashboard {
    if (!name) return depth === 0 ? Settings : Circle;
    if (typeof name !== 'string') return name as typeof LayoutDashboard;
    return iconMap[name] ?? Settings;
  }

  function getLabel(mi: MenuItem): string {
    return mi.label ?? mi.name;
  }

  function isActive(itemHref: string | undefined): boolean {
    if (!itemHref) return false;
    const baseHref = itemHref.replace(/^#/, '').split(/[?#]/)[0] || '/';
    const baseCurrentPath = currentPath.replace(/^#/, '').split(/[?#]/)[0] || '/';
    if (baseHref === '/') return baseCurrentPath === '/';
    return baseCurrentPath.startsWith(baseHref) && (baseCurrentPath.length === baseHref.length || baseCurrentPath[baseHref.length] === '/');
  }

  function hasActiveChild(menuItem: MenuItem): boolean {
    if (isActive(menuItem.href)) return true;
    return menuItem.children?.some((c: MenuItem) => hasActiveChild(c)) ?? false;
  }

  const hasChildren = $derived(item.children && item.children.length > 0);
  const active = $derived(isActive(item.href));
  const childActive = $derived(hasActiveChild(item));
  const isExternal = $derived(item.target === '_blank' || item.href?.startsWith('http'));

  const finalHref = $derived(isExternal ? item.href : (item.href ? adminContext.formatLink(item.href) : undefined));

  let isOpen = $state(false);
  $effect(() => { if (childActive) isOpen = true; });

  const Icon = $derived(getIcon(item.icon));
  const label = $derived(getLabel(item));
  const soon = $derived(Boolean((item.meta as { soon?: boolean } | undefined)?.soon));

  const isTopLevel = $derived(depth === 0);
  const indentPx = $derived(isTopLevel ? 10 : 10 + depth * 16);
</script>

{#if item.meta?.hidden}
  <!-- hidden -->
{:else if hasChildren && !collapsed}
  {#if isTopLevel}
    <div class="mt-2 first:mt-0">
      <Collapsible.Root bind:open={isOpen}>
        <Collapsible.Trigger
          class="svadmin-collapsible-trigger sidebar-menu-item flex w-full items-center justify-between rounded-md py-[7px] text-[13px] font-medium transition-colors duration-150
          {childActive
            ? 'text-sidebar-foreground'
            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'}"
          style="padding-left: {indentPx}px; padding-right: 10px"
        >
          <span class="flex items-center gap-2.5">
            <Icon class="h-[18px] w-[18px] flex-shrink-0 {childActive ? 'text-primary' : 'text-sidebar-foreground/50'}" />
            <span>{label}</span>
          </span>
          <ChevronDown class="h-3.5 w-3.5 text-sidebar-foreground/40 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}" />
        </Collapsible.Trigger>
        <Collapsible.Content>
          <div class="relative mt-[2px]">
            <div class="absolute left-[19px] top-0 bottom-0 w-px bg-border/60"></div>
            <div class="space-y-[1px]">
              {#each item.children as child, _i (_i)}
                <SidebarItem item={child} {currentPath} {collapsed} depth={depth + 1} />
              {/each}
            </div>
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  {:else}
    <Collapsible.Root bind:open={isOpen}>
      <Collapsible.Trigger
        class="svadmin-collapsible-trigger sidebar-menu-item flex w-full items-center justify-between rounded-md py-[6px] text-[13px] font-normal transition-colors duration-150
        {childActive
          ? 'text-primary font-medium'
          : 'text-sidebar-foreground/65 hover:text-sidebar-foreground'}"
        style="padding-left: {indentPx}px; padding-right: 10px"
      >
        <span class="flex items-center gap-2.5">
          <Circle class="h-[5px] w-[5px] flex-shrink-0 {childActive ? 'fill-primary text-primary' : 'fill-sidebar-foreground/30 text-sidebar-foreground/30'}" />
          <span>{label}</span>
        </span>
        <ChevronDown class="h-3 w-3 text-sidebar-foreground/35 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}" />
      </Collapsible.Trigger>
      <Collapsible.Content>
        <div class="space-y-[1px] mt-[1px]">
          {#each item.children as child, _i (_i)}
            <SidebarItem item={child} {currentPath} {collapsed} depth={depth + 1} />
          {/each}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  {/if}
{:else if collapsed}
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props }: { props: Record<string, unknown> })}
        <a
          {...props}
          href={finalHref}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          class="sidebar-menu-item flex items-center justify-center rounded-md px-2 py-[7px] transition-colors duration-150
          {active
            ? 'sidebar-menu-item-active bg-sidebar-accent text-primary'
            : 'text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}"
        >
          <Icon class="h-[18px] w-[18px] flex-shrink-0" />
        </a>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content side="right">
      {label}
    </Tooltip.Content>
  </Tooltip.Root>
{:else}
  {#if isTopLevel}
    <a
      href={finalHref}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      class="sidebar-menu-item flex items-center gap-2.5 rounded-md py-[7px] text-[13px] font-medium transition-colors duration-150
      {active
        ? 'sidebar-menu-item-active text-primary bg-sidebar-accent'
        : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}"
      style="padding-left: {indentPx}px; padding-right: 10px"
    >
      <Icon class="h-[18px] w-[18px] flex-shrink-0 {active ? 'text-primary' : 'text-sidebar-foreground/50'}" />
      <span class="flex-1">{label}</span>
      {#if soon}
        <Badge variant="secondary" class="h-[18px] px-1.5 text-[10px] font-medium">Soon</Badge>
      {/if}
      {#if isExternal}
        <ExternalLink class="h-3 w-3 opacity-40" />
      {/if}
    </a>
  {:else}
    <a
      href={finalHref}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      class="sidebar-menu-item flex items-center gap-2.5 rounded-md py-[6px] text-[13px] font-normal transition-colors duration-150
      {active
        ? 'sidebar-menu-item-active text-primary font-medium'
        : 'text-sidebar-foreground/65 hover:text-sidebar-foreground'}"
      style="padding-left: {indentPx}px; padding-right: 10px"
    >
      <Circle class="h-[5px] w-[5px] flex-shrink-0 {active ? 'fill-primary text-primary' : 'fill-sidebar-foreground/30 text-sidebar-foreground/30'}" />
      <span class="flex-1">{label}</span>
      {#if soon}
        <Badge variant="secondary" class="h-[18px] px-1.5 text-[10px] font-medium">Soon</Badge>
      {/if}
      {#if isExternal}
        <ExternalLink class="h-3 w-3 opacity-40" />
      {/if}
    </a>
  {/if}
{/if}
