<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Filter, X, Search } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { clickOutside } from '../actions.js';
  import { cn } from '../utils.js';

  interface OptionItem {
    label: string;
    value: string | number;
  }

  interface Props {
    title?: string;
    open?: boolean;
    active?: boolean;
    value?: unknown;
    options?: OptionItem[];
    placeholder?: string;
    applyLabel?: string;
    resetLabel?: string;
    align?: 'left' | 'right';
    onapply?: (value: unknown) => void;
    onreset?: () => void;
    children?: Snippet;
    trigger?: Snippet;
    class?: string;
  }

  let {
    title = 'Filter',
    open = $bindable(false),
    active,
    value = $bindable(undefined),
    options,
    placeholder = 'Search...',
    applyLabel = 'Apply',
    resetLabel = 'Reset',
    align = 'right',
    onapply,
    onreset,
    children,
    trigger,
    class: className = '',
  }: Props = $props();

  type OptionValue = OptionItem['value'];

  function isOptionValue(candidate: unknown): candidate is OptionValue {
    return typeof candidate === 'string' || typeof candidate === 'number';
  }

  function getTextValue(candidate: unknown): string {
    return typeof candidate === 'string' ? candidate : '';
  }

  function getSelectedValues(candidate: unknown): OptionValue[] {
    if (Array.isArray(candidate)) return candidate.filter(isOptionValue);
    return isOptionValue(candidate) && candidate !== '' ? [candidate] : [];
  }

  let internalTextValue = $state(getTextValue(value));
  let internalSelectedValues = $state<OptionValue[]>(getSelectedValues(value));
  let optionSearch = $state('');

  // Keep the editable draft aligned with controlled value changes.
  $effect(() => {
    internalTextValue = getTextValue(value);
    internalSelectedValues = getSelectedValues(value);
  });

  const isFilterActive = $derived(
    active !== undefined
      ? active
      : Array.isArray(value)
        ? value.length > 0
        : value != null && value !== ''
  );

  const filteredOptions = $derived(
    options
      ? optionSearch
        ? options.filter((opt) => opt.label.toLowerCase().includes(optionSearch.toLowerCase()))
        : options
      : []
  );

  function restoreDraft() {
    internalTextValue = getTextValue(value);
    internalSelectedValues = getSelectedValues(value);
    optionSearch = '';
  }

  function handleClose() {
    restoreDraft();
    open = false;
  }

  function handleClickOutside() {
    if (open) handleClose();
  }

  function handleTriggerClick() {
    if (open) {
      handleClose();
    } else {
      open = true;
    }
  }

  function toggleOption(optValue: OptionValue) {
    if (internalSelectedValues.includes(optValue)) {
      internalSelectedValues = internalSelectedValues.filter((v) => v !== optValue);
    } else {
      internalSelectedValues = [...internalSelectedValues, optValue];
    }
  }

  function handleApply() {
    if (options && options.length > 0) {
      const nextValue = [...internalSelectedValues];
      value = nextValue;
      onapply?.(nextValue);
    } else if (!children) {
      value = internalTextValue;
      onapply?.(internalTextValue);
    } else {
      onapply?.(value);
    }
    optionSearch = '';
    open = false;
  }

  function handleReset() {
    internalTextValue = '';
    internalSelectedValues = [];
    optionSearch = '';
    value = options && options.length > 0 ? [] : undefined;
    onreset?.();
    open = false;
  }
</script>

<div class={cn('relative inline-block text-left', className)} use:clickOutside={handleClickOutside}>
  {#if trigger}
    {@render trigger()}
  {:else}
    <Button
      variant={isFilterActive ? 'secondary' : 'ghost'}
      size="icon-sm"
      class={cn(
        'relative h-7 w-7 rounded-sm p-0 transition-colors',
        isFilterActive ? 'text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20' : 'text-muted-foreground hover:text-foreground'
      )}
      onclick={handleTriggerClick}
      aria-label={title}
      aria-expanded={open}
      aria-haspopup="dialog"
      title={title}
    >
      <Filter class="h-3.5 w-3.5" />
      {#if isFilterActive}
        <span class="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
      {/if}
    </Button>
  {/if}

  {#if open}
    <div
      class={cn(
        'absolute z-50 mt-1.5 w-64 rounded-md border border-border bg-popover text-popover-foreground shadow-lg outline-none animate-in fade-in-0 zoom-in-95',
        align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
      )}
      role="dialog"
      aria-label={title}
    >
      <div class="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <span class="text-xs font-semibold text-foreground">{title}</span>
        <button
          type="button"
          class="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          onclick={handleClose}
          aria-label="Close"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>

      <div class="p-3">
        {#if children}
          {@render children()}
        {:else if options && options.length > 0}
          {#if options.length > 5}
            <div class="relative mb-2">
              <Search class="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                bind:value={optionSearch}
                placeholder="Search options..."
                class="h-7 pl-7 text-xs"
              />
            </div>
          {/if}
          <div class="max-h-44 overflow-y-auto space-y-1.5 pr-1">
            {#each filteredOptions as opt (opt.value)}
              <label class="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-accent cursor-pointer">
                <input
                  type="checkbox"
                  checked={internalSelectedValues.includes(opt.value)}
                  onchange={() => toggleOption(opt.value)}
                  class="h-3.5 w-3.5 rounded border-muted-foreground text-primary focus:ring-primary"
                />
                <span class="flex-1 truncate">{opt.label}</span>
              </label>
            {:else}
              <div class="py-2 text-center text-xs text-muted-foreground">No options match</div>
            {/each}
          </div>
        {:else}
          <Input
            bind:value={internalTextValue}
            {placeholder}
            class="h-8 text-xs"
            onkeydown={(e) => { if (e.key === 'Enter') handleApply(); }}
          />
        {/if}
      </div>

      <div class="flex items-center justify-between border-t border-border/60 bg-muted/30 px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onclick={handleReset}
        >
          {resetLabel}
        </Button>
        <Button
          variant="default"
          size="sm"
          class="h-7 px-3 text-xs"
          onclick={handleApply}
        >
          {applyLabel}
        </Button>
      </div>
    </div>
  {/if}
</div>
