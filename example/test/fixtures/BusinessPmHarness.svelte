<script lang="ts">
  import type { RouterProvider } from '@svadmin/core';
  import { AdminApp } from '@svadmin/ui';
  import { createResources } from '../../src/resources';
  import { inMemoryDataProvider } from '../../src/providers/inMemoryDb';
  import { createInventoryChatProvider } from '../../src/providers/inventoryAssistant';
  import TodoWorkspacePage from '../../src/features/planning/TodoWorkspacePage.svelte';
  import MailWorkspacePage from '../../src/features/mail/MailWorkspacePage.svelte';
  import CrmDashboardPage from '../../src/features/crm/CrmDashboardPage.svelte';
  import DomainWorkspacePage from '../../src/features/domain/DomainWorkspacePage.svelte';
  import AiWorkspacePage from '../../src/features/ai/AiWorkspacePage.svelte';
  import CalendarWorkspacePage from '../../src/features/calendar/CalendarWorkspacePage.svelte';
  import RealEstateWorkspacePage from '../../src/features/property/RealEstateWorkspacePage.svelte';
  import UserManagementPage from '../../src/features/people/UserManagementPage.svelte';
  import OperationsWorkspacePage from '../../src/features/operations/OperationsWorkspacePage.svelte';

  let { resourceName }: { resourceName: string } = $props();
  const resources = createResources('en');
  const dataProvider = inMemoryDataProvider;
  const routerProvider: RouterProvider = {
    go: () => {}, back: () => {}, parse: () => ({ pathname: '/', params: {} }),
  };
  const chatProvider = createInventoryChatProvider(inMemoryDataProvider, resources);
</script>

<AdminApp {dataProvider} {resources} {routerProvider} {chatProvider} locale="en">
  {#snippet dashboard()}
    {#if resourceName === 'todos'}<TodoWorkspacePage {resourceName} />
    {:else if resourceName.startsWith('mail_')}<MailWorkspacePage {resourceName} />
    {:else if resourceName.startsWith('crm_')}<CrmDashboardPage {resourceName} />
    {:else if resourceName === 'ai_conversations'}<AiWorkspacePage {resourceName} />
    {:else if resourceName === 'calendar_events'}<CalendarWorkspacePage {resourceName} />
    {:else if ['reorder_rules', 'purchase_orders', 'sales_orders'].includes(resourceName)}<OperationsWorkspacePage {resourceName} />
    {:else if resourceName.startsWith('propert')}<RealEstateWorkspacePage {resourceName} />
    {:else if ['users', 'roles', 'permissions', 'user_accounts', 'user_logs', 'user_settings'].includes(resourceName)}<UserManagementPage {resourceName} />
    {:else}<DomainWorkspacePage {resourceName} />{/if}
  {/snippet}
</AdminApp>
