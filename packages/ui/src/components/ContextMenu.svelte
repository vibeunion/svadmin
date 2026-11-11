<script lang="ts">
  import { onMount, onDestroy, type Snippet } from 'svelte';
  import { cn } from '../utils.js';

  export interface ContextMenuItem {
    key: string;
    label: string;
    icon?: string | Snippet;
    shortcut?: string;
    disabled?: boolean;
    danger?: boolean;
    divider?: boolean;
    children?: ContextMenuItem[];
    onclick?: (item: ContextMenuItem) => void;
  }

  export interface ContextMenuProps {
    items: ContextMenuItem[];
    disabled?: boolean;
    class?: string;
    onselect?: (item: ContextMenuItem) => void;
    children?: Snippet;
  }

  let {
    items = [],
    disabled = false,
    class: className = '',
    onselect,
    children,
  }: ContextMenuProps = $props();

  let isOpen = $state(false);
  let menuX = $state(0);
  let menuY = $state(0);
  let activeSubmenuKey = $state<string | null>(null);

  let containerEl = $state<HTMLDivElement | null>(null);
  let menuEl = $state<HTMLDivElement | null>(null);

  function closeMenu() {
    isOpen = false;
    activeSubmenuKey = null;
  }

  function handleContextMenu(e: MouseEvent) {
    if (disabled || items.length === 0) return;
    e.preventDefault();
    e.stopPropagation();

    activeSubmenuKey = null;
    const clientX = e.clientX;
    const clientY = e.clientY;

    const estimatedWidth = 190;
    const estimatedHeight = items.length * 36;
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 768;

    let posX = clientX;
    let posY = clientY;

    if (clientX + estimatedWidth > winW - 8) {
      posX = Math.max(8, clientX - estimatedWidth);
    }
    if (clientY + estimatedHeight > winH - 8) {
      posY = Math.max(8, clientY - estimatedHeight);
    }

    menuX = posX;
    menuY = posY;
    isOpen = true;
  }

  function handleItemClick(item: ContextMenuItem, e: MouseEvent) {
    if (item.disabled || item.divider) return;
    if (item.children && item.children.length > 0) {
      // Toggle or keep submenu open
      activeSubmenuKey = activeSubmenuKey === item.key ? null : item.key;
      return;
    }

    e.stopPropagation();
    item.onclick?.(item);
    onselect?.(item);
    closeMenu();
  }

  function handleSubItemClick(subItem: ContextMenuItem, e: MouseEvent) {
    if (subItem.disabled || subItem.divider) return;
    e.stopPropagation();
    subItem.onclick?.(subItem);
    onselect?.(subItem);
    closeMenu();
  }

  function handleGlobalClick(e: MouseEvent) {
    if (!isOpen) return;
    if (menuEl && !menuEl.contains(e.target as Node)) {
      closeMenu();
    }
  }

  function handleGlobalKeyDown(e: KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      closeMenu();
    }
  }

  function handleGlobalScroll() {
    if (isOpen) {
      closeMenu();
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('click', handleGlobalClick);
      window.addEventListener('keydown', handleGlobalKeyDown);
      window.addEventListener('scroll', handleGlobalScroll, true);
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('scroll', handleGlobalScroll, true);
    }
  });
</script>

<!-- Outer wrapper capturing right-click context menu -->
<div
  bind:this={containerEl}
  oncontextmenu={handleContextMenu}
  class={cn('contents', className)}
  data-svadmin-component="ContextMenu"
  role="region"
  aria-label="Context Menu Container"
>
  {@render children?.()}
</div>

{#if isOpen}
  <div
    bind:this={menuEl}
    class="fixed z-50 min-w-[180px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none animate-in fade-in-80 zoom-in-95"
    style="left: {menuX}px; top: {menuY}px;"
    data-svadmin-context-menu-popup="true"
    role="menu"
    tabindex="-1"
  >
    {#each items as item (item.key)}
      {#if item.divider}
        <div class="-mx-1 my-1 h-px bg-border" role="separator"></div>
      {:else}
        <div
          class="relative"
          role="none"
          onmouseenter={() => {
            if (item.children && item.children.length > 0) {
              activeSubmenuKey = item.key;
            }
          }}
        >
          <button
            type="button"
            role="menuitem"
            disabled={item.disabled}
            aria-disabled={item.disabled}
            aria-haspopup={item.children && item.children.length > 0 ? 'true' : undefined}
            aria-expanded={activeSubmenuKey === item.key}
            class={cn(
              'flex w-full cursor-default select-none items-center rounded-sm px-2.5 py-1.5 text-sm outline-none transition-colors text-left',
              item.disabled
                ? 'pointer-events-none opacity-50'
                : item.danger
                  ? 'text-destructive hover:bg-destructive/10 focus:bg-destructive/10'
                  : 'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground'
            )}
            onclick={(e) => handleItemClick(item, e)}
          >
            {#if item.icon}
              <span class="mr-2 inline-flex h-4 w-4 shrink-0 items-center justify-center">
                {#if typeof item.icon === 'string'}
                  <span class="text-xs">{item.icon}</span>
                {:else}
                  {@render item.icon()}
                {/if}
              </span>
            {/if}

            <span class="flex-1 truncate">{item.label}</span>

            {#if item.shortcut}
              <span class="ml-auto pl-3 font-mono text-xs text-muted-foreground">
                {item.shortcut}
              </span>
            {/if}

            {#if item.children && item.children.length > 0}
              <svg
                class="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            {/if}
          </button>

          <!-- Nested Submenu -->
          {#if item.children && item.children.length > 0 && activeSubmenuKey === item.key}
            <div
              class="absolute left-full top-0 ml-1 min-w-[160px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none animate-in fade-in-80 zoom-in-95"
              role="menu"
              tabindex="-1"
            >
              {#each item.children as subItem (subItem.key)}
                {#if subItem.divider}
                  <div class="-mx-1 my-1 h-px bg-border" role="separator"></div>
                {:else}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={subItem.disabled}
                    aria-disabled={subItem.disabled}
                    class={cn(
                      'flex w-full cursor-default select-none items-center rounded-sm px-2.5 py-1.5 text-sm outline-none transition-colors text-left',
                      subItem.disabled
                        ? 'pointer-events-none opacity-50'
                        : subItem.danger
                          ? 'text-destructive hover:bg-destructive/10 focus:bg-destructive/10'
                          : 'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground'
                    )}
                    onclick={(e) => handleSubItemClick(subItem, e)}
                  >
                    {#if subItem.icon}
                      <span class="mr-2 inline-flex h-4 w-4 shrink-0 items-center justify-center">
                        {#if typeof subItem.icon === 'string'}
                          <span class="text-xs">{subItem.icon}</span>
                        {:else}
                          {@render subItem.icon()}
                        {/if}
                      </span>
                    {/if}
                    <span class="flex-1 truncate">{subItem.label}</span>
                    {#if subItem.shortcut}
                      <span class="ml-auto pl-3 font-mono text-xs text-muted-foreground">
                        {subItem.shortcut}
                      </span>
                    {/if}
                  </button>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
{/if}
