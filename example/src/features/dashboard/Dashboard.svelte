<!-- // @vibe-escape: Level 3 Headless / custom operations cockpit composition -->
<script lang="ts">
  import { demoRenderers } from '../../resource-rendering';
  import { demoContracts } from '../../resource-contracts';
  import type { DemoRow } from '../../resource-schemas';

  type Movement = DemoRow<'stock_movements'>;

  import { captureAdminContext, createEnterpriseRequestContext, useList, type DashboardProvider } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { AuditSection, ChartContainer, DashboardPage, DataState, MetricBlock, StatusPill, type AuditDataState } from '@svadmin/ui';
  import {
    Bell,
    Bot,
    CalendarDays,
    ClipboardCheck,
    CreditCard,
    Home,
    Package,
    Settings,
    Shuffle,
    Sliders,
    TrendingUp,
    Truck,
    Users,
  } from '@lucide/svelte';
  import { registerDashboardTranslations } from './dashboard-i18n';

  registerDashboardTranslations();

  const i18n = useTranslation();
  const adminContext = captureAdminContext();
  import { recordLink } from '../../workspace/workspace-links';
  import DashboardWorkspace from './DashboardWorkspace.svelte';
  import {
    buildDashboardWorkspace, loadWorkspaceDrilldownRecords, type WorkspaceDrilldownTarget,
  } from './dashboard-workspace-data';

  let declarativeSurfacePromise = $state(import('../../components/DeclarativeSurfaceExample.svelte'));
  let secondaryOpen = $state(false);

  function retryDeclarativeSurface(): void {
    declarativeSurfacePromise = import('../../components/DeclarativeSurfaceExample.svelte');
  }

  const productsQuery = useList({ resource: demoContracts.products, pagination: { mode: 'off' }, errorNotification: false });
  const suppliersQuery = useList({ resource: demoContracts.suppliers, pagination: { current: 1, pageSize: 1 }, errorNotification: false });
  const warehousesQuery = useList({ resource: demoContracts.warehouses, pagination: { current: 1, pageSize: 1 }, errorNotification: false });
  const movementsQuery = useList({ resource: demoContracts.stock_movements, pagination: { mode: 'off' }, sorters: [{ field: 'date', order: 'desc' }], errorNotification: false });
  const transfersQuery = useList({ resource: demoContracts.stock_transfers, pagination: { mode: 'off' }, errorNotification: false });
  const cycleCountsQuery = useList({ resource: demoContracts.cycle_counts, pagination: { mode: 'off' }, errorNotification: false });
  const adjustmentsQuery = useList({ resource: demoContracts.inventory_adjustments, pagination: { mode: 'off' }, errorNotification: false });
  const reorderRulesQuery = useList({ resource: demoContracts.reorder_rules, pagination: { mode: 'off' }, errorNotification: false });
  const purchaseOrdersQuery = useList({ resource: demoContracts.purchase_orders, pagination: { current: 1, pageSize: 1 }, errorNotification: false });
  const salesOrdersQuery = useList({ resource: demoContracts.sales_orders, pagination: { mode: 'off' }, sorters: [{ field: 'orderDate', order: 'desc' }], errorNotification: false });
  const todosQuery = useList({ resource: demoContracts.todos, pagination: { mode: 'off' }, errorNotification: false });
  const usersQuery = useList({ resource: demoContracts.users, pagination: { mode: 'off' }, errorNotification: false });
  const rolesQuery = useList({ resource: demoContracts.roles, pagination: { current: 1, pageSize: 1 }, errorNotification: false });

  // P1: Secondary queries are lazy-loaded upon opening the schedule & collaboration details section
  const calendarQuery = useList({
    resource: demoContracts.calendar_events,
    pagination: { mode: 'off' },
    sorters: [{ field: 'startDate', order: 'asc' }],
    errorNotification: false,
    get queryOptions() {
      return { enabled: secondaryOpen };
    },
  });
  const conversationsQuery = useList({
    resource: demoContracts.ai_conversations,
    pagination: { mode: 'off' },
    sorters: [{ field: 'updatedAt', order: 'desc' }],
    errorNotification: false,
    get queryOptions() {
      return { enabled: secondaryOpen };
    },
  });
  const notificationsQuery = useList({
    resource: demoContracts.notifications,
    pagination: { mode: 'off' },
    sorters: [{ field: 'createdAt', order: 'desc' }],
    errorNotification: false,
    get queryOptions() {
      return { enabled: secondaryOpen };
    },
  });

  const locale = $derived(i18n.locale);
  const isZh = $derived(locale === 'zh-CN');

  const products = $derived(demoRenderers.products.records(productsQuery.data?.data ?? []));
  const movements = $derived(demoRenderers.stock_movements.records(movementsQuery.data?.data ?? []));
  const transfers = $derived(demoRenderers.stock_transfers.records(transfersQuery.data?.data ?? []));
  const cycleCounts = $derived(demoRenderers.cycle_counts.records(cycleCountsQuery.data?.data ?? []));
  const adjustments = $derived(demoRenderers.inventory_adjustments.records(adjustmentsQuery.data?.data ?? []));
  const reorderRules = $derived(demoRenderers.reorder_rules.records(reorderRulesQuery.data?.data ?? []));
  const todos = $derived(demoRenderers.todos.records(todosQuery.data?.data ?? []));
  const users = $derived(demoRenderers.users.records(usersQuery.data?.data ?? []));
  const salesOrders = $derived(demoRenderers.sales_orders.records(salesOrdersQuery.data?.data ?? []));
  const calendarEvents = $derived(demoRenderers.calendar_events.records(calendarQuery.data?.data ?? []));
  const conversations = $derived(demoRenderers.ai_conversations.records(conversationsQuery.data?.data ?? []));
  const notifications = $derived(demoRenderers.notifications.records(notificationsQuery.data?.data ?? []));

  const queries = [
    productsQuery, suppliersQuery, warehousesQuery, movementsQuery, transfersQuery,
    cycleCountsQuery, adjustmentsQuery, reorderRulesQuery, purchaseOrdersQuery,
    salesOrdersQuery, todosQuery, usersQuery, rolesQuery, calendarQuery,
    conversationsQuery, notificationsQuery,
  ];
  const isRefreshing = $derived(queries.some((query) => query.isFetching));
  const hasError = $derived(queries.some((query) => query.isError));
  const workspaceRequestContext = createEnterpriseRequestContext({
    tenantId: 'example-tenant', requestId: 'example-dashboard-workspace', traceId: 'example-dashboard-workspace',
  });
  const workspaceDataProvider = adminContext.getDataProvider();
  // 页面的列表查询已覆盖同一批资源，工作区快照复用这些行，避免同一资源重复请求。
  const workspaceRows = $derived({
    movements: movementsQuery.data?.data ?? [],
    orders: salesOrdersQuery.data?.data ?? [],
    todos: todosQuery.data?.data ?? [],
  });
  const workspaceUnavailable = $derived(movementsQuery.isError || salesOrdersQuery.isError || todosQuery.isError);
  const workspaceProvider = $derived<DashboardProvider>({
    get: async (_context, query) => {
      if (workspaceUnavailable) throw new Error('Dashboard workspace data is unavailable');
      return buildDashboardWorkspace(workspaceRows, query, { isZh }).snapshot;
    },
  });
  async function loadWorkspaceRecords(target: WorkspaceDrilldownTarget) {
    const records = await loadWorkspaceDrilldownRecords(workspaceDataProvider, target, { isZh });
    return records.map(record => ({
      ...record,
      href: recordLink(record.resource, record.id, adminContext.currentPath()),
    }));
  }
  function sectionState(query: { isLoading: boolean; isError: boolean; data?: unknown }, count: number): AuditDataState {
    if (query.isLoading) return 'loading';
    if (query.isError) return query.data ? 'partial' : 'error';
    return count === 0 ? 'empty' : 'ready';
  }
  const queryByRoute = {
    products: productsQuery, suppliers: suppliersQuery, warehouses: warehousesQuery,
    purchase_orders: purchaseOrdersQuery, sales_orders: salesOrdersQuery, todos: todosQuery,
    stock_transfers: transfersQuery, cycle_counts: cycleCountsQuery,
    inventory_adjustments: adjustmentsQuery, reorder_rules: reorderRulesQuery,
    users: usersQuery, roles: rolesQuery, calendar_events: calendarQuery, ai_conversations: conversationsQuery,
    notifications: notificationsQuery,
  };
  function displayValue(href: string, value: string | number): string | number {
    const key = href.replace('#/', '');
    const query = Object.entries(queryByRoute).find(([route]) => route === key)?.[1];
    return query && (query.isError || query.isLoading) ? '—' : value;
  }
  function retryFailedQueries(): void {
    for (const query of queries) {
      if (query.isError && !query.isFetching) void query.refetch();
    }
  }

  const totalStock = $derived(products.reduce((sum, product) => sum + product.stock, 0));
  const totalAssetValue = $derived(products.reduce((sum, product) => sum + product.stock * product.price, 0));
  const lowStockProducts = $derived(products.filter((product) => product.stock <= product.minStock));
  const outOfStockProducts = $derived(products.filter((product) => product.stock === 0));
  const availableProducts = $derived(products.filter((product) => product.stock > product.minStock));
  const openTodos = $derived(todos.filter((todo) => !todo.completed).length);
  const unreadNotifications = $derived(notifications.filter((notification) => !notification.read).length);
  const openConversations = $derived(conversations.filter((conversation) => conversation.status !== 'resolved').length);
  const activeTransfers = $derived(transfers.filter((transfer) => !['received', 'cancelled'].includes(transfer.status)).length);
  const activeCycleCounts = $derived(cycleCounts.filter((count) => !['reconciled', 'cancelled'].includes(count.status)).length);
  const pendingAdjustments = $derived(adjustments.filter((adjustment) => adjustment.status === 'pending_approval').length);
  const reviewReorderRules = $derived(reorderRules.filter((rule) => rule.status === 'review').length);
  const bestSellers = $derived(products.slice().sort((a, b) => b.stock - a.stock).slice(0, 3));
  const teamMembers = $derived(users.slice(0, 4));

  const stats = $derived([
    { label: i18n.t('dashboard.stat.totalAssetValue'), value: `$${Math.round(totalAssetValue / 1000)}K`, href: '#/products', Icon: TrendingUp, tone: 'bg-primary/10 text-primary border-primary/20' },
    { label: i18n.t('dashboard.stat.available'), value: availableProducts.length, href: '#/products', Icon: Package, tone: 'bg-success/10 text-success border-success/20' },
    { label: i18n.t('dashboard.stat.stockUnits'), value: totalStock, href: '#/products', Icon: Package, tone: 'bg-info/10 text-info border-info/20' },
    { label: i18n.t('dashboard.stat.warehouses'), value: warehousesQuery.data?.total ?? 0, href: '#/warehouses', Icon: Home, tone: 'bg-success/10 text-success border-success/20' },
    { label: i18n.t('dashboard.stat.suppliers'), value: suppliersQuery.data?.total ?? 0, href: '#/suppliers', Icon: Truck, tone: 'bg-warning/10 text-warning border-warning/20' },
    { label: i18n.t('dashboard.stat.settings'), value: reorderRules.length, href: '#/reorder_rules', Icon: Settings, tone: 'bg-muted text-muted-foreground border-border' },
  ]);

  const orderSummary = $derived([
    { label: i18n.t('dashboard.order.purchaseOrders'), value: purchaseOrdersQuery.data?.total ?? 0, href: '#/purchase_orders', Icon: ClipboardCheck },
    { label: i18n.t('dashboard.order.salesOrders'), value: salesOrdersQuery.data?.total ?? 0, href: '#/sales_orders', Icon: CreditCard },
    { label: i18n.t('dashboard.order.openTodo'), value: openTodos, href: '#/todos', Icon: TrendingUp },
    { label: i18n.t('dashboard.order.stockTransfers'), value: activeTransfers, href: '#/stock_transfers', Icon: Shuffle },
    { label: i18n.t('dashboard.order.cycleCounts'), value: activeCycleCounts, href: '#/cycle_counts', Icon: ClipboardCheck },
    { label: i18n.t('dashboard.order.adjustments'), value: pendingAdjustments, href: '#/inventory_adjustments', Icon: Sliders },
    { label: i18n.t('dashboard.order.reorderRules'), value: reviewReorderRules, href: '#/reorder_rules', Icon: Settings },
  ]);

  const roadmapModules = $derived([
    {
      label: i18n.t('dashboard.module.userManagement'),
      value: usersQuery.data?.total ?? 0,
      meta: `${displayValue('#/roles', rolesQuery.data?.total ?? 0)} ${i18n.t('dashboard.module.roles')}`,
      href: '#/users',
      Icon: Users,
      tone: 'bg-primary/10 text-primary border-primary/20',
    },
    {
      label: i18n.t('dashboard.module.calendar'),
      value: secondaryOpen ? (calendarQuery.data?.total ?? 0) : '—',
      meta: i18n.t('dashboard.module.calendarMeta'),
      href: '#/calendar_events',
      Icon: CalendarDays,
      tone: 'bg-info/10 text-info border-info/20',
    },
    {
      label: i18n.t('dashboard.module.aiChat'),
      value: secondaryOpen ? openConversations : '—',
      meta: i18n.t('dashboard.module.aiChatMeta'),
      href: '#/ai_conversations',
      Icon: Bot,
      tone: 'bg-primary/10 text-primary border-primary/20',
    },
    {
      label: i18n.t('dashboard.module.notificationCenter'),
      value: secondaryOpen ? unreadNotifications : '—',
      meta: i18n.t('dashboard.module.notificationCenterMeta'),
      href: '#/notifications',
      Icon: Bell,
      tone: 'bg-warning/10 text-warning border-warning/20',
    },
  ]);

  function movementTone(type: string): string {
    if (type === 'in') return 'text-success bg-success/10';
    if (type === 'out') return 'text-destructive bg-destructive/10';
    return 'text-warning bg-warning/10';
  }

  function signedQuantity(movement: Movement): string {
    if (movement.type === 'in') return `+${movement.quantity}`;
    return String(movement.quantity);
  }

  function eventTypeLabel(type: string): string {
    const key = `dashboard.eventType.${type}`;
    const translation = i18n.t(key);
    return translation !== key ? translation : type;
  }

  function eventTitle(title: string): string {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const key = `dashboard.eventTitle.${slug}`;
    const translation = i18n.t(key);
    return translation !== key ? translation : title;
  }

  function conversationTitle(title: string): string {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const key = `dashboard.conversationTitle.${slug}`;
    const translation = i18n.t(key);
    return translation !== key ? translation : title;
  }

  function notificationTitle(title: string): string {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const key = `dashboard.notificationTitle.${slug}`;
    const translation = i18n.t(key);
    return translation !== key ? translation : title;
  }

  function movementNote(note: string): string {
    const slug = note.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const key = `dashboard.movementNote.${slug}`;
    const translation = i18n.t(key);
    return translation !== key ? translation : note;
  }

  function conversationStatusLabel(status: string): string {
    const key = `dashboard.conversationStatus.${status}`;
    const translation = i18n.t(key);
    return translation !== key ? translation : status;
  }

  function severityLabel(severity: string): string {
    const key = `dashboard.severity.${severity}`;
    const translation = i18n.t(key);
    return translation !== key ? translation : severity;
  }

  function orderStatusLabel(status: string): string {
    const key = `dashboard.orderStatus.${status}`;
    const translation = i18n.t(key);
    return translation !== key ? translation : status;
  }
</script>

<DashboardPage pageId="operations-dashboard"
  title={i18n.t('dashboard.pageTitle')}
  description={i18n.t('dashboard.pageDescription')}
  data-svadmin-component="OperationsDashboard"
  data-svadmin-resource="dashboard">
  {#snippet actions()}
    <span role="status">
      <StatusPill tone={hasError ? 'warning' : isRefreshing ? 'info' : 'success'}
        label={hasError ? i18n.t('dashboard.status.unavailable') : isRefreshing ? i18n.t('dashboard.status.updating') : i18n.t('dashboard.status.synced')} />
    </span>
  {/snippet}

  {#if hasError}
    <DataState state="error" title={i18n.t('dashboard.error.title')}
      description={i18n.t('dashboard.error.description')}
      retry={retryFailedQueries} />
  {/if}
  <section class="grid gap-3" aria-labelledby="dashboard-workspace-heading" data-testid="example-dashboard-workspace" data-svadmin-component="DashboardWorkspaceSection">
    <div>
      <h2 id="dashboard-workspace-heading" class="text-base font-semibold text-foreground">
        {i18n.t('dashboard.workspace.heading')}
      </h2>
      <p class="text-sm text-muted-foreground">
        {i18n.t('dashboard.workspace.description')}
      </p>
    </div>
    <DashboardWorkspace
      provider={workspaceProvider}
      dashboardId="operations-dashboard"
      requestContext={workspaceRequestContext}
      title={i18n.t('dashboard.workspace.title')}
      isZh={isZh}
      loadDrilldownRecords={loadWorkspaceRecords}
      defaultFrom="2026-06-01"
      defaultTo="2026-06-30" />
  </section>
  {#snippet metrics()}
    <MetricBlock label={i18n.t('dashboard.metric.stockAtRisk')} value={productsQuery.isError ? '—' : lowStockProducts.length}
      trendTone={!productsQuery.isLoading && !productsQuery.isError && lowStockProducts.length > 0 ? 'warning' : 'neutral'}
      detail={productsQuery.isError ? '' : (isZh ? `其中 ${outOfStockProducts.length} 项缺货` : `${outOfStockProducts.length} ${i18n.t('dashboard.metric.outOfStock')}`)}
      loading={productsQuery.isLoading}
      data-svadmin-component="StockRiskMetric"
      data-svadmin-resource="products" />
    <MetricBlock label={i18n.t('dashboard.metric.openWork')}
      value={todosQuery.isError || transfersQuery.isError || adjustmentsQuery.isError ? '—' : openTodos + activeTransfers + pendingAdjustments}
      detail={i18n.t('dashboard.metric.workDetail')}
      loading={todosQuery.isLoading || transfersQuery.isLoading || adjustmentsQuery.isLoading}
      data-svadmin-component="OpenWorkMetric"
      data-svadmin-resource="todos" />
    <MetricBlock label={i18n.t('dashboard.metric.inventoryValue')}
      value={productsQuery.isError ? '—' : `$${Math.round(totalAssetValue).toLocaleString(locale)}`}
      detail={productsQuery.isError ? '' : `${totalStock.toLocaleString(locale)} ${i18n.t('dashboard.metric.unitsInStock')}`}
      loading={productsQuery.isLoading}
      data-svadmin-component="InventoryValueMetric"
      data-svadmin-resource="products" />
  {/snippet}

  <!-- Inventory Health + Operations Queue -->
  <div class="dashboard-primary-grid" data-svadmin-component="DashboardPrimaryGrid">
    <AuditSection title={i18n.t('dashboard.section.stockRisk')}
      accent={lowStockProducts.length ? 'warning' : 'neutral'}
      state={sectionState(productsQuery, lowStockProducts.length)}
      message={!productsQuery.isError && !productsQuery.isLoading && !lowStockProducts.length ? i18n.t('dashboard.section.stockHealthy') : undefined}
      retry={() => void productsQuery.refetch()}>
      {#snippet actions()}
        <a class="text-sm font-medium text-primary hover:underline" href="#/products">{i18n.t('dashboard.section.products')}</a>
      {/snippet}
      <div class="divide-y" data-svadmin-component="StockRiskList" data-svadmin-resource="products">
        {#each lowStockProducts as product (product.id)}
          <div class="flex items-center justify-between gap-4 py-3" data-svadmin-component="StockRiskItem" data-svadmin-field="stock">
            <div class="min-w-0">
              <a href={recordLink('products', product.id, adminContext.currentPath())} class="block truncate text-sm font-medium text-foreground hover:text-primary hover:underline">{product.name}</a>
              <p class="text-xs text-muted-foreground">{product.sku}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold text-destructive">{product.stock} / {product.minStock}</p>
              <p class="text-xs text-muted-foreground">{i18n.t('dashboard.section.onHandMin')}</p>
            </div>
          </div>
        {:else}
          <div class="px-6 py-8 text-sm text-muted-foreground">{i18n.t('dashboard.section.stockHealthy')}</div>
        {/each}
      </div>
    </AuditSection>

    <AuditSection title={i18n.t('dashboard.section.operationsQueue')} accent="neutral">
      <div class="grid gap-x-5 sm:grid-cols-2" data-dashboard-queue data-svadmin-component="OperationsQueue" data-svadmin-resource="sales_orders">
        {#each orderSummary as item (item.label)}
          <a href={item.href} class="flex items-center justify-between gap-3 border-b border-border py-3 transition hover:bg-muted/50" data-svadmin-component="QueueItem">
            <div class="flex items-center gap-3">
              <item.Icon class="h-4 w-4 text-muted-foreground" />
              <span class="text-sm font-medium">{item.label}</span>
            </div>
            <span class="text-sm font-semibold tabular-nums text-foreground">{displayValue(item.href, item.value)}</span>
          </a>
        {/each}
      </div>
    </AuditSection>
  </div>

  <details class="svadmin-collapsible dashboard-secondary" data-dashboard-summary>
    <summary>{i18n.t('dashboard.stat.settings')}</summary>
    <section class="grid grid-cols-2 gap-x-6 gap-y-3 pb-4 xl:grid-cols-3" data-svadmin-component="DashboardStatsGrid">
      {#each stats as stat (stat.label)}
        <a href={stat.href} class="block py-2 hover:text-primary" data-svadmin-component="DashboardStatCard">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="min-h-7 text-xs font-medium leading-tight text-muted-foreground sm:min-h-0">{stat.label}</p>
              <p class="mt-1 text-lg font-semibold tabular-nums text-foreground">{displayValue(stat.href, stat.value)}</p>
            </div>
            <span class="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground">
              <stat.Icon class="h-4 w-4" />
            </span>
          </div>
        </a>
      {/each}
    </section>

    <!-- Roadmap modules -->
    <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-svadmin-component="DashboardRoadmapModules">
      {#each roadmapModules as module (module.label)}
        <a href={module.href} class="dashboard-module border-b py-3 transition hover:bg-muted/50" data-svadmin-component="DashboardModuleCard">
          <div class="flex items-center justify-between gap-3">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground">
              <module.Icon class="h-4 w-4" />
            </span>
            <span class="text-lg font-semibold tabular-nums text-foreground">{displayValue(module.href, module.value)}</span>
          </div>
          <div class="mt-2">
            <p class="text-sm font-semibold text-foreground">{module.label}</p>
            <p class="mt-1 text-xs text-muted-foreground">{module.meta}</p>
          </div>
        </a>
      {/each}
    </section>
  </details>

  <!-- Calendar / AI / Notifications columns (Gated lazy loading via secondaryOpen) -->
  <details class="svadmin-collapsible dashboard-secondary"
    ontoggle={(e) => { secondaryOpen = (e.currentTarget as HTMLDetailsElement).open; }}>
    <summary>{i18n.t('dashboard.section.scheduleCollaboration')}</summary>
    <div class="dashboard-support-grid" data-svadmin-component="DashboardSupportGrid">
      <AuditSection title={i18n.t('dashboard.section.calendar')} accent="neutral"
        state={sectionState(calendarQuery, calendarEvents.length)} retry={() => void calendarQuery.refetch()}>
        {#snippet actions()}
          <a class="text-sm font-medium text-primary hover:underline" href="#/calendar_events">{i18n.t('dashboard.section.viewAll')}</a>
        {/snippet}
        <div class="divide-y" data-svadmin-component="CalendarEventsList" data-svadmin-resource="calendar_events">
          {#each calendarEvents.slice(0, 3) as event (event.id)}
            <div class="px-6 py-4" data-svadmin-component="CalendarEventItem" data-svadmin-field="title">
              <p class="truncate text-sm font-medium text-foreground">{eventTitle(event.title)}</p>
              <p class="mt-1 text-xs text-muted-foreground">{event.startDate} / {eventTypeLabel(event.type)}</p>
            </div>
          {:else}
            <div class="px-6 py-8 text-sm text-muted-foreground">{i18n.t('dashboard.section.noEvents')}</div>
          {/each}
        </div>
      </AuditSection>

      <AuditSection title={i18n.t('dashboard.section.aiOperations')} accent="neutral"
        state={sectionState(conversationsQuery, conversations.length)} retry={() => void conversationsQuery.refetch()}>
        {#snippet actions()}
          <a class="text-sm font-medium text-primary hover:underline" href="#/ai_conversations">{i18n.t('dashboard.section.viewAll')}</a>
        {/snippet}
        <div class="divide-y" data-svadmin-component="AIConversationsList" data-svadmin-resource="ai_conversations">
          {#each conversations.slice(0, 3) as conversation (conversation.id)}
            <div class="flex items-center justify-between gap-4 px-6 py-4" data-svadmin-component="AIConversationItem" data-svadmin-field="title">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-foreground">{conversationTitle(conversation.title)}</p>
                <p class="text-xs text-muted-foreground">{conversation.updatedAt}</p>
              </div>
              <StatusPill tone={conversation.status === 'resolved' ? 'success' : 'info'} label={conversationStatusLabel(conversation.status)} />
            </div>
          {:else}
            <div class="px-6 py-8 text-sm text-muted-foreground">{i18n.t('dashboard.section.noAI')}</div>
          {/each}
        </div>
      </AuditSection>

      <AuditSection title={i18n.t('dashboard.section.notifications')} accent="neutral"
        state={sectionState(notificationsQuery, notifications.length)} retry={() => void notificationsQuery.refetch()}>
        {#snippet actions()}
          <a class="text-sm font-medium text-primary hover:underline" href="#/notifications">{i18n.t('dashboard.section.viewAll')}</a>
        {/snippet}
        <div class="divide-y" data-svadmin-component="NotificationsList" data-svadmin-resource="notifications">
          {#each notifications.slice(0, 3) as notification (notification.id)}
            <div class="flex items-center justify-between gap-4 px-6 py-4" data-svadmin-component="NotificationItem" data-svadmin-field="title">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-foreground">{notificationTitle(notification.title)}</p>
                <p class="text-xs text-muted-foreground">{notification.createdAt}</p>
              </div>
              <StatusPill tone={notification.severity === 'critical' ? 'danger' : notification.severity === 'warning' ? 'warning' : 'info'} label={severityLabel(notification.severity)} />
            </div>
          {:else}
            <div class="px-6 py-8 text-sm text-muted-foreground">{i18n.t('dashboard.section.noNotifications')}</div>
          {/each}
        </div>
      </AuditSection>
    </div>

    <div class="dashboard-primary-grid mt-4">
      <ChartContainer title={i18n.t('dashboard.section.bestSellers')}
        state={sectionState(productsQuery, bestSellers.length)} retry={() => void productsQuery.refetch()}>
        {#snippet actions()}
          <a class="text-sm font-medium text-primary hover:underline" href="#/products">{i18n.t('dashboard.section.products')}</a>
        {/snippet}
        <div class="divide-y" data-svadmin-component="BestSellersList" data-svadmin-resource="products">
          {#each bestSellers as product (product.id)}
            <div class="grid gap-3 px-6 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-foreground">{product.name}</p>
                <p class="text-xs text-muted-foreground">{product.sku}</p>
              </div>
              <div class="min-w-40">
                <div class="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{i18n.t('dashboard.section.fastMoving')}</span>
                  <span>{product.stock}</span>
                </div>
                <div class="mt-2 h-2 rounded-full bg-muted">
                  <div class="h-2 rounded-full bg-primary" style:width={`${totalStock ? product.stock / totalStock * 100 : 0}%`}></div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </ChartContainer>

      <AuditSection title={i18n.t('dashboard.module.userManagement')} accent="neutral"
        state={sectionState(usersQuery, teamMembers.length)} retry={() => void usersQuery.refetch()}>
        {#snippet actions()}
          <a class="text-sm font-medium text-primary hover:underline" href="#/users">{i18n.t('dashboard.section.viewAll')}</a>
        {/snippet}
        <div class="divide-y" data-svadmin-component="TeamMembersList" data-svadmin-resource="users">
          {#each teamMembers as member (member.id)}
            <div class="grid gap-3 px-6 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-foreground">{member.name}</p>
                <p class="text-xs text-muted-foreground">{member.department}</p>
              </div>
              <div class="flex items-center gap-3">
                <a class="text-sm text-primary hover:underline" href={recordLink('users', member.id, adminContext.currentPath())}>{i18n.t('dashboard.section.viewAll')}</a>
              </div>
            </div>
          {/each}
        </div>
      </AuditSection>
    </div>
  </details>

  <div class="dashboard-primary-grid" data-svadmin-component="DashboardSalesGrid">
    <AuditSection title={i18n.t('dashboard.section.salesActivity')} accent="neutral"
      state={sectionState(salesOrdersQuery, salesOrders.length)} retry={() => void salesOrdersQuery.refetch()}>
      <div class="dashboard-sales" data-svadmin-component="SalesActivityCard" data-svadmin-resource="sales_orders">
        <div class="border-b pb-4">
          <p class="text-xs font-medium text-muted-foreground">{i18n.t('dashboard.order.salesOrders')}</p>
          <p class="mt-2 text-xl font-semibold tabular-nums text-foreground">{salesOrders.length}</p>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="p-3">
            <p class="text-lg font-semibold">{salesOrders.filter((order) => order.status === 'pending').length}</p>
            <p class="text-xs text-muted-foreground">{i18n.t('dashboard.section.pending')}</p>
          </div>
          <div class="border-x p-3">
            <p class="text-lg font-semibold">{salesOrders.filter((order) => order.status === 'processing').length}</p>
            <p class="text-xs text-muted-foreground">{i18n.t('dashboard.section.processing')}</p>
          </div>
          <div class="p-3">
            <p class="text-lg font-semibold">{salesOrders.filter((order) => order.status === 'shipped').length}</p>
            <p class="text-xs text-muted-foreground">{i18n.t('dashboard.section.shipped')}</p>
          </div>
        </div>
      </div>
    </AuditSection>

    <AuditSection title={i18n.t('dashboard.section.recentOrders')} accent="neutral"
      state={sectionState(salesOrdersQuery, salesOrders.length)} retry={() => void salesOrdersQuery.refetch()}>
      {#snippet actions()}
        <a class="text-sm font-medium text-primary hover:underline" href="#/sales_orders">{i18n.t('dashboard.order.salesOrders')}</a>
      {/snippet}
      <div class="divide-y" data-svadmin-component="RecentOrdersList" data-svadmin-resource="sales_orders">
        {#each salesOrders.slice(0, 5) as order (order.id)}
          <div class="grid gap-3 px-6 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center" data-svadmin-component="OrderItem">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-foreground">{order.orderNumber}</p>
              <p class="text-xs text-muted-foreground">{order.customerName} · {order.orderDate}</p>
            </div>
            <StatusPill label={orderStatusLabel(order.status)} tone={order.status === 'cancelled' ? 'danger' : order.status === 'shipped' ? 'success' : 'neutral'} />
            <p class="text-sm font-semibold tabular-nums text-foreground">${order.totalAmount}</p>
          </div>
        {:else}
          <div class="px-6 py-8 text-sm text-muted-foreground">{i18n.t('dashboard.section.noRecentOrders')}</div>
        {/each}
      </div>
    </AuditSection>
  </div>

  <!-- Recent Stock Movements -->
  <details class="svadmin-collapsible dashboard-secondary">
    <summary>{i18n.t('dashboard.section.stockMovementsExt')}</summary>
    <AuditSection title={i18n.t('dashboard.section.recentMovements')} accent="neutral"
      state={sectionState(movementsQuery, movements.length)} retry={() => void movementsQuery.refetch()}>
      {#snippet actions()}
        <a class="text-sm font-medium text-primary hover:underline" href="#/stock_movements">{i18n.t('dashboard.section.viewAll')}</a>
      {/snippet}
      <div class="divide-y" data-svadmin-component="StockMovementsList" data-svadmin-resource="stock_movements">
        {#each movements.slice(0, 5) as movement (movement.id)}
          <div class="flex items-center justify-between gap-4 px-6 py-4" data-svadmin-component="StockMovementItem">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-foreground">{movementNote(movement.note)}</p>
              <p class="text-xs text-muted-foreground">{movement.date}</p>
            </div>
            <span class="rounded-md px-2 py-1 text-xs font-semibold {movementTone(movement.type)}">
              {signedQuantity(movement)}
            </span>
          </div>
        {:else}
          <div class="px-6 py-8 text-sm text-muted-foreground">{i18n.t('dashboard.section.noMovements')}</div>
        {/each}
      </div>
    </AuditSection>
  </details>

  {#await declarativeSurfacePromise}
    <DataState state="loading" title={i18n.t('dashboard.section.loadingDeclarativeSurface')} />
  {:then declarativeSurfaceModule}
    {@const DeclarativeSurfaceExample = declarativeSurfaceModule.default}
    <DeclarativeSurfaceExample {isZh} />
  {:catch}
    <DataState
      state="error"
      title={i18n.t('dashboard.section.failedDeclarativeSurface')}
      retry={retryDeclarativeSurface}
    />
  {/await}
</DashboardPage>
