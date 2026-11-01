<script lang="ts">
  import ConfigProvider, { type ComponentConfig, type GetPopupContainer } from './ConfigProvider.svelte';
  import DefaultsReader from './config-provider-defaults.reader.svelte';
  import EmptyState from './EmptyState.svelte';
  import ListPagination from './ListPagination.svelte';
  import { Button } from './ui/button/index.js';
  import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './ui/dropdown-menu/index.js';

  let {
    componentSize = 'md',
    componentDefaults = {},
    empty = {},
    pagination = {},
    popupTarget = 'a',
  }: Pick<ComponentConfig, 'componentSize' | 'componentDefaults' | 'empty' | 'pagination'> & {
    popupTarget?: 'a' | 'b';
  } = $props();

  let rootA = $state<HTMLElement | null>(null);
  let rootB = $state<HTMLElement | null>(null);

  const getPopupContainer: GetPopupContainer = () => (popupTarget === 'b' ? rootB : rootA);
</script>

<div data-testid="popup-a" bind:this={rootA}></div>
<div data-testid="popup-b" bind:this={rootB}></div>
<ConfigProvider {componentSize} {componentDefaults} {empty} {pagination} {getPopupContainer}>
  <DefaultsReader />
  <EmptyState />
  <Button>Action</Button>
  <ListPagination page={1} totalPages={3} total={30} rangeStart={1} rangeEnd={10} label="Records" onPageChange={() => {}} />
  <DropdownMenu>
    <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
    <DropdownMenuContent portal>Menu choice</DropdownMenuContent>
  </DropdownMenu>
</ConfigProvider>
