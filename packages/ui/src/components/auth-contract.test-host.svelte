<script lang="ts">
  import { provideAdminContext, type AuthProvider, type DataProvider, type RouterProvider } from '@svadmin/core';
  import LoginPage from './LoginPage.svelte';
  import RegisterPage from './RegisterPage.svelte';
  import ForgotPasswordPage from './ForgotPasswordPage.svelte';
  import UpdatePasswordPage from './UpdatePasswordPage.svelte';

  let { provider, screen }: {
    provider: AuthProvider;
    screen: 'login' | 'register' | 'forgot' | 'update';
  } = $props();

  const dataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
    getApiUrl: () => '',
  } satisfies DataProvider;
  const routerProvider: RouterProvider = {
    go: () => {},
    back: () => {},
    parse: () => ({ resource: '', action: 'list', params: {}, pathname: '/login' }),
  };
  provideAdminContext({ dataProvider, resources: [], get authProvider() { return provider; }, routerProvider });
</script>

{#if screen === 'login'}
  <LoginPage />
{:else if screen === 'register'}
  <RegisterPage />
{:else if screen === 'forgot'}
  <ForgotPasswordPage />
{:else}
  <UpdatePasswordPage />
{/if}
