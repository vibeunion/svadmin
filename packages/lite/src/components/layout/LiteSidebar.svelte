<script lang="ts">
  import type { ResourceDefinition, MenuItem } from '@svadmin/core';
  import { filterVisibleMenu, filterVisibleResources } from '../../menu-visibility';
  import LiteMenuList from './LiteMenuList.svelte';

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
</script>

<nav class="lite-sidebar">
  <div class="lite-sidebar-brand">{brandName}</div>
  {#if hasCustomMenu}
    <LiteMenuList items={visibleMenu} {basePath} {currentResource} />
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
