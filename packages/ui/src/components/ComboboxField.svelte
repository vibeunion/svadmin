<script lang="ts">
  import { definedReactiveOptions } from '@svadmin/core/options';

  import { useTranslation } from '@svadmin/core/i18n';
  import { useResourceContract, useSelect } from '@svadmin/core';
  import type { BaseRecord, Filter } from '@svadmin/core';
  import type { HTMLButtonAttributes } from 'svelte/elements';
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
    value?: string | number | null;
    onchange?: (value: string | number | null) => void;
    optionLabel?: string;
    optionValue?: string;
    placeholder?: string;
    searchable?: boolean;
    onSearch?: (value: string) => Filter[];
    id?: string;
    class?: string;
  }

  let {
    resource,
    value = null,
    onchange,
    optionLabel = 'title',
    optionValue = 'id',
    placeholder = 'Select...',
    searchable = true,
    onSearch,
    disabled = false,
    ...restProps
  }: Props = $props();

  const binding = useResourceContract(() => resource);
  const defaultSearch = $derived.by(() => {
    const field = optionLabel;
    return (v: string): Filter[] => v ? [{ field, operator: 'contains', value: v }] : [];
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
    get defaultValue() { return value === null ? [] : [value]; },
    get onSearch() { return onSearch ?? (searchable ? defaultSearch : undefined); },
  }));

  let open = $state(false);
  let searchInputValue = $state('');
  $effect(() => {
    void binding.resource;
    void binding.dataProviderName;
    void binding.meta;
    searchInputValue = '';
    open = false;
  });

  const selectedLabel = $derived(
    select.options.find(o => o.value === value)?.label ?? ''
  );

  function handleSelect(optValue: string | number) {
    onchange?.(optValue === value ? null : optValue);
    open = false;
    searchInputValue = '';
    select.onSearchChange('');
  }

  function handleClear(e: Event) {
    e.stopPropagation();
    onchange?.(null);
    open = false;
    searchInputValue = '';
    select.onSearchChange('');
  }

  function handleSearchInput(e: Event) {
    if (!(e.currentTarget instanceof HTMLInputElement)) return;
    const v = e.currentTarget.value;
    searchInputValue = v;
    select.onSearchChange(v);
  }
</script>

<div class="svadmin-u-d89972fe17d6" use:clickOutside>
  <div class="select-control">  <Button
    variant="outline"
    type="button"
    class="svadmin-u-6da6a3c3f741 svadmin-u-8ef2268efbbc svadmin-u-8ecebc9f80e6"
    onclick={() => { open = !open; }}
    {...restProps}
    {disabled}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-busy={select.isFetching}
    aria-invalid={select.isError}
  >
    {#if selectedLabel}
      <span class="svadmin-u-f283ea9bea0e">{selectedLabel}</span>
    {:else}
      <span class="svadmin-u-bfa603190748">{placeholder}</span>
    {/if}
    <ChevronsUpDown class="svadmin-u-fb56d9cff341 svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-012fbd121f37 svadmin-u-0b8c506a0596" />
  </Button>
  {#if value !== null}
    <Button type="button" variant="ghost" size="icon-sm" {disabled}
      title={i18n.t('common.clear')} aria-label={i18n.t('common.clear')} onclick={handleClear}>
      <X class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
    </Button>
  {/if}
  </div>
  {#if select.isError}
    <div role="alert" class="select-error">
      <span>Unable to load options.</span>
      <Button type="button" variant="ghost" size="icon-sm" disabled={disabled || select.isFetching}
        title={i18n.t('common.retry')} aria-label={i18n.t('common.retry')} onclick={() => select.refetch()}>
        <RotateCw class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
      </Button>
    </div>
  {/if}

  {#if open}
    <div class="svadmin-u-da4dbfbc4fdc svadmin-u-181b286668b5 svadmin-u-b6b02c0ebef6 svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e541d86d1ec8 svadmin-u-06bbb43166db">
      <Command.Root shouldFilter={false} class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-2cd02d11d1af svadmin-u-421ac2be5045 svadmin-u-e541d86d1ec8 svadmin-u-9b13e8ae5c9c">        {#if searchable}
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-65fdbade2025 svadmin-u-d5eab218aa34">
            <Search class="svadmin-u-82cc6c6581cd svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-012fbd121f37 svadmin-u-0b8c506a0596" />
            <Command.Input
              bind:value={searchInputValue}
              oninput={handleSearchInput}
              placeholder="Search..."
              class="svadmin-u-60fbb7713999 svadmin-u-e7a768f922d2 svadmin-u-6da6a3c3f741 svadmin-u-7f19cdf4c5bb svadmin-u-03b4dd7f172b svadmin-u-fc7473ca09eb svadmin-u-df37b1fd9495 svadmin-u-9c24ab70af61"
            />
          </div>
        {/if}
        <Command.List class="svadmin-u-558f64349245 svadmin-u-92bf82f493b1 svadmin-u-eb6a3cef9686">
          {#if select.isLoading}            {#each Array(3) as _, _i (_i)}
              <div class="svadmin-u-d5eab218aa34 svadmin-u-ec0091ee009b"><Skeleton class="svadmin-u-cd0d9c512cdc svadmin-u-6da6a3c3f741" /></div>
            {/each}
          {:else if !select.isError}
            {#if !select.options.length}
              <Command.Empty class="svadmin-u-cb11fec3bb46 svadmin-u-ca6bf63030aa svadmin-u-359090c2d529 svadmin-u-bfa603190748">
                No results.
              </Command.Empty>
            {/if}
            {#each select.options as opt (opt.value)}
              <Command.Item
                value={`${typeof opt.value}:${opt.value}`}
                onSelect={() => handleSelect(opt.value)}
                class="svadmin-u-d89972fe17d6 svadmin-u-60fbb7713999 svadmin-u-50ca6ba56aa3 svadmin-u-7f6912283f11 svadmin-u-3960ffc248d9 svadmin-u-36d4469299aa svadmin-u-d5eab218aa34 svadmin-u-ec0091ee009b svadmin-u-fc7473ca09eb svadmin-u-df37b1fd9495 svadmin-u-99afb1cc3b47 svadmin-u-529780e25268"
              >
                <Check class="svadmin-u-d2347e8497a9 svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c {value === opt.value ? 'svadmin-u-3972e98dc84f' : 'svadmin-u-7065497e1ca0'}" />
                {opt.label}
              </Command.Item>
            {/each}
          {/if}
        </Command.List>
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
