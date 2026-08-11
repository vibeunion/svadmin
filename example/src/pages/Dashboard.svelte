<script lang="ts">
  import { useList } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Card from '@svadmin/ui/components/ui/card/index.js';
  import {
    AlertTriangle,
    Bell,
    Bot,
    CalendarDays,
    ClipboardCheck,
    CreditCard,
    Home,
    Loader2,
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

  interface Product {
    id: number;
    name: string;
    sku: string;
    price: number;
    stock: number;
    minStock: number;
  }

  interface Movement {
    id: number;
    quantity: number;
    type: string;
    note: string;
    date: string;
  }

  interface Todo {
    id: number;
    completed: boolean;
    priority: string;
    title: string;
  }

  interface CalendarEvent {
    id: number;
    title: string;
    startDate: string;
    type: string;
  }

  interface Conversation {
    id: number;
    title: string;
    status: string;
    updatedAt: string;
  }

  interface Notification {
    id: number;
    title: string;
    severity: string;
    read: boolean;
    createdAt: string;
  }

  interface User {
    id: number;
    name: string;
    department: string;
    status: string;
  }

  interface SalesOrder {
    id: number;
    orderNumber: string;
    customerName: string;
    status: string;
    totalAmount: number;
    orderDate: string;
  }

  interface StockTransfer {
    id: number;
    status: string;
  }

  interface CycleCount {
    id: number;
    status: string;
  }

  interface InventoryAdjustment {
    id: number;
    status: string;
  }

  interface ReorderRule {
    id: number;
    status: string;
  }

  const productsQuery = useList({ resource: 'products', pagination: { mode: 'off' } });
  const suppliersQuery = useList({ resource: 'suppliers', pagination: { current: 1, pageSize: 1 } });
  const warehousesQuery = useList({ resource: 'warehouses', pagination: { current: 1, pageSize: 1 } });
  const movementsQuery = useList({ resource: 'stock_movements', pagination: { current: 1, pageSize: 5 }, sorters: [{ field: 'date', order: 'desc' }] });
  const transfersQuery = useList({ resource: 'stock_transfers', pagination: { mode: 'off' } });
  const cycleCountsQuery = useList({ resource: 'cycle_counts', pagination: { mode: 'off' } });
  const adjustmentsQuery = useList({ resource: 'inventory_adjustments', pagination: { mode: 'off' } });
  const reorderRulesQuery = useList({ resource: 'reorder_rules', pagination: { mode: 'off' } });
  const purchaseOrdersQuery = useList({ resource: 'purchase_orders', pagination: { current: 1, pageSize: 1 } });
  const salesOrdersQuery = useList({ resource: 'sales_orders', pagination: { current: 1, pageSize: 5 }, sorters: [{ field: 'orderDate', order: 'desc' }] });
  const todosQuery = useList({ resource: 'todos', pagination: { mode: 'off' } });
  const usersQuery = useList({ resource: 'users', pagination: { mode: 'off' } });
  const rolesQuery = useList({ resource: 'roles', pagination: { current: 1, pageSize: 1 } });
  const calendarQuery = useList({
    resource: 'calendar_events',
    pagination: { current: 1, pageSize: 3 },
    sorters: [{ field: 'startDate', order: 'asc' }],
  });
  const conversationsQuery = useList({
    resource: 'ai_conversations',
    pagination: { current: 1, pageSize: 3 },
    sorters: [{ field: 'updatedAt', order: 'desc' }],
  });
  const notificationsQuery = useList({
    resource: 'notifications',
    pagination: { current: 1, pageSize: 3 },
    sorters: [{ field: 'createdAt', order: 'desc' }],
  });

  const locale = $derived(i18n.locale);
  const isZh = $derived(locale === 'zh-CN');

  const products = $derived((productsQuery.data?.data ?? []) as unknown as Product[]);
  const movements = $derived((movementsQuery.data?.data ?? []) as unknown as Movement[]);
  const transfers = $derived((transfersQuery.data?.data ?? []) as unknown as StockTransfer[]);
  const cycleCounts = $derived((cycleCountsQuery.data?.data ?? []) as unknown as CycleCount[]);
  const adjustments = $derived((adjustmentsQuery.data?.data ?? []) as unknown as InventoryAdjustment[]);
  const reorderRules = $derived((reorderRulesQuery.data?.data ?? []) as unknown as ReorderRule[]);
  const todos = $derived((todosQuery.data?.data ?? []) as unknown as Todo[]);
  const users = $derived((usersQuery.data?.data ?? []) as unknown as User[]);
  const salesOrders = $derived((salesOrdersQuery.data?.data ?? []) as unknown as SalesOrder[]);
  const calendarEvents = $derived((calendarQuery.data?.data ?? []) as unknown as CalendarEvent[]);
  const conversations = $derived((conversationsQuery.data?.data ?? []) as unknown as Conversation[]);
  const notifications = $derived((notificationsQuery.data?.data ?? []) as unknown as Notification[]);

  const isLoading = $derived(
    productsQuery.isLoading ||
      suppliersQuery.isLoading ||
      warehousesQuery.isLoading ||
      movementsQuery.isLoading ||
      transfersQuery.isLoading ||
      cycleCountsQuery.isLoading ||
      adjustmentsQuery.isLoading ||
      reorderRulesQuery.isLoading ||
      purchaseOrdersQuery.isLoading ||
      salesOrdersQuery.isLoading ||
      todosQuery.isLoading ||
      usersQuery.isLoading ||
      rolesQuery.isLoading ||
      calendarQuery.isLoading ||
      conversationsQuery.isLoading ||
      notificationsQuery.isLoading,
  );

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
  const staffPerformance = $derived(
    users.slice(0, 4).map((user, index) => ({
      ...user,
      score: [98, 94, 89, 84][index] ?? 82,
      closed: [18, 15, 12, 9][index] ?? 8,
    })),
  );

  const stats = $derived([
    { label: isZh ? '资产价值' : 'Total Asset Value', value: `$${Math.round(totalAssetValue / 1000)}K`, href: '#/products', Icon: TrendingUp, tone: 'bg-primary/10 text-primary border-primary/20' },
    { label: isZh ? '可用商品' : 'Available', value: availableProducts.length, href: '#/products', Icon: Package, tone: 'bg-success/10 text-success border-success/20' },
    { label: isZh ? '库存件数' : 'Stock Units', value: totalStock, href: '#/products', Icon: Package, tone: 'bg-info/10 text-info border-info/20' },
    { label: isZh ? '低库存' : 'Low Stock', value: lowStockProducts.length, href: '#/products', Icon: AlertTriangle, tone: 'bg-destructive/10 text-destructive border-destructive/20' },
    { label: isZh ? '缺货' : 'Out of Stock', value: outOfStockProducts.length, href: '#/products', Icon: AlertTriangle, tone: 'bg-warning/10 text-warning border-warning/20' },
    { label: isZh ? '仓库' : 'Warehouses', value: warehousesQuery.data?.total ?? 0, href: '#/warehouses', Icon: Home, tone: 'bg-success/10 text-success border-success/20' },
    { label: isZh ? '供应商' : 'Suppliers', value: suppliersQuery.data?.total ?? 0, href: '#/suppliers', Icon: Truck, tone: 'bg-warning/10 text-warning border-warning/20' },
    { label: isZh ? '客户' : 'Customer', value: salesOrdersQuery.data?.total ?? 0, href: '#/sales_orders', Icon: Users, tone: 'bg-info/10 text-info border-info/20' },
    { label: isZh ? '库存设置' : 'Settings', value: reorderRules.length, href: '#/reorder_rules', Icon: Settings, tone: 'bg-muted text-muted-foreground border-border' },
    { label: isZh ? '采购订单' : 'Purchase Orders', value: purchaseOrdersQuery.data?.total ?? 0, href: '#/purchase_orders', Icon: ClipboardCheck, tone: 'bg-primary/10 text-primary border-primary/20' },
    { label: isZh ? '销售订单' : 'Sales Orders', value: salesOrdersQuery.data?.total ?? 0, href: '#/sales_orders', Icon: CreditCard, tone: 'bg-info/10 text-info border-info/20' },
    { label: isZh ? '未读提醒' : 'Unread Alerts', value: unreadNotifications, href: '#/notifications', Icon: Bell, tone: 'bg-warning/10 text-warning border-warning/20' },
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

<div class="space-y-6">
  <header class="grid gap-4 border-b border-border/60 pb-5 xl:grid-cols-[1fr_0.82fr]">
    <div class="min-w-0">
      <div class="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
        {isZh ? '运营驾驶舱' : 'Operations Cockpit'}
      </div>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-foreground">
        {isZh ? '运营工作台' : 'Operations Workspace'}
      </h1>
      <p class="mt-2 max-w-3xl text-sm text-muted-foreground">
        {isZh
          ? '集中掌握库存风险、履约进度、访问权限、计划任务和关键通知。'
          : 'Monitor inventory risk, fulfillment, access, planned work, and critical notifications in one place.'}
      </p>
      <div class="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span class="rounded-md border bg-card px-2.5 py-1">{isZh ? '库存管控' : 'Inventory control'}</span>
        <span class="rounded-md border bg-card px-2.5 py-1">{isZh ? '履约协同' : 'Fulfillment'}</span>
        <span class="rounded-md border bg-card px-2.5 py-1">{isZh ? '自动化队列' : 'Automation queue'}</span>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-2 xl:grid-cols-1 xl:gap-3">
      <div class="rounded-lg border bg-card px-2.5 py-3 sm:px-4">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{isZh ? '履约健康' : 'Fulfillment Health'}</p>
        <p class="mt-2 text-xl font-semibold text-foreground sm:text-2xl">{lowStockProducts.length === 0 ? '100%' : '91%'}</p>
        <p class="mt-1 hidden text-xs text-muted-foreground sm:block">{isZh ? '低库存风险已纳入队列' : 'low-stock risk is queued'}</p>
      </div>
      <div class="rounded-lg border bg-card px-2.5 py-3 sm:px-4">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{isZh ? '待处理' : 'Open Work'}</p>
        <p class="mt-2 text-xl font-semibold text-foreground sm:text-2xl">{openTodos + activeTransfers + pendingAdjustments}</p>
        <p class="mt-1 hidden text-xs text-muted-foreground sm:block">{isZh ? '待办、调拨与审批' : 'todos, transfers, approvals'}</p>
      </div>
      <div class="rounded-lg border bg-card px-2.5 py-3 sm:px-4">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{isZh ? '刷新状态' : 'Refresh'}</p>
        <p class="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          {#if isLoading}
            <Loader2 class="h-4 w-4 animate-spin" />
            {isZh ? '同步中' : 'Refreshing'}
          {:else}
            {isZh ? '已同步' : 'Synced'}
          {/if}
        </p>
        <p class="mt-1 hidden text-xs text-muted-foreground sm:block">{isZh ? '运营数据实时读取' : 'operations data is live'}</p>
      </div>
    </div>
  </header>

  <!-- Key stats -->
  <section class="grid grid-cols-2 gap-3 xl:grid-cols-4">
    {#each stats as stat (stat.label)}
      <a href={stat.href} class="block rounded-lg border bg-card px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:px-6">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="min-h-7 text-[11px] font-medium uppercase leading-tight text-muted-foreground sm:min-h-0 sm:text-xs">{stat.label}</p>
            <p class="mt-2 text-2xl font-semibold text-foreground">{stat.value}</p>
          </div>
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border {stat.tone}">
            <stat.Icon class="h-5 w-5" />
          </span>
        </div>
      </a>
    {/each}
  </section>

  <!-- Inventory Health + Operations Queue -->
  <section class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
    <Card.Root class="overflow-hidden border-border/40">
      <Card.Header class="flex flex-row items-center justify-between border-b px-6 py-4">
        <Card.Title class="text-sm font-semibold">{isZh ? '库存健康' : 'Inventory Health'}</Card.Title>
        <a class="text-sm font-medium text-primary hover:underline" href="#/products">{isZh ? '商品档案' : 'Products'}</a>
      </Card.Header>
      <Card.Content class="p-0">
        <div class="divide-y">
          {#each lowStockProducts as product (product.id)}
            <div class="flex items-center justify-between gap-4 px-6 py-4">
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
      </Card.Content>
    </Card.Root>

    <Card.Root class="overflow-hidden border-border/40">
      <Card.Header class="border-b px-6 py-4">
        <Card.Title class="text-sm font-semibold">{isZh ? '运营队列' : 'Operations Queue'}</Card.Title>
      </Card.Header>
      <Card.Content class="p-4">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {#each orderSummary as item (item.label)}
            <a href={item.href} class="rounded-lg border p-3 transition hover:border-primary/50 hover:bg-muted/50">
              <div class="flex items-center justify-between gap-3">
                <item.Icon class="h-4 w-4 text-muted-foreground" />
                <span class="text-lg font-semibold text-foreground">{item.value}</span>
              </div>
              <p class="mt-2 text-xs font-medium text-muted-foreground">{item.label}</p>
            </a>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
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
        <Card.Title class="text-sm font-semibold">{isZh ? '热销与周转' : 'Best Sellers'}</Card.Title>
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
        <Card.Title class="text-sm font-semibold">{isZh ? '团队表现' : 'Staff Performance'}</Card.Title>
        <a class="text-sm font-medium text-primary hover:underline" href="#/users">{isZh ? '用户管理' : 'Users'}</a>
      </Card.Header>
      <Card.Content class="p-0">
        <div class="divide-y">
          {#each staffPerformance as member (member.id)}
            <div class="grid gap-3 px-6 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-foreground">{member.name}</p>
                <p class="text-xs text-muted-foreground">{member.department}</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{member.closed} {isZh ? '项' : 'closed'}</span>
                <span class="text-sm font-semibold text-foreground">{member.score}%</span>
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
        <div class="rounded-xl border bg-muted/20 p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{isZh ? '今日履约节奏' : 'Today flow'}</p>
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
    <section class="grid min-h-40 place-items-center rounded-xl border border-border/60 bg-muted/10" aria-live="polite">
      <p class="text-sm text-muted-foreground">{isZh ? '正在加载声明式 Surface…' : 'Loading declarative Surface…'}</p>
    </section>
  {:then declarativeSurfaceModule}
    {@const DeclarativeSurfaceExample = declarativeSurfaceModule.default}
    <DeclarativeSurfaceExample {isZh} />
  {:catch}
    <section class="grid min-h-40 place-items-center rounded-xl border border-destructive/50 bg-muted/10" role="alert">
      <p class="text-sm text-destructive">{isZh ? '声明式 Surface 加载失败。' : 'Unable to load the declarative Surface.'}</p>
    </section>
  {/await}
</div>
