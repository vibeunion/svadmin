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
  const loadOperationsWorkspacePage = () => import('../pages/OperationsWorkspacePage.svelte');
  const loadDomainWorkspacePage = () => import('../pages/DomainWorkspacePage.svelte');

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
    stock_movements: loadOperationsWorkspacePage,
    stock_transfers: loadOperationsWorkspacePage,
    cycle_counts: loadOperationsWorkspacePage,
    inventory_adjustments: loadOperationsWorkspacePage,
    reorder_rules: loadOperationsWorkspacePage,
    purchase_orders: loadOperationsWorkspacePage,
    sales_orders: loadOperationsWorkspacePage,
    products: loadDomainWorkspacePage,
    skus: loadDomainWorkspacePage,
    categories: loadDomainWorkspacePage,
    suppliers: loadDomainWorkspacePage,
    warehouses: loadDomainWorkspacePage,
    notifications: loadDomainWorkspacePage,
    store_client_products: loadDomainWorkspacePage,
    store_client_orders: loadDomainWorkspacePage,
    project_planning: loadDomainWorkspacePage,
    store_admin: loadDomainWorkspacePage,
    store_services: loadDomainWorkspacePage,
    ai_prompt: loadDomainWorkspacePage,
    invoice_generator: loadDomainWorkspacePage,
    billing_plans: loadDomainWorkspacePage,
    billing_invoices: loadDomainWorkspacePage,
    billing_subscriptions: loadDomainWorkspacePage,
    security_sessions: loadDomainWorkspacePage,
    security_devices: loadDomainWorkspacePage,
    security_allowed_ips: loadDomainWorkspacePage,
    referral_invites: loadDomainWorkspacePage,
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
