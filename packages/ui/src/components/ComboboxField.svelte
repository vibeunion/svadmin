<script lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
  import { useTranslation } from '@svadmin/core/i18n';
  import { useSelect } from '@svadmin/core';
  import type { Filter } from '@svadmin/core';
  import { Button } from './ui/button/index.js';
  import TooltipButton from './TooltipButton.svelte';
  import { Command } from './ui/command/index.js';
  import { Skeleton } from './ui/skeleton/index.js';
  import { ChevronsUpDown, Check, X, Search } from '@lucide/svelte';

  const i18n = useTranslation();

  function clickOutside(node: HTMLElement) {
    const handler = (e: MouseEvent) => {
      if (!node.contains(e.target as Node)) open = false;
    };
    document.addEventListener('click', handler, true);
    return { destroy() { document.removeEventListener('click', handler, true); } };
  }

  interface Props {
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
    [key: string]: any;
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
    ...restProps
  }: Props = $props();

  const { options, query, onSearchChange } = useSelect({
    get resource() { return resource; },
    get optionLabel() { return optionLabel; },
    get optionValue() { return optionValue; },
    get onSearch() { return onSearch ?? (searchable ? (v: string) => v ? [{ field: optionLabel, operator: 'contains' as const, value: v }] : [] : undefined); },
  });

  let open = $state(false);
  let searchInputValue = $state('');

  const selectedLabel = $derived(
    (options as { label: string; value: string | number }[])?.find(
      (o: { label: string; value: string | number }) => o.value === value
    )?.label ?? ''
  );

  function handleSelect(optValue: string | number) {
    onchange?.(optValue === value ? null : optValue);
    open = false;
    searchInputValue = '';
  }

  function handleClear(e: Event) {
    e.stopPropagation();
    onchange?.(null);
    open = false;
    searchInputValue = '';
  }

  function handleSearchInput(e: Event) {
    const v = (e.currentTarget as HTMLInputElement).value;
    searchInputValue = v;
    onSearchChange(v);
  }
</script>

<div class="svadmin-u-d89972fe17d6" use:clickOutside>
  <Button
    variant="outline"
    type="button"
    class="svadmin-u-6da6a3c3f741 svadmin-u-8ef2268efbbc svadmin-u-8ecebc9f80e6"
    onclick={() => { open = !open; }}
    {...restProps}
  >
    {#if selectedLabel}
      <span class="svadmin-u-f283ea9bea0e">{selectedLabel}</span>
      <TooltipButton tooltip={i18n.t('common.clear')} size="icon-sm" class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-f58b02572ab2" onclick={handleClear}>
        <X class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
      </TooltipButton>
    {:else}
      <span class="svadmin-u-bfa603190748">{placeholder}</span>
    {/if}
    <ChevronsUpDown class="svadmin-u-fb56d9cff341 svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-012fbd121f37 svadmin-u-0b8c506a0596" />
  </Button>

  {#if open}
    <div class="svadmin-u-da4dbfbc4fdc svadmin-u-181b286668b5 svadmin-u-b6b02c0ebef6 svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e541d86d1ec8 svadmin-u-06bbb43166db">
      <Command.Root class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-2cd02d11d1af svadmin-u-421ac2be5045 svadmin-u-e541d86d1ec8 svadmin-u-9b13e8ae5c9c">
        {#if searchable}
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
          <Command.Empty class="svadmin-u-cb11fec3bb46 svadmin-u-ca6bf63030aa svadmin-u-359090c2d529 svadmin-u-bfa603190748">
            No results.
          </Command.Empty>
          {#if query.isLoading}
            {#each Array(3) as _, _i (_i)}
              <div class="svadmin-u-d5eab218aa34 svadmin-u-ec0091ee009b"><Skeleton class="svadmin-u-cd0d9c512cdc svadmin-u-6da6a3c3f741" /></div>
            {/each}
          {:else}
            {#each (options as { label: string; value: string | number }[]) ?? [] as opt, _i (_i)}
              <Command.Item
                value={opt.label}
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
