<script module lang="ts">
  const loadDefaultResourcePage = () => import('../pages/ExampleResourcePage.svelte');
  const loadTodoWorkspacePage = () => import('../pages/TodoWorkspacePage.svelte');
  const loadUserManagementPage = () => import('../pages/UserManagementPage.svelte');
  const loadCalendarWorkspacePage = () => import('../pages/CalendarWorkspacePage.svelte');
  const loadAiWorkspacePage = () => import('../pages/AiWorkspacePage.svelte');
  const loadMailWorkspacePage = () => import('../pages/MailWorkspacePage.svelte');
  const loadCrmDashboardPage = () => import('../pages/CrmDashboardPage.svelte');
  const loadRealEstateWorkspacePage = () => import('../pages/RealEstateWorkspacePage.svelte');
  const loadDesignPrinciplesPage = () => import('../pages/DesignPrinciplesPage.svelte');

  const resourcePageLoaders = {
    todos: loadTodoWorkspacePage,
    users: loadUserManagementPage,
    roles: loadUserManagementPage,
    permissions: loadUserManagementPage,
    user_accounts: loadUserManagementPage,
    user_logs: loadUserManagementPage,
    user_settings: loadUserManagementPage,
    calendar_events: loadCalendarWorkspacePage,
    ai_conversations: loadAiWorkspacePage,
    mail_inbox: loadMailWorkspacePage,
    mail_draft: loadMailWorkspacePage,
    mail_sent: loadMailWorkspacePage,
    mail_archive: loadMailWorkspacePage,
    mail_snoozed: loadMailWorkspacePage,
    mail_spam: loadMailWorkspacePage,
    mail_trash: loadMailWorkspacePage,
    crm_accounts: loadCrmDashboardPage,
    crm_contacts: loadCrmDashboardPage,
    crm_deals: loadCrmDashboardPage,
    crm_activities: loadCrmDashboardPage,
    properties: loadRealEstateWorkspacePage,
    property_agents: loadRealEstateWorkspacePage,
    property_leads: loadRealEstateWorkspacePage,
    property_showings: loadRealEstateWorkspacePage,
    design_principles: loadDesignPrinciplesPage,
  } as const;

  function getResourcePageLoader(resourceName: string) {
    if (resourceName in resourcePageLoaders) {
      return resourcePageLoaders[resourceName as keyof typeof resourcePageLoaders];
    }
    return loadDefaultResourcePage;
  }
</script>

<script lang="ts">
  import LazyPage from '@svadmin/ui/components/LazyPage.svelte';

  let { resourceName }: { resourceName: string } = $props();
  const loader = $derived(getResourcePageLoader(resourceName));
</script>

<LazyPage {loader} props={{ resourceName }} />
