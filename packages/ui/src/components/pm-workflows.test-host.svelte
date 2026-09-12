<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { Type } from '@sinclair/typebox';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { defineResource, provideAdminContext, type DataProvider, type RouterProvider } from '@svadmin/core';
  import { createI18nScope, provideI18nScope } from '@svadmin/core/i18n';
  import AutoTable from './AutoTable.svelte';

  let { locale = 'en', canEdit = false, canDelete = false, selectable = false,
    initialParams = {}, emptyData = false, editAllowed = true, deleteAllowed = true,
    onNavigate, onDeleteOne = () => {}, onUpdate,
  }: {
    locale?: string;
    canEdit?: boolean;
    canDelete?: boolean;
    selectable?: boolean;
    initialParams?: Record<string, string>;
    emptyData?: boolean;
    editAllowed?: boolean;
    deleteAllowed?: boolean;
    onNavigate: RouterProvider['go'];
    onDeleteOne?: () => void;
    onUpdate?: () => Promise<void>;
  } = $props();
  provideI18nScope(createI18nScope({ locale: untrack(() => locale) }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  onDestroy(() => client.clear());
  let email = 'user@example.com';
  const provider: DataProvider = {
    getApiUrl: () => '/api',
    getList: async () => ({ data: emptyData ? [] : [{ id: 'user-1', email }], total: emptyData ? 0 : 1 }),
    getOne: async ({ id }) => ({ data: { id, email } }),
    create: async () => ({ data: { id: 'user-1', email } }),
    update: async ({ id, variables }) => {
      await onUpdate?.();
      if (typeof variables === 'object' && variables !== null && 'email' in variables && typeof variables.email === 'string') email = variables.email;
      return { data: { id, email } };
    },
    deleteOne: async ({ id }) => { onDeleteOne(); return { data: { id, email } }; },
  };
  let params = $state({ ...untrack(() => initialParams) });
  const router: RouterProvider = {
    parse: () => ({ pathname: '/users', params }),
    go: options => { params = options.query ?? {}; onNavigate(options); },
    back: () => { params = { ...initialParams }; },
  };
  provideAdminContext({
    dataProvider: provider,
    resources: [{
      name: 'users', label: 'Users', canCreate: false,
      canEdit: untrack(() => canEdit), canDelete: untrack(() => canDelete),
      contract: defineResource('users', {
        record: Type.Object({ id: Type.String(), email: Type.String() }),
        update: Type.Object({ email: Type.String() }),
      }),
      fields: [
        { key: 'id', label: 'ID', type: 'text' },
        { key: 'email', label: 'Email', type: 'text', searchable: true, filterable: true, group: 'Contact' },
      ],
    }],
    accessControlProvider: {
      can: async ({ action }) => ({ can: action === 'edit' ? editAllowed : action === 'delete' ? deleteAllowed : true }),
    },
    routerProvider: router,
  });
</script>

<QueryClientProvider client={client}>
  <AutoTable resourceName="users" {selectable} />
</QueryClientProvider>
