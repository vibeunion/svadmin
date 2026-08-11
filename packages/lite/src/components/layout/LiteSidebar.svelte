<script lang="ts">
  import type { ResourceDefinition, MenuItem } from '@svadmin/core';
  import { filterVisibleMenu, filterVisibleResources } from '../../menu-visibility';

  interface Props {
    resources: ResourceDefinition[];
    currentResource?: string;
    brandName?: string;
    userName?: string;
    basePath?: string;
    menu?: MenuItem[];
    canAccess?: (resource: string, action: string) => boolean;
  }

  let {
    resources,
    currentResource = '',
    brandName = 'Admin',
    userName = '',
    basePath = '/lite',
    menu,
    canAccess,
  }: Props = $props();

  const menuResources = $derived(filterVisibleResources(resources, canAccess));

  const hasCustomMenu = $derived(menu !== undefined);
  const visibleMenu = $derived(menu ? filterVisibleMenu(menu, canAccess) : []);

  function isActive(href: string | undefined): boolean {
    if (!href) return false;
    return currentResource === href.replace(basePath + '/', '');
  }

  function hasActiveChild(children?: MenuItem[]): boolean {
    if (!children) return false;
    return children.some(c => isActive(c.href ?? `${basePath}/${c.name}`));
  }
</script>

<nav class="lite-sidebar">
  <div class="lite-sidebar-brand">{brandName}</div>
  {#if hasCustomMenu}
    {#each visibleMenu as item, _i (_i)}
      {#if item.children && item.children.length > 0}
        <details class="lite-menu-group" open={hasActiveChild(item.children)}>
          <summary class="lite-menu-parent">{item.label ?? item.name}</summary>
          {#each item.children as child, _i (_i)}
            {#if child.children && child.children.length > 0}
              <details class="lite-menu-group" style="margin-left:12px" open={hasActiveChild(child.children)}>
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
        {res.label ?? res.name}
      </a>
    {/each}
  {/if}
  {#if userName}
    <div style="position:absolute;bottom:0;left:0;right:0;padding:12px 16px;border-top:1px solid #334155;font-size:12px;color:#94a3b8;">
      {userName}
      <form method="POST" action={`${basePath}/login?/logout`} style="display:inline;margin-left:8px;">
        <button type="submit" class="lite-btn lite-btn-sm" style="color:#94a3b8;border-color:#475569;background:transparent;padding:2px 8px;">Logout</button>
      </form>
    </div>
  {/if}
</nav>
