<script lang="ts">
  import {
    provideAdminContext,
    type AuthProvider,
    type DataProvider,
    type TenantContext,
  } from '@svadmin/core';
  import AuditLogViewer from './AuditLogViewer.svelte';

  let {
    authProvider,
    tenant,
  }: {
    authProvider: AuthProvider;
    tenant: TenantContext;
  } = $props();

  const fallbackDataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'test' } }),
    create: async () => ({ data: { id: 'test' } }),
    update: async () => ({ data: { id: 'test' } }),
    deleteOne: async () => ({ data: { id: 'test' } }),
    getApiUrl: () => 'https://audit-log-viewer-scope.example.test',
  } as DataProvider;

  provideAdminContext({
    dataProvider: fallbackDataProvider,
    get authProvider() { return authProvider; },
    resources: [],
    get tenant() { return tenant; },
  });
</script>

<AuditLogViewer />
