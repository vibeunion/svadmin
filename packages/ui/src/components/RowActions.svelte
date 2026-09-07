<script lang="ts">
  import { Ellipsis } from '@lucide/svelte';
  import { tick, type Component, type Snippet } from 'svelte';
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
  type RowActionsKeyboardEvent = KeyboardEvent & {
    currentTarget: EventTarget & HTMLDivElement;
  };

  let {
    actions = [],
    maxVisible = 2,
    moreLabel = 'More actions',
    ref = $bindable(null),
    class: className,
    onkeydown,
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
  let menuWasOpen = false;
  let initialMenuFocus: 'first' | 'last' = 'first';
  let restoreFocusOnClose = false;

  function resolvedVariant(action: RowActionItem): RowActionItem['variant'] {
    return action.variant ?? (action.danger ? 'destructive' : 'ghost');
  }

  function handleOverflowAction(action: RowActionItem, event: MouseEvent): void {
    if (action.disabled) {
      event.preventDefault();
      return;
    }
    restoreFocusOnClose = true;
    overflowOpen = false;
    action.onclick?.(event);
  }

  function menuElements(): HTMLElement[] {
    return [...(ref?.querySelector('[data-slot="dropdown-menu-content"]')?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
      .filter((element) => !element.matches(':disabled, [aria-disabled="true"]'));
  }

  function moveMenuFocus(event: KeyboardEvent, direction: 1 | -1): void {
    const elements = menuElements();
    if (!elements.length) return;
    const currentIndex = elements.indexOf(document.activeElement as HTMLElement);
    const nextIndex = currentIndex < 0
      ? (direction > 0 ? 0 : elements.length - 1)
      : (currentIndex + direction + elements.length) % elements.length;
    event.preventDefault();
    elements[nextIndex]?.focus();
  }

  function focusMenuBoundary(event: KeyboardEvent, boundary: 'first' | 'last'): void {
    const elements = menuElements();
    if (!elements.length) return;
    event.preventDefault();
    elements[boundary === 'first' ? 0 : elements.length - 1]?.focus();
  }

  function manageMenuKeyboard(event: RowActionsKeyboardEvent): void {
    onkeydown?.(event);
    if (event.defaultPrevented) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    const trigger = target?.closest<HTMLElement>('[data-slot="dropdown-menu-trigger"]');
    const content = target?.closest<HTMLElement>('[data-slot="dropdown-menu-content"]');
    if (trigger && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      initialMenuFocus = event.key === 'ArrowUp' ? 'last' : 'first';
      trigger.click();
    } else if (content && event.key === 'Escape') {
      event.preventDefault();
      restoreFocusOnClose = true;
      overflowOpen = false;
    } else if (content && event.key === 'ArrowDown') moveMenuFocus(event, 1);
    else if (content && event.key === 'ArrowUp') moveMenuFocus(event, -1);
    else if (content && event.key === 'Home') focusMenuBoundary(event, 'first');
    else if (content && event.key === 'End') focusMenuBoundary(event, 'last');
  }

  $effect(() => {
    if (overflowOpen) {
      void tick().then(() => {
        menuWasOpen = true;
        const elements = menuElements();
        elements[initialMenuFocus === 'last' ? elements.length - 1 : 0]?.focus();
        initialMenuFocus = 'first';
      });
    } else if (menuWasOpen) {
      menuWasOpen = false;
      if (restoreFocusOnClose) {
        restoreFocusOnClose = false;
        ref?.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]')?.focus();
      }
    }
  });
</script>

<div
  bind:this={ref}
  data-slot="row-actions"
  class={cn("svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568", className)}
  onkeydown={manageMenuKeyboard}
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
        class="svadmin-u-ed8a5df7b2fb svadmin-u-d5eab218aa34 svadmin-u-359090c2d529"
      >
        {#if action.icon}
          {@const Icon = action.icon}
          <Icon class="svadmin-u-618162408e7a svadmin-u-783b0d9d1e2c" />
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
        class="svadmin-u-ed8a5df7b2fb svadmin-u-d5eab218aa34 svadmin-u-359090c2d529"
      >
        {#if action.icon}
          {@const Icon = action.icon}
          <Icon class="svadmin-u-618162408e7a svadmin-u-783b0d9d1e2c" />
        {/if}
        {action.label}
      </Button>
    {/if}
  {/each}

  {#if overflowActions.length > 0 || moreContent}
    <DropdownMenu.Root bind:open={overflowOpen}>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" size="icon-sm" title={moreLabel} aria-label={moreLabel} aria-haspopup="menu" aria-expanded={overflowOpen}>
            <Ellipsis class="svadmin-u-f7b5fa971871" />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" class="svadmin-u-3143d72a3869" role="menu" aria-label={moreLabel}>
        {#each overflowActions as action (action)}
          {#if action.href}
            <Button
              href={action.href}
              variant={resolvedVariant(action)}
              size="sm"
              disabled={action.disabled}
              onclick={(event) => handleOverflowAction(action, event)}
              role="menuitem"
              tabindex={-1}
              class="svadmin-u-b8f0a08ece1e svadmin-u-6da6a3c3f741 svadmin-u-4b5cc19bfdfc svadmin-u-421ac2be5045 svadmin-u-d5eab218aa34 svadmin-u-ec0091ee009b svadmin-u-fc7473ca09eb svadmin-u-8ecebc9f80e6"
            >
              {#if action.icon}
                {@const Icon = action.icon}
                <Icon class="svadmin-u-783b0d9d1e2c" />
              {/if}
              {action.label}
            </Button>
          {:else}
            <DropdownMenu.Item
              onclick={(event) => handleOverflowAction(action, event)}
              disabled={action.disabled}
              destructive={action.danger || action.variant === 'destructive'}
              role="menuitem"
              tabindex={-1}
            >
              {#if action.icon}
                {@const Icon = action.icon}
                <Icon class="svadmin-u-783b0d9d1e2c" />
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
