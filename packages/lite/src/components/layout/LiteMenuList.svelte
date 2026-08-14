<script lang="ts">
  import type { MenuItem } from '@svadmin/core';
  import LiteMenuList from './LiteMenuList.svelte';

  interface Props {
    items: MenuItem[];
    basePath: string;
    currentResource: string;
    depth?: number;
  }

  let { items, basePath, currentResource, depth = 0 }: Props = $props();

  function itemHref(menuItem: MenuItem): string {
    return menuItem.href ?? `${basePath}/${menuItem.name}`;
  }

  function isActive(menuItem: MenuItem): boolean {
    return currentResource === itemHref(menuItem).replace(basePath + '/', '');
  }
</script>

<ul class="lite-menu-list lite-menu-depth-{depth}">
  {#each items as menuItem (menuItem.name)}
    <li>
      {#if menuItem.children && menuItem.children.length > 0}
        <span class="lite-menu-parent">{menuItem.label ?? menuItem.name}</span>
        <LiteMenuList
          items={menuItem.children}
          {basePath}
          {currentResource}
          depth={depth + 1}
        />
      {:else}
        <a
          href={itemHref(menuItem)}
          class={isActive(menuItem) ? 'active' : ''}
          target={menuItem.target === '_blank' ? '_blank' : undefined}
          rel={menuItem.target === '_blank' ? 'noreferrer' : undefined}
        >{menuItem.label ?? menuItem.name}</a>
      {/if}
    </li>
  {/each}
</ul>
