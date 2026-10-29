<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronDown } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface MenuEntry {
    id: string;
    label: string;
    href?: string;
    disabled?: boolean;
    badge?: string | number;
    children?: MenuEntry[];
  }

  interface Props {
    items: MenuEntry[];
    mode?: 'vertical' | 'horizontal';
    selected?: string;
    openKeys?: string[];
    collapsed?: boolean;
    label?: string;
    class?: string;
    icon?: Snippet<[MenuEntry]>;
    onselect?: (item: MenuEntry) => void;
    onopenchange?: (keys: string[]) => void;
  }

  let {
    items,
    mode = 'vertical',
    selected = $bindable(),
    openKeys = $bindable([]),
    collapsed = false,
    label = 'Menu',
    class: className = '',
    icon,
    onselect,
    onopenchange,
  }: Props = $props();

  function isOpen(item: MenuEntry): boolean {
    return openKeys.includes(item.id);
  }

  function toggle(item: MenuEntry): void {
    if (item.disabled) return;
    if (!item.children?.length) return;
    const next = isOpen(item) ? openKeys.filter((key) => key !== item.id) : [...openKeys, item.id];
    openKeys = next;
    onopenchange?.(next);
  }

  function select(item: MenuEntry): void {
    if (item.disabled) return;
    selected = item.id;
    onselect?.(item);
    if (item.children?.length) toggle(item);
  }
</script>

{#snippet renderItems(nodes: MenuEntry[], depth: number)}
  <ul class="svadmin-menu__list" data-depth={depth}>
    {#each nodes as item (item.id)}
      <li class="svadmin-menu__item" data-open={isOpen(item) ? 'true' : undefined}>
        {#if item.href && !item.children?.length}
          <a
            class="svadmin-menu__link"
            data-selected={selected === item.id ? 'true' : undefined}
            data-disabled={item.disabled ? 'true' : undefined}
            aria-current={selected === item.id ? 'page' : undefined}
            href={item.href}
            onclick={() => select(item)}
          >
            {#if icon}<span class="svadmin-menu__icon">{@render icon(item)}</span>{/if}
            <span class="svadmin-menu__label">{item.label}</span>
            {#if item.badge !== undefined}<span class="svadmin-menu__badge">{item.badge}</span>{/if}
          </a>
        {:else}
          <button
            type="button"
            class="svadmin-menu__link"
            data-selected={selected === item.id ? 'true' : undefined}
            data-disabled={item.disabled ? 'true' : undefined}
            aria-expanded={item.children?.length ? isOpen(item) : undefined}
            disabled={item.disabled}
            onclick={() => select(item)}
          >
            {#if icon}<span class="svadmin-menu__icon">{@render icon(item)}</span>{/if}
            <span class="svadmin-menu__label">{item.label}</span>
            {#if item.badge !== undefined}<span class="svadmin-menu__badge">{item.badge}</span>{/if}
            {#if item.children?.length}<span class="svadmin-menu__chevron"><ChevronDown size={14} aria-hidden="true" /></span>{/if}
          </button>
        {/if}
        {#if item.children?.length && isOpen(item)}
          {@render renderItems(item.children, depth + 1)}
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

<nav class={cn('svadmin-menu', className)} data-mode={mode} data-collapsed={collapsed ? 'true' : 'false'} aria-label={label}>
  {@render renderItems(items, 0)}
</nav>

<style>
  .svadmin-menu { min-width: 0; color: var(--foreground); }
  .svadmin-menu__list { display: grid; gap: var(--svadmin-space-1); margin: 0; padding: 0; list-style: none; }
  .svadmin-menu__item { min-width: 0; }
  .svadmin-menu__link {
    display: flex;
    align-items: center;
    gap: var(--svadmin-space-2);
    width: 100%;
    min-height: var(--svadmin-control-h);
    padding-inline: var(--svadmin-space-3);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-body);
    text-align: start;
    text-decoration: none;
    cursor: pointer;
  }
  .svadmin-menu__link:hover { background: var(--muted); color: var(--foreground); }
  .svadmin-menu__link[data-selected='true'] { background: var(--accent); color: var(--accent-foreground); font-weight: 600; }
  .svadmin-menu__link[data-disabled='true'] { opacity: 0.45; cursor: not-allowed; }
  .svadmin-menu__link:focus-visible { outline: 2px solid var(--ring); outline-offset: 1px; }
  .svadmin-menu__icon { display: inline-flex; flex: 0 0 auto; }
  .svadmin-menu__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-menu__badge { margin-inline-start: auto; padding-inline: var(--svadmin-space-2); border-radius: 999px; background: var(--muted); color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  .svadmin-menu__chevron { margin-inline-start: auto; transition: transform 120ms ease; }
  .svadmin-menu__item[data-open='true'] > .svadmin-menu__link .svadmin-menu__chevron { transform: rotate(180deg); }
  .svadmin-menu__list[data-depth]:not([data-depth='0']) { margin-block-start: var(--svadmin-space-1); margin-inline-start: var(--svadmin-space-4); }
  .svadmin-menu[data-collapsed='true'] .svadmin-menu__label,
  .svadmin-menu[data-collapsed='true'] .svadmin-menu__badge,
  .svadmin-menu[data-collapsed='true'] .svadmin-menu__chevron { display: none; }
  .svadmin-menu[data-collapsed='true'] .svadmin-menu__link { justify-content: center; padding-inline: 0; }
  .svadmin-menu[data-mode='horizontal'] > .svadmin-menu__list { grid-auto-flow: column; grid-auto-columns: max-content; }
  .svadmin-menu[data-mode='horizontal'] .svadmin-menu__item { position: relative; }
  .svadmin-menu[data-mode='horizontal'] .svadmin-menu__list[data-depth]:not([data-depth='0']) {
    position: absolute;
    z-index: 30;
    inset-block-start: calc(100% + var(--svadmin-space-1));
    inset-inline-start: 0;
    min-width: 12rem;
    margin: 0;
    padding: var(--svadmin-space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--card);
    box-shadow: var(--shadow-lg, 0 12px 30px color-mix(in srgb, var(--foreground) 16%, transparent));
  }
  @media (prefers-reduced-motion: reduce) { .svadmin-menu__chevron { transition: none; } }
</style>