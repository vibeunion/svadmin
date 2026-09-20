<script lang="ts" generics="T extends string">
  import { cn } from '../utils.js';

  export interface SegmentedControlOption<T extends string = string> {
    value: T;
    label: string;
    disabled?: boolean;
  }

  interface Props<T extends string = string> {
    options: readonly SegmentedControlOption<T>[];
    value?: T;
    disabled?: boolean;
    ariaLabel: string;
    dir?: 'ltr' | 'rtl';
    class?: string;
    onchange?: (value: T) => void;
  }

  let {
    options,
    value = $bindable(),
    disabled = false,
    ariaLabel,
    dir,
    class: className = '',
    onchange,
  }: Props<T> = $props();

  let root: HTMLDivElement;
  const enabledOptions = $derived(options.filter(option => !option.disabled));
  const tabValue = $derived(enabledOptions.find(option => option.value === value)?.value ?? enabledOptions[0]?.value);

  function select(option: SegmentedControlOption<T>): void {
    if (disabled || option.disabled) return;
    if (value !== option.value) {
      value = option.value;
      onchange?.(option.value);
    }
  }

  function moveFocus(index: number, direction: number): void {
    if (disabled || enabledOptions.length === 0) return;
    const next = (index + direction + enabledOptions.length) % enabledOptions.length;
    const target = root.querySelector<HTMLButtonElement>(
      `[data-svadmin-segment-value="${CSS.escape(enabledOptions[next]!.value)}"]`,
    );
    target?.focus();
    select(enabledOptions[next]!);
  }

  function handleKeydown(event: KeyboardEvent, option: SegmentedControlOption<T>, index: number): void {
    if (disabled || option.disabled) return;
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
  class={cn('svadmin-segmented-control', className)}
>
  {#each options as option (option.value)}
    {@const selected = value === option.value}
    {@const enabledIndex = enabledOptions.findIndex(candidate => candidate.value === option.value)}
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled || option.disabled ? 'true' : undefined}
      tabindex={!disabled && !option.disabled && option.value === tabValue ? 0 : -1}
      disabled={disabled || option.disabled}
      data-svadmin-segment-value={option.value}
      class={cn('svadmin-segmented-control__item', selected && 'svadmin-segmented-control__item--selected')}
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
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }

  .svadmin-segmented-control__item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
