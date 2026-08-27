<script lang="ts">
  import type { DataProvider, ResourceDefinition, RouterProvider } from '@svadmin/core';
  import AdminApp from '../../src/components/AdminApp.svelte';
  import AutoTable from '../../src/components/AutoTable.svelte';
  import ListPage from '../../src/components/ListPage.svelte';
  import ShowPage from '../../src/components/ShowPage.svelte';
  import StatusTabs from '../../src/components/content/StatusTabs.svelte';
  import FilterToolbar from '../../src/components/content/FilterToolbar.svelte';

  interface Props {
    viewMode?: 'table' | 'list-page' | 'show-page-grid' | 'show-page-list';
    showHeader?: boolean;
    density?: 'compact' | 'comfortable';
    selectable?: boolean;
    locale?: string;
  }

  let {
    viewMode = 'table',
    showHeader = true,
    density = 'comfortable',
    selectable = true,
    locale = 'zh-CN',
  }: Props = $props();

  const dataProvider = {
    getList: async () => ({
      data: [
        { id: 'user-1', email: 'user1@example.com', role: 'admin', active: true },
        { id: 'user-2', email: 'user2@example.com', role: 'member', active: false },
      ],
      total: 2,
    }),
    getOne: async () => ({
      data: { id: 'user-1', email: 'user1@example.com', role: 'admin', active: true },
    }),
    create: async () => ({ data: { id: 'user-1' } }),
    update: async () => ({ data: { id: 'user-1' } }),
    deleteOne: async () => ({ data: { id: 'user-1' } }),
    deleteMany: async () => ({ data: [{ id: 'user-1' }, { id: 'user-2' }] }),
    getApiUrl: () => 'https://example.test',
  } as DataProvider;

  const resources: ResourceDefinition[] = [{
    name: 'users',
    label: '用户管理',
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canShow: true,
    fields: [
      { key: 'id', label: 'ID', type: 'text' },
      { key: 'email', label: '邮箱', type: 'text', searchable: true },
      { key: 'role', label: '角色', type: 'select', filterable: true, options: [{ label: '管理员', value: 'admin' }, { label: '成员', value: 'member' }] },
      { key: 'active', label: '状态', type: 'boolean' },
    ],
  }];

  const routerProvider: RouterProvider = {
    go: () => {},
    back: () => {},
    parse: () => ({ pathname: '/', params: {} }),
  };
</script>

{#snippet dashboard()}
  {#if viewMode === 'table'}
    <AutoTable resourceName="users" {showHeader} {density} {selectable} />
  {:else if viewMode === 'list-page'}
    <ListPage resourceName="users" {density}>
      {#snippet statusTabs()}
        <StatusTabs
          items={[
            { key: 'all', label: '全部', count: 2 },
            { key: 'admin', label: '管理员', count: 1 },
          ]}
        />
      {/snippet}
      {#snippet filterToolbar()}
        <FilterToolbar
          placeholder="搜索用户..."
        />
      {/snippet}
    </ListPage>
  {:else if viewMode === 'show-page-grid'}
    <ShowPage resourceName="users" id="user-1" layout="grid" columns={3} bordered {density} />
  {:else if viewMode === 'show-page-list'}
    <ShowPage resourceName="users" id="user-1" layout="list" {density} />
  {/if}
{/snippet}

<AdminApp {dataProvider} {resources} {routerProvider} {locale} dashboard={dashboard as never} />
