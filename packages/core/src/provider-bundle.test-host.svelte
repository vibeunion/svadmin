<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { captureAdminContext, provideAdminContext } from './context.svelte';
  import type { ProviderBundle, TenantContext } from './provider-bundle';
  import type { ResourceDefinition } from './types';
  import ProviderBundleQueryTestProbe from './provider-bundle.query-test-probe.svelte';

  interface Props {
    instance: string;
    providerBundle: ProviderBundle;
    tenant: TenantContext;
    resources: ResourceDefinition[];
    queryClient?: QueryClient;
    queryEnabled?: boolean;
  }

  let {
    instance,
    providerBundle,
    tenant,
    resources,
    queryClient,
    queryEnabled = false,
  }: Props = $props();

  provideAdminContext({
    get providerBundle() { return providerBundle; },
    get tenant() { return tenant; },
    get resources() { return resources; },
  });

  const adminContext = captureAdminContext();
  const fallbackQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const activeQueryClient = $derived(queryClient ?? fallbackQueryClient);

  async function readResource(): Promise<void> {
    await adminContext.getDataProviderForResource('posts').getList({
      resource: 'posts',
      meta: { request: instance, tenantId: 'call-spoof' },
    });
  }
</script>

<button data-testid={`${instance}-read`} onclick={readResource}>read</button>
<output data-testid={`${instance}-tenant`}>{adminContext.tenant?.tenantId ?? ''}</output>
<output data-testid={`${instance}-cache`}>{adminContext.tenantCacheKey?.__svadminTenant ?? ''}</output>
<output data-testid={`${instance}-access`}>
  {adminContext.accessControlProvider === providerBundle.accessControlProvider ? 'scoped' : 'missing'}
</output>
<output data-testid={`${instance}-audit`}>
  {adminContext.auditLogProvider === providerBundle.auditLogProvider ? 'scoped' : 'missing'}
</output>
<output data-testid={`${instance}-notification`}>
  {adminContext.notificationProvider === providerBundle.notificationProvider ? 'scoped' : 'missing'}
</output>
<output data-testid={`${instance}-chat`}>
  {adminContext.chatProvider === providerBundle.chatProvider ? 'scoped' : 'missing'}
</output>
<output data-testid={`${instance}-organization`}>
  {adminContext.organizationProvider === providerBundle.organizationProvider ? 'scoped' : 'missing'}
</output>
<output data-testid={`${instance}-identity-governance`}>
  {adminContext.identityGovernanceProvider === providerBundle.identityGovernanceProvider ? 'scoped' : 'missing'}
</output>
<output data-testid={`${instance}-session`}>
  {adminContext.sessionProvider === providerBundle.sessionProvider ? 'scoped' : 'missing'}
</output>
<output data-testid={`${instance}-credential`}>
  {adminContext.credentialProvider === providerBundle.credentialProvider ? 'scoped' : 'missing'}
</output>
<QueryClientProvider client={activeQueryClient}>
  <ProviderBundleQueryTestProbe {instance} enabled={queryEnabled} />
</QueryClientProvider>
