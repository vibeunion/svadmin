<script lang="ts">
  /**
   * LiteLayout — Minimal server-rendered sidebar + main layout.
   * No client-side JS required. Supports multi-level menus via native HTML.
   */
  import type { ResourceDefinition, MenuItem } from '@svadmin/core';
  import type { Snippet } from 'svelte';
  import { filterVisibleMenu, filterVisibleResources } from '../menu-visibility';

  interface Props {
    resources: ResourceDefinition[];
    currentResource?: string;
    brandName?: string;
    userName?: string;
    basePath?: string;
    /** Optional multi-level menu configuration */
    menu?: MenuItem[];
    /** Optional server-computed permission check for menu metadata. */
    canAccess?: (resource: string, action: string) => boolean;
    children: Snippet;
  }

  let {
    resources,
    currentResource = '',
    brandName = 'Admin',
    userName = '',
    basePath = '/lite',
    menu,
    canAccess,
    children,
  }: Props = $props();

  const menuResources = $derived(filterVisibleResources(resources, canAccess));

  const hasCustomMenu = $derived(menu !== undefined);
  const visibleMenu = $derived(menu ? filterVisibleMenu(menu, canAccess) : []);

  const mobileItems = $derived.by(() => {
    if (!hasCustomMenu) {
      return menuResources.map((resource): MenuItem => ({
        name: resource.name,
        label: resource.label,
        href: `${basePath}/${resource.name}`,
      }));
    }

    const result: MenuItem[] = [];
    const visit = (items: MenuItem[]) => {
      for (const item of items) {
        if (item.href || !item.children?.length) result.push(item);
        if (item.children?.length) visit(item.children);
      }
    };
    visit(visibleMenu);
    return result;
  });

  function isActive(href: string | undefined): boolean {
    if (!href) return false;
    return currentResource === href.replace(basePath + '/', '');
  }
</script>

<div class="lite-wrapper">
  <!-- Sidebar -->
  <nav class="lite-sidebar">
    <div class="lite-sidebar-brand">{brandName}</div>
    {#if hasCustomMenu}
      {#each visibleMenu as item, _i (_i)}
        {#if item.children && item.children.length > 0}
          <details class="lite-menu-group">
            <summary class="lite-menu-parent">{item.label ?? item.name}</summary>
            {#each item.children as child, _i (_i)}
              {#if child.children && child.children.length > 0}
                <details class="lite-menu-group" style="margin-left:12px">
                  <summary class="lite-menu-parent">{child.label ?? child.name}</summary>
                  {#each child.children as grandchild, _i (_i)}
                    <a
                      href={grandchild.href ?? `${basePath}/${grandchild.name}`}
                      class={isActive(grandchild.href ?? `${basePath}/${grandchild.name}`) ? 'active' : ''}
                      target={grandchild.target === '_blank' ? '_blank' : undefined}
                      style="padding-left:40px"
                    >{grandchild.label ?? grandchild.name}</a>
                  {/each}
                </details>
              {:else}
                <a
                  href={child.href ?? `${basePath}/${child.name}`}
                  class={isActive(child.href ?? `${basePath}/${child.name}`) ? 'active' : ''}
                  target={child.target === '_blank' ? '_blank' : undefined}
                  style="padding-left:28px"
                >{child.label ?? child.name}</a>
              {/if}
            {/each}
          </details>
        {:else}
          <a
            href={item.href ?? `${basePath}/${item.name}`}
            class={isActive(item.href ?? `${basePath}/${item.name}`) ? 'active' : ''}
            target={item.target === '_blank' ? '_blank' : undefined}
          >{item.label ?? item.name}</a>
        {/if}
      {/each}
    {:else}
      {#each menuResources as res, _i (_i)}
        <a
          href={`${basePath}/${res.name}`}
          class={res.name === currentResource ? 'active' : ''}
        >
          {res.label}
        </a>
      {/each}
    {/if}
    {#if userName}
      <div style="position:absolute;bottom:0;left:0;right:0;padding:12px 16px;border-top:1px solid #334155;font-size:12px;color:#94a3b8;">
        {userName}
        <form method="POST" action={`${basePath}/login?/logout`} style="display:inline;margin-left:8px;">
          <button type="submit" class="lite-btn lite-btn-sm" style="color:#94a3b8;border-color:#475569;background:transparent;">Logout</button>
        </form>
      </div>
    {/if}
  </nav>

  <nav class="lite-mobile-nav" aria-label="Mobile navigation">
    <details>
      <summary>{brandName}</summary>
      <div class="lite-mobile-nav-links">
        {#each mobileItems as item (item.name)}
          <a
            href={item.href ?? `${basePath}/${item.name}`}
            class={isActive(item.href ?? `${basePath}/${item.name}`) ? 'active' : ''}
            target={item.target === '_blank' ? '_blank' : undefined}
          >{item.label ?? item.name}</a>
        {/each}
        {#if userName}
          <div class="lite-mobile-user">
            <span>{userName}</span>
            <form method="POST" action={`${basePath}/login?/logout`}>
              <button type="submit" class="lite-btn lite-btn-sm">Logout</button>
            </form>
          </div>
        {/if}
      </div>
    </details>
  </nav>

  <!-- Main Content -->
  <main class="lite-main">
    {@render children()}
  </main>
</div>
