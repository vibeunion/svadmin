<script lang="ts">
  import { definedReactiveOptions } from '@svadmin/core/options';

  import { useTranslation } from '@svadmin/core/i18n';
  import { captureAdminContext, captureAuthSession, useResourceContract, useSelect } from '@svadmin/core';
  import { onDestroy, untrack } from 'svelte';
  import type { BaseRecord, Filter } from '@svadmin/core';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import type { ButtonProps } from './ui/button/index.js';
  import { Button } from './ui/button/index.js';
  import { Command } from './ui/command/index.js';
  import { Skeleton } from './ui/skeleton/index.js';
  import { ChevronsUpDown, Check, X, Search, RotateCw } from '@lucide/svelte';

  const i18n = useTranslation();

  function clickOutside(node: HTMLElement) {
    const handler = (e: MouseEvent) => {
      if (e.target instanceof Node && !node.contains(e.target)) open = false;
    };
    document.addEventListener('click', handler, true);
    return { destroy() { document.removeEventListener('click', handler, true); } };
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
    disabled = false,
    ...restProps
  }: Props = $props();

  const buttonRestProps = $derived(restProps as Omit<ButtonProps, 'children' | 'variant' | 'size'>);
  let open = $state(false);
  let searchInputValue = $state('');
  let page = $state(1);
  let appliedSearch = $state('');
  let timer: ReturnType<typeof setTimeout> | undefined;
  onDestroy(() => clearTimeout(timer));
  const normalizedFetchSize = $derived(
    Number.isSafeInteger(fetchSize) && fetchSize >= 10 && fetchSize <= 200 ? fetchSize : 50,
  );

  const binding = useResourceContract(() => resource);
  const context = captureAdminContext();
  const sourceScope = $derived({
    contract: binding.resource, provider: context.providers?.[binding.dataProviderName],
    meta: JSON.stringify(binding.meta), tenant: context.tenantCacheKey?.__svadminTenant,
    auth: context.authProvider, session: captureAuthSession(context.authProvider).cacheKey,
    access: context.accessControlProvider, router: context.routerProvider,
    optionLabel, optionValue, onSearch, searchable, normalizedFetchSize,
  });
  type Option = { value: string | number; label: string };
  let loaded = $state.raw<{ scope: typeof sourceScope; search: string; options: Option[] }>();
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
    get pagination() { return { current: page, pageSize: normalizedFetchSize }; },
    get defaultValue() {
      if (Array.isArray(value)) return value;
      return value === null || value === undefined ? [] : [value];
    },
    get filters() { return searchFilters.filters; },
    get queryOptions() { return { enabled: !searchFilters.invalid }; },
  }));

  $effect.pre(() => {
    void sourceScope;
    clearTimeout(timer);
    searchInputValue = appliedSearch = '';
    open = false;
    page = 1;
    loaded = undefined;
  });
  $effect(() => {
    const data = select.query.data;
    if (!data || select.query.isFetching || select.isError || searchFilters.invalid) return;
    const scope = sourceScope;
    const search = appliedSearch;
    const previous = untrack(() => loaded);
    const options = new Map<string | number, Option>(
      page > 1 && previous?.scope === scope && previous.search === search
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
      loaded?.scope === sourceScope && loaded.search === appliedSearch
        ? loaded.options.map(option => [option.value, option]) : [],
    );
    for (const option of select.options) options.set(option.value, option);
    return [...options.values()];
  });
  const totalOptions = $derived(select.query.data?.total ?? availableOptions.length);
  const hasMore = $derived(totalOptions > page * normalizedFetchSize && !select.isError
    && !searchFilters.invalid && searchInputValue === appliedSearch);
  const invalidOptions = $derived(select.isError || searchFilters.invalid);
  const selectedLabels = $derived(selectedValues.flatMap(selectedValue => {
    const option = availableOptions.find(candidate => candidate.value === selectedValue);
    return option ? [option.label] : [];
  }));
  const selectedLabel = $derived(selectedLabels.join(', '));

  function handleSelect(optValue: string | number) {
    if (disabled || invalidOptions || select.isFetching || searchInputValue !== appliedSearch) return;
    if (multiple) {
      const next = selectedValues.includes(optValue)
        ? selectedValues.filter(selectedValue => selectedValue !== optValue)
        : [...selectedValues, optValue];
      onchange?.(next);
      return;
    }
    onchange?.(optValue === value ? null : optValue);
    open = false;
    resetSearch();
  }

  function handleClear(e: Event) {
    e.stopPropagation();
    if (disabled) return;
    onchange?.(multiple ? [] : null);
    open = false;
    resetSearch();
  }

  function resetSearch(): void {
    clearTimeout(timer);
    searchInputValue = appliedSearch = '';
    page = 1;
    loaded = undefined;
  }

  function handleSearchInput(e: Event) {
    if (!(e.currentTarget instanceof HTMLInputElement)) return;
    const v = e.currentTarget.value;
    searchInputValue = v;
    clearTimeout(timer);
    const scope = sourceScope;
    const apply = () => {
      if (scope !== sourceScope || disabled) return;
      appliedSearch = v;
      page = 1;
      loaded = undefined;
    };
    if (!v) apply();
    else timer = setTimeout(apply, 300);
  }

  function loadMore(): void {
    if (disabled || select.isFetching || !hasMore) return;
    page += 1;
  }
</script>

<div class="svadmin-u-d89972fe17d6" use:clickOutside>
  <div class="select-control">
  <Button
    variant="outline"
    type="button"
    class="svadmin-u-6da6a3c3f741 svadmin-u-8ef2268efbbc svadmin-u-8ecebc9f80e6"
    onclick={() => { open = !open; }}
    {...buttonRestProps}
    {disabled}
    aria-haspopup="listbox"
    aria-expanded={open}
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
      <Command.Root shouldFilter={false} class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-2cd02d11d1af svadmin-u-421ac2be5045 svadmin-u-e541d86d1ec8 svadmin-u-9b13e8ae5c9c">
        {#if searchable}
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-65fdbade2025 svadmin-u-d5eab218aa34">
            <Search class="svadmin-u-82cc6c6581cd svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-012fbd121f37 svadmin-u-0b8c506a0596" />
            <Command.Input
              bind:value={searchInputValue}
              oninput={handleSearchInput}
              placeholder={i18n.t('common.search')}
              class="svadmin-u-60fbb7713999 svadmin-u-e7a768f922d2 svadmin-u-6da6a3c3f741 svadmin-u-7f19cdf4c5bb svadmin-u-03b4dd7f172b svadmin-u-fc7473ca09eb svadmin-u-df37b1fd9495 svadmin-u-9c24ab70af61"
            />
          </div>
        {/if}
        <Command.List
          role="listbox"
          aria-multiselectable={multiple || undefined}
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
            {#each availableOptions as opt (`${typeof opt.value}:${opt.value}`)}
              <Command.Item
                disabled={select.isFetching || searchInputValue !== appliedSearch}
                value={`${typeof opt.value}:${opt.value}`}
                onSelect={() => handleSelect(opt.value)}
                class="svadmin-u-d89972fe17d6 svadmin-u-60fbb7713999 svadmin-u-50ca6ba56aa3 svadmin-u-7f6912283f11 svadmin-u-3960ffc248d9 svadmin-u-36d4469299aa svadmin-u-d5eab218aa34 svadmin-u-ec0091ee009b svadmin-u-fc7473ca09eb svadmin-u-df37b1fd9495 svadmin-u-99afb1cc3b47 svadmin-u-529780e25268"
              >
                <Check class="svadmin-u-d2347e8497a9 svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c {selectedValues.includes(opt.value) ? 'svadmin-u-3972e98dc84f' : 'svadmin-u-7065497e1ca0'}" />
                {opt.label}
              </Command.Item>
            {/each}
          {/if}
        </Command.List>
        {#if hasMore}
          <Button type="button" variant="ghost" size="sm" disabled={select.isFetching} onclick={loadMore}>
            {i18n.t('select.loadMore')}
          </Button>
        {/if}
      </Command.Root>
    </div>
  {/if}
</div>

<style>
  .select-control, .select-error {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .select-error {
    color: var(--destructive);
    font-size: 0.875rem;
  }
</style>
