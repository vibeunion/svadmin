<script lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
  import { Moon, Sun, Search, MonitorUp } from '@lucide/svelte';
  import { Button } from './ui/button';
  import TooltipButton from './TooltipButton.svelte';
  import { getResolvedTheme, toggleTheme } from '@svadmin/core';
  import Breadcrumbs from './Breadcrumbs.svelte';
  import { useTranslation } from '@svadmin/core/i18n';

  import { getComponentRegistry } from '../component-registry.svelte.js';

  const i18n = useTranslation();

  let {
    showThemeToggle = false,
    showBreadcrumbs = true,
    showSearch = true,
    onSearchClick,
    children,
    /** Slot for additional actions on the right side of the header */
    rightActions,
    siteUrl,
  } = $props<{
    showThemeToggle?: boolean;
    showBreadcrumbs?: boolean;
    showSearch?: boolean;
    onSearchClick?: () => void;
    children?: import('svelte').Snippet;
    rightActions?: import('svelte').Snippet;
    siteUrl?: string;
  }>();

  // Retrieve optional component overrides from registry
  const registry = getComponentRegistry() || {} as any;
  const CustomBreadcrumbs = registry.Breadcrumbs;
  const CustomThemeToggle = registry.ThemeToggle;
  const CustomUserMenu = registry.UserMenu;
  const CustomNotificationPanel = registry.NotificationPanel;
</script>

<header class="svadmin-header sticky top-0 z-30 flex w-full shrink-0 items-center justify-between border-b px-3 sm:px-4">
  <div class="flex items-center gap-4">
    {#if children}
      {@render children()}
    {/if}
    {#if showBreadcrumbs}
      {#if CustomBreadcrumbs}
        <CustomBreadcrumbs />
      {:else}
        <Breadcrumbs />
      {/if}
    {/if}
  </div>
  <div class="ml-auto flex items-center gap-2">
    {#if rightActions}
      {@render rightActions()}
    {/if}

    {#if siteUrl}
      <TooltipButton tooltip={i18n.t('common.goToSite') || 'Site'} href={siteUrl} target="_blank" rel="noopener noreferrer" class="rounded-full flex items-center justify-center">
        <MonitorUp class="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
      </TooltipButton>
    {/if}

    {#if CustomNotificationPanel}
      <CustomNotificationPanel />
    {/if}

    {#if showSearch && onSearchClick}
      <Button variant="outline" size="sm" onclick={onSearchClick} class="h-8 gap-2 rounded-md border-border/70 px-2.5 text-muted-foreground">
        <Search class="h-3.5 w-3.5" />
        <span class="hidden sm:inline text-xs">{i18n.t('common.search')}...</span>
        <kbd class="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium font-mono text-muted-foreground">
          <span class="text-xs">⌘</span>K
        </kbd>
      </Button>
    {/if}
    
    {#if showThemeToggle}
      {#if CustomThemeToggle}
        <CustomThemeToggle />
      {:else}
        <TooltipButton tooltip={i18n.t('common.toggleTheme')} onclick={() => toggleTheme()} class="rounded-full">
          {#if getResolvedTheme() === 'dark'}
            <Moon class="h-4 w-4 transition-all" />
          {:else}
            <Sun class="h-4 w-4 transition-all" />
          {/if}
        </TooltipButton>
      {/if}
    {/if}

    {#if CustomUserMenu}
      <CustomUserMenu />
    {/if}
  </div>
</header>
