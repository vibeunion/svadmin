<script lang="ts">
  import { Ellipsis } from '@lucide/svelte';
  import type { Component, Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn, type WithElementRef } from '../utils.js';
  import * as DropdownMenu from './ui/dropdown-menu/index.js';
  import { Button } from './ui/button/index.js';

  export type RowActionItem = {
    label: string;
    icon?: Component<{ class?: string }>;
    href?: string;
    onclick?: (e: MouseEvent) => void;
    variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
    disabled?: boolean;
    title?: string;
    danger?: boolean;
    hidden?: boolean;
  };

  type Props = WithElementRef<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
    actions?: RowActionItem[];
    maxVisible?: number;
    moreLabel?: string;
    children?: Snippet;
    moreContent?: Snippet;
  };

  let {
    actions = [],
    maxVisible = 2,
    moreLabel = 'More actions',
    ref = $bindable(null),
    class: className,
    children,
    moreContent,
    ...restProps
  }: Props = $props();

  let overflowOpen = $state(false);
  const availableActions = $derived(actions.filter((action) => !action.hidden));
  const visibleLimit = $derived(
    Number.isFinite(maxVisible)
      ? Math.max(0, Math.floor(maxVisible))
      : availableActions.length
  );
  const visibleActions = $derived(availableActions.slice(0, visibleLimit));
  const overflowActions = $derived(availableActions.slice(visibleLimit));

  function resolvedVariant(action: RowActionItem): RowActionItem['variant'] {
    return action.variant ?? (action.danger ? 'destructive' : 'ghost');
  }

  function handleOverflowAction(action: RowActionItem, event: MouseEvent): void {
    if (action.disabled) {
      event.preventDefault();
      return;
    }
    overflowOpen = false;
    action.onclick?.(event);
  }
</script>

<div
  bind:this={ref}
  data-slot="row-actions"
  class={cn("inline-flex items-center gap-1.5", className)}
  {...restProps}
>
  {#if children}
    {@render children()}
  {/if}

  {#each visibleActions as action (action)}
    {#if action.href}
      <Button
        variant={resolvedVariant(action)}
        size="sm"
        href={action.href}
        disabled={action.disabled}
        title={action.title || action.label}
        class="h-8 px-2 text-xs"
      >
        {#if action.icon}
          {@const Icon = action.icon}
          <Icon class="mr-1 size-3.5" />
        {/if}
        {action.label}
      </Button>
    {:else}
      <Button
        variant={resolvedVariant(action)}
        size="sm"
        onclick={action.onclick}
        disabled={action.disabled}
        title={action.title || action.label}
        class="h-8 px-2 text-xs"
      >
        {#if action.icon}
          {@const Icon = action.icon}
          <Icon class="mr-1 size-3.5" />
        {/if}
        {action.label}
      </Button>
    {/if}
  {/each}

  {#if overflowActions.length > 0 || moreContent}
    <DropdownMenu.Root bind:open={overflowOpen}>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" size="icon-sm" title={moreLabel} aria-label={moreLabel}>
            <Ellipsis class="size-4" />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" class="min-w-[8rem]">
        {#each overflowActions as action (action)}
          {#if action.href}
            <Button
              href={action.href}
              variant={resolvedVariant(action)}
              size="sm"
              disabled={action.disabled}
              onclick={(event) => handleOverflowAction(action, event)}
              class="h-auto w-full justify-start rounded-md px-2 py-1.5 text-sm font-normal"
            >
              {#if action.icon}
                {@const Icon = action.icon}
                <Icon class="size-3.5" />
              {/if}
              {action.label}
            </Button>
          {:else}
            <DropdownMenu.Item
              onclick={(event) => handleOverflowAction(action, event)}
              disabled={action.disabled}
              destructive={action.danger || action.variant === 'destructive'}
            >
              {#if action.icon}
                {@const Icon = action.icon}
                <Icon class="size-3.5" />
              {/if}
              {action.label}
            </DropdownMenu.Item>
          {/if}
        {/each}
        {#if moreContent}
          {@render moreContent()}
        {/if}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
</div>
