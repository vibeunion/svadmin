<script lang="ts">
  import { Check, ChevronsUpDown, Loader2, Search, X } from '@lucide/svelte';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import { captureAdminContext, captureAuthSession, useResourceContract, useSelect, useCan } from '@svadmin/core';
  import type { BaseRecord, Filter, KnownResources } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { onDestroy, untrack } from 'svelte';
  import { Badge } from './ui/badge/index.js';
  import { Button } from './ui/button/index.js';
  import { Checkbox } from './ui/checkbox/index.js';
  import * as Dialog from './ui/dialog/index.js';
  import { Input } from './ui/input/index.js';
  import * as Table from './ui/table/index.js';

  export interface RelationPickerOption {
    value: string | number;
    label: string;
  }

  interface Props {
    resource: KnownResources;
    value?: string | number | null | (string | number)[];
    onchange?: (value: string | number | null | (string | number)[]) => void;
    optionLabel?: string;
    placeholder?: string;
    title?: string;
    multiple?: boolean;
    searchable?: boolean;
    fetchSize?: number;
    sorters?: { field: string; order: 'asc' | 'desc' }[];
    filters?: Filter[];
    disabled?: boolean;
    allowClear?: boolean;
  }

  let {
    resource,
    value = null,
    onchange,
    optionLabel = 'title',
    placeholder,
    title,
    multiple = false,
    searchable = true,
    fetchSize = 20,
    sorters = [],
    filters = [],
    disabled = false,
    allowClear = true,
  }: Props = $props();

  const i18n = useTranslation();
  const context = captureAdminContext();
  let open = $state(false);
  let searchText = $state('');
  let appliedSearch = $state('');
  let page = $state(1);
  let draftValues = $state<(string | number)[]>([]);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const normalizedFetchSize = $derived(
    Number.isSafeInteger(fetchSize) && fetchSize >= 1 && fetchSize <= 200 ? fetchSize : 20,
  );
  const binding = useResourceContract(() => resource);
  const permission = useCan(() => ({ resource, action: 'list' }));
  const allowed = $derived(permission.allowed && captureAuthSession(context.authProvider).available);
  const searchFilters = $derived<Filter[]>(appliedSearch && searchable
    ? [{ field: optionLabel, operator: 'contains', value: appliedSearch }] : []);
  const scope = $derived({
    resource,
    contract: binding.resource,
    provider: context.providers?.[binding.dataProviderName],
    meta: JSON.stringify(binding.meta),
    access: context.accessControlProvider,
    authProvider: context.authProvider,
    tenant: context.tenantCacheKey?.__svadminTenant,
    auth: captureAuthSession(context.authProvider).cacheKey,
    optionLabel,
    normalizedFetchSize,
    filters,
    sorters,
  });
  let valueInvalidated = $state(false);
  const selectedValues = $derived(allowed && !valueInvalidated ? normalizedValues(value) : []);
  const select = useSelect(definedReactiveOptions({
    get resource() { return binding.resource; },
    get dataProviderName() { return binding.dataProviderName; },
    get optionLabel() { return optionLabel; },
    get optionValue() {
      return (row: BaseRecord): string | number => {
        const id = row['id'];
        if (typeof id === 'string' || (typeof id === 'number' && Number.isFinite(id))) return id;
        throw new TypeError('Relation records must expose a string or number id');
      };
    },
    get pagination() { return { current: page, pageSize: normalizedFetchSize }; },
    get fetchSize() { return normalizedFetchSize; },
    get sorters() { return sorters; },
    get filters() { return [...filters, ...searchFilters]; },
    get defaultValue() { return selectedValues; },
    get queryOptions() { return { enabled: allowed }; },
    get projectionKey() { return `relation-picker:${String(optionLabel)}:id`; },
  }));

  let loaded = $state.raw<{ scope: typeof scope; search: string; options: RelationPickerOption[] }>();
  let observedScope = untrack(() => scope);
  let observedValue = untrack(() => value);
  let observedAllowed = untrack(() => allowed);
  let draftScope = $state.raw<typeof scope>();

  function normalizedValues(input: Props['value']): (string | number)[] {
    if (Array.isArray(input)) return [...new Set(input)];
    return input === null || input === undefined ? [] : [input];
  }

  function optionFor(valueToFind: string | number): RelationPickerOption | undefined {
    return availableOptions.find(option => option.value === valueToFind);
  }

  $effect(() => {
    const data = select.query.data;
    if (!allowed || !data || select.query.isFetching || select.isError) return;
    const currentScope = scope;
    const previous = untrack(() => loaded);
    const options = new Map<string | number, RelationPickerOption>(
      page > 1 && previous?.scope === currentScope && previous.search === appliedSearch
        ? previous.options.map(option => [option.value, option]) : [],
    );
    for (const option of data.options) options.set(option.value, option);
    loaded = { scope: currentScope, search: appliedSearch, options: [...options.values()] };
  });

  const availableOptions = $derived.by(() => {
    if (!allowed || select.isError) return [];
    const options = new Map<string | number, RelationPickerOption>();
    if (loaded?.scope === scope && loaded.search === appliedSearch) {
      for (const option of loaded.options) options.set(option.value, option);
    }
    for (const option of select.options) options.set(option.value, option);
    return [...options.values()];
  });
  const visibleValues = $derived(open ? draftValues : selectedValues);
  const selectedLabels = $derived(selectedValues.map(item => optionFor(item)?.label ?? `#${item}`));
  const total = $derived(select.query.data?.total ?? availableOptions.length);
  const hasMore = $derived(total > page * normalizedFetchSize && !select.isError);

  function begin(): void {
    if (disabled || !allowed) return;
    draftValues = [...selectedValues];
    draftScope = scope;
    open = true;
  }

  function toggle(item: string | number): void {
    if (disabled || !allowed || !open || draftScope !== scope || select.isError
      || select.isFetching || searchText !== appliedSearch) return;
    if (!multiple) {
      draftValues = [item];
      commit();
      return;
    }
    draftValues = draftValues.includes(item)
      ? draftValues.filter(valueToRemove => valueToRemove !== item)
      : [...draftValues, item];
  }

  function commit(): void {
    if (disabled || !allowed || !open || draftScope !== scope || select.isError
      || select.isFetching || searchText !== appliedSearch) return;
    const next = [...draftValues];
    onchange?.(multiple ? next : next[0] ?? null);
    open = false;
    resetSearch();
  }

  function cancel(): void {
    open = false;
    resetSearch();
  }

  function clear(event: MouseEvent): void {
    event.stopPropagation();
    if (!disabled && allowed) onchange?.(multiple ? [] : null);
  }

  function resetSearch(): void {
    clearTimeout(timer);
    searchText = '';
    appliedSearch = '';
    page = 1;
    loaded = undefined;
  }

  function search(event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    searchText = input.value;
    clearTimeout(timer);
    const origin = scope;
    timer = setTimeout(() => {
      if (origin !== scope || disabled || !allowed || !open) return;
      appliedSearch = searchText;
      page = 1;
      loaded = undefined;
    }, searchText ? 250 : 0);
  }

  function loadMore(): void {
    if (!disabled && allowed && open && !select.isFetching && hasMore
      && searchText === appliedSearch) page += 1;
  }

  $effect.pre(() => {
    const currentScope = scope;
    const currentValue = value;
    const currentAllowed = allowed;
    const currentDisabled = disabled;
    untrack(() => {
      if (observedScope !== currentScope || (observedAllowed && !currentAllowed)) {
        observedScope = currentScope;
        valueInvalidated = true;
        draftValues = [];
        open = false;
        resetSearch();
      }
      observedAllowed = currentAllowed;
      if (observedValue !== currentValue) {
        observedValue = currentValue;
        valueInvalidated = false;
        open = false;
        draftValues = [];
        resetSearch();
      }
      if (currentDisabled) cancel();
    });
  });

  onDestroy(() => clearTimeout(timer));
</script>

<div class="svadmin-relation-picker">
  <div class="svadmin-u-44ee8ba0a421 svadmin-u-60fbb7713999">
    {#each selectedLabels as label, index (selectedValues[index])}
      <Badge variant="secondary">
        {label}
        {#if multiple && !disabled}
          <button type="button" aria-label={`${i18n.t('common.clear')} ${label}`} onclick={() => { if (allowed) onchange?.(selectedValues.filter((_, itemIndex) => itemIndex !== index)); }}>
            <X class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
          </button>
        {/if}
      </Badge>
    {/each}
    <Button type="button" variant="outline" disabled={disabled || !allowed} onclick={begin} aria-haspopup="dialog">
      {selectedLabels.length ? i18n.t('common.edit') : (placeholder ?? i18n.t('field.selectPlaceholder'))}
      <ChevronsUpDown class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
    </Button>
    {#if allowClear && selectedValues.length > 0}
      <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} aria-label={i18n.t('common.clear')} onclick={clear}>
        <X class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
      </Button>
    {/if}
  </div>

  <Dialog.Root bind:open>
    <Dialog.Content class="svadmin-relation-picker__dialog" aria-label={title ?? i18n.t('common.selectOption')}>
      <Dialog.Header>
        <Dialog.Title>{title ?? i18n.t('common.selectOption')}</Dialog.Title>
        <Dialog.Description>{i18n.t('common.selectedItems', { count: draftValues.length })}</Dialog.Description>
      </Dialog.Header>
      {#if searchable}
        <div class="svadmin-u-60fbb7713999">
          <Search class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
          <Input value={searchText} oninput={search} placeholder={i18n.t('common.search')} aria-label={i18n.t('common.search')} />
        </div>
      {/if}
      <div class="svadmin-relation-picker__table">
        {#if select.isError}
          <div role="alert">{i18n.t('select.loadFailed')}</div>
          <Button type="button" variant="outline" onclick={() => { void select.refetch(); }}>{i18n.t('common.retry')}</Button>
        {:else if select.isFetching && availableOptions.length === 0}
          <div aria-live="polite"><Loader2 class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" /> {i18n.t('common.loading')}</div>
        {:else if availableOptions.length === 0}
          <div>{i18n.t('common.noData')}</div>
        {:else}
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>{i18n.t('common.selectOption')}</Table.Head>
                <Table.Head>{String(optionLabel)}</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each availableOptions as option (option.value)}
                <Table.Row>
                  <Table.Cell>
                    <Checkbox checked={visibleValues.includes(option.value)} aria-label={option.label}
                      disabled={select.isFetching || searchText !== appliedSearch}
                      onCheckedChange={() => toggle(option.value)} />
                  </Table.Cell>
                  <Table.Cell>
                    <button type="button" class="svadmin-relation-picker__option"
                      disabled={select.isFetching || searchText !== appliedSearch} onclick={() => toggle(option.value)}>
                      {#if visibleValues.includes(option.value)}<Check class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />{/if}
                      {option.label}
                    </button>
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
          {#if hasMore}
            <Button type="button" variant="outline" disabled={select.isFetching} onclick={loadMore}>
              {select.isFetching ? i18n.t('common.loading') : i18n.t('select.loadMore')}
            </Button>
          {/if}
        {/if}
      </div>
      <Dialog.Footer>
        <Button type="button" variant="outline" onclick={cancel}>{i18n.t('common.cancel')}</Button>
        <Button type="button" onclick={commit} disabled={select.isFetching || select.isError || searchText !== appliedSearch}>{i18n.t('common.confirm')}</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</div>

<style>
  .svadmin-relation-picker { min-width: 0; }
  .svadmin-relation-picker__table { max-height: 24rem; overflow: auto; }
  .svadmin-relation-picker__option {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    text-align: start;
    overflow-wrap: anywhere;
    max-width: 100%;
  }
  .svadmin-relation-picker__option:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
</style>
