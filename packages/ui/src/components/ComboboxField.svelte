<script lang="ts">
  import { definedReactiveOptions } from '@svadmin/core/options';

  import { useTranslation } from '@svadmin/core/i18n';
  import { captureAdminContext, captureAuthSession, useResourceContract, useSelect } from '@svadmin/core';
  import { onDestroy, untrack } from 'svelte';
  import { on } from 'svelte/events';
  import type { BaseRecord, Filter } from '@svadmin/core';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import type { ButtonProps } from './ui/button/index.js';
  import { Button } from './ui/button/index.js';
  import { Command } from './ui/command/index.js';
  import { Skeleton } from './ui/skeleton/index.js';
  import { ChevronsUpDown, Check, X, Search, RotateCw } from '@lucide/svelte';

  const i18n = useTranslation();

  function menuInteractions(node: HTMLElement) {
    const handler = (e: MouseEvent) => {
      if (e.target instanceof Node && !node.contains(e.target) && open) closeMenu();
    };
    document.addEventListener('click', handler, true);
    const removeKeydown = on(node, 'keydown', handleMenuKeydown);
    return { destroy() {
      document.removeEventListener('click', handler, true);
      removeKeydown();
    } };
  }

  interface Props extends Omit<HTMLButtonAttributes, 'value' | 'onchange' | 'children' | 'onclick' | 'type'> {
    resource: string;
    value?: string | number | null | (string | number)[];
    onchange?: (value: string | number | null | (string | number)[]) => void;
    optionLabel?: string;
    optionValue?: string;
    placeholder?: string;
    searchable?: boolean;
    multiple?: boolean;
    onSearch?: (value: string) => Filter[];
    fetchSize?: number;
    requestTimeout?: number;
    virtualized?: boolean;
    itemHeight?: number;
    viewportHeight?: number;
    id?: string;
    class?: string;
  }

  let {
    resource,
    value = null,
    onchange,
    optionLabel = 'title',
    optionValue = 'id',
    placeholder,
    searchable = true,
    multiple = false,
    onSearch,
    fetchSize = 50,
    requestTimeout,
    virtualized = true,
    itemHeight = 36,
    viewportHeight = 280,
    disabled = false,
    ...restProps
  }: Props = $props();

  const buttonRestProps = $derived(restProps as Omit<ButtonProps, 'children' | 'variant' | 'size'>);
  let open = $state(false);
  let searchInputValue = $state('');
  let page = $state(1);
  let appliedSearch = $state('');
  let triggerButton = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let searchInput = $state<HTMLInputElement | null>(null);
  let commandRoot = $state<HTMLElement | null>(null);
  let listElement = $state<HTMLElement | null>(null);
  let listScrollTop = $state(0);
  let activeIndex = $state(-1);
  let loadMoreButton = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  onDestroy(() => clearTimeout(timer));
  const normalizedFetchSize = $derived(
    Number.isSafeInteger(fetchSize) && fetchSize >= 10 && fetchSize <= 200 ? fetchSize : 50,
  );
  const normalizedItemHeight = $derived(
    Number.isSafeInteger(itemHeight) && itemHeight >= 32 && itemHeight <= 100 ? itemHeight : 36,
  );
  const normalizedViewportHeight = $derived(
    Number.isSafeInteger(viewportHeight) && viewportHeight >= 120 && viewportHeight <= 800 ? viewportHeight : 280,
  );

  const binding = useResourceContract(() => resource);
  const context = captureAdminContext();
  const instanceId = $props.id();
  const listboxId = $derived(`${instanceId}-listbox`);
  const optionId = (index: number) => `${instanceId}-option-${index}`;
  const sourceScope = $derived({
    contract: binding.resource, provider: context.providers?.[binding.dataProviderName],
    meta: JSON.stringify(binding.meta), tenant: context.tenantCacheKey?.__svadminTenant,
    auth: context.authProvider, session: captureAuthSession(context.authProvider).cacheKey,
    access: context.accessControlProvider, router: context.routerProvider,
    optionLabel, optionValue, onSearch, searchable, normalizedFetchSize, requestTimeout: String(requestTimeout),
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
        filters: appliedSearch && (onSearch || searchable)
          ? (onSearch ?? defaultSearch)(appliedSearch)
          : [],
        invalid: false,
      };
    } catch { return { filters: [], invalid: true }; }
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
        throw new TypeError('Invalid select value field');
      };
    },
    get projectionKey() { return `combobox:${optionLabel}:${optionValue}`; },
    get fetchSize() { return normalizedFetchSize; },
    get requestTimeout() { return requestTimeout; },
    get pagination() { return { current: page, pageSize: normalizedFetchSize }; },
    get defaultValue() {
      if (Array.isArray(value)) return value;
      return value === null || value === undefined || value === '' ? [] : [value];
    },
    get filters() { return searchFilters.filters; },
    get queryOptions() { return { enabled: !searchFilters.invalid }; },
  }));
  onDestroy(() => select.cancel());

  $effect.pre(() => {
    const nextScope = sourceScope;
    const previousScope = untrack(() => observedSourceScope);
    // 字段说明和错误更新不改变查询作用域，也不应打断当前操作。
    if (sameSourceScope(previousScope, nextScope)) return;
    observedSourceScope = nextScope;
    clearTimeout(timer);
    searchInputValue = appliedSearch = '';
    open = false;
    page = 1;
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

  const selectedValues = $derived(
    Array.isArray(value) ? value : value === null || value === undefined ? [] : [value],
  );
  const availableOptions = $derived.by(() => {
    if (select.isError || searchFilters.invalid) return [];
    const options = new Map<string | number, Option>(
      loaded && sameSourceScope(loaded.scope, sourceScope) && loaded.search === appliedSearch
        ? loaded.options.map(option => [option.value, option]) : [],
    );
    for (const option of select.options) options.set(option.value, option);
    return [...options.values()];
  });
  const totalOptions = $derived(select.query.data?.total ?? availableOptions.length);
  const shouldVirtualize = $derived(virtualized && availableOptions.length >= 200);
  const virtualTotalHeight = $derived(availableOptions.length * normalizedItemHeight);
  const virtualMaxScroll = $derived(Math.max(0, virtualTotalHeight - normalizedViewportHeight));
  const clampedListScrollTop = $derived(Math.max(0, Math.min(listScrollTop, virtualMaxScroll)));
  const virtualStart = $derived(Math.max(0, Math.floor(clampedListScrollTop / normalizedItemHeight) - 5));
  const virtualEnd = $derived(Math.min(availableOptions.length,
    Math.ceil((clampedListScrollTop + normalizedViewportHeight) / normalizedItemHeight) + 5));
  const renderedOptions = $derived(shouldVirtualize
    ? availableOptions.slice(virtualStart, virtualEnd) : availableOptions);
  const activeOptionId = $derived(shouldVirtualize && activeIndex >= 0 && availableOptions[activeIndex]
    && activeIndex >= virtualStart && activeIndex < virtualEnd ? optionId(activeIndex) : undefined);
  const hasMore = $derived((totalOptions > page * normalizedFetchSize || (select.query.isFetching && page > 1)) && !select.isError
    && !searchFilters.invalid && searchInputValue === appliedSearch);
  const invalidOptions = $derived(select.isError || searchFilters.invalid);
  // 已确认值的回显独立于候选列表的错误/搜索过滤，避免后续分页失败或搜索期间清空选中摘要。
  const selectionOptions = $derived.by(() => {
    const options = new Map<string | number, Option>();
    // 已选记录查询失败时沿用旧实现的隐藏标签边界，不能用旧页缓存回显。
    if (select.defaultValueQuery.isError) return options;
    if (loaded && sameSourceScope(loaded.scope, sourceScope)) {
      for (const option of loaded.options) options.set(option.value, option);
    }
    for (const option of select.options) options.set(option.value, option);
    return options;
  });
  const selectedLabels = $derived(selectedValues.flatMap(selectedValue => {
    const option = selectionOptions.get(selectedValue);
    return option ? [option.label] : [];
  }));
  const selectedLabel = $derived(selectedLabels.join(', '));

  $effect.pre(() => {
    if (disabled) closeMenu();
  });
  $effect(() => {
    if (open && !disabled) (searchable ? searchInput : commandRoot)?.focus();
  });
  $effect.pre(() => {
    if (!hasMore && open && loadMoreButton && document.activeElement === loadMoreButton) {
      (searchable ? searchInput : commandRoot)?.focus();
    }
  });
  $effect(() => {
    const count = availableOptions.length;
    if (activeIndex >= count) activeIndex = count > 0 ? count - 1 : -1;
  });
  $effect(() => {
    if (!shouldVirtualize || activeIndex < 0) return;
    if (activeIndex < virtualStart || activeIndex >= virtualEnd) activeIndex = -1;
  });
  $effect(() => {
    if (listScrollTop !== clampedListScrollTop) {
      listScrollTop = clampedListScrollTop;
      if (listElement) listElement.scrollTop = clampedListScrollTop;
    }
  });

  function closeMenu(restoreFocus = false): void {
    open = false;
    activeIndex = -1;
    resetSearch();
    if (restoreFocus && !disabled) triggerButton?.focus();
  }

  function retainMultiSelectFocus(): void {
    if (!open || disabled) return;
    const target = searchable ? searchInput : commandRoot;
    const active = document.activeElement;
    if (!target || (active !== document.body && active !== document.documentElement
      && !commandRoot?.contains(active))) return;
    target.focus();
  }

  function handleSelect(optValue: string | number) {
    if (disabled || invalidOptions || select.isFetching || searchInputValue !== appliedSearch) return;
    if (multiple) {
      const next = selectedValues.includes(optValue)
        ? selectedValues.filter(selectedValue => selectedValue !== optValue)
        : [...selectedValues, optValue];
      onchange?.(next);
      retainMultiSelectFocus();
      return;
    }
    const next = optValue === value ? null : optValue;
    closeMenu(true);
    onchange?.(next);
  }

  function handleClear(e: Event) {
    e.stopPropagation();
    if (disabled) return;
    closeMenu(true);
    onchange?.(multiple ? [] : null);
  }

  function resetSearch(): void {
    clearTimeout(timer);
    timer = undefined;
    searchInputValue = appliedSearch = '';
    page = 1;
    loaded = undefined;
    listScrollTop = 0;
    activeIndex = -1;
    if (listElement) listElement.scrollTop = 0;
    select.cancel();
  }

  function handleSearchInput(e: Event) {
    if (!(e.currentTarget instanceof HTMLInputElement)) return;
    const v = e.currentTarget.value;
    searchInputValue = v;
    clearTimeout(timer);
    const scope = sourceScope;
    const apply = () => {
      if (!open || searchInputValue !== v || !sameSourceScope(scope, sourceScope) || disabled) return;
      appliedSearch = v;
      page = 1;
      loaded = undefined;
      listScrollTop = 0;
      activeIndex = -1;
      if (listElement) listElement.scrollTop = 0;
    };
    if (!v) apply();
    else timer = setTimeout(apply, 300);
  }

  function loadMore(): void {
    if (disabled || select.isFetching || !hasMore) return;
    page += 1;
  }

  function handleTriggerKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || disabled || event.isComposing
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (open) (searchable ? searchInput : commandRoot)?.focus();
      else open = true;
    }
  }

  function isButtonKeydown(
    event: KeyboardEvent,
  ): event is KeyboardEvent & { currentTarget: HTMLButtonElement } {
    return event.currentTarget instanceof HTMLButtonElement;
  }

  function handleTriggerKeydownWithHost(event: KeyboardEvent): void {
    if (isButtonKeydown(event)) restProps.onkeydown?.(event);
    handleTriggerKeydown(event);
  }

  function handleMenuKeydown(event: KeyboardEvent): void {
    if (!open || event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
    event.preventDefault();
    event.stopPropagation();
    closeMenu(true);
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
    const count = availableOptions.length;
    if (!count) {
      activeIndex = -1;
      return;
    }
    const start = activeIndex < 0 ? (delta > 0 ? -1 : count) : activeIndex;
    activeIndex = (start + delta + count) % count;
    revealActive();
  }

  // 窗口化只挂载少量 Command.Item，键盘导航必须基于完整候选而不是已挂载节点。
  function handleVirtualNavigation(event: KeyboardEvent): void {
    if (!open || disabled || event.defaultPrevented || event.isComposing
      || event.altKey || event.ctrlKey || event.metaKey || !shouldVirtualize) return;
    const target = event.target;
    if (!(target instanceof Node) || (target !== searchInput
      && !(commandRoot && commandRoot.contains(target)))) return;
    if (!availableOptions.length) return;
    const key = event.key;
    if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End') {
      event.preventDefault();
      event.stopPropagation();
      if (key === 'ArrowDown' || key === 'ArrowUp') moveActive(key === 'ArrowDown' ? 1 : -1);
      else {
        activeIndex = key === 'Home' ? 0 : availableOptions.length - 1;
        revealActive();
      }
      return;
    }
    if (key === 'Enter' && activeIndex >= 0) {
      const option = availableOptions[activeIndex];
      if (!option) return;
      event.preventDefault();
      event.stopPropagation();
      handleSelect(option.value);
    }
  }

  function handleFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    // 点击不可聚焦的选项时 relatedTarget 为空，保留弹层以完成随后的 click。
    if (next instanceof Node && event.currentTarget instanceof HTMLElement
      && !event.currentTarget.contains(next)) closeMenu();
  }

</script>

{#snippet optionRow(opt: Option, index: number)}
  <Command.Item
    id={optionId(index)}
    disabled={select.isFetching || searchInputValue !== appliedSearch}
    value={`${typeof opt.value}:${opt.value}`}
    onSelect={() => handleSelect(opt.value)}
    style={shouldVirtualize ? `height:${normalizedItemHeight}px;` : undefined}
    class="svadmin-u-d89972fe17d6 svadmin-u-60fbb7713999 svadmin-u-50ca6ba56aa3 svadmin-u-7f6912283f11 svadmin-u-3960ffc248d9 svadmin-u-36d4469299aa svadmin-u-d5eab218aa34 svadmin-u-ec0091ee009b svadmin-u-fc7473ca09eb svadmin-u-df37b1fd9495 svadmin-u-99afb1cc3b47 svadmin-u-529780e25268"
  >
    <Check class="svadmin-u-d2347e8497a9 svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c {selectedValues.includes(opt.value) ? 'svadmin-u-3972e98dc84f' : 'svadmin-u-7065497e1ca0'}" />
    {opt.label}
  </Command.Item>
{/snippet}

<div class="svadmin-u-d89972fe17d6" use:menuInteractions onfocusout={handleFocusOut}
  onkeydowncapture={handleVirtualNavigation}>
  <div class="select-control">
  <Button
    bind:ref={triggerButton}
    variant="outline"
    type="button"
    class="svadmin-u-6da6a3c3f741 svadmin-u-8ef2268efbbc svadmin-u-8ecebc9f80e6"
    onclick={() => { if (open) closeMenu(); else open = true; }}
    {...buttonRestProps}
    onkeydown={handleTriggerKeydownWithHost}
    {disabled}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls={open ? listboxId : undefined}
    aria-multiselectable={multiple || undefined}
    aria-busy={select.isFetching}
    aria-invalid={invalidOptions || restProps['aria-invalid']}
  >
    {#if selectedLabel}
      <span class="svadmin-u-f283ea9bea0e">{selectedLabel}</span>
    {:else}
      <span class="svadmin-u-bfa603190748">{placeholder ?? i18n.t('field.selectPlaceholder')}</span>
    {/if}
    <ChevronsUpDown class="svadmin-u-fb56d9cff341 svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-012fbd121f37 svadmin-u-0b8c506a0596" />
  </Button>
  {#if selectedValues.length}
    <Button type="button" variant="ghost" size="icon-sm" {disabled}
      title={i18n.t('common.clear')} aria-label={i18n.t('common.clear')} onclick={handleClear}>
      <X class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
    </Button>
  {/if}
  </div>
  {#if invalidOptions}
    <div role="alert" class="select-error">
      <span>{i18n.t('select.loadFailed')}</span>
      <Button type="button" variant="ghost" size="icon-sm" disabled={disabled || select.isFetching}
        title={i18n.t('common.retry')} aria-label={i18n.t('common.retry')} onclick={() => select.refetch()}>
        <RotateCw class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
      </Button>
    </div>
  {/if}

  {#if open && !disabled}
    <div class="svadmin-u-da4dbfbc4fdc svadmin-u-181b286668b5 svadmin-u-b6b02c0ebef6 svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e541d86d1ec8 svadmin-u-06bbb43166db">
      <Command.Root bind:ref={commandRoot} shouldFilter={false} class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-2cd02d11d1af svadmin-u-421ac2be5045 svadmin-u-e541d86d1ec8 svadmin-u-9b13e8ae5c9c">
        {#if searchable}
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-65fdbade2025 svadmin-u-d5eab218aa34">
            <Search class="svadmin-u-82cc6c6581cd svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-012fbd121f37 svadmin-u-0b8c506a0596" />
            <Command.Input
              bind:ref={searchInput}
              bind:value={searchInputValue}
              oninput={handleSearchInput}
              aria-activedescendant={activeOptionId}
              placeholder={i18n.t('common.search')}
              class="svadmin-u-60fbb7713999 svadmin-u-e7a768f922d2 svadmin-u-6da6a3c3f741 svadmin-u-7f19cdf4c5bb svadmin-u-03b4dd7f172b svadmin-u-fc7473ca09eb svadmin-u-df37b1fd9495 svadmin-u-9c24ab70af61"
            />
          </div>
        {/if}
        <Command.List
          bind:ref={listElement}
          id={listboxId}
          role="listbox"
          tabindex={-1}
          aria-activedescendant={activeOptionId}
          aria-multiselectable={multiple || undefined}
          style={shouldVirtualize
            ? `height:${normalizedViewportHeight}px;max-height:${normalizedViewportHeight}px;overflow-y:auto;` : undefined}
          onscroll={(event: Event) => {
            if (event.currentTarget instanceof HTMLElement) listScrollTop = event.currentTarget.scrollTop;
          }}
          class="svadmin-u-558f64349245 svadmin-u-92bf82f493b1 svadmin-u-eb6a3cef9686"
        >
          {#if select.isLoading}
            {#each Array(3) as _, _i (_i)}
              <div class="svadmin-u-d5eab218aa34 svadmin-u-ec0091ee009b"><Skeleton class="svadmin-u-cd0d9c512cdc svadmin-u-6da6a3c3f741" /></div>
            {/each}
          {:else if !invalidOptions}
            {#if !availableOptions.length}
              <Command.Empty class="svadmin-u-cb11fec3bb46 svadmin-u-ca6bf63030aa svadmin-u-359090c2d529 svadmin-u-bfa603190748">
                {i18n.t('select.noResults')}
              </Command.Empty>
            {/if}
            {#if shouldVirtualize}
              <div style={`height:${virtualTotalHeight}px;position:relative;`}>
                <div style={`position:absolute;top:${virtualStart * normalizedItemHeight}px;left:0;right:0;`}>
                  {#each renderedOptions as opt, offset (`${typeof opt.value}:${opt.value}`)}
                    {@render optionRow(opt, virtualStart + offset)}
                  {/each}
                </div>
              </div>
            {:else}
              {#each renderedOptions as opt, index (`${typeof opt.value}:${opt.value}`)}
                {@render optionRow(opt, index)}
              {/each}
            {/if}
          {/if}
        </Command.List>
      </Command.Root>
      {#if hasMore}
        <Button bind:ref={loadMoreButton} type="button" variant="ghost" size="sm"
          aria-disabled={select.isFetching} aria-busy={select.isFetching} onclick={loadMore}>
          {i18n.t('select.loadMore')}
        </Button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .select-control, .select-error {
    display: flex;
    align-items: center;
    gap: 4px;
    min-inline-size: 0;
  }
  .select-control > :global(button[data-slot='button']:first-child) {
    flex: 1 1 auto;
    min-inline-size: 0;
  }
  .select-error {
    color: var(--destructive);
    font-size: 0.875rem;
  }
</style>
