<script lang="ts">
  import { syncGlobalPath } from '@svadmin/core';
  import type { AccessControlProvider, DataProvider, NotificationProvider, ResourceDefinition, RouterProvider } from '@svadmin/core';
  import { untrack } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { Button } from '../../src/components/ui/button/index.js';
  import AdminApp from '../../src/components/AdminApp.svelte';
  import AutoTable from '../../src/components/AutoTable.svelte';
  import RecordDetailDrawer from '../../src/components/RecordDetailDrawer.svelte';

  interface Props {
    onNavigate: RouterProvider['go'];
    onBack?: () => void;
    initialParams?: Record<string, string>;
    locale?: string;
    providerName?: string;
    tenantIdentity?: string | number;
    canShow?: boolean;
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    showAllowed?: boolean;
    editAllowed?: boolean;
    deleteAllowed?: boolean;
    batchDeleteAllowed?: boolean;
    recordPermissions?: Record<string, Partial<Record<'show' | 'edit' | 'delete', boolean>>>;
    selectable?: boolean;
    customBatchAction?: boolean;
    numericIds?: boolean;
    onCan?: (params: { action: string; params?: Record<string, unknown> }) => void;
    onCustomBatchAction?: (ids: (string | number)[]) => void;
    onDeleteOne?: (id: string | number) => void | Promise<void>;
    onDeleteMany?: (ids: (string | number)[]) => void | Promise<void>;
    disableDeleteMany?: boolean;
    onGetOne?: (id: string | number) => void;
    standaloneDetailId?: string | number;
    includeSecondRecord?: boolean;
    emptyData?: boolean;
    onNotify?: NotificationProvider['open'];
    density?: 'compact' | 'comfortable';
  }

  let {
    onNavigate,
    onBack,
    initialParams = {},
    locale = 'zh-CN',
    providerName = 'default',
    tenantIdentity,
    canShow = true,
    canCreate = false,
    canEdit = false,
    canDelete = false,
    showAllowed,
    editAllowed,
    deleteAllowed,
    batchDeleteAllowed,
    recordPermissions,
    selectable = false,
    customBatchAction = false,
    numericIds = false,
    onCan,
    onCustomBatchAction,
    onDeleteOne,
    onDeleteMany,
    disableDeleteMany = false,
    onGetOne,
    standaloneDetailId,
    includeSecondRecord = false,
    emptyData = false,
    onNotify,
    density = 'comfortable',
  }: Props = $props();

  const deletedIds = new SvelteSet<string>();
  const dataProvider = {
    getList: async () => {
      const data = (emptyData ? [] : [
        { id: numericIds ? 1 : 'user-1', email: 'user@example.com' },
        ...(includeSecondRecord ? [{ id: numericIds ? 2 : 'user-2', email: 'second@example.com' }] : []),
      ]).filter((record) => !deletedIds.has(String(record.id)));
      return { data, total: data.length };
    },
    getOne: async ({ id }) => {
      onGetOne?.(id);
      return { data: { id, email: 'user@example.com' } };
    },
    create: async () => ({ data: { id: numericIds ? 1 : 'user-1' } }),
    update: async () => ({ data: { id: numericIds ? 1 : 'user-1' } }),
    deleteOne: async ({ id }) => {
      await onDeleteOne?.(id);
      deletedIds.add(String(id));
      return { data: { id } };
    },
    get deleteMany() {
      if (disableDeleteMany) return undefined;
      return async ({ ids }: { ids: (string | number)[] }) => {
        await onDeleteMany?.(ids);
        for (const id of ids) deletedIds.add(String(id));
        return { data: ids.map((id) => ({ id })) };
      };
    },
    getApiUrl: () => 'https://example.test',
  } as DataProvider;

  const resources: ResourceDefinition[] = [{
    name: 'users',
    label: 'Users',
    get canCreate() { return canCreate; },
    get canEdit() { return canEdit; },
    get canDelete() { return canDelete; },
    get canShow() { return canShow; },
    get provider() {
      return providerName === 'default' ? undefined : { dataProviderName: providerName };
    },
    fields: [
      { key: 'id', label: 'ID', type: 'text' },
      { key: 'email', label: 'Email', type: 'text', searchable: true, filterable: true },
    ],
  }];

  const initialPathname = '/';
  let currentPathname = $state(initialPathname);
  let currentParams = $state<Record<string, string>>({ ...untrack(() => initialParams) });

  const routerProvider: RouterProvider = {
    go: (options) => {
      currentPathname = options.to;
      currentParams = options.query ? { ...options.query } : {};
      onNavigate(options);
      syncGlobalPath();
    },
    back: () => {
      currentPathname = initialPathname;
      currentParams = { ...untrack(() => initialParams) };
      onBack?.();
      syncGlobalPath();
    },
    parse: () => ({ pathname: currentPathname, params: currentParams }),
  };

  function permissionFor(params: { action: string; params?: Record<string, unknown> }): boolean {
    const id = params.params?.id;
    if ((typeof id === 'string' || typeof id === 'number') && recordPermissions?.[String(id)]?.[params.action as 'show' | 'edit' | 'delete'] !== undefined) {
      return recordPermissions[String(id)]?.[params.action as 'show' | 'edit' | 'delete'] === true;
    }
    if (params.action === 'delete' && Array.isArray(params.params?.ids) && batchDeleteAllowed !== undefined) {
      return batchDeleteAllowed;
    }
    if (params.action === 'show' && showAllowed !== undefined) return showAllowed;
    if (params.action === 'edit' && editAllowed !== undefined) return editAllowed;
    if (params.action === 'delete' && deleteAllowed !== undefined) return deleteAllowed;
    return true;
  }

  const testAccessControlProvider: AccessControlProvider = {
    can: async (params) => {
      if (Array.isArray(params)) {
        return params.map((entry) => {
          onCan?.(entry);
          return { can: permissionFor(entry) };
        });
      }
      onCan?.(params);
      return { can: permissionFor(params) };
    },
  };

  const accessControlProvider = $derived(
    [showAllowed, editAllowed, deleteAllowed, batchDeleteAllowed, recordPermissions].every((value) => value === undefined)
      ? undefined
      : testAccessControlProvider,
  );

  const notificationProvider = $derived<NotificationProvider | undefined>(onNotify
    ? { open: (params) => onNotify?.(params), close: () => {} }
    : undefined);
</script>

{#snippet dashboard()}
  {#snippet expandedRowRender({ record }: { record: Record<string, unknown> })}
    已展开：{record.email}
  {/snippet}

  {#snippet batchActions({ selectedIds }: { selectedIds: (string | number)[] })}
    <Button variant="outline" size="sm" onclick={() => onCustomBatchAction?.(selectedIds)}>自定义批量 ({selectedIds.length})</Button>
  {/snippet}

  {#if standaloneDetailId != null}
    <RecordDetailDrawer resourceName="users" open={true} recordId={standaloneDetailId} />
  {:else if customBatchAction}
    <AutoTable resourceName="users" {selectable} {density} expandedRowRender={expandedRowRender as never} batchActions={batchActions as never} />
  {:else}
    <AutoTable resourceName="users" {selectable} {density} expandedRowRender={expandedRowRender as never} />
  {/if}
{/snippet}

<AdminApp
  dataProvider={providerName === 'default' ? dataProvider : { [providerName]: dataProvider }}
  {resources}
  {routerProvider}
  {accessControlProvider}
  {notificationProvider}
  {locale}
  tenant={tenantIdentity === undefined ? undefined : { tenantId: tenantIdentity }}
  dashboard={dashboard as never}
/>
