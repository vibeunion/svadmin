<script lang="ts">
  import { definedReactiveOptions } from '@svadmin/core/options';
  import { useTranslation } from '@svadmin/core/i18n';
  import {
    captureAdminContext, captureAuthSession, useResourceContract, useSelect,
  } from '@svadmin/core';
  import { onDestroy, untrack } from 'svelte';
  import type { BaseRecord, Filter } from '@svadmin/core';
  import { RotateCw, X } from '@lucide/svelte';

  interface Props {
    resource: string;
    value?: string | number | null;
    onchange?: (value: string | number | null) => void;
    optionLabel?: string;
    optionValue?: string;
    placeholder?: string;
    onSearch?: (value: string) => Filter[];
    fetchSize?: number;
    requestTimeout?: number;
    debounce?: number;
    virtualized?: boolean;
    itemHeight?: number;
    viewportHeight?: number;
    disabled?: boolean;
    id?: string;
    class?: string;
    'aria-label'?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean | 'true' | 'false';
  }

  let {
    resource,
    value = null,
    onchange,
    optionLabel = 'title',
    optionValue = 'id',
    placeholder,
    onSearch,
    fetchSize = 50,
    requestTimeout,
    debounce = 300,
    virtualized = true,
    itemHeight = 36,
    viewportHeight = 280,
    disabled = false,
    id,
    class: className,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedby,
    'aria-invalid': ariaInvalid,
  }: Props = $props();

  const i18n = useTranslation();
  const instanceId = $props.id();
  const inputId = $derived(id ?? `${instanceId}-input`);
  const listboxId = $derived(`${instanceId}-listbox`);
  const optionId = (index: number) => `${instanceId}-option-${index}`;

  let open = $state(false);
  let inputValue = $state('');
  let appliedSearch = $state('');
  // null means the input mirrors the selected label; a string means the user is drafting a search.
  let searchDraft = $state<string | null>(null);
  const searchPending = $derived(searchDraft !== null && searchDraft !== appliedSearch);
  let page = $state(1);
  let activeIndex = $state(-1);
  let listScrollTop = $state(0);
  let inputElement = $state<HTMLInputElement | null>(null);
  let listElement = $state<HTMLElement | null>(null);
  let rootElement = $state<HTMLElement | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  onDestroy(() => clearTimeout(timer));

  const normalizedFetchSize = $derived(
    Number.isSafeInteger(fetchSize) && fetchSize >= 10 && fetchSize <= 200 ? fetchSize : 50,
  );
  const normalizedDebounce = $derived(
    typeof debounce === 'number' && Number.isSafeInteger(debounce)
      && debounce >= 0 && debounce <= 2_147_483_647 ? debounce : 300,
  );
  const normalizedItemHeight = $derived(
    Number.isSafeInteger(itemHeight) && itemHeight >= 32 && itemHeight <= 100 ? itemHeight : 36,
  );
  const normalizedViewportHeight = $derived(
    Number.isSafeInteger(viewportHeight) && viewportHeight >= 120 && viewportHeight <= 800 ? viewportHeight : 280,
  );

  const binding = useResourceContract(() => resource);
  const context = captureAdminContext();
  const sourceScope = $derived({
    contract: binding.resource, provider: context.providers?.[binding.dataProviderName],
    meta: JSON.stringify(binding.meta), tenant: context.tenantCacheKey?.__svadminTenant,
    auth: context.authProvider, session: captureAuthSession(context.authProvider).cacheKey,
    access: context.accessControlProvider, router: context.routerProvider,
    optionLabel, optionValue, onSearch, normalizedFetchSize, requestTimeout: String(requestTimeout),
  });
  function sameSourceScope(left: typeof sourceScope, right: typeof sourceScope): boolean {
    return (Object.keys(left) as (keyof typeof sourceScope)[]).every(key => left[key] === right[key]);
  }
  type Option = { value: string | number; label: string };
  let loaded = $state.raw<{ scope: typeof sourceScope; search: string; options: Option[] }>();
  let observedSourceScope = untrack(() => sourceScope);

  const defaultSearch = $derived.by(() => {
    const field = optionLabel;
    return (v: string): Filter[] => v ? [{ field, operator: 'contains', value: v }] : [];
  });
  const searchFilters = $derived.by(() => {
    try {
      return {
        filters: appliedSearch ? (onSearch ?? defaultSearch)(appliedSearch) : [],
        invalid: false,
      };
    } catch {
      return { filters: [], invalid: true };
    }
  });
  const select = useSelect(definedReactiveOptions({
    get resource() { return binding.resource; },
    get dataProviderName() { return binding.dataProviderName; },
    get optionLabel() { return optionLabel; },
    get optionValue() {
      const field = optionValue;
      return (row: BaseRecord) => {
        const candidate = row[field];
        if (typeof candidate === 'string' || (typeof candidate === 'number' && Number.isFinite(candidate))) return candidate;
        throw new TypeError('Invalid autocomplete value field');
      };
    },
    get projectionKey() { return `autocomplete:${optionLabel}:${optionValue}`; },
    get fetchSize() { return normalizedFetchSize; },
    get requestTimeout() { return requestTimeout; },
    get pagination() { return { current: page, pageSize: normalizedFetchSize }; },
    get defaultValue() {
      return value === null || value === undefined || value === '' ? [] : [value];
    },
    get filters() { return searchFilters.filters; },
    get queryOptions() { return { enabled: !searchFilters.invalid }; },
  }));
  onDestroy(() => select.cancel());

  $effect.pre(() => {
    const nextScope = sourceScope;
    const previousScope = untrack(() => observedSourceScope);
    if (sameSourceScope(previousScope, nextScope)) return;
    observedSourceScope = nextScope;
    clearTimeout(timer);
    open = false;
    inputValue = appliedSearch = '';
    searchDraft = null;
    page = 1;
    activeIndex = -1;
    loaded = undefined;
    listScrollTop = 0;
    select.cancel();
  });

  $effect(() => {
    const data = select.query.data;
    if (!data || select.query.isFetching || select.isError || searchFilters.invalid) return;
    const scope = sourceScope;
    const search = appliedSearch;
    const previous = untrack(() => loaded);
    const options = new Map<string | number, Option>(
      page > 1 && previous && sameSourceScope(previous.scope, scope) && previous.search === search
        ? previous.options.map(option => [option.value, option]) : [],
    );
    for (const option of data.options) options.set(option.value, option);
    loaded = { scope, search, options: [...options.values()] };
  });

  const availableOptions = $derived.by(() => {
    if (select.isError || searchFilters.invalid) return [];
    const options = new Map<string | number, Option>(
      loaded && sameSourceScope(loaded.scope, sourceScope) && loaded.search === appliedSearch
        ? loaded.options.map(option => [option.value, option]) : [],
    );
    for (const option of select.options) options.set(option.value, option);
    return [...options.values()];
  });
  const selectionOptions = $derived.by(() => {
    const options = new Map<string | number, Option>();
    if (select.defaultValueQuery.isError) return options;
    if (loaded && sameSourceScope(loaded.scope, sourceScope)) {
      for (const option of loaded.options) options.set(option.value, option);
    }
    for (const option of select.options) options.set(option.value, option);
    return options;
  });
  const selectedLabel = $derived(value === null || value === undefined
    ? '' : selectionOptions.get(value)?.label ?? '');
  const totalOptions = $derived(select.query.data?.total ?? availableOptions.length);
  const hasMore = $derived(open && (totalOptions > page * normalizedFetchSize
    || (select.query.isFetching && page > 1)) && !select.isError && !searchFilters.invalid
    && !searchPending);
  const invalidOptions = $derived(select.isError || searchFilters.invalid);

  const shouldVirtualize = $derived(virtualized && availableOptions.length >= 200);
  const virtualTotalHeight = $derived(availableOptions.length * normalizedItemHeight);
  const virtualMaxScroll = $derived(Math.max(0, virtualTotalHeight - normalizedViewportHeight));
  const clampedListScrollTop = $derived(Math.max(0, Math.min(listScrollTop, virtualMaxScroll)));
  const virtualStart = $derived(Math.max(0, Math.floor(clampedListScrollTop / normalizedItemHeight) - 5));
  const virtualEnd = $derived(Math.min(availableOptions.length,
    Math.ceil((clampedListScrollTop + normalizedViewportHeight) / normalizedItemHeight) + 5));
  const renderedOptions = $derived(shouldVirtualize
    ? availableOptions.slice(virtualStart, virtualEnd) : availableOptions);
  const activeOptionId = $derived(open && activeIndex >= 0 && availableOptions[activeIndex]
    && (!shouldVirtualize || (activeIndex >= virtualStart && activeIndex < virtualEnd))
    ? optionId(activeIndex) : undefined);

  let observedValue = untrack(() => value);
  $effect(() => {
    const currentValue = value;
    if (currentValue !== observedValue) {
      observedValue = currentValue;
      if (open) {
        inputValue = selectedLabel;
        appliedSearch = '';
        searchDraft = null;
        page = 1;
        loaded = undefined;
        activeIndex = -1;
        listScrollTop = 0;
      }
    }
    if (!open && inputValue !== selectedLabel) inputValue = selectedLabel;
  });
  $effect(() => {
    const count = availableOptions.length;
    if (activeIndex >= count) activeIndex = count > 0 ? count - 1 : -1;
  });
  $effect(() => {
    if (!shouldVirtualize || activeIndex < 0) return;
    if (activeIndex < virtualStart || activeIndex >= virtualEnd) activeIndex = -1;
  });
  $effect.pre(() => {
    if (disabled) closeMenu(false);
  });
  $effect(() => {
    if (listScrollTop !== clampedListScrollTop) {
      listScrollTop = clampedListScrollTop;
      if (listElement) listElement.scrollTop = clampedListScrollTop;
    }
  });

  function closeMenu(restore: boolean): void {
    open = false;
    activeIndex = -1;
    searchDraft = null;
    clearTimeout(timer);
    timer = undefined;
    select.cancel();
    if (restore) inputValue = selectedLabel;
  }

  function outsideInteractions(node: HTMLElement) {
    const handler = (event: MouseEvent) => {
      if (event.target instanceof Node && !node.contains(event.target) && open) closeMenu(true);
    };
    document.addEventListener('click', handler, true);
    return { destroy() { document.removeEventListener('click', handler, true); } };
  }

  function handleFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget instanceof HTMLElement
      && !event.currentTarget.contains(next)) closeMenu(true);
  }

  function resetSearch(): void {
    appliedSearch = '';
    searchDraft = null;
    page = 1;
    loaded = undefined;
    activeIndex = -1;
    listScrollTop = 0;
    if (listElement) listElement.scrollTop = 0;
  }

  function openMenu(): void {
    if (disabled) return;
    if (!open) {
      resetSearch();
      inputValue = selectedLabel;
      open = true;
    }
    activeIndex = -1;
  }

  function applySearch(value: string): void {
    appliedSearch = value;
    page = 1;
    loaded = undefined;
    activeIndex = -1;
    listScrollTop = 0;
    if (listElement) listElement.scrollTop = 0;
  }

  function handleInput(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return;
    const next = event.currentTarget.value;
    openMenu();
    inputValue = next;
    searchDraft = next;
    clearTimeout(timer);
    const scope = sourceScope;
    const apply = () => {
      if (!open || inputValue !== next || !sameSourceScope(scope, sourceScope) || disabled) return;
      applySearch(next);
    };
    if (!next || normalizedDebounce === 0) apply();
    else timer = setTimeout(apply, normalizedDebounce);
  }

  function pick(option: Option): void {
    if (disabled || invalidOptions || select.isFetching || searchPending) return;
    if (!availableOptions.some(candidate => candidate.value === option.value)) return;
    inputValue = option.label;
    closeMenu(false);
    onchange?.(option.value);
  }

  function revealActive(): void {
    if (!shouldVirtualize || activeIndex < 0) return;
    const top = activeIndex * normalizedItemHeight;
    const bottom = top + normalizedItemHeight;
    if (top < clampedListScrollTop) listScrollTop = top;
    else if (bottom > clampedListScrollTop + normalizedViewportHeight) {
      listScrollTop = bottom - normalizedViewportHeight;
    }
    if (listElement) listElement.scrollTop = listScrollTop;
  }

  function moveActive(delta: number): void {
    if (!open) openMenu();
    const count = availableOptions.length;
    if (!count) return;
    const start = activeIndex < 0 ? (delta > 0 ? -1 : count) : activeIndex;
    activeIndex = (start + delta + count) % count;
    revealActive();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || disabled || event.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if ((event.key === 'Home' || event.key === 'End') && open && activeIndex >= 0
      && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const count = availableOptions.length;
      if (!count) return;
      event.preventDefault();
      activeIndex = event.key === 'Home' ? 0 : count - 1;
      revealActive();
      return;
    }
    if (event.key === 'Enter') {
      if (open && activeIndex >= 0) {
        const option = availableOptions[activeIndex];
        if (option) {
          event.preventDefault();
          pick(option);
        }
      }
      return;
    }
    if (event.key === 'Escape') {
      if (!open) return;
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
      return;
    }
    if (event.key === 'Tab') closeMenu(true);
  }

  function loadMore(): void {
    if (disabled || select.isFetching || !hasMore) return;
    page += 1;
  }
</script>

<div class="autocomplete {className ?? ''}" bind:this={rootElement} use:outsideInteractions onfocusout={handleFocusOut}>
  <input
    bind:this={inputElement}
    id={inputId}
    type="text"
    role="combobox"
    autocomplete="off"
    spellcheck="false"
    aria-autocomplete="list"
    aria-expanded={open}
    aria-controls={open ? listboxId : undefined}
    aria-activedescendant={activeOptionId}
    aria-label={ariaLabel}
    aria-describedby={ariaDescribedby}
    aria-invalid={invalidOptions || ariaInvalid || undefined}
    aria-busy={select.isFetching}
    placeholder={placeholder ?? i18n.t('field.selectPlaceholder')}
    value={inputValue}
    {disabled}
    oninput={handleInput}
    onfocus={() => openMenu()}
    onclick={() => openMenu()}
    onkeydown={handleKeydown}
  />
  {#if value !== null && value !== undefined}
    <button
      type="button"
      class="autocomplete-clear"
      title={i18n.t('common.clear')}
      aria-label={i18n.t('common.clear')}
      onclick={(event: MouseEvent) => {
        event.stopPropagation();
        inputValue = '';
        closeMenu(false);
        onchange?.(null);
      }}
    >
      <X aria-hidden="true" />
    </button>
  {/if}
  {#if open && !disabled}
    <div class="autocomplete-popup">
      <div
        bind:this={listElement}
        id={listboxId}
        role="listbox"
        tabindex={-1}
        style={shouldVirtualize
          ? `height:${normalizedViewportHeight}px;max-height:${normalizedViewportHeight}px;overflow-y:auto;` : undefined}
        onscroll={(event: Event) => {
          if (event.currentTarget instanceof HTMLElement) listScrollTop = event.currentTarget.scrollTop;
        }}
      >
        {#if select.isLoading}
          <div role="status" class="autocomplete-state">{i18n.t('common.loading')}</div>
        {:else if invalidOptions}
          <div role="alert" class="autocomplete-error">
            <span>{i18n.t('select.loadFailed')}</span>
            <button type="button" disabled={select.isFetching}
              title={i18n.t('common.retry')} aria-label={i18n.t('common.retry')} onclick={() => select.refetch()}>
              <RotateCw aria-hidden="true" />
            </button>
          </div>
        {:else if !availableOptions.length}
          <div class="autocomplete-state">{i18n.t('select.noResults')}</div>
        {:else if shouldVirtualize}
          <div style={`height:${virtualTotalHeight}px;position:relative;`}>
            <div style={`position:absolute;top:${virtualStart * normalizedItemHeight}px;left:0;right:0;`}>
              {#each renderedOptions as option, offset (`${typeof option.value}:${option.value}`)}
                {@const index = virtualStart + offset}
                <button
                  type="button"
                  tabindex={-1}
                  id={optionId(index)}
                  role="option"
                  aria-selected={option.value === value}
                  aria-posinset={index + 1}
                  aria-setsize={availableOptions.length}
                  class="autocomplete-option"
                  class:active={index === activeIndex}
                  style={`height:${normalizedItemHeight}px;`}
                  onmousedown={(event: MouseEvent) => event.preventDefault()}
                  onclick={() => pick(option)}
                >{option.label}</button>
              {/each}
            </div>
          </div>
        {:else}
          {#each availableOptions as option, index (`${typeof option.value}:${option.value}`)}
            <button
              type="button"
              tabindex={-1}
              id={optionId(index)}
              role="option"
              aria-selected={option.value === value}
              aria-posinset={index + 1}
              aria-setsize={availableOptions.length}
              class="autocomplete-option"
              class:active={index === activeIndex}
              onmousedown={(event: MouseEvent) => event.preventDefault()}
              onclick={() => pick(option)}
            >{option.label}</button>
          {/each}
        {/if}
      </div>
      {#if hasMore}
        <button type="button" class="autocomplete-more" aria-disabled={select.isFetching}
          aria-busy={select.isFetching} onclick={loadMore}>
          {i18n.t('select.loadMore')}
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .autocomplete {
    position: relative;
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
  }
  .autocomplete > input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--border);
    border-radius: var(--radius-md, 0.375rem);
    background: var(--background);
    color: var(--foreground);
    padding: 0.5rem 2rem 0.5rem 0.75rem;
    font-size: 0.875rem;
    outline: none;
  }
  .autocomplete-clear {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-end: 0.5rem;
    display: inline-flex;
    transform: translateY(-50%);
    border: 0;
    background: transparent;
    color: var(--muted-foreground);
    cursor: pointer;
  }
  .autocomplete-clear :global(svg) {
    width: 1rem;
    height: 1rem;
  }
  .autocomplete > input:focus-visible {
    border-color: var(--ring);
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 35%, transparent);
  }
  .autocomplete > input:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  .autocomplete-popup {
    position: absolute;
    inset-inline: 0;
    top: calc(100% + 4px);
    z-index: 50;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius-md, 0.375rem);
    background: var(--popover);
    color: var(--popover-foreground);
    box-shadow: 0 8px 24px color-mix(in oklab, var(--foreground) 12%, transparent);
  }
  .autocomplete [role='listbox'] {
    max-height: 18rem;
    overflow-y: auto;
    padding: 4px;
  }
  .autocomplete-option {
    display: flex;
    width: 100%;
    border: 0;
    background: transparent;
    color: inherit;
    text-align: start;
    align-items: center;
    border-radius: 0.125rem;
    padding: 0.375rem 0.5rem;
    font-size: 0.875rem;
    cursor: default;
    user-select: none;
  }
  .autocomplete-option.active,
  .autocomplete-option[aria-selected='true'] {
    background: var(--accent);
    color: var(--accent-foreground);
  }
  .autocomplete-state {
    padding: 0.75rem;
    color: var(--muted-foreground);
    font-size: 0.875rem;
  }
  .autocomplete-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    color: var(--destructive);
    font-size: 0.875rem;
  }
  .autocomplete-error button,
  .autocomplete-more {
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
  .autocomplete-error :global(svg) {
    width: 1rem;
    height: 1rem;
  }
  .autocomplete-more {
    display: block;
    width: 100%;
    border-top: 1px solid var(--border);
    padding: 0.5rem;
    font-size: 0.875rem;
  }
</style>