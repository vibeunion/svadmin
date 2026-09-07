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
    <div class="svadmin-u-eccd13ef4f2f svadmin-u-71a0a94437c6">
      <Collapsible.Root bind:open={isOpen}>
        <Collapsible.Trigger
          class="sidebar-menu-item svadmin-u-60fbb7713999 svadmin-u-6da6a3c3f741 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-421ac2be5045 svadmin-u-01cc1873771f svadmin-u-a14daebf7748 svadmin-u-2689f3958069 svadmin-u-ceb69a6b0e5f svadmin-u-233c0494b485
          {childActive
            ? 'svadmin-u-a7a63217e098'
            : 'svadmin-u-4e5ca9623e22 svadmin-u-646e10356266'}"
          style="padding-left: {indentPx}px; padding-right: 10px"
        >
          <span class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-7e9a2a250cc3">
            <Icon class="svadmin-u-86171d20618e svadmin-u-10d7a2feb011 svadmin-u-2074a75bf2e7 {childActive ? 'svadmin-u-20aaf08a7ed1' : 'svadmin-u-68d55a736ff4'}" />
            <span>{label}</span>
          </span>
          <ChevronDown class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-3e3534b4c5df svadmin-u-eadef238231e svadmin-u-625a4c3fbeb2 {isOpen ? 'svadmin-u-3350916b3513' : ''}" />
        </Collapsible.Trigger>
        <Collapsible.Content>
          <div class="svadmin-u-d89972fe17d6 svadmin-u-0a88129d55fd">
            <div class="svadmin-u-da4dbfbc4fdc svadmin-u-45c5dd0869c8 svadmin-u-2167406b24d7 svadmin-u-189f036c335c svadmin-u-47a69140380e svadmin-u-29f553b60628"></div>
            <div class="svadmin-u-cfa4ce4bdcbd">
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
        class="sidebar-menu-item svadmin-u-60fbb7713999 svadmin-u-6da6a3c3f741 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-421ac2be5045 svadmin-u-a139beb4e318 svadmin-u-a14daebf7748 svadmin-u-8ecebc9f80e6 svadmin-u-ceb69a6b0e5f svadmin-u-233c0494b485
        {childActive
          ? 'svadmin-u-20aaf08a7ed1 svadmin-u-2689f3958069'
          : 'svadmin-u-98714a2f7d41 svadmin-u-646e10356266'}"
        style="padding-left: {indentPx}px; padding-right: 10px"
      >
        <span class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-7e9a2a250cc3">
          <Circle class="svadmin-u-6e718d5684c2 svadmin-u-28ab41ff3b38 svadmin-u-2074a75bf2e7 {childActive ? 'svadmin-u-fed9c9b1e894 svadmin-u-20aaf08a7ed1' : 'svadmin-u-da619aaefdf6 svadmin-u-8a1efe654daa'}" />
          <span>{label}</span>
        </span>
        <ChevronDown class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-711a3789b7a6 svadmin-u-eadef238231e svadmin-u-625a4c3fbeb2 {isOpen ? 'svadmin-u-3350916b3513' : ''}" />
      </Collapsible.Trigger>
      <Collapsible.Content>
        <div class="svadmin-u-cfa4ce4bdcbd svadmin-u-75be195e1cd6">
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
          class="sidebar-menu-item svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-d5eab218aa34 svadmin-u-01cc1873771f svadmin-u-ceb69a6b0e5f svadmin-u-233c0494b485
          {active
            ? 'sidebar-menu-item-active svadmin-u-707e8e52f284 svadmin-u-20aaf08a7ed1'
            : 'svadmin-u-68d55a736ff4 svadmin-u-55d1f8b9d318 svadmin-u-646e10356266'}"
        >
          <Icon class="svadmin-u-86171d20618e svadmin-u-10d7a2feb011 svadmin-u-2074a75bf2e7" />
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
      class="sidebar-menu-item svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-7e9a2a250cc3 svadmin-u-421ac2be5045 svadmin-u-01cc1873771f svadmin-u-a14daebf7748 svadmin-u-2689f3958069 svadmin-u-ceb69a6b0e5f svadmin-u-233c0494b485
      {active
        ? 'sidebar-menu-item-active svadmin-u-20aaf08a7ed1 svadmin-u-707e8e52f284'
        : 'svadmin-u-4e5ca9623e22 svadmin-u-646e10356266 svadmin-u-55d1f8b9d318'}"
      style="padding-left: {indentPx}px; padding-right: 10px"
    >
      <Icon class="svadmin-u-86171d20618e svadmin-u-10d7a2feb011 svadmin-u-2074a75bf2e7 {active ? 'svadmin-u-20aaf08a7ed1' : 'svadmin-u-68d55a736ff4'}" />
      <span class="svadmin-u-36e579c0b41c">{label}</span>
      {#if soon}
        <Badge variant="secondary" class="svadmin-u-86171d20618e svadmin-u-45d828117213 svadmin-u-1dc571a3609f svadmin-u-2689f3958069">Soon</Badge>
      {/if}
      {#if isExternal}
        <ExternalLink class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-2a2db4667b27" />
      {/if}
    </a>
  {:else}
    <a
      href={finalHref}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      class="sidebar-menu-item svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-7e9a2a250cc3 svadmin-u-421ac2be5045 svadmin-u-a139beb4e318 svadmin-u-a14daebf7748 svadmin-u-8ecebc9f80e6 svadmin-u-ceb69a6b0e5f svadmin-u-233c0494b485
      {active
        ? 'sidebar-menu-item-active svadmin-u-20aaf08a7ed1 svadmin-u-2689f3958069'
        : 'svadmin-u-98714a2f7d41 svadmin-u-646e10356266'}"
      style="padding-left: {indentPx}px; padding-right: 10px"
    >
      <Circle class="svadmin-u-6e718d5684c2 svadmin-u-28ab41ff3b38 svadmin-u-2074a75bf2e7 {active ? 'svadmin-u-fed9c9b1e894 svadmin-u-20aaf08a7ed1' : 'svadmin-u-da619aaefdf6 svadmin-u-8a1efe654daa'}" />
      <span class="svadmin-u-36e579c0b41c">{label}</span>
      {#if soon}
        <Badge variant="secondary" class="svadmin-u-86171d20618e svadmin-u-45d828117213 svadmin-u-1dc571a3609f svadmin-u-2689f3958069">Soon</Badge>
      {/if}
      {#if isExternal}
        <ExternalLink class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-2a2db4667b27" />
      {/if}
    </a>
  {/if}
{/if}
