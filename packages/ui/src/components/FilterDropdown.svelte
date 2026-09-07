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

<div class={cn('svadmin-u-d89972fe17d6 svadmin-u-bb0c4bfc52bd svadmin-u-2eba0d65d059', className)} use:clickOutside={handleClickOutside}>
  {#if trigger}
    {@render trigger()}
  {:else}
    <Button
      variant={isFilterActive ? 'secondary' : 'ghost'}
      size="icon-sm"
      class={cn(
        'svadmin-u-d89972fe17d6 svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-36d4469299aa svadmin-u-8a539c7fe216 svadmin-u-ceb69a6b0e5f',
        isFilterActive ? 'svadmin-u-20aaf08a7ed1 svadmin-u-375dc44df6e9 svadmin-u-ca6bcd4b6f3f svadmin-u-a6afccfc915b svadmin-u-7f9a026b5897' : 'svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e'
      )}
      onclick={handleTriggerClick}
      aria-label={title}
      aria-expanded={open}
      aria-haspopup="dialog"
      title={title}
    >
      <Filter class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
      {#if isFilterActive}
        <span class="svadmin-u-da4dbfbc4fdc svadmin-u-2a95a5f480f7 svadmin-u-4c15f4f8c5ab svadmin-u-60fbb7713999 svadmin-u-2f2a842e50fa svadmin-u-940924b6e2d9">
          <span class="svadmin-u-e9963c2ac628 svadmin-u-da4dbfbc4fdc svadmin-u-52083e7da442 svadmin-u-668b21aa5409 svadmin-u-6da6a3c3f741 svadmin-u-ac204c108886 svadmin-u-75b1bec3ea0e svadmin-u-f854738e0622"></span>
          <span class="svadmin-u-d89972fe17d6 svadmin-u-52083e7da442 svadmin-u-ac204c108886 svadmin-u-2f2a842e50fa svadmin-u-940924b6e2d9 svadmin-u-75b1bec3ea0e"></span>
        </span>
      {/if}
    </Button>
  {/if}

  {#if open}
    <div
      class={cn(
        'svadmin-u-da4dbfbc4fdc svadmin-u-181b286668b5 svadmin-u-aac62f0e854f svadmin-u-6ca625288b1e svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-e541d86d1ec8 svadmin-u-9b13e8ae5c9c svadmin-u-06bbb43166db svadmin-u-df37b1fd9495 svadmin-u-40137e897961 fade-in-0 zoom-in-95',
        align === 'right' ? 'svadmin-u-d8cdcad240d1 svadmin-u-3c63a476b257' : 'svadmin-u-c78facc7a0a6 svadmin-u-2e479b8dbbd7'
      )}
      role="dialog"
      aria-label={title}
    >
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b">
        <span class="svadmin-u-359090c2d529 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{title}</span>
        <button
          type="button"
          class="svadmin-u-07389a777c1f svadmin-u-de8350a3bbad svadmin-u-bfa603190748 svadmin-u-0557b88819cd svadmin-u-ea7b2e9e070e"
          onclick={handleClose}
          aria-label="Close"
        >
          <X class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
        </button>
      </div>

      <div class="svadmin-u-eb6e8b881acd">
        {#if children}
          {@render children()}
        {:else if options && options.length > 0}
          {#if options.length > 5}
            <div class="svadmin-u-d89972fe17d6 svadmin-u-a77ed4d908c0">
              <Search class="svadmin-u-da4dbfbc4fdc svadmin-u-d83be576442b svadmin-u-d694ba66e322 svadmin-u-36b381be4df3 svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-bfa603190748" />
              <Input
                bind:value={optionSearch}
                placeholder="Search options..."
                class="svadmin-u-d0a52b312f7d svadmin-u-20ebde75765d svadmin-u-359090c2d529"
              />
            </div>
          {/if}
          <div class="svadmin-u-f81ede24db81 svadmin-u-92bf82f493b1 svadmin-u-5a2508227c6a svadmin-u-eda955402ba6">
            {#each filteredOptions as opt (opt.value)}
              <label class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-07389a777c1f svadmin-u-45d828117213 svadmin-u-660d2effb880 svadmin-u-359090c2d529 svadmin-u-0557b88819cd svadmin-u-34516836730d">
                <input
                  type="checkbox"
                  checked={internalSelectedValues.includes(opt.value)}
                  onchange={() => toggleOption(opt.value)}
                  class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-07389a777c1f svadmin-u-6ffcd84c45e5 svadmin-u-20aaf08a7ed1 svadmin-u-1a5f9520d7fa"
                />
                <span class="svadmin-u-36e579c0b41c svadmin-u-f283ea9bea0e">{opt.label}</span>
              </label>
            {:else}
              <div class="svadmin-u-03b4dd7f172b svadmin-u-ca6bf63030aa svadmin-u-359090c2d529 svadmin-u-bfa603190748">No options match</div>
            {/each}
          </div>
        {:else}
          <Input
            bind:value={internalTextValue}
            {placeholder}
            class="svadmin-u-ed8a5df7b2fb svadmin-u-359090c2d529"
            onkeydown={(e) => { if (e.key === 'Enter') handleApply(); }}
          />
        {/if}
      </div>

      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-b950dda299d3 svadmin-u-05faf5c801ff svadmin-u-2859c861d7de svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b">
        <Button
          variant="ghost"
          size="sm"
          class="svadmin-u-d0a52b312f7d svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e"
          onclick={handleReset}
        >
          {resetLabel}
        </Button>
        <Button
          variant="default"
          size="sm"
          class="svadmin-u-d0a52b312f7d svadmin-u-0e17f2bd9074 svadmin-u-359090c2d529"
          onclick={handleApply}
        >
          {applyLabel}
        </Button>
      </div>
    </div>
  {/if}
</div>
