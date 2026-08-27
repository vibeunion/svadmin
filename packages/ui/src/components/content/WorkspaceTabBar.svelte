<script module lang="ts">
  import type { Component } from 'svelte';

  export interface WorkspaceTabItem {
    id: string;
    label: string;
    icon?: Component<any>;
    badge?: string | number;
    disabled?: boolean;
    description?: string;
  }
</script>

<script lang="ts">
  import { cn } from '../../utils.js';

  interface Props {
    items: WorkspaceTabItem[];
    activeId: string;
    onselect?: (item: WorkspaceTabItem) => void;
    variant?: 'segmented' | 'pill' | 'underline';
    ariaLabel?: string;
    class?: string;
  }

  let {
    items,
    activeId,
    onselect,
    variant = 'segmented',
    ariaLabel = 'Workspace tabs',
    class: className = '',
  }: Props = $props();
</script>

<nav
  aria-label={ariaLabel}
  class={cn(
    'flex items-center gap-1 overflow-x-auto',
    variant === 'segmented' && 'rounded-lg border border-border bg-muted/40 p-1',
    variant === 'pill' && 'gap-1.5 p-0.5',
    variant === 'underline' && 'gap-2 border-b border-border',
    className,
  )}
  data-svadmin-workspace-tab-bar
  data-variant={variant}
>
  {#each items as item (item.id)}
    {@const Icon = item.icon}
    {@const isActive = item.id === activeId}
    <button
      type="button"
      disabled={item.disabled}
      class={cn(
        'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variant === 'segmented' && [
          isActive
            ? 'bg-background text-foreground shadow-sm font-semibold'
            : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
        ],
        variant === 'pill' && [
          isActive
            ? 'bg-primary text-primary-foreground font-semibold'
            : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
        ],
        variant === 'underline' && [
          'rounded-none border-b-2 px-3 py-2',
          isActive
            ? 'border-primary text-primary font-semibold'
            : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
        ],
      )}
      aria-current={isActive ? 'page' : undefined}
      onclick={() => onselect?.(item)}
    >
      {#if Icon}
        <Icon class="size-4 shrink-0" aria-hidden="true" />
      {/if}
      <span>{item.label}</span>
      {#if item.badge !== undefined && item.badge !== ''}
        <span
          class={cn(
            'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[0.6875rem] font-bold leading-none tabular-nums',
            isActive
              ? (variant === 'pill' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary')
              : 'bg-muted text-muted-foreground',
          )}
        >
          {item.badge}
        </span>
      {/if}
    </button>
  {/each}
</nav>
