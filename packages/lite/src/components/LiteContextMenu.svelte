<script lang="ts">
  import type { Snippet } from 'svelte';

  export interface LiteContextMenuItem {
    key: string;
    label: string;
    shortcut?: string;
    disabled?: boolean;
    danger?: boolean;
    divider?: boolean;
    href?: string;
  }

  interface Props {
    items: LiteContextMenuItem[];
    class?: string;
    children?: Snippet;
  }

  let {
    items = [],
    class: className = '',
    children,
  }: Props = $props();
</script>

<div
  class="lite-context-menu-wrapper {className}"
  data-svadmin-component="LiteContextMenu"
>
  <div class="lite-context-target">
    {#if children}{@render children()}{/if}
  </div>

  {#if items.length > 0}
    <ul class="lite-context-menu-list" role="menu">
      {#each items as item (item.key)}
        {#if item.divider}
          <li class="lite-context-divider" role="separator"></li>
        {:else}
          <li
            class="lite-context-item"
            class:lite-context-danger={item.danger}
            class:lite-context-disabled={item.disabled}
            role="menuitem"
          >
            {#if item.href && !item.disabled}
              <a href={item.href} class="lite-context-link">
                <span>{item.label}</span>
                {#if item.shortcut}<kbd>{item.shortcut}</kbd>{/if}
              </a>
            {:else}
              <span class="lite-context-label">{item.label}</span>
              {#if item.shortcut}<kbd>{item.shortcut}</kbd>{/if}
            {/if}
          </li>
        {/if}
      {/each}
    </ul>
  {/if}
</div>

<style>
  .lite-context-menu-wrapper {
    position: relative;
    display: block;
  }
  .lite-context-menu-list {
    margin: 8px 0 0;
    padding: 4px;
    list-style: none;
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .lite-context-divider {
    width: 1px;
    height: 16px;
    background: #e5e6eb;
    align-self: center;
    margin: 0 4px;
  }
  .lite-context-item {
    font-size: 12px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    color: #1d2129;
    background: #f7f8fa;
  }
  .lite-context-link {
    color: inherit;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .lite-context-danger { color: #f53f3f; background: #ffece8; }
  .lite-context-disabled { opacity: 0.5; pointer-events: none; }
  kbd {
    font-size: 10px;
    font-family: monospace;
    background: #e5e6eb;
    padding: 1px 4px;
    border-radius: 3px;
    color: #4e5969;
  }
</style>
