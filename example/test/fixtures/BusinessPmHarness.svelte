<script lang="ts">
  import type { ChatProvider, NotificationProvider, RouterProvider } from '@svadmin/core';
  import type { QueryClient } from '@tanstack/svelte-query';
  import { definedOptions } from '@svadmin/core/options';
  import { AdminApp } from '@svadmin/ui';
  import AutoTable from '../../../packages/ui/src/components/AutoTable.svelte';
  import { createResources } from '../../src/resources';
  import { demoRendering } from '../../src/resource-rendering';
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
  import Dashboard from '../../src/features/dashboard/Dashboard.svelte';

  let { resourceName, page = 'workspace', notificationProvider, chatProvider: providedChatProvider, queryClient }: {
    resourceName: string;
    page?: 'workspace' | 'table';
    notificationProvider?: NotificationProvider;
    chatProvider?: ChatProvider;
    queryClient?: QueryClient;
  } = $props();
  const resources = createResources('en');
  const dataProvider = inMemoryDataProvider;
  const routerProvider: RouterProvider = {
    go: () => {}, back: () => {}, parse: () => ({ pathname: '/', params: {} }),
  };
  const defaultChatProvider = createInventoryChatProvider(inMemoryDataProvider, resources);
  const chatProvider = $derived(providedChatProvider ?? defaultChatProvider);
</script>

<AdminApp {dataProvider} {resources} {routerProvider} {chatProvider} locale="en"
  {...definedOptions({ notificationProvider, queryClient })} queryClientDefaultOptions={{ queries: { retry: false } }}>
  {#snippet dashboard()}
    {#if resourceName === 'dashboard'}<Dashboard />
    {:else if page === 'table'}<AutoTable {resourceName} rendering={demoRendering(resourceName)} />
    {:else if resourceName === 'todos'}<TodoWorkspacePage {resourceName} />
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
