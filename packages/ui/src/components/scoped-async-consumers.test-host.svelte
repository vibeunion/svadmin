<script lang="ts">
  import {
    provideAdminContext,
    type AuthProvider,
    type AuditLogProvider,
    type ChatProvider,
    type DataProvider,
    type DataProviderInput,
    type ResourceDefinition,
    type RouterProvider,
    type TenantContext,
  } from '@svadmin/core';
  import AuditLogDrawer from './AuditLogDrawer.svelte';
  import AICommandBar from './AICommandBar.svelte';
  import CopilotPanel from './CopilotPanel.svelte';
  import InsightCard from './InsightCard.svelte';
  import SmartSuggest from './SmartSuggest.svelte';
  import AboutSettings from './AboutSettings.svelte';
  import InferencerPanel from './InferencerPanel.svelte';
  import ProfilePage from './ProfilePage.svelte';
  import RolesSettings from './RolesSettings.svelte';

  type Consumer = 'audit' | 'command' | 'copilot' | 'insight' | 'snapshots' | 'suggest';

  interface Props {
    consumer: Consumer;
    dataProvider?: DataProviderInput;
    authProvider?: AuthProvider;
    chatProvider?: ChatProvider;
    auditLogProvider?: AuditLogProvider;
    resources?: ResourceDefinition[];
    tenant: TenantContext;
    requestContext: string;
    consumerOpen?: boolean;
    inputValue?: string;
  }

  let {
    consumer,
    dataProvider,
    authProvider,
    chatProvider,
    auditLogProvider,
    resources = [],
    tenant,
    requestContext,
    consumerOpen = true,
    inputValue = '',
  }: Props = $props();

  const fallbackDataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'test' } }),
    create: async () => ({ data: { id: 'test' } }),
    update: async () => ({ data: { id: 'test' } }),
    deleteOne: async () => ({ data: { id: 'test' } }),
    getApiUrl: () => 'https://scoped-async-consumers.example.test',
  } as DataProvider;

  const routerProvider: RouterProvider = {
    go: () => {},
    back: () => {},
    parse: () => ({
      resource: requestContext,
      action: 'list',
      params: {},
      pathname: `/${requestContext}`,
    }),
  };
  provideAdminContext({
    get dataProvider() { return dataProvider ?? fallbackDataProvider; },
    get authProvider() { return authProvider; },
    get resources() { return resources; },
    routerProvider,
    get chatProvider() { return chatProvider; },
    get auditLogProvider() { return auditLogProvider; },
    get tenant() { return tenant; },
  });
</script>

{#if consumer === 'insight'}
  <InsightCard context={requestContext} />
{:else if consumer === 'audit'}
  <AuditLogDrawer open={true} resource={requestContext} recordId="shared-record" />
{:else if consumer === 'copilot'}
  <CopilotPanel open={true} />
{:else if consumer === 'command'}
  <AICommandBar open={consumerOpen} />
{:else if consumer === 'suggest'}
  <SmartSuggest value={inputValue} context={requestContext} />
{:else if consumer === 'snapshots'}
  <section data-testid="snapshot-about"><AboutSettings /></section>
  <section data-testid="snapshot-inferencer"><InferencerPanel /></section>
  <section data-testid="snapshot-profile"><ProfilePage /></section>
  <section data-testid="snapshot-roles"><RolesSettings /></section>
{/if}
