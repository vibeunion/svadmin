<script lang="ts">
  import {
    provideAdminContext,
    type AuthProvider,
    type DataProvider,
    type RouterProvider,
    type TenantContext,
  } from '@svadmin/core';
  import ProfilePage from './ProfilePage.svelte';

  let {
    authProvider,
    tenant,
  }: {
    authProvider: AuthProvider;
    tenant: TenantContext;
  } = $props();

  const dataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'profile-scope' } }),
    create: async () => ({ data: { id: 'profile-scope' } }),
    update: async () => ({ data: { id: 'profile-scope' } }),
    deleteOne: async () => ({ data: { id: 'profile-scope' } }),
    getApiUrl: () => 'https://profile-auth-scope.example.test',
  } as DataProvider;
  const routerProvider: RouterProvider = {
    go: () => {},
    back: () => {},
    parse: () => ({ resource: 'profile', action: 'list', params: {}, pathname: '/settings/profile' }),
  };

  provideAdminContext({
    dataProvider,
    get authProvider() { return authProvider; },
    resources: [],
    routerProvider,
    get tenant() { return tenant; },
  });
</script>

<ProfilePage />
