<script lang="ts">
  import { provideAdminContext, type AuthProvider, type ProviderBundle, type TenantContext } from '@svadmin/core';
  import ApiSettings from './ApiSettings.svelte';
  import SecuritySettings from './SecuritySettings.svelte';
  import SettingsEnterprisePage from './account/SettingsEnterprisePage.svelte';

  interface Props {
    page: 'api' | 'security' | 'enterprise';
    providerBundle: ProviderBundle;
    authProvider?: AuthProvider;
    tenant?: TenantContext;
  }

  let { page, providerBundle, authProvider, tenant }: Props = $props();
  provideAdminContext({
    get providerBundle() { return providerBundle; },
    get authProvider() { return authProvider ?? providerBundle.authProvider ?? null; },
    get tenant() { return tenant; },
    resources: [],
  });
</script>

{#if page === 'api'}
  <ApiSettings />
{:else if page === 'security'}
  <SecuritySettings />
{:else}
  <SettingsEnterprisePage />
{/if}
