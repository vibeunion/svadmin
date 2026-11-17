<script lang="ts" generics="T extends string">
  import { untrack } from 'svelte';
  import { cn } from '../utils.js';

  export interface SegmentedControlOption<T extends string = string> {
    value: T;
    label: string;
    disabled?: boolean;
  }

  export type SegmentedControlItem<T extends string = string> = T | SegmentedControlOption<T>;

  interface Props<T extends string = string> {
    options: readonly SegmentedControlItem<T>[];
    value?: T | undefined;
    defaultValue?: T | undefined;
    size?: 'mini' | 'small' | 'default' | 'large';
    disabled?: boolean;
    block?: boolean;
    ariaLabel: string;
    dir?: 'ltr' | 'rtl';
    class?: string;
    onchange?: (value: T) => void;
  }

  let {
    options,
    value = $bindable(),
    defaultValue,
    size = 'default',
    disabled = false,
    block = false,
    ariaLabel,
    dir,
    class: className = '',
    onchange,
  }: Props<T> = $props();

  const normalizedOptions = $derived<readonly SegmentedControlOption<T>[]>(
    options.map((opt) => (typeof opt === 'string' ? { value: opt, label: opt } : opt))
  );

  let internalValue = $state(untrack(() => defaultValue));
  const effectiveValue = $derived(value !== undefined ? value : internalValue);

  let root: HTMLDivElement;
  const enabledOptions = $derived(normalizedOptions.filter(option => !option.disabled));
  const tabValue = $derived(enabledOptions.find(option => option.value === effectiveValue)?.value ?? enabledOptions[0]?.value);

  function select(option: SegmentedControlOption<T>): void {
    if (disabled || option.disabled) return;
    if (effectiveValue !== option.value) {
      if (value !== undefined) {
        value = option.value;
      } else {
        internalValue = option.value;
      }
      onchange?.(option.value);
    }
  }

  function moveFocus(index: number, direction: number): void {
    if (disabled || enabledOptions.length === 0) return;
    const next = (index + direction + enabledOptions.length) % enabledOptions.length;
    const nextOption = enabledOptions[next];
    if (!nextOption) return;
    const target = root.querySelector<HTMLButtonElement>(
      `[data-svadmin-segment-value="${CSS.escape(nextOption.value)}"]`,
    );
    target?.focus();
    select(nextOption);
  }

  function handleKeydown(event: KeyboardEvent, option: SegmentedControlOption<T>, index: number): void {
    const current = event.currentTarget;
    if (disabled || option.disabled || event.altKey || event.ctrlKey || event.metaKey
      || !(current instanceof HTMLButtonElement) || current.matches(':disabled')) return;
    const rtl = getComputedStyle(root).direction === 'rtl' || dir === 'rtl';
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocus(index, event.key === 'ArrowRight' && rtl ? -1 : 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(index, event.key === 'ArrowLeft' && rtl ? 1 : -1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveFocus(index, -index);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveFocus(index, enabledOptions.length - 1 - index);
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      select(option);
    }
  }
</script>

<div
  bind:this={root}
  {dir}
  role="radiogroup"
  aria-label={ariaLabel}
  aria-disabled={disabled ? 'true' : undefined}
  data-size={size}
  data-block={block ? 'true' : undefined}
  class={cn('svadmin-segmented-control', block && 'w-full flex', className)}
>
  {#each normalizedOptions as option (option.value)}
    {@const selected = effectiveValue === option.value}
    {@const enabledIndex = enabledOptions.findIndex(candidate => candidate.value === option.value)}
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled || option.disabled ? 'true' : undefined}
      tabindex={!disabled && !option.disabled && option.value === tabValue ? 0 : -1}
      disabled={disabled || option.disabled}
      data-svadmin-segment-value={option.value}
      class={cn('svadmin-segmented-control__item', block && 'flex-1 text-center', selected && 'svadmin-segmented-control__item--selected')}
      onclick={() => select(option)}
      onkeydown={(event) => handleKeydown(event, option, enabledIndex)}
    >
      {option.label}
    </button>
  {/each}
</div>

<style>
  .svadmin-segmented-control {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px;
    max-width: 100%;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--muted);
  }

  .svadmin-segmented-control__item {
    min-height: 32px;
    min-width: 0;
    padding: 4px 12px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: var(--muted-foreground);
    font: inherit;
    letter-spacing: 0;
    overflow-wrap: anywhere;
    cursor: pointer;
  }

  .svadmin-segmented-control__item--selected {
    background: var(--background);
    color: var(--foreground);
    border-color: var(--border);
  }

  .svadmin-segmented-control__item:focus-visible {
    outline: var(--svadmin-focus-width) solid var(--ring);
    outline-offset: var(--svadmin-focus-offset);
  }

  .svadmin-segmented-control__item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Size variations */
  .svadmin-segmented-control[data-size='mini'] {
    padding: 2px;
    gap: 2px;
  }
  .svadmin-segmented-control[data-size='mini'] .svadmin-segmented-control__item {
    min-height: 22px;
    padding: 2px 8px;
    font-size: var(--svadmin-text-caption, 0.75rem);
  }
  .svadmin-segmented-control[data-size='small'] {
    padding: 2px;
    gap: 2px;
  }
  .svadmin-segmented-control[data-size='small'] .svadmin-segmented-control__item {
    min-height: 26px;
    padding: 3px 10px;
    font-size: var(--svadmin-text-caption, 0.75rem);
  }
  .svadmin-segmented-control[data-size='large'] {
    padding: 4px;
    gap: 4px;
  }
  .svadmin-segmented-control[data-size='large'] .svadmin-segmented-control__item {
    min-height: 38px;
    padding: 6px 16px;
    font-size: var(--svadmin-text-section, 1rem);
  }
</style>
