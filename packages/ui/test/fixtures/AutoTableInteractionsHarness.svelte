<script lang="ts">
  import type { DataProvider, ResourceDefinition, RouterProvider } from '@svadmin/core';
  import AdminApp from '../../src/components/AdminApp.svelte';
  import AutoTable from '../../src/components/AutoTable.svelte';

  interface Props {
    onNavigate: RouterProvider['go'];
    locale?: string;
  }

  let { onNavigate, locale = 'zh-CN' }: Props = $props();

  const dataProvider = {
    getList: async () => ({ data: [{ id: 'user-1', email: 'user@example.com' }], total: 1 }),
    getOne: async () => ({ data: { id: 'user-1' } }),
    create: async () => ({ data: { id: 'user-1' } }),
    update: async () => ({ data: { id: 'user-1' } }),
    deleteOne: async () => ({ data: { id: 'user-1' } }),
    getApiUrl: () => 'https://example.test',
  } as DataProvider;

  const resources: ResourceDefinition[] = [{
    name: 'users',
    label: 'Users',
    canCreate: false,
    canEdit: false,
    canDelete: false,
    fields: [
      { key: 'id', label: 'ID', type: 'text' },
      { key: 'email', label: 'Email', type: 'text', searchable: true },
    ],
  }];

  const routerProvider: RouterProvider = {
    go: (options) => onNavigate(options),
    back: () => {},
    parse: () => ({ pathname: '/', params: {} }),
  };
</script>

{#snippet dashboard()}
  {#snippet expandedRowRender({ record }: { record: Record<string, unknown> })}
    已展开：{record.email}
  {/snippet}

  <AutoTable resourceName="users" selectable={false} expandedRowRender={expandedRowRender as never} />
{/snippet}

<AdminApp {dataProvider} {resources} {routerProvider} {locale} dashboard={dashboard as never} />
