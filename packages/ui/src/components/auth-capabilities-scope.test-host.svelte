<script lang="ts">
  import {
    provideAdminContext,
    type AuthProvider,
    type DataProvider,
    type RouterProvider,
    type TenantContext,
  } from '@svadmin/core';
  import AuditLogViewer from './AuditLogViewer.svelte';
  import LoginPage from './LoginPage.svelte';
  import SettingsPage from './SettingsPage.svelte';

  let {
    authProvider,
    tenant,
  }: {
    authProvider?: AuthProvider;
    tenant: TenantContext;
  } = $props();

  const fallbackDataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'test' } }),
    create: async () => ({ data: { id: 'test' } }),
    update: async () => ({ data: { id: 'test' } }),
    deleteOne: async () => ({ data: { id: 'test' } }),
    getApiUrl: () => 'https://auth-capabilities-scope.example.test',
  } as DataProvider;
  const routerProvider: RouterProvider = {
    go: () => {},
    back: () => {},
    parse: () => ({ resource: 'settings', action: 'list', params: {}, pathname: '/settings/profile' }),
  };

  provideAdminContext({
    dataProvider: fallbackDataProvider,
    get authProvider() { return authProvider; },
    resources: [],
    routerProvider,
    get tenant() { return tenant; },
  });
</script>

<section data-testid="snapshot-login"><LoginPage /></section>
<section data-testid="snapshot-settings"><SettingsPage /></section>
<section data-testid="snapshot-audit-viewer"><AuditLogViewer /></section>
