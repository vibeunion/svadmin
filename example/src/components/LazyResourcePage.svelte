<script module lang="ts">
  import { loadProductsPage } from '../features/catalog/index.js';
  import { loadCalendarWorkspacePage } from '../features/calendar/index.js';
  import { loadUserManagementPage } from '../features/people/index.js';
  import { loadCrmDashboardPage } from '../features/crm/index.js';
  import { loadMailWorkspacePage } from '../features/mail/index.js';
  import { loadOperationsWorkspacePage } from '../features/operations/index.js';
  import { loadAiWorkspacePage } from '../features/ai/index.js';
  import { loadRealEstateWorkspacePage } from '../features/property/index.js';
  import { loadTodoWorkspacePage } from '../features/planning/index.js';
  import { loadDomainWorkspacePage } from '../features/domain/index.js';
  import { loadCaseWorkspacePage } from '../features/case/index.js';
  import { loadExampleResourcePage } from '../features/resource/index.js';
  import { loadDesignPrinciplesPage } from '../features/showcase/index.js';
  import type { DemoResource } from '../resource-schemas';

  type ResourcePageKey = DemoResource | 'design_principles';
  const loadDefaultResourcePage = loadExampleResourcePage;

  const resourcePageLoaders = {
    products: loadProductsPage,
    case_workspace: loadCaseWorkspacePage,
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
  } as const satisfies Partial<Record<ResourcePageKey, unknown>>;

  function getResourcePageLoader(resourceName: string) {
    const entry = Object.entries(resourcePageLoaders).find(([name]) => name === resourceName);
    if (entry) return entry[1];
    return loadDefaultResourcePage;
  }
</script>

<script lang="ts">
  import LazyPage from '@svadmin/ui/components/LazyPage.svelte';

  let { resourceName }: { resourceName: string } = $props();
  const loader = $derived(getResourcePageLoader(resourceName));
</script>

<LazyPage {loader} props={{ resourceName }} />
