<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

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
    variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'primary';
    disabled?: boolean;
    /** 受控禁用原因；禁用项通过 tooltip/标题与菜单内说明呈现，不改变命令语义。 */
    disabledReason?: string;
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

  function resolvedVariant(action: RowActionItem): Exclude<NonNullable<RowActionItem['variant']>, 'primary'> {
    if (action.variant === 'primary') return 'default';
    return (action.variant ?? (action.danger ? 'destructive' : 'ghost')) as Exclude<NonNullable<RowActionItem['variant']>, 'primary'>;
  }

  function actionTitle(action: RowActionItem): string {
    const base = action.title || action.label;
    return action.disabled && action.disabledReason ? `${base}：${action.disabledReason}` : base;
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

  const menuOwner = `row-${Math.random().toString(36).slice(2, 10)}`;

  function menuElements(): HTMLElement[] {
    const content = typeof document === 'undefined'
      ? null
      : document.querySelector<HTMLElement>(`[data-slot="dropdown-menu-content"][data-row-actions="${menuOwner}"]`);
    return [...(content?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
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
      let menu: HTMLElement | null = null;
      let cancelled = false;
      const onMenuKeyDown = (event: KeyboardEvent) => {
        manageMenuKeyboard(event as RowActionsKeyboardEvent);
      };
      void tick().then(() => {
        if (cancelled) return;
        menuWasOpen = true;
        menu = typeof document === 'undefined'
          ? null
          : document.querySelector<HTMLElement>(`[data-slot="dropdown-menu-content"][data-row-actions="${menuOwner}"]`);
        menu?.addEventListener('keydown', onMenuKeyDown);
        const elements = menuElements();
        elements[initialMenuFocus === 'last' ? elements.length - 1 : 0]?.focus();
        initialMenuFocus = 'first';
      });
      return () => {
        cancelled = true;
        menu?.removeEventListener('keydown', onMenuKeyDown);
      };
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
  class={cn("inline-flex items-center gap-1.5", className)}
  onkeydown={manageMenuKeyboard}
  {...restProps}
>
  {#if children}
    {@render children()}
  {/if}

  {#each visibleActions as action (action)}
    {#if action.href}
      <Button
        {...definedOptions({ "variant": resolvedVariant(action) })}
        size="sm"
        href={action.href}
        disabled={action.disabled}
        disabledReason={action.disabled ? (action.disabledReason ?? '') : ''}
        title={actionTitle(action)}
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
        {...definedOptions({ "variant": resolvedVariant(action) })}
        size="sm"
        onclick={action.onclick}
        disabled={action.disabled}
        disabledReason={action.disabled ? (action.disabledReason ?? '') : ''}
        title={actionTitle(action)}
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
          <Button {...props} variant="ghost" size="icon-sm" title={moreLabel} aria-label={moreLabel} aria-haspopup="menu" aria-expanded={overflowOpen}>
            <Ellipsis class="size-4" />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content portal align="end" data-row-actions={menuOwner} class="min-w-[8rem]" role="menu" aria-label={moreLabel}>
        {#each overflowActions as action (action)}
          {#if action.href}
            <Button
              href={action.href}
              {...definedOptions({ "variant": resolvedVariant(action) })}
              size="sm"
              disabled={action.disabled}
              disabledReason={action.disabled ? (action.disabledReason ?? '') : ''}
              onclick={(event) => handleOverflowAction(action, event)}
              role="menuitem"
              tabindex={-1}
              title={actionTitle(action)}
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
              role="menuitem"
              tabindex={-1}
              title={actionTitle(action)}
            >
              {#if action.icon}
                {@const Icon = action.icon}
                <Icon class="size-3.5" />
              {/if}
              <span class="row-action-label">
                <span>{action.label}</span>
                {#if action.disabled && action.disabledReason}
                  <span class="row-action-reason">{action.disabledReason}</span>
                {/if}
              </span>
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

<style>
  .row-action-label { display: inline-flex; flex-direction: column; align-items: flex-start; gap: .125rem; min-width: 0; }
  .row-action-label > span:first-child { overflow: hidden; text-overflow: ellipsis; }
  .row-action-reason { font-size: .75em; line-height: 1.3; opacity: .72; white-space: normal; }
</style>
