<script lang="ts">
  import { Moon, Sun, Search, MonitorUp } from '@lucide/svelte';
  import { Button } from './ui/button';
  import TooltipButton from './TooltipButton.svelte';
  import { getResolvedTheme, toggleTheme, type MenuItem } from '@svadmin/core';
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
    menu,
  } = $props<{
    showThemeToggle?: boolean;
    showBreadcrumbs?: boolean;
    showSearch?: boolean;
    onSearchClick?: () => void;
    children?: import('svelte').Snippet;
    rightActions?: import('svelte').Snippet;
    siteUrl?: string;
    menu?: MenuItem[];
  }>();

  // Retrieve optional component overrides from registry
  const registry = getComponentRegistry();
  const CustomBreadcrumbs = registry?.Breadcrumbs;
  const CustomThemeToggle = registry?.ThemeToggle;
  const CustomUserMenu = registry?.UserMenu;
  const CustomNotificationPanel = registry?.NotificationPanel;
</script>

<header class="svadmin-u-3e0fd166d494 svadmin-u-2167406b24d7 svadmin-u-0f2fff0ae96e svadmin-u-60fbb7713999 svadmin-u-07017cde3e97 svadmin-u-6da6a3c3f741 svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-65fdbade2025 svadmin-u-6ee2d41e2d2d svadmin-u-16d6f96aa157 svadmin-u-1ca6dd1e47c4 svadmin-u-f0faeb26d656 svadmin-u-8a3831239aa5">
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-0c3bc98565dd">
    {#if children}
      {@render children()}
    {/if}
    {#if showBreadcrumbs}
      {#if CustomBreadcrumbs}
        <CustomBreadcrumbs />
      {:else}
        <Breadcrumbs {menu} />
      {/if}
    {/if}
  </div>
  <div class="svadmin-u-fb56d9cff341 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
    {#if rightActions}
      {@render rightActions()}
    {/if}

    {#if siteUrl}
      <TooltipButton tooltip={i18n.t('common.goToSite') || 'Site'} href={siteUrl} target="_blank" rel="noopener noreferrer" class="svadmin-u-ac204c108886 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227">
        <MonitorUp class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748 svadmin-u-ceb69a6b0e5f svadmin-u-ea7b2e9e070e" />
      </TooltipButton>
    {/if}

    {#if CustomNotificationPanel}
      <CustomNotificationPanel />
    {/if}

    {#if showSearch && onSearchClick}
      <Button variant="outline" size="sm" onclick={onSearchClick} class="svadmin-u-77a2a20e90d4 svadmin-u-bfa603190748 svadmin-u-e7a768f922d2 svadmin-u-0e17f2bd9074 svadmin-u-5f22e64f2282 svadmin-u-05faf5c801ff">
        <Search class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
        <span class="svadmin-u-99d72c7fc3e2 svadmin-u-ee3c1259a368 svadmin-u-359090c2d529">{i18n.t('common.search')}</span>
        <kbd class="svadmin-u-99d72c7fc3e2 svadmin-u-e3fd07f96126 svadmin-u-3960ffc248d9 svadmin-u-a3899220f90e svadmin-u-07389a777c1f svadmin-u-ca6bcd4b6f3f svadmin-u-706701550477 svadmin-u-45d828117213 svadmin-u-465609a240a8 svadmin-u-1dc571a3609f svadmin-u-2689f3958069 svadmin-u-0e65706bcccd svadmin-u-bfa603190748">
          <span class="svadmin-u-359090c2d529">⌘</span>K
        </kbd>
      </Button>
    {/if}
    
    {#if showThemeToggle}
      {#if CustomThemeToggle}
        <CustomThemeToggle />
      {:else}
        <TooltipButton tooltip={i18n.t('common.toggleTheme')} onclick={() => toggleTheme()} class="svadmin-u-ac204c108886">
          {#if getResolvedTheme() === 'dark'}
            <Moon class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-0fe7d7d814d0" />
          {:else}
            <Sun class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-0fe7d7d814d0" />
          {/if}
        </TooltipButton>
      {/if}
    {/if}

    {#if CustomUserMenu}
      <CustomUserMenu />
    {/if}
  </div>
</header>
