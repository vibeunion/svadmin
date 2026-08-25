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
    Activity,
    Bell,
    Boxes,
    Building2,
    CreditCard,
    FileClock,
    KeyRound,
    Layers3,
    PackageSearch,
    ServerCog,
    ShieldCheck,
    Sparkles,
    Truck,
    Users,
  } from '@lucide/svelte';

  type Row = Record<string, unknown>;
  type CopyPair = readonly [string, string];
  type SummaryMetric = readonly [string, string | number];
  type SummaryMetricBuilder = () => SummaryMetric[];
  type DomainResource = keyof typeof profiles;

  interface PageProfile {
    eyebrow: CopyPair;
    title: CopyPair;
    description: CopyPair;
    action: CopyPair;
  }

  let { resourceName }: { resourceName: string } = $props();

  const i18n = useTranslation();
  const adminContext = captureAdminContext();
  const currentQuery = useList({ get resource() { return resourceName; }, pagination: { mode: 'off' } });
  const productsQuery = useList({ resource: 'products', pagination: { mode: 'off' } });
  const categoriesQuery = useList({ resource: 'categories', pagination: { mode: 'off' } });
  const suppliersQuery = useList({ resource: 'suppliers', pagination: { mode: 'off' } });
  const usersQuery = useList({ resource: 'users', pagination: { mode: 'off' } });
  const plansQuery = useList({ resource: 'billing_plans', pagination: { mode: 'off' } });

  const isZh = $derived(i18n.locale === 'zh-CN');
  const rows = $derived((currentQuery.data?.data ?? []) as Row[]);
  const products = $derived((productsQuery.data?.data ?? []) as Row[]);
  const categories = $derived((categoriesQuery.data?.data ?? []) as Row[]);
  const suppliers = $derived((suppliersQuery.data?.data ?? []) as Row[]);
  const users = $derived((usersQuery.data?.data ?? []) as Row[]);
  const plans = $derived((plansQuery.data?.data ?? []) as Row[]);
  const isLoading = $derived(currentQuery.isLoading || productsQuery.isLoading || categoriesQuery.isLoading || suppliersQuery.isLoading || usersQuery.isLoading || plansQuery.isLoading);
  const hasError = $derived(Boolean(currentQuery.error || productsQuery.error || categoriesQuery.error || suppliersQuery.error || usersQuery.error || plansQuery.error));
  const domainResource = $derived(resourceName as DomainResource);

  const profiles = {
    products: { eyebrow: ['Catalog', '商品目录'], title: ['Product catalog', '商品目录'], description: ['Manage sellable products, pricing, stock exposure, and catalog enrichment.', '管理可售商品、价格、库存风险和目录完整度。'], action: ['New product', '新建商品'] },
    skus: { eyebrow: ['Variants', 'SKU 变体'], title: ['SKU directory', 'SKU 变体目录'], description: ['Maintain barcodes, variants, product links, and lifecycle state.', '维护条码、变体、关联商品和生命周期状态。'], action: ['New SKU', '新建 SKU'] },
    categories: { eyebrow: ['Taxonomy', '目录结构'], title: ['Category structure', '商品分类结构'], description: ['Organize catalog navigation, category codes, and product coverage.', '组织目录导航、分类编码和商品覆盖。'], action: ['New category', '新建分类'] },
    suppliers: { eyebrow: ['Sourcing', '供应网络'], title: ['Supplier directory', '供应商名录'], description: ['Review supplier contacts, catalog dependency, and sourcing coverage.', '查看供应商联系人、目录依赖和采购覆盖。'], action: ['New supplier', '新建供应商'] },
    warehouses: { eyebrow: ['Facilities', '仓储设施'], title: ['Warehouse capacity', '仓库容量管理'], description: ['Monitor locations, capacity utilization, and available operating headroom.', '监控仓库位置、容量利用率和可用作业空间。'], action: ['New warehouse', '新建仓库'] },
    notifications: { eyebrow: ['Communications', '消息中心'], title: ['Notification center', '通知中心'], description: ['Triage unread alerts, delivery channels, priorities, and follow-up state.', '处理未读提醒、投递渠道、优先级和后续状态。'], action: ['New notification', '新建通知'] },
    store_client_products: { eyebrow: ['Storefront', '商城前台'], title: ['Store merchandising', '商城商品运营'], description: ['Review customer-facing assortment, ratings, pricing, and availability.', '查看面向客户的商品组合、评分、价格和可售库存。'], action: ['New store product', '新建商城商品'] },
    store_client_orders: { eyebrow: ['Commerce', '商城交易'], title: ['Store order flow', '商城订单流转'], description: ['Track checkout orders through processing, shipment, and delivery.', '跟踪商城订单从处理、发货到签收的过程。'], action: ['New store order', '新建商城订单'] },
    project_planning: { eyebrow: ['Planning', '项目规划'], title: ['Delivery plan', '项目交付计划'], description: ['Coordinate milestones, owners, due dates, confidence, and review state.', '协调里程碑、负责人、截止日期、信心度和评审状态。'], action: ['New milestone', '新建里程碑'] },
    store_admin: { eyebrow: ['Store administration', '商城后台'], title: ['Store capability roadmap', '商城能力路线图'], description: ['Prioritize catalog, promotion, merchant, and operations modules.', '规划目录、促销、商户和运营后台模块。'], action: ['New module', '新建模块'] },
    store_services: { eyebrow: ['Commerce platform', '商城平台'], title: ['Store service operations', '商城服务运行'], description: ['Monitor runtime placement, latency budgets, ownership, and delivery state.', '监控服务运行位置、延迟预算、负责人和交付状态。'], action: ['New service', '新建服务'] },
    ai_prompt: { eyebrow: ['AI operations', 'AI 运营'], title: ['Prompt library', '提示词库'], description: ['Govern prompt audiences, review state, usage, and reusable content.', '治理提示词受众、评审状态、使用量和可复用内容。'], action: ['New prompt', '新建提示词'] },
    invoice_generator: { eyebrow: ['Document automation', '文档自动化'], title: ['Invoice generation queue', '发票生成队列'], description: ['Schedule templates, channels, review checkpoints, and next runs.', '安排模板、渠道、复核节点和下次运行。'], action: ['New template', '新建模板'] },
    billing_plans: { eyebrow: ['Billing catalog', '计费目录'], title: ['Plan catalog', '套餐方案'], description: ['Compare pricing, included seats, lifecycle state, and positioning.', '比较价格、包含席位、生命周期状态和套餐定位。'], action: ['New plan', '新建套餐'] },
    billing_invoices: { eyebrow: ['Receivables', '应收管理'], title: ['Billing history', '账单历史'], description: ['Review paid, pending, failed, and refunded invoices by billing period.', '按计费周期查看已支付、待支付、失败和退款账单。'], action: ['New invoice', '新建账单'] },
    billing_subscriptions: { eyebrow: ['Recurring revenue', '订阅收入'], title: ['Subscription portfolio', '订阅组合'], description: ['Track subscribers, plan mix, renewals, trials, and past-due risk.', '跟踪订阅方、套餐结构、续费、试用和逾期风险。'], action: ['New subscription', '新建订阅'] },
    security_sessions: { eyebrow: ['Access security', '访问安全'], title: ['Active sessions', '登录会话'], description: ['Inspect session location, device, recency, and revocation state.', '检查会话位置、设备、活跃时间和撤销状态。'], action: ['New session', '新建会话'] },
    security_devices: { eyebrow: ['Device trust', '设备信任'], title: ['Trusted devices', '可信设备'], description: ['Approve enrolled devices, owners, platforms, and trust state.', '审批已登记设备、负责人、平台和信任状态。'], action: ['Enroll device', '登记设备'] },
    security_allowed_ips: { eyebrow: ['Network policy', '网络策略'], title: ['Allowed IP policy', '允许 IP 策略'], description: ['Maintain office, VPN, and restricted network access ranges.', '维护办公室、VPN 和受限网络访问范围。'], action: ['Add IP rule', '新增 IP 规则'] },
    referral_invites: { eyebrow: ['Growth loop', '邀请增长'], title: ['Referral invitations', '推荐邀请'], description: ['Track invite delivery, acceptance, expiration, and inviter contribution.', '跟踪邀请发送、接受、过期和邀请人贡献。'], action: ['New invitation', '新建邀请'] },
  } as const satisfies Record<string, PageProfile>;

  const profile = $derived(profiles[domainResource] ?? profiles.products);
  const copy = (pair: CopyPair) => isZh ? pair[1] : pair[0];
  const valueText = (row: Row, key: string) => String(row[key] ?? '—');
  const valueNumber = (row: Row, key: string) => Number(row[key] ?? 0);
  const countBy = (key: string, value: string) => rows.filter((row) => valueText(row, key) === value).length;
  const sumBy = (key: string) => rows.reduce((sum, row) => sum + valueNumber(row, key), 0);
  const averageBy = (key: string) => rows.length ? Math.round(sumBy(key) / rows.length) : 0;
  const findName = (records: Row[], id: unknown, key = 'name') => String(records.find((record) => record.id === id)?.[key] ?? (isZh ? '未分配' : 'Unassigned'));
  const money = (amount: number) => new Intl.NumberFormat(isZh ? 'zh-CN' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  const percent = (amount: number, total: number) => total > 0 ? Math.round((amount / total) * 100) : 0;

  const statusLabel = (status: unknown) => {
    const labels: Record<string, CopyPair> = {
      active: ['Active', '生效'], paused: ['Paused', '暂停'], retired: ['Retired', '停用'], deprecated: ['Deprecated', '已弃用'],
      processing: ['Processing', '处理中'], shipped: ['Shipped', '已发货'], delivered: ['Delivered', '已签收'],
      planned: ['Planned', '计划中'], in_progress: ['In progress', '进行中'], review: ['Review', '待复核'], completed: ['Completed', '已完成'],
      paid: ['Paid', '已支付'], pending: ['Pending', '待处理'], failed: ['Failed', '失败'], refunded: ['Refunded', '已退款'],
      trialing: ['Trialing', '试用中'], past_due: ['Past due', '已逾期'], idle: ['Idle', '空闲'], revoked: ['Revoked', '已撤销'],
      trusted: ['Trusted', '可信'], allowed: ['Allowed', '允许'], restricted: ['Restricted', '受限'], accepted: ['Accepted', '已接受'], sent: ['Sent', '已发送'], expired: ['Expired', '已过期'],
    };
    return copy(labels[String(status)] ?? [String(status), String(status)]);
  };

  const badgeVariant = (status: unknown): 'default' | 'secondary' | 'outline' | 'destructive' => {
    const normalized = String(status);
    if (['failed', 'revoked', 'past_due', 'expired'].includes(normalized)) return 'destructive';
    if (['active', 'paid', 'delivered', 'completed', 'trusted', 'allowed', 'accepted'].includes(normalized)) return 'default';
    if (['planned', 'pending', 'idle', 'sent', 'paused'].includes(normalized)) return 'secondary';
    return 'outline';
  };

  const defaultMetrics: SummaryMetricBuilder = () => [
    [isZh ? '记录' : 'Records', rows.length],
    [isZh ? '进行中' : 'In progress', countBy('status', 'in_progress')],
    [isZh ? '待复核' : 'In review', countBy('status', 'review')],
    [isZh ? '已完成' : 'Completed', countBy('status', 'completed')],
  ];

  const summaryMetricBuilders: Record<DomainResource, SummaryMetricBuilder> = {
    products: () => [
      [isZh ? '商品' : 'Products', rows.length],
      [isZh ? '低库存' : 'Low stock', rows.filter((row) => valueNumber(row, 'stock') < valueNumber(row, 'minStock')).length],
      [isZh ? '库存件数' : 'Units in stock', sumBy('stock')],
      [isZh ? '目录货值' : 'Catalog value', money(rows.reduce((sum, row) => sum + valueNumber(row, 'price') * valueNumber(row, 'stock'), 0))],
    ],
    skus: () => [
      [isZh ? 'SKU' : 'SKUs', rows.length],
      [isZh ? '生效' : 'Active', countBy('status', 'active')],
      [isZh ? '变体商品' : 'Linked products', new Set(rows.map((row) => row.productId)).size],
      [isZh ? '条码覆盖' : 'Barcode coverage', `${percent(rows.filter((row) => valueText(row, 'barcode') !== '—').length, rows.length)}%`],
    ],
    categories: () => [
      [isZh ? '分类' : 'Categories', rows.length],
      [isZh ? '已覆盖商品' : 'Covered products', products.length],
      [isZh ? '平均商品数' : 'Avg products', rows.length ? Math.round(products.length / rows.length) : 0],
      [isZh ? '编码覆盖' : 'Code coverage', `${percent(rows.filter((row) => valueText(row, 'code') !== '—').length, rows.length)}%`],
    ],
    suppliers: () => [
      [isZh ? '供应商' : 'Suppliers', rows.length],
      [isZh ? '供应商品' : 'Sourced products', products.length],
      [isZh ? '联系人覆盖' : 'Contact coverage', `${percent(rows.filter((row) => valueText(row, 'contactName') !== '—').length, rows.length)}%`],
      [isZh ? '邮箱覆盖' : 'Email coverage', `${percent(rows.filter((row) => valueText(row, 'email') !== '—').length, rows.length)}%`],
    ],
    warehouses: () => [
      [isZh ? '仓库' : 'Warehouses', rows.length],
      [isZh ? '总容量' : 'Capacity', sumBy('capacity')],
      [isZh ? '平均利用率' : 'Avg utilization', `${averageBy('utilization')}%`],
      [isZh ? '可用空间' : 'Available capacity', rows.reduce((sum, row) => sum + Math.round(valueNumber(row, 'capacity') * (100 - valueNumber(row, 'utilization')) / 100), 0)],
    ],
    notifications: () => [
      [isZh ? '通知' : 'Notifications', rows.length],
      [isZh ? '未读' : 'Unread', rows.filter((row) => !row.read).length],
      [isZh ? '严重' : 'Critical', countBy('severity', 'critical')],
      [isZh ? '渠道' : 'Channels', new Set(rows.map((row) => row.channel)).size],
    ],
    store_client_products: () => [
      [isZh ? '在售商品' : 'Store products', rows.length],
      [isZh ? '平均评分' : 'Avg rating', rows.length ? (sumBy('rating') / rows.length).toFixed(1) : '0'],
      [isZh ? '可售库存' : 'Available stock', sumBy('stock')],
      [isZh ? '商品价值' : 'Merchandise value', money(sumBy('price'))],
    ],
    store_client_orders: () => [
      [isZh ? '商城订单' : 'Store orders', rows.length],
      [isZh ? '交易金额' : 'Order value', money(sumBy('totalAmount'))],
      [isZh ? '处理中' : 'Processing', countBy('status', 'processing')],
      [isZh ? '已签收' : 'Delivered', countBy('status', 'delivered')],
    ],
    project_planning: () => [
      [isZh ? '里程碑' : 'Milestones', rows.length],
      [isZh ? '进行中' : 'In progress', countBy('status', 'in_progress')],
      [isZh ? '待评审' : 'In review', countBy('status', 'review')],
      [isZh ? '平均信心度' : 'Avg confidence', `${averageBy('confidence')}%`],
    ],
    store_admin: () => [
      [isZh ? '后台模块' : 'Admin modules', rows.length],
      [isZh ? '进行中' : 'In progress', countBy('status', 'in_progress')],
      [isZh ? '待复核' : 'In review', countBy('status', 'review')],
      [isZh ? '负责人' : 'Owners', new Set(rows.map((row) => row.ownerId)).size],
    ],
    store_services: () => [
      [isZh ? '服务' : 'Services', rows.length],
      [isZh ? '运行环境' : 'Runtimes', new Set(rows.map((row) => row.runtime)).size],
      [isZh ? '平均延迟预算' : 'Avg latency budget', `${averageBy('latencyBudgetMs')} ms`],
      [isZh ? '进行中' : 'In progress', countBy('status', 'in_progress')],
    ],
    ai_prompt: () => [
      [isZh ? '提示词' : 'Prompts', rows.length],
      [isZh ? '使用次数' : 'Uses', sumBy('usageCount')],
      [isZh ? '待复核' : 'In review', countBy('status', 'review')],
      [isZh ? '受众数' : 'Audiences', new Set(rows.map((row) => row.audience)).size],
    ],
    invoice_generator: () => [
      [isZh ? '生成模板' : 'Templates', rows.length],
      [isZh ? '进行中' : 'In progress', countBy('status', 'in_progress')],
      [isZh ? '待复核' : 'In review', countBy('status', 'review')],
      [isZh ? '渠道' : 'Channels', new Set(rows.map((row) => row.channel)).size],
    ],
    billing_plans: () => [
      [isZh ? '套餐' : 'Plans', rows.length],
      [isZh ? '生效套餐' : 'Active plans', countBy('status', 'active')],
      [isZh ? '月费范围' : 'Monthly range', rows.length ? `${money(Math.min(...rows.map((row) => valueNumber(row, 'priceMonthly'))))} - ${money(Math.max(...rows.map((row) => valueNumber(row, 'priceMonthly'))))}` : money(0)],
      [isZh ? '包含席位' : 'Included seats', sumBy('seatsIncluded')],
    ],
    billing_invoices: () => [
      [isZh ? '账单' : 'Invoices', rows.length],
      [isZh ? '账单金额' : 'Billed', money(sumBy('amount'))],
      [isZh ? '待收款' : 'Pending', money(rows.filter((row) => valueText(row, 'status') === 'pending').reduce((sum, row) => sum + valueNumber(row, 'amount'), 0))],
      [isZh ? '失败账单' : 'Failed', countBy('status', 'failed')],
    ],
    billing_subscriptions: () => [
      [isZh ? '订阅' : 'Subscriptions', rows.length],
      [isZh ? '活跃订阅' : 'Active', countBy('status', 'active')],
      [isZh ? '试用' : 'Trials', countBy('status', 'trialing')],
      [isZh ? '逾期' : 'Past due', countBy('status', 'past_due')],
    ],
    security_sessions: () => [
      [isZh ? '会话' : 'Sessions', rows.length],
      [isZh ? '活跃' : 'Active', countBy('status', 'active')],
      [isZh ? '空闲' : 'Idle', countBy('status', 'idle')],
      [isZh ? '已撤销' : 'Revoked', countBy('status', 'revoked')],
    ],
    security_devices: () => [
      [isZh ? '设备' : 'Devices', rows.length],
      [isZh ? '可信设备' : 'Trusted', countBy('status', 'trusted')],
      [isZh ? '待审批' : 'Pending', countBy('status', 'pending')],
      [isZh ? '平台数' : 'Platforms', new Set(rows.map((row) => row.platform)).size],
    ],
    security_allowed_ips: () => [
      [isZh ? 'IP 规则' : 'IP rules', rows.length],
      [isZh ? '允许' : 'Allowed', countBy('status', 'allowed')],
      [isZh ? '受限' : 'Restricted', countBy('status', 'restricted')],
      [isZh ? '网络范围' : 'Network ranges', rows.filter((row) => valueText(row, 'cidr').includes('/')).length],
    ],
    referral_invites: () => [
      [isZh ? '邀请' : 'Invites', rows.length],
      [isZh ? '已接受' : 'Accepted', countBy('status', 'accepted')],
      [isZh ? '待接受' : 'Open', countBy('status', 'sent')],
      [isZh ? '转化率' : 'Conversion', `${percent(countBy('status', 'accepted'), rows.length)}%`],
    ],
  };

  const summaryMetrics = $derived((summaryMetricBuilders[domainResource] ?? defaultMetrics)());

  function createRecord(): void {
    adminContext.navigate(`/${resourceName}/create`);
  }
</script>

{#snippet actions()}
  <Button size="sm" onclick={createRecord}>{copy(profile.action)}</Button>
{/snippet}

<ContentPageShell pageId={`domain-${resourceName}`} width="wide" eyebrow={copy(profile.eyebrow)} title={copy(profile.title)} description={copy(profile.description)} {actions}>
  {#if hasError}
    <DataState state="error" title={isZh ? '业务数据加载失败' : 'Unable to load workspace data'} />
  {:else if isLoading}
    <DataState state="loading" title={isZh ? '正在加载业务数据' : 'Loading workspace data'} />
  {:else}
    <section class="grid grid-cols-2 gap-3 xl:grid-cols-4" data-domain-metrics>
      {#each summaryMetrics as metric (String(metric[0]))}
        <MetricBlock label={String(metric[0])} value={metric[1]} />
      {/each}
    </section>

    {#if domainResource === 'products'}
      <section class="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_18rem]" data-product-catalog-layout>
        <div class="grid gap-3 md:grid-cols-2">{#each rows as row (String(row.id))}<article class="rounded-lg border border-border bg-card p-4"><div class="flex items-start justify-between gap-3"><div><p class="text-sm font-semibold text-foreground">{valueText(row, 'name')}</p><p class="mt-1 font-mono text-xs text-muted-foreground">{valueText(row, 'sku')}</p></div><Badge variant={valueNumber(row, 'stock') < valueNumber(row, 'minStock') ? 'destructive' : 'outline'}>{valueNumber(row, 'stock')} {isZh ? '件' : 'units'}</Badge></div><div class="mt-4 flex items-end justify-between"><div><p class="text-xs text-muted-foreground">{findName(categories, row.categoryId)}</p><p class="mt-1 text-sm text-foreground">{findName(suppliers, row.supplierId)}</p></div><p class="text-lg font-semibold">{money(valueNumber(row, 'price'))}</p></div></article>{/each}</div>
        <aside class="rounded-lg border border-border bg-card p-4"><SectionHeader title={isZh ? '库存风险' : 'Stock exposure'} description={isZh ? '按最低库存检查目录风险。' : 'Catalog risk measured against minimum stock.'} /><div class="mt-4 space-y-4">{#each rows.filter((row) => valueNumber(row, 'stock') < valueNumber(row, 'minStock')) as row (String(row.id))}<div><div class="flex items-center justify-between gap-3 text-sm"><span class="truncate">{valueText(row, 'name')}</span><Badge variant="destructive">-{valueNumber(row, 'minStock') - valueNumber(row, 'stock')}</Badge></div><div class="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-destructive" style:width={`${percent(valueNumber(row, 'stock'), valueNumber(row, 'minStock'))}%`}></div></div></div>{:else}<DataState state="empty" title={isZh ? '没有低库存商品' : 'No low-stock products'} />{/each}</div></aside>
      </section>
    {:else if domainResource === 'skus'}
      <section class="rounded-lg border border-border bg-card" data-sku-directory-layout><div class="border-b border-border p-4"><SectionHeader title={isZh ? '条码与变体' : 'Barcode and variants'} description={isZh ? '以紧凑目录检查每个 SKU 的商品关联和生命周期。' : 'Audit product links and lifecycle state in a dense SKU directory.'} /></div><div class="divide-y divide-border">{#each rows as row (String(row.id))}<article class="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.7fr)_auto] sm:items-center"><div><p class="font-mono text-sm font-semibold">{valueText(row, 'sku')}</p><p class="mt-1 text-xs text-muted-foreground">{findName(products, row.productId)}</p></div><div><p class="text-sm">{valueText(row, 'variant')}</p><p class="mt-1 font-mono text-xs text-muted-foreground">{valueText(row, 'barcode')}</p></div><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge></article>{/each}</div></section>
    {:else if domainResource === 'categories'}
      <section class="grid gap-4 md:grid-cols-3" data-category-structure-layout>{#each rows as row (String(row.id))}{@const productCount = products.filter((product) => product.categoryId === row.id).length}<article class="border-t-2 border-primary bg-card p-4"><div class="flex items-center justify-between"><span class="flex size-9 items-center justify-center rounded-md border border-border"><Layers3 class="size-4 text-muted-foreground" /></span><Badge variant="outline">{valueText(row, 'code')}</Badge></div><h2 class="mt-4 text-base font-semibold">{valueText(row, 'name')}</h2><p class="mt-1 min-h-10 text-sm text-muted-foreground">{valueText(row, 'description')}</p><div class="mt-4 border-t border-border pt-3 text-sm"><span class="text-muted-foreground">{isZh ? '商品覆盖' : 'Product coverage'}</span><span class="float-right font-semibold">{productCount}</span></div></article>{/each}</section>
    {:else if domainResource === 'suppliers'}
      <section class="rounded-lg border border-border bg-card" data-supplier-directory-layout><div class="border-b border-border p-4"><SectionHeader title={isZh ? '供应关系' : 'Supplier relationships'} description={isZh ? '结合联系人和目录依赖管理供应网络。' : 'Manage sourcing coverage through contacts and catalog dependency.'} /></div><div class="divide-y divide-border">{#each rows as row (String(row.id))}{@const sourcedProducts = products.filter((product) => product.supplierId === row.id)}<article class="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)_auto] lg:items-center"><div class="flex items-start gap-3"><span class="flex size-9 items-center justify-center rounded-md border border-border"><Truck class="size-4 text-muted-foreground" /></span><div><p class="text-sm font-semibold">{valueText(row, 'name')}</p><p class="mt-1 text-xs text-muted-foreground">{valueText(row, 'contactName')} · {valueText(row, 'email')}</p></div></div><div class="flex flex-wrap gap-2">{#each sourcedProducts as product (String(product.id))}<Badge variant="secondary">{valueText(product, 'name')}</Badge>{/each}</div><Badge variant="outline">{sourcedProducts.length} {isZh ? '种商品' : 'products'}</Badge></article>{/each}</div></section>
    {:else if domainResource === 'warehouses'}
      <section class="grid gap-4 md:grid-cols-3" data-warehouse-capacity-layout>{#each rows as row (String(row.id))}<article class="rounded-lg border border-border bg-card p-4"><div class="flex items-start justify-between"><div class="flex items-center gap-3"><Building2 class="size-5 text-muted-foreground" /><div><h2 class="text-sm font-semibold">{valueText(row, 'name')}</h2><p class="text-xs text-muted-foreground">{valueText(row, 'code')} · {valueText(row, 'location')}</p></div></div><Badge variant={valueNumber(row, 'utilization') > 80 ? 'destructive' : 'outline'}>{valueNumber(row, 'utilization')}%</Badge></div><div class="mt-5 h-2 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-primary" style:width={`${valueNumber(row, 'utilization')}%`}></div></div><div class="mt-3 flex justify-between text-xs text-muted-foreground"><span>{isZh ? '已用容量' : 'Used capacity'}</span><span>{Math.round(valueNumber(row, 'capacity') * valueNumber(row, 'utilization') / 100)} / {valueNumber(row, 'capacity')}</span></div></article>{/each}</section>
    {:else if domainResource === 'store_client_products'}
      <section class="grid gap-4 md:grid-cols-3" data-store-merchandising-layout>{#each rows as row (String(row.id))}<article class="rounded-lg border border-border bg-card p-4"><div class="flex aspect-[16/7] items-center justify-center rounded-md bg-muted"><PackageSearch class="size-7 text-muted-foreground" /></div><div class="mt-4 flex items-start justify-between gap-3"><div><h2 class="text-sm font-semibold">{valueText(row, 'name')}</h2><p class="mt-1 text-xs text-muted-foreground">{valueText(row, 'category')}</p></div><p class="font-semibold">{money(valueNumber(row, 'price'))}</p></div><div class="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs"><span>{valueNumber(row, 'rating')} / 5</span><Badge variant={valueNumber(row, 'stock') < 20 ? 'secondary' : 'outline'}>{valueNumber(row, 'stock')} {isZh ? '件可售' : 'available'}</Badge></div></article>{/each}</section>
    {:else if domainResource === 'store_client_orders'}
      <section class="rounded-lg border border-border bg-card" data-store-order-layout><div class="grid gap-px bg-border sm:grid-cols-3">{#each ['processing', 'shipped', 'delivered'] as status (status)}<div class="bg-card p-4"><p class="text-xs text-muted-foreground">{statusLabel(status)}</p><p class="mt-2 text-2xl font-semibold">{countBy('status', status)}</p></div>{/each}</div><div class="divide-y divide-border">{#each rows as row (String(row.id))}<article class="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"><div><p class="text-sm font-semibold">{valueText(row, 'orderNumber')}</p><p class="mt-1 text-xs text-muted-foreground">{valueText(row, 'orderDate')}</p></div><p class="font-semibold">{money(valueNumber(row, 'totalAmount'))}</p><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge></article>{/each}</div></section>
    {:else if domainResource === 'billing_plans'}
      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-billing-plan-layout>{#each rows as row (String(row.id))}<article class="rounded-lg border border-border bg-card p-5"><div class="flex items-center justify-between"><CreditCard class="size-5 text-muted-foreground" /><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge></div><h2 class="mt-5 text-lg font-semibold">{valueText(row, 'planName')}</h2><p class="mt-2 text-3xl font-semibold">{money(valueNumber(row, 'priceMonthly'))}<span class="text-sm font-normal text-muted-foreground">/{isZh ? '月' : 'mo'}</span></p><p class="mt-3 min-h-10 text-sm text-muted-foreground">{valueText(row, 'description')}</p><div class="mt-5 border-t border-border pt-3 text-sm"><span>{isZh ? '包含席位' : 'Included seats'}</span><span class="float-right font-semibold">{valueNumber(row, 'seatsIncluded')}</span></div></article>{/each}</section>
    {:else if domainResource === 'billing_invoices'}
      <section class="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_18rem]" data-billing-invoice-layout><div class="rounded-lg border border-border bg-card"><div class="border-b border-border p-4"><SectionHeader title={isZh ? '收款台账' : 'Collection ledger'} /></div><div class="divide-y divide-border">{#each rows as row (String(row.id))}<article class="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"><div><p class="font-mono text-sm font-semibold">{valueText(row, 'invoiceNumber')}</p><p class="mt-1 text-xs text-muted-foreground">{valueText(row, 'periodStart')} - {valueText(row, 'periodEnd')}</p></div><p class="font-semibold">{money(valueNumber(row, 'amount'))}</p><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge></article>{/each}</div></div><aside class="rounded-lg border border-border bg-card p-4"><SectionHeader title={isZh ? '收款状态' : 'Collection status'} /><div class="mt-4 space-y-4">{#each ['paid', 'pending', 'failed', 'refunded'] as status (status)}<div class="flex items-center justify-between"><span class="text-sm text-muted-foreground">{statusLabel(status)}</span><Badge variant="outline">{countBy('status', status)}</Badge></div>{/each}</div></aside></section>
    {:else if domainResource === 'billing_subscriptions'}
      <section class="rounded-lg border border-border bg-card" data-subscription-portfolio-layout><div class="border-b border-border p-4"><SectionHeader title={isZh ? '续费组合' : 'Renewal portfolio'} description={isZh ? '按套餐、周期和风险状态安排续费动作。' : 'Schedule renewal work by plan, cycle, and risk state.'} /></div><div class="divide-y divide-border">{#each rows as row (String(row.id))}<article class="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(10rem,0.6fr)_auto] lg:items-center"><div><p class="text-sm font-semibold">{valueText(row, 'subscriber')}</p><p class="mt-1 text-xs text-muted-foreground">{findName(plans, row.planId, 'planName')} · {valueText(row, 'billingCycle')}</p></div><div><p class="text-xs text-muted-foreground">{isZh ? '续费日期' : 'Renews on'}</p><p class="mt-1 text-sm">{valueText(row, 'renewsOn')}</p></div><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge></article>{/each}</div></section>
    {:else if domainResource === 'security_sessions'}
      <section class="rounded-lg border border-border bg-card" data-session-monitor-layout><div class="border-b border-border p-4"><SectionHeader title={isZh ? '会话活动' : 'Session activity'} description={isZh ? '按设备、地点和最近活动识别异常会话。' : 'Identify unusual sessions by device, location, and recency.'} /></div><div class="divide-y divide-border">{#each rows as row (String(row.id))}<article class="grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"><span class="flex size-9 items-center justify-center rounded-md border border-border"><Activity class="size-4 text-muted-foreground" /></span><div><p class="text-sm font-semibold">{valueText(row, 'device')}</p><p class="mt-1 font-mono text-xs text-muted-foreground">{valueText(row, 'ipAddress')} · {valueText(row, 'location')} · {valueText(row, 'lastActive')}</p></div><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge></article>{/each}</div></section>
    {:else if domainResource === 'security_devices'}
      <section class="grid gap-4 md:grid-cols-3" data-device-trust-layout>{#each rows as row (String(row.id))}<article class="rounded-lg border border-border bg-card p-4"><div class="flex items-center justify-between"><ShieldCheck class="size-5 text-muted-foreground" /><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge></div><h2 class="mt-4 text-sm font-semibold">{valueText(row, 'deviceName')}</h2><p class="mt-1 text-xs text-muted-foreground">{findName(users, row.ownerId)} · {valueText(row, 'platform')}</p><p class="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{isZh ? '登记时间' : 'Enrolled'}: {valueText(row, 'enrolledAt')}</p></article>{/each}</section>
    {:else if domainResource === 'security_allowed_ips'}
      <section class="rounded-lg border border-border bg-card" data-ip-policy-layout><div class="border-b border-border p-4"><SectionHeader title={isZh ? '网络访问规则' : 'Network access rules'} description={isZh ? '清晰区分允许网段与受限例外。' : 'Separate allowed ranges from restricted exceptions.'} /></div><div class="divide-y divide-border">{#each rows as row (String(row.id))}<article class="grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"><span class="flex size-9 items-center justify-center rounded-md border border-border"><KeyRound class="size-4 text-muted-foreground" /></span><div><p class="font-mono text-sm font-semibold">{valueText(row, 'cidr')}</p><p class="mt-1 text-xs text-muted-foreground">{valueText(row, 'label')} · {valueText(row, 'notes')}</p></div><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge></article>{/each}</div></section>
    {:else if domainResource === 'notifications'}
      <section class="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]" data-notification-center-layout><aside class="rounded-lg border border-border bg-card p-4"><SectionHeader title={isZh ? '处理队列' : 'Triage queue'} /><div class="mt-4 space-y-3">{#each ['critical', 'warning', 'info'] as severity (severity)}<div class="flex items-center justify-between"><span class="text-sm text-muted-foreground">{severity}</span><Badge variant="outline">{countBy('severity', severity)}</Badge></div>{/each}</div></aside><div class="rounded-lg border border-border bg-card"><div class="divide-y divide-border">{#each rows as row (String(row.id))}<article class="grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"><Bell class="size-4 text-muted-foreground" /><div><p class="text-sm font-semibold">{valueText(row, 'title')}</p><p class="mt-1 text-xs text-muted-foreground">{valueText(row, 'body')}</p></div><div class="flex items-center gap-2"><Badge variant={valueText(row, 'severity') === 'critical' ? 'destructive' : 'outline'}>{valueText(row, 'severity')}</Badge><Badge variant={row.read ? 'secondary' : 'default'}>{row.read ? (isZh ? '已读' : 'Read') : (isZh ? '未读' : 'Unread')}</Badge></div></article>{/each}</div></div></section>
    {:else if domainResource === 'project_planning'}
      <section class="grid gap-4 lg:grid-cols-3" data-project-plan-layout>{#each ['planned', 'in_progress', 'review'] as status (status)}<div class="rounded-lg border border-border bg-muted/15"><div class="flex items-center justify-between border-b border-border px-4 py-3"><h2 class="text-sm font-semibold">{statusLabel(status)}</h2><Badge variant="outline">{countBy('status', status)}</Badge></div><div class="space-y-3 p-3">{#each rows.filter((row) => valueText(row, 'status') === status) as row (String(row.id))}<article class="rounded-md border border-border bg-card p-3"><p class="text-sm font-semibold">{valueText(row, 'milestone')}</p><p class="mt-1 text-xs text-muted-foreground">{findName(users, row.ownerId)} · {valueText(row, 'dueDate')}</p><div class="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-primary" style:width={`${valueNumber(row, 'confidence')}%`}></div></div><p class="mt-1 text-right text-xs text-muted-foreground">{valueNumber(row, 'confidence')}%</p></article>{/each}</div></div>{/each}</section>
    {:else if domainResource === 'store_admin'}
      <section class="rounded-lg border border-border bg-card" data-store-admin-layout><div class="border-b border-border p-4"><SectionHeader title={isZh ? '后台模块交付' : 'Admin module delivery'} description={isZh ? '按负责人、目标日期和评审状态推进商城能力。' : 'Deliver store capabilities by owner, target date, and review state.'} /></div><div class="divide-y divide-border">{#each rows as row (String(row.id))}<article class="grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"><ServerCog class="size-5 text-muted-foreground" /><div><p class="text-sm font-semibold">{valueText(row, 'module')}</p><p class="mt-1 text-xs text-muted-foreground">{findName(users, row.ownerId)} · {valueText(row, 'targetDate')}</p></div><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge></article>{/each}</div></section>
    {:else if domainResource === 'store_services'}
      <section class="grid gap-4 md:grid-cols-3" data-store-service-layout>{#each rows as row (String(row.id))}<article class="rounded-lg border border-border bg-card p-4"><div class="flex items-center justify-between"><ServerCog class="size-5 text-muted-foreground" /><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge></div><h2 class="mt-4 text-sm font-semibold">{valueText(row, 'serviceName')}</h2><p class="mt-1 text-xs text-muted-foreground">{valueText(row, 'runtime')}</p><div class="mt-4 flex items-end justify-between border-t border-border pt-3"><span class="text-xs text-muted-foreground">{isZh ? '延迟预算' : 'Latency budget'}</span><span class="text-lg font-semibold">{valueNumber(row, 'latencyBudgetMs')} ms</span></div></article>{/each}</section>
    {:else if domainResource === 'ai_prompt'}
      <section class="grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)]" data-prompt-library-layout><aside class="rounded-lg border border-border bg-card p-4"><SectionHeader title={isZh ? '受众分布' : 'Audience mix'} /><div class="mt-4 space-y-3">{#each [...new Set(rows.map((row) => valueText(row, 'audience')))] as audience (audience)}<div class="flex items-center justify-between"><span class="text-sm text-muted-foreground">{audience}</span><Badge variant="outline">{countBy('audience', audience)}</Badge></div>{/each}</div></aside><div class="divide-y divide-border rounded-lg border border-border bg-card">{#each rows as row (String(row.id))}<article class="p-4"><div class="flex items-start justify-between gap-3"><div class="flex items-start gap-3"><Sparkles class="mt-0.5 size-4 text-muted-foreground" /><div><p class="text-sm font-semibold">{valueText(row, 'promptName')}</p><p class="mt-1 text-sm text-muted-foreground">{valueText(row, 'content')}</p></div></div><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge></div><p class="mt-3 text-xs text-muted-foreground">{valueText(row, 'audience')} · {valueNumber(row, 'usageCount')} {isZh ? '次使用' : 'uses'}</p></article>{/each}</div></section>
    {:else if domainResource === 'invoice_generator'}
      <section class="rounded-lg border border-border bg-card" data-invoice-generation-layout><div class="grid gap-px bg-border sm:grid-cols-3">{#each ['planned', 'in_progress', 'review'] as status (status)}<div class="bg-card p-4"><p class="text-xs text-muted-foreground">{statusLabel(status)}</p><p class="mt-2 text-2xl font-semibold">{countBy('status', status)}</p></div>{/each}</div><div class="divide-y divide-border">{#each rows as row (String(row.id))}<article class="grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"><FileClock class="size-5 text-muted-foreground" /><div><p class="text-sm font-semibold">{valueText(row, 'templateName')}</p><p class="mt-1 text-xs text-muted-foreground">{valueText(row, 'channel')} · {isZh ? '下次运行' : 'Next run'} {valueText(row, 'nextRunAt')}</p></div><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge></article>{/each}</div></section>
    {:else if domainResource === 'referral_invites'}
      <section class="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_18rem]" data-referral-invite-layout><div class="rounded-lg border border-border bg-card"><div class="border-b border-border p-4"><SectionHeader title={isZh ? '邀请转化' : 'Invitation conversion'} /></div><div class="divide-y divide-border">{#each rows as row (String(row.id))}<article class="grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"><Users class="size-5 text-muted-foreground" /><div><p class="text-sm font-semibold">{valueText(row, 'inviteeEmail')}</p><p class="mt-1 text-xs text-muted-foreground">{findName(users, row.inviterId)} · {valueText(row, 'sentAt')}</p></div><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge></article>{/each}</div></div><aside class="rounded-lg border border-border bg-card p-4"><SectionHeader title={isZh ? '邀请码' : 'Invite codes'} /><div class="mt-4 space-y-3">{#each rows as row (String(row.id))}<div class="rounded-md bg-muted px-3 py-2 font-mono text-xs">{valueText(row, 'code')}</div>{/each}</div></aside></section>
    {:else}
      <section class="rounded-lg border border-border bg-card" data-domain-work-queue><div class="border-b border-border p-4"><SectionHeader title={isZh ? '工作队列' : 'Work queue'} /></div><div class="divide-y divide-border">{#each rows as row (String(row.id))}<article class="grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"><Boxes class="size-5 text-muted-foreground" /><div><p class="text-sm font-semibold">{valueText(row, 'name') !== '—' ? valueText(row, 'name') : valueText(row, 'module')}</p><p class="mt-1 text-xs text-muted-foreground">{valueText(row, 'notes')}</p></div><Badge variant={badgeVariant(row.status)}>{statusLabel(row.status)}</Badge></article>{/each}</div></section>
    {/if}

    <section class="space-y-3" data-domain-table>
      <SectionHeader title={isZh ? '完整记录' : 'All records'} description={isZh ? '保留筛选、排序、新建、编辑、详情和删除流程。' : 'Keep filtering, sorting, create, edit, show, and delete workflows.'} />
      <AutoTable {resourceName} />
    </section>
  {/if}
</ContentPageShell>
