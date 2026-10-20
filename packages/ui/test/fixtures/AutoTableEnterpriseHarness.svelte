<script lang="ts">
  import type { AccessControlProvider, DataProvider, Filter, ResourceDefinition, RouterProvider, TaskProvider } from '@svadmin/core';
  import { defineResource } from '@svadmin/core';
  import { definedOptions } from '@svadmin/core/options';
  import { Type } from 'typebox';
  import AdminApp from '../../src/components/AdminApp.svelte';
  import AutoTable from '../../src/components/AutoTable.svelte';
  import ListPage from '../../src/components/ListPage.svelte';
  import ShowPage from '../../src/components/ShowPage.svelte';
  import StatusTabs from '../../src/components/content/StatusTabs.svelte';
  import FilterToolbar from '../../src/components/content/FilterToolbar.svelte';

  interface Props {
    viewMode?: 'table' | 'list-page' | 'show-page-grid' | 'show-page-list';
    showHeader?: boolean;
    selectable?: boolean;
    locale?: string;
    exportTaskName?: string;
    exportTaskProvider?: TaskProvider;
    exportTaskIdempotencyKey?: string;
  }

  let {
    viewMode = 'table',
    showHeader = true,
    selectable = true,
    locale = 'zh-CN',
    exportTaskName,
    exportTaskProvider,
    exportTaskIdempotencyKey,
  }: Props = $props();

  const dataProvider = {
    getList: async ({ filters = [] }) => {
      const records = [
        { id: 'user-1', email: 'user1@example.com', role: 'admin', active: true },
        { id: 'user-2', email: 'user2@example.com', role: 'member', active: false },
      ];
      const matches = (filter: Filter, record: typeof records[number]): boolean => {
        if ('field' in filter) {
          const value = String(record[filter.field as keyof typeof record] ?? '').toLowerCase();
          return filter.operator === 'contains'
            ? value.includes(String(filter.value ?? '').toLowerCase())
            : value === String(filter.value ?? '').toLowerCase();
        }
        return filter.operator === 'or'
          ? filter.value.some(candidate => matches(candidate, record))
          : filter.value.every(candidate => matches(candidate, record));
      };
      const data = records.filter(record => filters.every(filter => matches(filter, record)));
      return { data, total: data.length };
    },
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
    contract: defineResource('users', { record: Type.Object({
      id: Type.String(), email: Type.String(), role: Type.String(), active: Type.Boolean(),
    }), update: Type.Object({
      email: Type.Optional(Type.String()), role: Type.Optional(Type.String()), active: Type.Optional(Type.Boolean()),
    }) }),
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

  const accessControlProvider: AccessControlProvider = {
    can: async () => ({ can: true }),
  };
</script>

{#snippet dashboard()}
  {#if viewMode === 'table'}
    <AutoTable resourceName="users" {showHeader} {selectable}
      {...definedOptions({ exportTaskName, exportTaskProvider, exportTaskIdempotencyKey })} />
  {:else if viewMode === 'list-page'}
    <ListPage resourceName="users" selectable={selectable}>
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
    <ShowPage resourceName="users" id="user-1" layout="grid" columns={3} bordered />
  {:else if viewMode === 'show-page-list'}
    <ShowPage resourceName="users" id="user-1" layout="list" />
  {/if}
{/snippet}

<AdminApp
  {dataProvider}
  {resources}
  {routerProvider}
  {accessControlProvider}
  {locale}
  dashboard={dashboard as never}
/>
