<script lang="ts">
  import { captureAdminContext, useList } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import {
    AutoTable,
    Badge,
    Button,
    ContentPageShell,
    DataState,
    MetricBlock,
    SectionHeader,
  } from '@svadmin/ui';
  import {
    AlertTriangle,
    ArrowDownToLine,
    ArrowRight,
    ArrowUpFromLine,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    PackageCheck,
    Repeat2,
    Settings2,
    Table2,
    Truck,
  } from '@lucide/svelte';
  import { readHashParam, readHashView, replaceHashParam } from '../utils/hashView';

  type Row = Record<string, unknown>;
  type OperationsResource =
    | 'stock_movements'
    | 'stock_transfers'
    | 'cycle_counts'
    | 'inventory_adjustments'
    | 'reorder_rules'
    | 'purchase_orders'
    | 'sales_orders';

  interface PageProfile {
    eyebrow: [string, string];
    title: [string, string];
    description: [string, string];
    action: [string, string];
  }

  let { resourceName }: { resourceName: string } = $props();
  let activeView = $state(readHashView('default'));
  let showRecords = $state(readHashParam('records') === '1');

  const i18n = useTranslation();
  const adminContext = captureAdminContext();
  const query = useList({
    get resource() { return resourceName; },
    pagination: { mode: 'off' },
  });
  const productsQuery = useList({ resource: 'products', pagination: { mode: 'off' } });
  const warehousesQuery = useList({ resource: 'warehouses', pagination: { mode: 'off' } });
  const suppliersQuery = useList({ resource: 'suppliers', pagination: { mode: 'off' } });

  const isZh = $derived(i18n.locale === 'zh-CN');
  const rows = $derived((query.data?.data ?? []) as Row[]);
  const products = $derived((productsQuery.data?.data ?? []) as Row[]);
  const warehouses = $derived((warehousesQuery.data?.data ?? []) as Row[]);
  const suppliers = $derived((suppliersQuery.data?.data ?? []) as Row[]);
  const isLoading = $derived(query.isLoading || productsQuery.isLoading || warehousesQuery.isLoading || suppliersQuery.isLoading);
  const hasError = $derived(Boolean(query.error || productsQuery.error || warehousesQuery.error || suppliersQuery.error));
  const operationsResource = $derived(resourceName as OperationsResource);

  const profiles: Record<OperationsResource, PageProfile> = {
    stock_movements: {
      eyebrow: ['Inventory ledger', '库存台账'],
      title: ['Stock movement ledger', '库存流水台账'],
      description: ['Audit inbound, outbound, and adjustment activity with warehouse context.', '按仓库上下文审计入库、出库和调整流水。'],
      action: ['New movement', '新建流水'],
    },
    stock_transfers: {
      eyebrow: ['Warehouse flow', '仓间流转'],
      title: ['Stock transfer board', '库存调拨看板'],
      description: ['Coordinate release, transit, and receiving commitments between warehouses.', '协调仓库之间的放行、在途和收货承诺。'],
      action: ['New transfer', '新建调拨'],
    },
    cycle_counts: {
      eyebrow: ['Inventory assurance', '库存稽核'],
      title: ['Cycle count planner', '循环盘点计划'],
      description: ['Track count completion, variance exposure, owners, and scheduled windows.', '跟踪盘点完成度、差异风险、负责人和计划窗口。'],
      action: ['New count', '新建盘点'],
    },
    inventory_adjustments: {
      eyebrow: ['Exception control', '异常管控'],
      title: ['Adjustment approvals', '库存调整审批'],
      description: ['Review quantity corrections, reasons, and approval state before posting.', '过账前复核数量修正、原因和审批状态。'],
      action: ['New adjustment', '新建调整'],
    },
    reorder_rules: {
      eyebrow: ['Replenishment', '补货策略'],
      title: ['Reorder rule console', '补货规则控制台'],
      description: ['Tune minimum stock, target coverage, supplier lead time, and policy health.', '调整最低库存、目标覆盖、供应商交期和策略健康度。'],
      action: ['New rule', '新建规则'],
    },
    purchase_orders: {
      eyebrow: ['Procurement', '采购履约'],
      title: ['Purchase order workspace', '采购订单工作台'],
      description: ['Follow supplier commitments from draft through delivery and receiving.', '从草稿、下单到交付和收货跟踪供应商承诺。'],
      action: ['New purchase order', '新建采购单'],
    },
    sales_orders: {
      eyebrow: ['Order fulfillment', '销售履约'],
      title: ['Sales order workspace', '销售订单工作台'],
      description: ['Prioritize customer demand, processing queues, shipment dates, and exceptions.', '统筹客户需求、处理队列、发货日期和履约异常。'],
      action: ['New sales order', '新建销售单'],
    },
  };

  const profile = $derived.by(() => {
    if (operationsResource === 'reorder_rules' && activeView === 'settings') {
      return {
        eyebrow: ['Inventory settings', '库存设置'],
        title: ['Inventory settings', '库存设置'],
        description: ['Manage replenishment thresholds, lead times, and policy state as inventory settings.', '以库存设置视角维护补货阈值、供应商交期和策略状态。'],
        action: ['New inventory policy', '新建库存策略'],
      } satisfies PageProfile;
    }
    if (operationsResource === 'sales_orders' && activeView === 'customers') {
      return {
        eyebrow: ['Inventory customers', '库存客户'],
        title: ['Customer order view', '客户订单视图'],
        description: ['Review customer demand, order value, shipment state, and fulfillment exceptions.', '从客户需求、订单金额、发货状态和履约异常查看库存客户。'],
        action: ['New customer order', '新建客户订单'],
      } satisfies PageProfile;
    }
    return profiles[operationsResource] ?? profiles.stock_movements;
  });
  const copy = (pair: [string, string]) => isZh ? pair[1] : pair[0];
  const numeric = (row: Row, key: string) => Number(row[key] ?? 0);
  const text = (row: Row, key: string) => String(row[key] ?? '—');
  const recentMovements = $derived([...rows].sort((left, right) => text(right, 'date').localeCompare(text(left, 'date'))).slice(0, 5));
  const countBy = (key: string, value: string) => rows.filter((row) => text(row, key) === value).length;
  const sumBy = (key: string) => rows.reduce((sum, row) => sum + numeric(row, key), 0);
  const absoluteSumBy = (key: string) => rows.reduce((sum, row) => sum + Math.abs(numeric(row, key)), 0);
  const findName = (items: Row[], id: unknown, fallback: string) => String(items.find((item) => item.id === id)?.name ?? fallback);
  const productName = (id: unknown) => findName(products, id, isZh ? '未知商品' : 'Unknown product');
  const warehouseName = (id: unknown) => findName(warehouses, id, isZh ? '未知仓库' : 'Unknown warehouse');
  const supplierName = (id: unknown) => findName(suppliers, id, isZh ? '未知供应商' : 'Unknown supplier');
  const percent = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0;
  const money = (value: number) => new Intl.NumberFormat(isZh ? 'zh-CN' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  const statusLabel = (value: unknown) => {
    const labels: Record<string, [string, string]> = {
      in: ['Inbound', '入库'], out: ['Outbound', '出库'], adjustment: ['Adjustment', '调整'],
      draft: ['Draft', '草稿'], approved: ['Approved', '已批准'], in_transit: ['In transit', '运输中'], received: ['Received', '已收货'], cancelled: ['Cancelled', '已取消'],
      scheduled: ['Scheduled', '已计划'], in_progress: ['In progress', '进行中'], reconciled: ['Reconciled', '已对账'],
      pending_approval: ['Pending approval', '待审批'], rejected: ['Rejected', '已拒绝'],
      active: ['Active', '生效'], review: ['Review', '待复核'], paused: ['Paused', '已暂停'],
      ordered: ['Ordered', '已下单'], pending: ['Pending', '待处理'], processing: ['Processing', '处理中'], shipped: ['Shipped', '已发货'],
    };
    return copy(labels[String(value)] ?? [String(value), String(value)]);
  };

  const badgeVariant = (value: unknown): 'default' | 'secondary' | 'outline' | 'destructive' => {
    const status = String(value);
    if (['rejected', 'cancelled'].includes(status)) return 'destructive';
    if (['received', 'reconciled', 'approved', 'active', 'shipped'].includes(status)) return 'default';
    if (['draft', 'scheduled', 'pending', 'paused'].includes(status)) return 'secondary';
    return 'outline';
  };

  function createRecord(): void {
    adminContext.navigate(`/${resourceName}/create`);
  }

  function toggleRecords(): void {
    showRecords = !showRecords;
    replaceHashParam('records', showRecords ? '1' : null);
  }

  function syncView(): void {
    activeView = readHashView('default');
  }
</script>

<svelte:window onhashchange={syncView} onpopstate={syncView} />

{#snippet actions()}
  <div class="flex flex-wrap items-center justify-end gap-2">
    <Button data-operations-record-toggle variant="outline" size="sm" aria-expanded={showRecords} onclick={toggleRecords}>
      <Table2 class="size-4" />
      {showRecords ? (isZh ? '收起记录' : 'Hide records') : (isZh ? '查看记录' : 'View records')}
    </Button>
    <Button size="sm" onclick={createRecord}>{copy(profile.action)}</Button>
  </div>
{/snippet}

<ContentPageShell
  pageId={`operations-${resourceName}`}
  width="wide"
  eyebrow={copy(profile.eyebrow)}
  title={copy(profile.title)}
  description={copy(profile.description)}
  {actions}
>
  {#if hasError}
    <DataState state="error" title={isZh ? '运营数据加载失败' : 'Unable to load operations data'} />
  {:else if isLoading}
    <DataState state="loading" title={isZh ? '正在加载运营数据' : 'Loading operations data'} />
  {:else if operationsResource === 'stock_movements'}
    {@const inbound = rows.filter((row) => text(row, 'type') === 'in')}
    {@const outbound = rows.filter((row) => text(row, 'type') === 'out')}
    {@const adjustments = rows.filter((row) => text(row, 'type') === 'adjustment')}
    <section class="grid grid-cols-2 gap-3 xl:grid-cols-4" data-operations-metrics>
      <MetricBlock label={isZh ? '流水记录' : 'Movements'} value={rows.length} detail={isZh ? '当前台账范围' : 'Current ledger scope'} />
      <MetricBlock label={isZh ? '入库数量' : 'Inbound units'} value={inbound.reduce((sum, row) => sum + numeric(row, 'quantity'), 0)} detail={`${inbound.length} ${isZh ? '笔记录' : 'records'}`} trendTone="positive" />
      <MetricBlock label={isZh ? '出库数量' : 'Outbound units'} value={Math.abs(outbound.reduce((sum, row) => sum + numeric(row, 'quantity'), 0))} detail={`${outbound.length} ${isZh ? '笔记录' : 'records'}`} />
      <MetricBlock label={isZh ? '净变化' : 'Net change'} value={sumBy('quantity')} detail={adjustments.length ? `${adjustments.length} ${isZh ? '笔调整' : 'adjustments'}` : (isZh ? '无人工调整' : 'No manual adjustments')} />
    </section>
    <section class="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]" data-stock-movement-layout>
      <div class="rounded-lg border border-border bg-card">
        <div class="border-b border-border p-4"><SectionHeader title={isZh ? '近期库存活动' : 'Recent inventory activity'} description={isZh ? '按时间查看每次库存增减及所在仓库。' : 'Review every stock change with its warehouse context.'} /></div>
        <div class="divide-y divide-border">
          {#each recentMovements as row (String(row.id))}
            <article class="grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
              <span class="flex size-9 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                {#if text(row, 'type') === 'in'}<ArrowDownToLine class="size-4" />{:else}<ArrowUpFromLine class="size-4" />{/if}
              </span>
              <div class="min-w-0"><p class="truncate text-sm font-medium text-foreground">{productName(row.productId)}</p><p class="mt-1 text-xs text-muted-foreground">{warehouseName(row.warehouseId)} · {text(row, 'note')}</p></div>
              <div class="flex items-center justify-between gap-3 sm:block sm:text-right"><Badge variant={badgeVariant(row.type)}>{statusLabel(row.type)}</Badge><p class="mt-1 text-sm font-semibold text-foreground">{numeric(row, 'quantity') > 0 ? '+' : ''}{numeric(row, 'quantity')}</p></div>
            </article>
          {:else}
            <DataState state="empty" title={isZh ? '暂无库存流水' : 'No stock movements'} />
          {/each}
        </div>
      </div>
      <aside class="rounded-lg border border-border bg-card p-4">
        <SectionHeader title={isZh ? '流向构成' : 'Flow composition'} description={isZh ? '按操作类型汇总当前台账。' : 'Current ledger grouped by movement type.'} />
        <div class="mt-5 space-y-5">
          {#each [[isZh ? '入库' : 'Inbound', inbound.length, 'bg-primary'], [isZh ? '出库' : 'Outbound', outbound.length, 'bg-foreground'], [isZh ? '调整' : 'Adjustments', adjustments.length, 'bg-muted-foreground']] as item (String(item[0]))}
            <div><div class="flex items-center justify-between text-sm"><span class="text-muted-foreground">{item[0]}</span><span class="font-medium text-foreground">{item[1]}</span></div><div class="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div class={`h-full rounded-full ${item[2]}`} style:width={`${percent(Number(item[1]), rows.length)}%`}></div></div></div>
          {/each}
        </div>
      </aside>
    </section>
  {:else if operationsResource === 'stock_transfers'}
    {@const activeTransfers = rows.filter((row) => !['received', 'cancelled'].includes(text(row, 'status')))}
    <section class="grid grid-cols-2 gap-3 xl:grid-cols-4" data-operations-metrics>
      <MetricBlock label={isZh ? '调拨任务' : 'Transfers'} value={rows.length} detail={isZh ? '当前计划' : 'Current plan'} />
      <MetricBlock label={isZh ? '运输中' : 'In transit'} value={countBy('status', 'in_transit')} detail={isZh ? '正在跨仓移动' : 'Moving between warehouses'} trendTone="positive" />
      <MetricBlock label={isZh ? '待放行' : 'Awaiting release'} value={countBy('status', 'draft') + countBy('status', 'approved')} detail={isZh ? '需要运营动作' : 'Needs an operations action'} />
      <MetricBlock label={isZh ? '调拨件数' : 'Units planned'} value={sumBy('quantity')} detail={isZh ? '全部调拨数量' : 'Total transfer quantity'} />
    </section>
    <section class="rounded-lg border border-border bg-card" data-stock-transfer-layout>
      <div class="border-b border-border p-4"><SectionHeader title={isZh ? '仓间流转' : 'Warehouse transfer flow'} description={isZh ? '沿申请、放行、运输和收货阶段推进调拨。' : 'Move transfers through request, release, transit, and receiving.'} /></div>
      <div class="grid gap-px bg-border md:grid-cols-4">
        {#each [['draft', isZh ? '申请' : 'Requested'], ['approved', isZh ? '已放行' : 'Released'], ['in_transit', isZh ? '运输中' : 'In transit'], ['received', isZh ? '已收货' : 'Received']] as stage (String(stage[0]))}
          <div class="bg-card p-4"><p class="text-xs text-muted-foreground">{stage[1]}</p><p class="mt-2 text-2xl font-semibold text-foreground">{countBy('status', String(stage[0]))}</p></div>
        {/each}
      </div>
      <div class="divide-y divide-border">
        {#each activeTransfers as row (String(row.id))}
          <article class="grid gap-4 p-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_auto] lg:items-center">
            <div><div class="flex items-center gap-2"><Repeat2 class="size-4 text-muted-foreground" /><p class="text-sm font-medium text-foreground">{text(row, 'transferNumber')}</p></div><p class="mt-1 text-xs text-muted-foreground">{productName(row.productId)} · {numeric(row, 'quantity')} {isZh ? '件' : 'units'}</p></div>
            <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3"><span class="truncate text-sm text-foreground">{warehouseName(row.fromWarehouseId)}</span><ArrowRight class="size-4 text-muted-foreground" /><span class="truncate text-right text-sm text-foreground">{warehouseName(row.toWarehouseId)}</span></div>
            <div class="flex items-center justify-between gap-3 lg:justify-end"><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge><span class="text-xs text-muted-foreground">{text(row, 'expectedDate')}</span></div>
          </article>
        {:else}
          <DataState state="empty" title={isZh ? '暂无进行中的调拨' : 'No active transfers'} />
        {/each}
      </div>
    </section>
  {:else if operationsResource === 'cycle_counts'}
    {@const expected = sumBy('expectedItems')}
    {@const counted = sumBy('countedItems')}
    {@const variance = sumBy('varianceItems')}
    <section class="grid grid-cols-2 gap-3 xl:grid-cols-4" data-operations-metrics>
      <MetricBlock label={isZh ? '盘点计划' : 'Count plans'} value={rows.length} detail={isZh ? '当前周期' : 'Current cycle'} />
      <MetricBlock label={isZh ? '盘点进度' : 'Completion'} value={`${percent(counted, expected)}%`} detail={`${counted} / ${expected} ${isZh ? '项' : 'items'}`} trendTone="positive" />
      <MetricBlock label={isZh ? '差异项' : 'Variance items'} value={variance} detail={isZh ? '需要复核' : 'Requires reconciliation'} trendTone={variance > 0 ? 'warning' : 'positive'} />
      <MetricBlock label={isZh ? '进行中' : 'In progress'} value={countBy('status', 'in_progress')} detail={isZh ? '现场盘点' : 'Active count sessions'} />
    </section>
    <section class="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_18rem]" data-cycle-count-layout>
      <div class="rounded-lg border border-border bg-card">
        <div class="border-b border-border p-4"><SectionHeader title={isZh ? '盘点执行计划' : 'Count execution plan'} description={isZh ? '按仓库查看范围、负责人、进度和差异。' : 'Review scope, owner, progress, and variance by warehouse.'} /></div>
        <div class="divide-y divide-border">
          {#each rows as row (String(row.id))}
            {@const completion = percent(numeric(row, 'countedItems'), numeric(row, 'expectedItems'))}
            <article class="p-4"><div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div class="flex items-center gap-2"><ClipboardCheck class="size-4 text-muted-foreground" /><p class="text-sm font-medium text-foreground">{text(row, 'countNumber')} · {text(row, 'scope')}</p></div><p class="mt-1 text-xs text-muted-foreground">{warehouseName(row.warehouseId)} · {text(row, 'scheduledDate')}</p></div><div class="flex items-center gap-2"><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge>{#if numeric(row, 'varianceItems') > 0}<Badge variant="outline">{numeric(row, 'varianceItems')} {isZh ? '项差异' : 'variance'}</Badge>{/if}</div></div><div class="mt-4"><div class="flex items-center justify-between text-xs text-muted-foreground"><span>{numeric(row, 'countedItems')} / {numeric(row, 'expectedItems')}</span><span>{completion}%</span></div><div class="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-primary" style:width={`${completion}%`}></div></div></div></article>
          {/each}
        </div>
      </div>
      <aside class="space-y-4 rounded-lg border border-border bg-card p-4"><SectionHeader title={isZh ? '复核重点' : 'Review focus'} /><div class="space-y-3"><div class="flex items-start gap-3"><Clock3 class="mt-0.5 size-4 text-muted-foreground" /><div><p class="text-sm font-medium text-foreground">{isZh ? '计划窗口' : 'Scheduled windows'}</p><p class="text-xs text-muted-foreground">{rows.length} {isZh ? '个盘点任务待跟踪' : 'count sessions to track'}</p></div></div><div class="flex items-start gap-3"><AlertTriangle class="mt-0.5 size-4 text-muted-foreground" /><div><p class="text-sm font-medium text-foreground">{isZh ? '差异处理' : 'Variance review'}</p><p class="text-xs text-muted-foreground">{variance} {isZh ? '项需要核对库存记录' : 'items require reconciliation'}</p></div></div></div></aside>
    </section>
  {:else if operationsResource === 'inventory_adjustments'}
    {@const pendingAdjustments = rows.filter((row) => text(row, 'status') === 'pending_approval')}
    <section class="grid grid-cols-2 gap-3 xl:grid-cols-4" data-operations-metrics>
      <MetricBlock label={isZh ? '调整申请' : 'Adjustments'} value={rows.length} detail={isZh ? '当前审批范围' : 'Current approval scope'} />
      <MetricBlock label={isZh ? '待审批' : 'Pending approval'} value={pendingAdjustments.length} detail={isZh ? '需要负责人处理' : 'Needs an owner decision'} trendTone={pendingAdjustments.length > 0 ? 'warning' : 'positive'} />
      <MetricBlock label={isZh ? '净库存影响' : 'Net stock impact'} value={sumBy('quantityChange')} detail={isZh ? '所有调整合计' : 'Across all adjustments'} />
      <MetricBlock label={isZh ? '变动总量' : 'Gross change'} value={absoluteSumBy('quantityChange')} detail={isZh ? '绝对数量变化' : 'Absolute quantity movement'} />
    </section>
    <section class="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]" data-adjustment-layout>
      <div class="rounded-lg border border-border bg-card">
        <div class="border-b border-border p-4">
          <SectionHeader title={isZh ? '审批队列' : 'Approval queue'} description={isZh ? '先处理待审批的库存修正，再进入完整记录表。' : 'Resolve pending stock corrections before reviewing the full ledger.'} />
        </div>
        <div class="divide-y divide-border">
          {#each pendingAdjustments as row (String(row.id))}
            <article class="p-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><p class="text-sm font-medium text-foreground">{text(row, 'adjustmentNumber')} · {productName(row.productId)}</p><p class="mt-1 text-xs text-muted-foreground">{warehouseName(row.warehouseId)} · {text(row, 'reason').replaceAll('_', ' ')}</p></div>
                <div class="flex items-center gap-3"><span class={`text-sm font-semibold ${numeric(row, 'quantityChange') < 0 ? 'text-destructive' : 'text-foreground'}`}>{numeric(row, 'quantityChange') > 0 ? '+' : ''}{numeric(row, 'quantityChange')}</span><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge></div>
              </div>
              <p class="mt-3 text-sm leading-6 text-muted-foreground">{text(row, 'notes')}</p>
            </article>
          {:else}
            <DataState state="empty" title={isZh ? '没有待审批调整' : 'No adjustments awaiting approval'} />
          {/each}
        </div>
      </div>
      <aside class="rounded-lg border border-border bg-card p-4"><SectionHeader title={isZh ? '调整影响' : 'Adjustment impact'} /><div class="mt-5 space-y-4">{#each rows as row (String(row.id))}<div class="flex items-center justify-between gap-3"><div class="min-w-0"><p class="truncate text-sm font-medium text-foreground">{productName(row.productId)}</p><p class="text-xs text-muted-foreground">{warehouseName(row.warehouseId)}</p></div><span class={`text-sm font-semibold ${numeric(row, 'quantityChange') < 0 ? 'text-destructive' : 'text-foreground'}`}>{numeric(row, 'quantityChange') > 0 ? '+' : ''}{numeric(row, 'quantityChange')}</span></div>{/each}</div></aside>
    </section>
  {:else if operationsResource === 'reorder_rules'}
    {@const reviewRules = rows.filter((row) => text(row, 'status') === 'review')}
    <section class="grid grid-cols-2 gap-3 xl:grid-cols-4" data-operations-metrics>
      <MetricBlock label={isZh ? '补货策略' : 'Reorder policies'} value={rows.length} detail={isZh ? '已配置规则' : 'Configured rules'} />
      <MetricBlock label={isZh ? '生效策略' : 'Active policies'} value={countBy('status', 'active')} detail={isZh ? '自动补货范围' : 'Automated replenishment'} trendTone="positive" />
      <MetricBlock label={isZh ? '待复核' : 'Needs review'} value={reviewRules.length} detail={isZh ? '阈值或消耗变化' : 'Threshold or demand changed'} trendTone={reviewRules.length > 0 ? 'warning' : 'positive'} />
      <MetricBlock label={isZh ? '计划补货量' : 'Planned reorder units'} value={sumBy('reorderQuantity')} detail={isZh ? '全部策略合计' : 'Across all policies'} />
    </section>
    <section class="rounded-lg border border-border bg-card" data-reorder-layout>
      <div class="border-b border-border p-4"><SectionHeader title={isZh ? '策略健康度' : 'Policy health'} description={isZh ? '对照最低库存、目标库存、补货量和供应商交期。' : 'Compare minimum stock, target coverage, reorder quantity, and supplier lead time.'} /></div>
      <div class="divide-y divide-border">
        {#each rows as row (String(row.id))}
          {@const coverage = percent(numeric(row, 'minStock'), numeric(row, 'targetStock'))}
          <article class="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)_auto] lg:items-center"><div><div class="flex items-center gap-2"><Settings2 class="size-4 text-muted-foreground" /><p class="text-sm font-medium text-foreground">{productName(row.productId)}</p></div><p class="mt-1 text-xs text-muted-foreground">{warehouseName(row.warehouseId)} · {supplierName(row.supplierId)}</p></div><div><div class="flex items-center justify-between text-xs text-muted-foreground"><span>{isZh ? '最低 / 目标' : 'Minimum / target'}</span><span>{numeric(row, 'minStock')} / {numeric(row, 'targetStock')}</span></div><div class="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-primary" style:width={`${coverage}%`}></div></div></div><div class="flex items-center justify-between gap-3 lg:justify-end"><div class="text-right"><p class="text-sm font-semibold text-foreground">+{numeric(row, 'reorderQuantity')}</p><p class="text-xs text-muted-foreground">{numeric(row, 'leadTimeDays')} {isZh ? '天交期' : 'days lead'}</p></div><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge></div></article>
        {/each}
      </div>
    </section>
  {:else}
    {@const isPurchase = operationsResource === 'purchase_orders'}
    {@const amount = sumBy('totalAmount')}
    {@const completedStatus = isPurchase ? 'received' : 'shipped'}
    {@const activeOrders = rows.filter((row) => ![completedStatus, 'cancelled'].includes(text(row, 'status')))}
    <section class="grid grid-cols-2 gap-3 xl:grid-cols-4" data-operations-metrics>
      <MetricBlock label={isPurchase ? (isZh ? '采购订单' : 'Purchase orders') : (isZh ? '销售订单' : 'Sales orders')} value={rows.length} detail={isZh ? '当前订单范围' : 'Current order scope'} />
      <MetricBlock label={isZh ? '订单金额' : 'Order value'} value={money(amount)} detail={isZh ? '全部订单合计' : 'Across all orders'} />
      <MetricBlock label={isZh ? '进行中' : 'Open orders'} value={activeOrders.length} detail={isZh ? '仍需履约动作' : 'Still requires fulfillment'} />
      <MetricBlock label={isPurchase ? (isZh ? '已收货' : 'Received') : (isZh ? '已发货' : 'Shipped')} value={countBy('status', completedStatus)} detail={isZh ? '已完成履约' : 'Fulfillment completed'} trendTone="positive" />
    </section>
    <section class="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]" data-order-layout={operationsResource}>
      <div class="rounded-lg border border-border bg-card">
        <div class="border-b border-border p-4"><SectionHeader title={isPurchase ? (isZh ? '供应商履约队列' : 'Supplier fulfillment queue') : (isZh ? '客户履约队列' : 'Customer fulfillment queue')} description={isPurchase ? (isZh ? '跟踪下单、到货窗口和收货状态。' : 'Track ordering, delivery windows, and receiving state.') : (isZh ? '跟踪客户需求、处理状态和发货窗口。' : 'Track customer demand, processing state, and shipment windows.')} /></div>
        <div class="divide-y divide-border">
          {#each activeOrders as row (String(row.id))}
            <article class="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><div class="flex items-center gap-2">{#if isPurchase}<Truck class="size-4 text-muted-foreground" />{:else}<PackageCheck class="size-4 text-muted-foreground" />{/if}<p class="text-sm font-medium text-foreground">{text(row, 'orderNumber')}</p></div><p class="mt-1 text-xs text-muted-foreground">{isPurchase ? supplierName(row.supplierId) : text(row, 'customerName')} · {isPurchase ? text(row, 'deliveryDate') : text(row, 'shippingDate')}</p></div><div class="flex items-center justify-between gap-3"><span class="text-sm font-semibold text-foreground">{money(numeric(row, 'totalAmount'))}</span><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge></div></article>
          {:else}
            <DataState state="empty" title={isZh ? '暂无进行中的订单' : 'No active orders'} />
          {/each}
        </div>
      </div>
      <aside class="rounded-lg border border-border bg-card p-4"><SectionHeader title={isZh ? '履约状态' : 'Fulfillment status'} /><div class="mt-5 space-y-4">{#each (isPurchase ? ['draft', 'ordered', 'received'] : ['pending', 'processing', 'shipped']) as status (status)}<div class="flex items-center justify-between gap-3"><div class="flex items-center gap-2">{#if status === completedStatus}<CheckCircle2 class="size-4 text-muted-foreground" />{:else}<Clock3 class="size-4 text-muted-foreground" />{/if}<span class="text-sm text-muted-foreground">{statusLabel(status)}</span></div><Badge variant="outline">{countBy('status', status)}</Badge></div>{/each}</div></aside>
    </section>
  {/if}

  {#if !hasError && !isLoading && showRecords}
    <section class="space-y-3" data-operations-table>
      <SectionHeader title={isZh ? '完整记录' : 'All records'} description={isZh ? '保留 svadmin 的筛选、排序、新建、编辑、详情和删除流程。' : 'Keep the complete svadmin filter, sort, create, edit, show, and delete workflow.'} />
      <AutoTable {resourceName} />
    </section>
  {/if}
</ContentPageShell>
