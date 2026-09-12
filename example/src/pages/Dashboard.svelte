<script lang="ts">
  import { demoContracts } from '../resource-contracts';
  import type { DemoRow } from '../resource-schemas';

  type Movement = DemoRow<'stock_movements'>;

  import { useList } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { ContentPageHeader, ContentPageShell, DataState, MetricBlock } from '@svadmin/ui';
  import * as Card from '@svadmin/ui/components/ui/card/index.js';
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

  const i18n = useTranslation();
  const declarativeSurfacePromise = import('../components/DeclarativeSurfaceExample.svelte');

  const productsQuery = useList({ resource: demoContracts.products, pagination: { mode: 'off' } });
  const suppliersQuery = useList({ resource: demoContracts.suppliers, pagination: { current: 1, pageSize: 1 } });
  const warehousesQuery = useList({ resource: demoContracts.warehouses, pagination: { current: 1, pageSize: 1 } });
  const movementsQuery = useList({ resource: demoContracts.stock_movements, pagination: { current: 1, pageSize: 5 }, sorters: [{ field: 'date', order: 'desc' }] });
  const transfersQuery = useList({ resource: demoContracts.stock_transfers, pagination: { mode: 'off' } });
  const cycleCountsQuery = useList({ resource: demoContracts.cycle_counts, pagination: { mode: 'off' } });
  const adjustmentsQuery = useList({ resource: demoContracts.inventory_adjustments, pagination: { mode: 'off' } });
  const reorderRulesQuery = useList({ resource: demoContracts.reorder_rules, pagination: { mode: 'off' } });
  const purchaseOrdersQuery = useList({ resource: demoContracts.purchase_orders, pagination: { current: 1, pageSize: 1 } });
  const salesOrdersQuery = useList({ resource: demoContracts.sales_orders, pagination: { current: 1, pageSize: 5 }, sorters: [{ field: 'orderDate', order: 'desc' }] });
  const todosQuery = useList({ resource: demoContracts.todos, pagination: { mode: 'off' } });
  const usersQuery = useList({ resource: demoContracts.users, pagination: { mode: 'off' } });
  const rolesQuery = useList({ resource: demoContracts.roles, pagination: { current: 1, pageSize: 1 } });
  const calendarQuery = useList({
    resource: demoContracts.calendar_events,
    pagination: { current: 1, pageSize: 3 },
    sorters: [{ field: 'startDate', order: 'asc' }],
  });
  const conversationsQuery = useList({
    resource: demoContracts.ai_conversations,
    pagination: { current: 1, pageSize: 3 },
    sorters: [{ field: 'updatedAt', order: 'desc' }],
  });
  const notificationsQuery = useList({
    resource: demoContracts.notifications,
    pagination: { current: 1, pageSize: 3 },
    sorters: [{ field: 'createdAt', order: 'desc' }],
  });

  const locale = $derived(i18n.locale);
  const isZh = $derived(locale === 'zh-CN');

  const products = $derived((productsQuery.data?.data ?? []));
  const movements = $derived((movementsQuery.data?.data ?? []));
  const transfers = $derived((transfersQuery.data?.data ?? []));
  const cycleCounts = $derived((cycleCountsQuery.data?.data ?? []));
  const adjustments = $derived((adjustmentsQuery.data?.data ?? []));
  const reorderRules = $derived((reorderRulesQuery.data?.data ?? []));
  const todos = $derived((todosQuery.data?.data ?? []));
  const users = $derived((usersQuery.data?.data ?? []));
  const salesOrders = $derived((salesOrdersQuery.data?.data ?? []));
  const calendarEvents = $derived((calendarQuery.data?.data ?? []));
  const conversations = $derived((conversationsQuery.data?.data ?? []));
  const notifications = $derived((notificationsQuery.data?.data ?? []));

  const queries = [
    productsQuery, suppliersQuery, warehousesQuery, movementsQuery, transfersQuery,
    cycleCountsQuery, adjustmentsQuery, reorderRulesQuery, purchaseOrdersQuery,
    salesOrdersQuery, todosQuery, usersQuery, rolesQuery, calendarQuery,
    conversationsQuery, notificationsQuery,
  ];
  const isLoading = $derived(queries.some((query) => query.isLoading));
  const isRefreshing = $derived(queries.some((query) => query.isFetching));
  const hasError = $derived(queries.some((query) => query.isError));
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
    { label: isZh ? '资产价值' : 'Total Asset Value', value: `$${Math.round(totalAssetValue / 1000)}K`, href: '#/products', Icon: TrendingUp, tone: 'bg-primary/10 text-primary border-primary/20' },
    { label: isZh ? '可用商品' : 'Available', value: availableProducts.length, href: '#/products', Icon: Package, tone: 'bg-success/10 text-success border-success/20' },
    { label: isZh ? '库存件数' : 'Stock Units', value: totalStock, href: '#/products', Icon: Package, tone: 'bg-info/10 text-info border-info/20' },
    { label: isZh ? '仓库' : 'Warehouses', value: warehousesQuery.data?.total ?? 0, href: '#/warehouses', Icon: Home, tone: 'bg-success/10 text-success border-success/20' },
    { label: isZh ? '供应商' : 'Suppliers', value: suppliersQuery.data?.total ?? 0, href: '#/suppliers', Icon: Truck, tone: 'bg-warning/10 text-warning border-warning/20' },
    { label: isZh ? '库存设置' : 'Settings', value: reorderRules.length, href: '#/reorder_rules', Icon: Settings, tone: 'bg-muted text-muted-foreground border-border' },
  ]);

  const orderSummary = $derived([
    { label: isZh ? '采购订单' : 'Purchase Orders', value: purchaseOrdersQuery.data?.total ?? 0, href: '#/purchase_orders', Icon: ClipboardCheck },
    { label: isZh ? '销售订单' : 'Sales Orders', value: salesOrdersQuery.data?.total ?? 0, href: '#/sales_orders', Icon: CreditCard },
    { label: isZh ? '待办未结' : 'Open Todo', value: openTodos, href: '#/todos', Icon: TrendingUp },
    { label: isZh ? '库存调拨' : 'Stock Transfers', value: activeTransfers, href: '#/stock_transfers', Icon: Shuffle },
    { label: isZh ? '循环盘点' : 'Cycle Counts', value: activeCycleCounts, href: '#/cycle_counts', Icon: ClipboardCheck },
    { label: isZh ? '库存调整' : 'Adjustments', value: pendingAdjustments, href: '#/inventory_adjustments', Icon: Sliders },
    { label: isZh ? '补货规则' : 'Reorder Rules', value: reviewReorderRules, href: '#/reorder_rules', Icon: Settings },
  ]);

  const roadmapModules = $derived([
    {
      label: isZh ? '用户管理' : 'User Management',
      value: usersQuery.data?.total ?? 0,
      meta: isZh ? `${rolesQuery.data?.total ?? 0} 个角色` : `${rolesQuery.data?.total ?? 0} roles`,
      href: '#/users',
      Icon: Users,
      tone: 'bg-primary/10 text-primary border-primary/20',
    },
    {
      label: isZh ? '日历' : 'Calendar',
      value: calendarQuery.data?.total ?? 0,
      meta: isZh ? '采购与盘点计划' : 'purchase and count planning',
      href: '#/calendar_events',
      Icon: CalendarDays,
      tone: 'bg-info/10 text-info border-info/20',
    },
    {
      label: isZh ? 'AI 对话' : 'AI Chat',
      value: openConversations,
      meta: isZh ? '进行中的运营对话' : 'open operations threads',
      href: '#/ai_conversations',
      Icon: Bot,
      tone: 'bg-primary/10 text-primary border-primary/20',
    },
    {
      label: isZh ? '通知中心' : 'Notification Center',
      value: unreadNotifications,
      meta: isZh ? '未读提醒' : 'unread notices',
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

  function notificationTone(severity: string): string {
    if (severity === 'critical') return 'bg-destructive/10 text-destructive';
    if (severity === 'warning') return 'bg-warning/10 text-warning';
    return 'bg-muted text-muted-foreground';
  }

  function eventTypeLabel(type: string): string {
    if (!isZh) return type;
    if (type === 'cycle_count') return '盘点';
    if (type === 'receiving') return '收货';
    if (type === 'purchase') return '采购';
    return type;
  }

  function eventTitle(title: string): string {
    if (!isZh) return title;
    if (title === 'Warehouse cycle count') return '仓库循环盘点';
    if (title === 'Supplier delivery window') return '供应商到货窗口';
    if (title === 'Monthly purchase review') return '月度采购复盘';
    return title;
  }

  function conversationTitle(title: string): string {
    if (!isZh) return title;
    if (title === 'Reorder planning assistant') return '补货计划助手';
    if (title === 'Forecast variance review') return '预测偏差复核';
    if (title === 'Receiving exception triage') return '收货异常分诊';
    return title;
  }

  function notificationTitle(title: string): string {
    if (!isZh) return title;
    if (title === 'Two products below minimum stock') return '两个商品低于最低库存';
    if (title === 'PO-2026-002 delivery scheduled') return 'PO-2026-002 已安排到货';
    if (title === 'New analyst invitation pending') return '新分析师邀请待完成';
    return title;
  }

  function movementNote(note: string): string {
    if (!isZh) return note;
    if (note === 'Initial receiving') return '初始入库';
    if (note === 'Sales order shipment') return '销售订单出库';
    if (note === 'Supplier delivery') return '供应商到货';
    if (note === 'Packing line consumption') return '包装线消耗';
    return note;
  }

  function conversationStatusLabel(status: string): string {
    if (!isZh) return status;
    if (status === 'open') return '进行中';
    if (status === 'waiting') return '等待';
    if (status === 'resolved') return '已解决';
    return status;
  }

  function severityLabel(severity: string): string {
    if (!isZh) return severity;
    if (severity === 'critical') return '紧急';
    if (severity === 'warning') return '预警';
    if (severity === 'info') return '信息';
    return severity;
  }

  function orderStatusLabel(status: string): string {
    if (!isZh) return status;
    if (status === 'pending') return '待处理';
    if (status === 'processing') return '处理中';
    if (status === 'shipped') return '已发货';
    if (status === 'cancelled') return '已取消';
    return status;
  }
</script>

<ContentPageShell pageId="operations-dashboard" width="wide">
  <ContentPageHeader title={isZh ? '运营工作台' : 'Operations workspace'} />

  {#if hasError}
    <DataState state="error" title={isZh ? '部分数据未能更新' : 'Some data could not be updated'}
      description={isZh ? '暂不可用的指标显示为 —，请重试后再作判断。' : 'Unavailable metrics show —. Retry before making a decision.'}
      retry={retryFailedQueries} />
  {/if}
  <section class="grid gap-3 sm:grid-cols-3" data-dashboard-decisions>
    <MetricBlock label={isZh ? '库存风险' : 'Stock at risk'} value={productsQuery.isError ? '—' : lowStockProducts.length}
      detail={productsQuery.isError ? '' : (isZh ? `其中 ${outOfStockProducts.length} 项缺货` : `${outOfStockProducts.length} out of stock`)}
      loading={productsQuery.isLoading} />
    <MetricBlock label={isZh ? '待处理' : 'Open work'}
      value={todosQuery.isError || transfersQuery.isError || adjustmentsQuery.isError ? '—' : openTodos + activeTransfers + pendingAdjustments}
      detail={isZh ? '待办、调拨与审批' : 'Todos, transfers, approvals'} loading={todosQuery.isLoading || transfersQuery.isLoading || adjustmentsQuery.isLoading} />
    <MetricBlock label={isZh ? '数据状态' : 'Data status'}
      value={hasError ? (isZh ? '部分失败' : 'Partial failure') : isRefreshing ? (isZh ? '更新中' : 'Refreshing') : (isZh ? '已加载' : 'Loaded')}
      loading={isLoading} />
  </section>

  <details class="border-y" data-dashboard-summary>
    <summary class="cursor-pointer py-3 text-sm font-medium">{isZh ? '资源概览' : 'Resource overview'}</summary>
  <section class="grid grid-cols-2 gap-x-6 gap-y-3 pb-4 xl:grid-cols-3">
    {#each stats as stat (stat.label)}
      <a href={stat.href} class="block py-2 hover:text-primary">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="min-h-7 text-xs font-medium leading-tight text-muted-foreground sm:min-h-0">{stat.label}</p>
            <p class="mt-1 text-lg font-semibold tabular-nums text-foreground">{hasError ? '—' : stat.value}</p>
          </div>
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border {stat.tone}">
            <stat.Icon class="h-5 w-5" />
          </span>
        </div>
      </a>
    {/each}
  </section>
  </details>

  <!-- Inventory Health + Operations Queue -->
  <section class="grid items-start gap-6 lg:grid-cols-[1.2fr_0.8fr]">
    <section class="min-w-0">
      <header class="flex items-center justify-between border-b py-3">
        <h2 class="text-sm font-semibold">{isZh ? '库存风险清单' : 'Stock risk queue'}</h2>
        <a class="text-sm font-medium text-primary hover:underline" href="#/products">{isZh ? '商品档案' : 'Products'}</a>
      </header>
      {#if productsQuery.isLoading}
        <DataState state="loading" />
      {:else if productsQuery.isError}
        <p class="py-4 text-sm text-muted-foreground">{isZh ? '库存清单暂不可用' : 'Stock queue unavailable'}</p>
      {:else}
        <div class="divide-y">
          {#each lowStockProducts as product (product.id)}
            <div class="flex items-center justify-between gap-4 py-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-foreground">{product.name}</p>
                <p class="text-xs text-muted-foreground">{product.sku}</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-semibold text-destructive">{product.stock} / {product.minStock}</p>
                <p class="text-xs text-muted-foreground">{isZh ? '现有 / 下限' : 'on hand / minimum'}</p>
              </div>
            </div>
          {:else}
            <div class="px-6 py-8 text-sm text-muted-foreground">{isZh ? '所有跟踪商品均高于库存下限。' : 'All tracked products are above threshold.'}</div>
          {/each}
        </div>
      {/if}
    </section>

    <section class="min-w-0">
      <header class="border-b py-3">
        <h2 class="text-sm font-semibold">{isZh ? '运营队列' : 'Operations Queue'}</h2>
      </header>
        <div class="divide-y">
          {#each orderSummary as item (item.label)}
            <a href={item.href} class="flex items-center justify-between gap-3 py-3 transition hover:bg-muted/50">
              <div class="flex items-center gap-3">
                <item.Icon class="h-4 w-4 text-muted-foreground" />
                <span class="text-sm font-medium">{item.label}</span>
              </div>
              <span class="text-sm font-semibold tabular-nums text-foreground">{hasError ? '—' : item.value}</span>
            </a>
          {/each}
        </div>
    </section>
  </section>

  <!-- Roadmap modules -->
  <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {#each roadmapModules as module (module.label)}
      <a href={module.href} class="rounded-lg border bg-card px-6 py-4 shadow-sm transition hover:border-primary/50 hover:bg-muted/50">
        <div class="flex items-center justify-between gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border {module.tone}">
            <module.Icon class="h-5 w-5" />
          </span>
          <span class="text-2xl font-semibold text-foreground">{module.value}</span>
        </div>
        <div class="mt-3">
          <p class="text-sm font-semibold text-foreground">{module.label}</p>
          <p class="mt-1 text-xs text-muted-foreground">{module.meta}</p>
        </div>
      </a>
    {/each}
  </section>

  <!-- Calendar / AI / Notifications columns -->
  <section class="grid gap-4 xl:grid-cols-3">
    <Card.Root class="overflow-hidden border-border/40">
      <Card.Header class="flex flex-row items-center justify-between border-b px-6 py-4">
        <Card.Title class="text-sm font-semibold">{isZh ? '日历' : 'Calendar'}</Card.Title>
        <a class="text-sm font-medium text-primary hover:underline" href="#/calendar_events">{isZh ? '查看全部' : 'View all'}</a>
      </Card.Header>
      <Card.Content class="p-0">
        <div class="divide-y">
          {#each calendarEvents as event (event.id)}
            <div class="px-6 py-4">
              <p class="truncate text-sm font-medium text-foreground">{eventTitle(event.title)}</p>
              <p class="mt-1 text-xs text-muted-foreground">{event.startDate} / {eventTypeLabel(event.type)}</p>
            </div>
          {:else}
            <div class="px-6 py-8 text-sm text-muted-foreground">{isZh ? '暂无计划日程。' : 'No scheduled events.'}</div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root class="overflow-hidden border-border/40">
      <Card.Header class="flex flex-row items-center justify-between border-b px-6 py-4">
        <Card.Title class="text-sm font-semibold">{isZh ? 'AI 运营' : 'AI Operations'}</Card.Title>
        <a class="text-sm font-medium text-primary hover:underline" href="#/ai_conversations">{isZh ? '查看全部' : 'View all'}</a>
      </Card.Header>
      <Card.Content class="p-0">
        <div class="divide-y">
          {#each conversations as conversation (conversation.id)}
            <div class="flex items-center justify-between gap-4 px-6 py-4">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-foreground">{conversationTitle(conversation.title)}</p>
                <p class="text-xs text-muted-foreground">{conversation.updatedAt}</p>
              </div>
              <span class="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{conversationStatusLabel(conversation.status)}</span>
            </div>
          {:else}
            <div class="px-6 py-8 text-sm text-muted-foreground">{isZh ? '暂无 AI 对话。' : 'No AI threads yet.'}</div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root class="overflow-hidden border-border/40">
      <Card.Header class="flex flex-row items-center justify-between border-b px-6 py-4">
        <Card.Title class="text-sm font-semibold">{isZh ? '通知' : 'Notifications'}</Card.Title>
        <a class="text-sm font-medium text-primary hover:underline" href="#/notifications">{isZh ? '查看全部' : 'View all'}</a>
      </Card.Header>
      <Card.Content class="p-0">
        <div class="divide-y">
          {#each notifications as notification (notification.id)}
            <div class="flex items-center justify-between gap-4 px-6 py-4">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-foreground">{notificationTitle(notification.title)}</p>
                <p class="text-xs text-muted-foreground">{notification.createdAt}</p>
              </div>
              <span class="rounded-md px-2 py-1 text-xs font-semibold {notificationTone(notification.severity)}">
                {severityLabel(notification.severity)}
              </span>
            </div>
          {:else}
            <div class="px-6 py-8 text-sm text-muted-foreground">{isZh ? '暂无通知。' : 'No notifications yet.'}</div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  </section>

  <section class="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
    <Card.Root class="overflow-hidden border-border/40">
      <Card.Header class="flex flex-row items-center justify-between border-b px-6 py-4">
        <Card.Title class="text-sm font-semibold">{isZh ? '库存排行' : 'Stock ranking'}</Card.Title>
        <a class="text-sm font-medium text-primary hover:underline" href="#/products">{isZh ? '商品档案' : 'Products'}</a>
      </Card.Header>
      <Card.Content class="p-0">
        <div class="divide-y">
          {#each bestSellers as product (product.id)}
            <div class="grid gap-3 px-6 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-foreground">{product.name}</p>
                <p class="text-xs text-muted-foreground">{product.sku}</p>
              </div>
              <div class="min-w-40">
                <div class="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{isZh ? '可售库存' : 'sellable stock'}</span>
                  <span>{product.stock}</span>
                </div>
                <div class="mt-2 h-2 rounded-full bg-muted">
                  <div class="h-2 rounded-full bg-primary" style:width={`${Math.min(100, Math.max(16, product.stock))}%`}></div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root class="overflow-hidden border-border/40">
      <Card.Header class="flex flex-row items-center justify-between border-b px-6 py-4">
        <Card.Title class="text-sm font-semibold">{isZh ? '团队成员' : 'Team members'}</Card.Title>
        <a class="text-sm font-medium text-primary hover:underline" href="#/users">{isZh ? '用户管理' : 'Users'}</a>
      </Card.Header>
      <Card.Content class="p-0">
        <div class="divide-y">
          {#each teamMembers as member (member.id)}
            <div class="grid gap-3 px-6 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-foreground">{member.name}</p>
                <p class="text-xs text-muted-foreground">{member.department}</p>
              </div>
              <div class="flex items-center gap-3">
                <a class="text-sm text-primary hover:underline" href={`#/users/show/${member.id}`}>{isZh ? '查看成员' : 'View member'}</a>
              </div>
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  </section>

  <section class="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
    <Card.Root class="overflow-hidden border-border/40">
      <Card.Header class="border-b px-6 py-4">
        <Card.Title class="text-sm font-semibold">{isZh ? '销售活动' : 'Sales Activity'}</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4 p-6">
        <div class="rounded-lg border bg-muted/20 p-4">
          <p class="text-xs font-semibold text-muted-foreground">{isZh ? '今日履约节奏' : 'Today flow'}</p>
          <p class="mt-2 text-3xl font-semibold text-foreground">{salesOrders.length + movements.length}</p>
          <p class="mt-1 text-xs text-muted-foreground">{isZh ? '订单与库存动作合计' : 'orders and inventory actions'}</p>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="rounded-lg border p-3">
            <p class="text-lg font-semibold">{salesOrders.filter((order) => order.status === 'pending').length}</p>
            <p class="text-xs text-muted-foreground">{isZh ? '待处理' : 'Pending'}</p>
          </div>
          <div class="rounded-lg border p-3">
            <p class="text-lg font-semibold">{salesOrders.filter((order) => order.status === 'processing').length}</p>
            <p class="text-xs text-muted-foreground">{isZh ? '处理中' : 'Processing'}</p>
          </div>
          <div class="rounded-lg border p-3">
            <p class="text-lg font-semibold">{salesOrders.filter((order) => order.status === 'shipped').length}</p>
            <p class="text-xs text-muted-foreground">{isZh ? '已发货' : 'Shipped'}</p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root class="overflow-hidden border-border/40">
      <Card.Header class="flex flex-row items-center justify-between border-b px-6 py-4">
        <Card.Title class="text-sm font-semibold">{isZh ? '近期订单' : 'Recent Orders'}</Card.Title>
        <a class="text-sm font-medium text-primary hover:underline" href="#/sales_orders">{isZh ? '销售订单' : 'Sales Orders'}</a>
      </Card.Header>
      <Card.Content class="p-0">
        <div class="divide-y">
          {#each salesOrders as order (order.id)}
            <div class="grid gap-3 px-6 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-foreground">{order.orderNumber}</p>
                <p class="text-xs text-muted-foreground">{order.customerName} · {order.orderDate}</p>
              </div>
              <span class="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">{orderStatusLabel(order.status)}</span>
              <p class="text-sm font-semibold text-foreground">${order.totalAmount}</p>
            </div>
          {:else}
            <div class="px-6 py-8 text-sm text-muted-foreground">{isZh ? '暂无近期订单。' : 'No recent orders.'}</div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  </section>

  <!-- Recent Stock Movements -->
  <Card.Root class="overflow-hidden border-border/40">
    <Card.Header class="flex flex-row items-center justify-between border-b px-6 py-4">
      <Card.Title class="text-sm font-semibold">{isZh ? '近期库存流水' : 'Recent Stock Movements'}</Card.Title>
      <a class="text-sm font-medium text-primary hover:underline" href="#/stock_movements">{isZh ? '查看全部' : 'View all'}</a>
    </Card.Header>
    <Card.Content class="p-0">
      <div class="divide-y">
        {#each movements as movement (movement.id)}
          <div class="flex items-center justify-between gap-4 px-6 py-4">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-foreground">{movementNote(movement.note)}</p>
              <p class="text-xs text-muted-foreground">{movement.date}</p>
            </div>
            <span class="rounded-md px-2 py-1 text-xs font-semibold {movementTone(movement.type)}">
              {signedQuantity(movement)}
            </span>
          </div>
      {:else}
          <div class="px-6 py-8 text-sm text-muted-foreground">{isZh ? '暂无库存流水。' : 'No movements recorded yet.'}</div>
      {/each}
      </div>
    </Card.Content>
  </Card.Root>

  {#await declarativeSurfacePromise}
    <DataState state="loading" title={isZh ? '正在加载声明式 Surface' : 'Loading declarative Surface'} />
  {:then declarativeSurfaceModule}
    {@const DeclarativeSurfaceExample = declarativeSurfaceModule.default}
    <DeclarativeSurfaceExample {isZh} />
  {:catch}
    <DataState state="error" title={isZh ? '声明式 Surface 加载失败' : 'Unable to load the declarative Surface'} />
  {/await}
</ContentPageShell>
