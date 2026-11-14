import type { Component } from 'svelte';
import {
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  Mail,
  Package,
  ShoppingBag,
  Users,
} from '@lucide/svelte';
import { resolveApplicationLayout, type SpecializedApplicationLayout } from '../../applicationLayouts';

export interface PageCopy {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  tableLabel: string;
  tableDescription: string;
  highlightsLabel: string;
}

export interface PageConfig {
  icon: Component<{ class?: string }>;
  workspaceStyle: SpecializedApplicationLayout | 'people' | 'calendar' | 'crm' | 'property';
  en: PageCopy;
  zh: PageCopy;
  metrics: Array<{ label: string; value: string | number; hint?: string }>;
  lanes: Array<{ label: string; value: string | number; hint?: string }>;
  highlights: Array<{ title: string; description?: string; meta?: string; badge?: string }>;
}

export const fallbackConfig: PageConfig = {
  icon: ClipboardList,
  workspaceStyle: 'operations',
  en: {
    eyebrow: 'Operations',
    title: 'Workspace records',
    description: 'Review, edit, and maintain this example resource from a dense svadmin operations surface.',
    actionLabel: 'New record',
    tableLabel: 'Records',
    tableDescription: 'Editable data with list, create, update, and delete flows.',
    highlightsLabel: 'Focus queue',
  },
  zh: {
    eyebrow: '运营',
    title: '工作区记录',
    description: '在高密度的 svadmin 运营页面中查看、编辑和维护该示例资源。',
    actionLabel: '新建记录',
    tableLabel: '记录',
    tableDescription: '支持列表、新建、更新和删除的可编辑数据。',
    highlightsLabel: '重点队列',
  },
  metrics: [
    { label: 'Active', value: 12, hint: 'demo records' },
    { label: 'Queued', value: 4, hint: 'needs review' },
    { label: 'Health', value: '92%', hint: 'sample score' },
  ],
  lanes: [
    { label: 'Ready', value: 8, hint: 'available for action' },
    { label: 'Review', value: 3, hint: 'requires attention' },
    { label: 'Closed', value: 5, hint: 'recently completed' },
  ],
  highlights: [
    { title: 'Daily review', description: 'Check the highest priority records first.', meta: 'Updated today', badge: 'Live' },
  ],
};

export const appConfigs = {
  inventory: {
    ...fallbackConfig,
    icon: Package,
    workspaceStyle: 'inventory',
    en: {
      eyebrow: 'Inventory',
      title: 'Inventory control cockpit',
      description: 'Track catalog coverage, reorder exposure, warehouse capacity, and operational exceptions.',
      actionLabel: 'New inventory record',
      tableLabel: 'Inventory records',
      tableDescription: 'Editable inventory data connected to the local example provider.',
      highlightsLabel: 'Replenishment focus',
    },
    zh: {
      eyebrow: '库存',
      title: '库存控制工作台',
      description: '跟踪商品覆盖、补货风险、仓库容量和运营异常。',
      actionLabel: '新建库存记录',
      tableLabel: '库存记录',
      tableDescription: '连接本地示例数据源的可编辑库存数据。',
      highlightsLabel: '补货关注',
    },
    metrics: [
      { label: 'Catalog', value: 28, hint: 'managed items' },
      { label: 'Low stock', value: 2, hint: 'below threshold' },
      { label: 'Coverage', value: '91%', hint: 'healthy lanes' },
    ],
    lanes: [
      { label: 'Ready to ship', value: 18, hint: 'normal stock range' },
      { label: 'Needs reorder', value: 2, hint: 'below minimum stock' },
      { label: 'Pending setup', value: 4, hint: 'missing enrichment' },
    ],
    highlights: [
      { title: 'Ergonomic Chair', description: 'Below minimum stock in West Hub.', meta: '4 / 6 units', badge: 'Low' },
      { title: 'Packing Tape', description: 'Consumption is above the weekly baseline.', meta: '18 / 24 units', badge: 'Review' },
    ],
  },
  operations: {
    ...fallbackConfig,
    icon: ClipboardList,
    workspaceStyle: 'operations',
    en: {
      eyebrow: 'Operations',
      title: 'Operations execution board',
      description: 'Coordinate transfers, counts, adjustments, purchase work, and sales fulfillment from one view.',
      actionLabel: 'New operation',
      tableLabel: 'Operation records',
      tableDescription: 'Use the table for CRUD, audit preparation, and day-to-day operations checks.',
      highlightsLabel: 'Execution queue',
    },
    zh: {
      eyebrow: '运营',
      title: '运营执行看板',
      description: '集中协调调拨、盘点、调整、采购作业和销售履约。',
      actionLabel: '新建作业',
      tableLabel: '作业记录',
      tableDescription: '使用表格完成 CRUD、审计准备和日常运营检查。',
      highlightsLabel: '执行队列',
    },
    metrics: [
      { label: 'Open work', value: 14, hint: 'active tasks' },
      { label: 'Blocked', value: 1, hint: 'needs owner' },
      { label: 'SLA', value: '96%', hint: 'on-time work' },
    ],
    lanes: [
      { label: 'Draft', value: 3, hint: 'not yet released' },
      { label: 'In progress', value: 7, hint: 'currently owned' },
      { label: 'Completed', value: 16, hint: 'recent closure' },
    ],
    highlights: [
      { title: 'WH-MAIN cycle count', description: 'Count window starts today.', meta: 'Owner: Operations Analyst', badge: 'Today' },
      { title: 'Tape reorder rule', description: 'Target quantity needs review.', meta: 'Lead time: 5 days', badge: 'Policy' },
    ],
  },
  people: {
    ...fallbackConfig,
    icon: Users,
    workspaceStyle: 'people',
    en: {
      eyebrow: 'Organization',
      title: 'User and access workspace',
      description: 'Manage users, roles, permission views, ownership, and activity signals.',
      actionLabel: 'New member',
      tableLabel: 'People records',
      tableDescription: 'Operational people data for access and ownership examples.',
      highlightsLabel: 'Access focus',
    },
    zh: {
      eyebrow: '组织',
      title: '用户与权限工作区',
      description: '管理用户、角色、权限视图、负责人和活动信号。',
      actionLabel: '新建成员',
      tableLabel: '人员记录',
      tableDescription: '用于权限与负责人示例的运营人员数据。',
      highlightsLabel: '权限关注',
    },
    metrics: [
      { label: 'Members', value: 8, hint: 'active users' },
      { label: 'Roles', value: 4, hint: 'access groups' },
      { label: 'Invites', value: 2, hint: 'pending' },
    ],
    lanes: [
      { label: 'Active', value: 6, hint: 'signed in recently' },
      { label: 'Invited', value: 2, hint: 'waiting for setup' },
      { label: 'Suspended', value: 0, hint: 'no current holds' },
    ],
    highlights: [
      { title: 'Role review', description: 'Confirm operator access before next deployment.', meta: 'Due this week', badge: 'RBAC' },
    ],
  },
  calendar: {
    ...fallbackConfig,
    icon: CalendarDays,
    workspaceStyle: 'calendar',
    en: {
      eyebrow: 'Planning',
      title: 'Calendar planning board',
      description: 'Track events, meetings, reminders, schedules, and operational milestones.',
      actionLabel: 'New event',
      tableLabel: 'Calendar records',
      tableDescription: 'Timeline data for procurement, receiving, reviews, and recurring operations.',
      highlightsLabel: 'Upcoming schedule',
    },
    zh: {
      eyebrow: '计划',
      title: '日历计划看板',
      description: '跟踪活动、会议、提醒、排期和运营里程碑。',
      actionLabel: '新建日程',
      tableLabel: '日历记录',
      tableDescription: '采购、收货、复盘和周期作业的时间线数据。',
      highlightsLabel: '近期日程',
    },
    metrics: [
      { label: 'This week', value: 9, hint: 'planned items' },
      { label: 'Reviews', value: 3, hint: 'decision points' },
      { label: 'Done', value: 5, hint: 'completed' },
    ],
    lanes: [
      { label: 'Events', value: 4, hint: 'operational milestones' },
      { label: 'Meetings', value: 3, hint: 'cross-team reviews' },
      { label: 'Reminders', value: 6, hint: 'owner prompts' },
    ],
    highlights: [
      { title: 'Cycle count', description: 'Warehouse count scheduled for the next shift.', meta: 'Today', badge: 'Count' },
    ],
  },
  communications: {
    ...fallbackConfig,
    icon: Mail,
    workspaceStyle: 'communications',
    en: {
      eyebrow: 'Communications',
      title: 'Message operations center',
      description: 'Review inboxes, notifications, delivery signals, and follow-up communication queues.',
      actionLabel: 'New message',
      tableLabel: 'Message records',
      tableDescription: 'Example communication data for mail, alerts, and internal notifications.',
      highlightsLabel: 'Unread focus',
    },
    zh: {
      eyebrow: '通信',
      title: '消息运营中心',
      description: '查看收件箱、通知、投递信号和跟进沟通队列。',
      actionLabel: '新建消息',
      tableLabel: '消息记录',
      tableDescription: '邮件、警报和内部通知的示例通信数据。',
      highlightsLabel: '未读关注',
    },
    metrics: [
      { label: 'Unread', value: 5, hint: 'needs review' },
      { label: 'Drafts', value: 2, hint: 'not sent' },
      { label: 'Alerts', value: 3, hint: 'system events' },
    ],
    lanes: [
      { label: 'Inbox', value: 3, hint: 'incoming messages' },
      { label: 'Snoozed', value: 1, hint: 'scheduled follow-up' },
      { label: 'Sent', value: 2, hint: 'outbound notes' },
    ],
    highlights: [
      { title: 'Low stock review', description: 'Operations message waiting in the inbox.', meta: 'Unread', badge: 'Mail' },
    ],
  },
  crm: {
    ...fallbackConfig,
    icon: Briefcase,
    workspaceStyle: 'crm',
    en: {
      eyebrow: 'CRM',
      title: 'Customer revenue workspace',
      description: 'Coordinate accounts, contacts, opportunities, and customer activity follow-ups.',
      actionLabel: 'New CRM record',
      tableLabel: 'Customer records',
      tableDescription: 'Account and pipeline data built for a compact admin workflow.',
      highlightsLabel: 'Pipeline focus',
    },
    zh: {
      eyebrow: '客户经营',
      title: '客户收入工作区',
      description: '协同客户账户、联系人、收入机会和客户活动跟进。',
      actionLabel: '新建客户记录',
      tableLabel: '客户记录',
      tableDescription: '面向紧凑后台流程的账户与管线数据。',
      highlightsLabel: '管线关注',
    },
    metrics: [
      { label: 'Accounts', value: 6, hint: 'active portfolio' },
      { label: 'Pipeline', value: '$860K', hint: 'weighted value' },
      { label: 'At risk', value: 1, hint: 'watch list' },
    ],
    lanes: [
      { label: 'Discovery', value: 3, hint: 'new opportunities' },
      { label: 'Proposal', value: 2, hint: 'commercial review' },
      { label: 'Negotiation', value: 1, hint: 'late-stage' },
    ],
    highlights: [
      { title: 'Renewal account', description: 'Decision maker needs one more technical review.', meta: 'Close date: Jun 28', badge: 'Hot' },
    ],
  },
  property: {
    ...fallbackConfig,
    icon: Building2,
    workspaceStyle: 'property',
    en: {
      eyebrow: 'Property',
      title: 'Property operations workspace',
      description: 'Manage property portfolios, advisors, leads, tours, saved assets, and map-oriented work.',
      actionLabel: 'New property record',
      tableLabel: 'Property records',
      tableDescription: 'Real-estate style operations data represented through svadmin resources.',
      highlightsLabel: 'Tour focus',
    },
    zh: {
      eyebrow: '资产',
      title: '资产运营工作区',
      description: '管理资产组合、顾问、线索、看房、收藏资产和地图类作业。',
      actionLabel: '新建资产记录',
      tableLabel: '资产记录',
      tableDescription: '通过 svadmin 资源表达的资产运营数据。',
      highlightsLabel: '看房关注',
    },
    metrics: [
      { label: 'Assets', value: 12, hint: 'managed properties' },
      { label: 'Leads', value: 8, hint: 'active demand' },
      { label: 'Tours', value: 3, hint: 'scheduled' },
    ],
    lanes: [
      { label: 'Listed', value: 4, hint: 'market ready' },
      { label: 'Qualified', value: 5, hint: 'lead stage' },
      { label: 'Scheduled', value: 3, hint: 'upcoming tours' },
    ],
    highlights: [
      { title: 'Harbor Lofts tour', description: 'Prepare amenity and rent-roll details.', meta: 'Jun 14', badge: 'Tour' },
    ],
  },
  ai: {
    ...fallbackConfig,
    icon: Bot,
    workspaceStyle: 'ai',
    en: {
      eyebrow: 'AI',
      title: 'AI assistant workspace',
      description: 'Review assistant conversations, operational prompts, templates, and model routing examples.',
      actionLabel: 'New conversation',
      tableLabel: 'AI conversation records',
      tableDescription: 'Local assistant data powered by the example chat provider.',
      highlightsLabel: 'Prompt focus',
    },
    zh: {
      eyebrow: 'AI',
      title: 'AI 助手工作区',
      description: '查看助手对话、运营提示词、模板和模型路由示例。',
      actionLabel: '新建对话',
      tableLabel: 'AI 对话记录',
      tableDescription: '由本地示例聊天 provider 支持的助手数据。',
      highlightsLabel: '提示词关注',
    },
    metrics: [
      { label: 'Threads', value: 6, hint: 'active chats' },
      { label: 'Resolved', value: 4, hint: 'closed answers' },
      { label: 'Waiting', value: 2, hint: 'needs context' },
    ],
    lanes: [
      { label: 'Replenishment', value: 2, hint: 'inventory prompts' },
      { label: 'Forecast', value: 1, hint: 'planning prompts' },
      { label: 'Policy', value: 3, hint: 'knowledge prompts' },
    ],
    highlights: [
      { title: 'Reorder assistant', description: 'Use stock and purchase data for local guidance.', meta: 'Read-only demo', badge: 'AI' },
    ],
  },
  store: {
    ...fallbackConfig,
    icon: ShoppingBag,
    workspaceStyle: 'store',
    en: {
      eyebrow: 'Store',
      title: 'Storefront operations workspace',
      description: 'Manage catalog search, product details, cart signals, wishlist demand, checkout, and orders.',
      actionLabel: 'New store record',
      tableLabel: 'Store records',
      tableDescription: 'Commerce-oriented demo records for client-facing store flows.',
      highlightsLabel: 'Store focus',
    },
    zh: {
      eyebrow: '商城',
      title: '商城运营工作区',
      description: '管理商品搜索、详情、购物车信号、心愿需求、结账和订单。',
      actionLabel: '新建商城记录',
      tableLabel: '商城记录',
      tableDescription: '面向客户端商城流程的电商示例记录。',
      highlightsLabel: '商城关注',
    },
    metrics: [
      { label: 'Products', value: 3, hint: 'demo catalog' },
      { label: 'Orders', value: 3, hint: 'recent checkout' },
      { label: 'Rating', value: '4.6', hint: 'avg score' },
    ],
    lanes: [
      { label: 'Catalog', value: 3, hint: 'searchable items' },
      { label: 'Checkout', value: 2, hint: 'active orders' },
      { label: 'Delivered', value: 1, hint: 'completed order' },
    ],
    highlights: [
      { title: 'Field Laptop Bundle', description: 'Strongest demand in the demo catalog.', meta: '$1,499 · 4.8 rating', badge: 'Top' },
      { title: 'Ergonomic Work Kit', description: 'Workspace bundle with stable repeat demand.', meta: '$389 · 4.6 rating', badge: 'Popular' },
      { title: 'Packing Starter Pack', description: 'Fast-moving supply pack for new locations.', meta: '$42 · 72 in stock', badge: 'Stocked' },
    ],
  },
  orders: {
    ...fallbackConfig,
    icon: ClipboardList,
    workspaceStyle: 'orders',
    en: { eyebrow: 'Orders', title: 'Order fulfillment workspace', description: 'Review commercial demand, approvals, receiving, shipment state, and exceptions.', actionLabel: 'New order', tableLabel: 'Order records', tableDescription: 'Operational order data with customer or supplier context.', highlightsLabel: 'Fulfillment timeline' },
    zh: { eyebrow: '订单', title: '订单履约工作区', description: '查看业务需求、审批、到货、发货状态和异常。', actionLabel: '新建订单', tableLabel: '订单记录', tableDescription: '包含客户或供应商上下文的订单数据。', highlightsLabel: '履约时间线' },
    metrics: [{ label: 'Open', value: 4, hint: 'needs action' }, { label: 'In transit', value: 2, hint: 'moving now' }, { label: 'Value', value: '$18.4K', hint: 'active orders' }],
    lanes: [{ label: 'Draft', value: 2, hint: 'awaiting release' }, { label: 'Processing', value: 3, hint: 'owned work' }, { label: 'Completed', value: 8, hint: 'recent closure' }],
    highlights: [{ title: 'Approval', description: 'Commercial and budget checks completed.', meta: '09:10', badge: 'Done' }, { title: 'Fulfillment', description: 'Warehouse assignment and picking in progress.', meta: '11:30', badge: 'Active' }, { title: 'Delivery', description: 'Carrier handoff scheduled for the next window.', meta: 'Tomorrow', badge: 'Next' }],
  },
  planning: {
    ...fallbackConfig,
    icon: CalendarDays,
    workspaceStyle: 'planning',
    en: { eyebrow: 'Planning tools', title: 'Planning and generation workspace', description: 'Coordinate milestones, reusable AI prompts, and scheduled document generation.', actionLabel: 'New item', tableLabel: 'Planning records', tableDescription: 'Structured work items for repeatable planning and generation flows.', highlightsLabel: 'Active work' },
    zh: { eyebrow: '计划工具', title: '计划与生成工作区', description: '协调里程碑、可复用 AI 提示词和定时文档生成。', actionLabel: '新建事项', tableLabel: '计划记录', tableDescription: '用于重复计划与生成流程的结构化工作项。', highlightsLabel: '当前工作' },
    metrics: [{ label: 'On track', value: '82%', hint: 'delivery confidence' }, { label: 'In review', value: 3, hint: 'decision points' }, { label: 'Next run', value: 'Jun 18', hint: 'scheduled output' }],
    lanes: [{ label: 'Planned', value: 3, hint: 'ready to start' }, { label: 'In progress', value: 4, hint: 'actively owned' }, { label: 'Review', value: 2, hint: 'awaiting decision' }],
    highlights: [
      { title: 'Workspace launch checklist', description: 'Finalize navigation and sample-data coverage.', meta: 'Due Jun 21', badge: '82%' },
      { title: 'Mobile evidence pack', description: 'Collect compact route screenshots and smoke logs.', meta: 'Due Jun 24', badge: '76%' },
      { title: 'Release readiness review', description: 'Confirm approvals, changelog, and rollback notes.', meta: 'Due Jun 25', badge: 'Review' },
      { title: 'Navigation inventory', description: 'Map the remaining routes to their intended page families.', meta: 'Due Jun 18', badge: 'Ready' },
      { title: 'Prompt governance set', description: 'Review reusable prompts and owner metadata.', meta: 'Due Jun 22', badge: '64%' },
      { title: 'Acceptance summary', description: 'Publish route-level evidence and remaining follow-ups.', meta: 'Due Jun 26', badge: 'Draft' },
    ],
  },
  generation: {
    ...fallbackConfig,
    icon: FileText,
    workspaceStyle: 'generation',
    en: { eyebrow: 'Document operations', title: 'Invoice generation workspace', description: 'Prepare billable details, review calculated totals, and track generated document delivery.', actionLabel: 'Generate invoice', tableLabel: 'Generated invoices', tableDescription: 'Invoice drafts and generated documents connected to the example provider.', highlightsLabel: 'Generation inputs' },
    zh: { eyebrow: '文档运营', title: '发票生成工作区', description: '准备计费明细、复核计算合计并跟踪生成文档的投递状态。', actionLabel: '生成发票', tableLabel: '已生成发票', tableDescription: '连接示例数据源的发票草稿和已生成文档。', highlightsLabel: '生成输入' },
    metrics: [{ label: 'Draft invoices', value: 4, hint: 'needs completion' }, { label: 'Awaiting approval', value: 2, hint: 'finance review' }, { label: 'Ready to send', value: 7, hint: 'generated documents' }],
    lanes: [{ label: 'Input', value: 4, hint: 'customer and line items' }, { label: 'Preview', value: 2, hint: 'tax and total review' }, { label: 'Delivery', value: 7, hint: 'email or download' }],
    highlights: [{ title: 'Customer and line items', description: 'Confirm billing identity, currency, quantities, and rates.', badge: 'Required' }, { title: 'Tax and totals', description: 'Review discounts, tax treatment, and final amount.', badge: 'Review' }, { title: 'Delivery settings', description: 'Choose document format and delivery channel.', badge: 'Output' }],
  },
  billing: {
    ...fallbackConfig,
    icon: Briefcase,
    workspaceStyle: 'billing',
    en: { eyebrow: 'Billing', title: 'Plans and billing workspace', description: 'Compare plans, review invoice health, and manage subscription renewal risk.', actionLabel: 'Manage billing', tableLabel: 'Billing records', tableDescription: 'Plans, invoices, and subscriptions connected to the example provider.', highlightsLabel: 'Available plans' },
    zh: { eyebrow: '账单', title: '套餐与账单工作区', description: '比较套餐、查看账单健康度并管理订阅续费风险。', actionLabel: '管理账单', tableLabel: '账单记录', tableDescription: '连接示例数据源的套餐、账单和订阅记录。', highlightsLabel: '可用套餐' },
    metrics: [{ label: 'Monthly recurring', value: '$217', hint: 'active subscriptions' }, { label: 'Paid', value: 2, hint: 'current invoices' }, { label: 'At risk', value: 1, hint: 'payment follow-up' }],
    lanes: [{ label: 'Active', value: 2, hint: 'healthy renewals' }, { label: 'Trialing', value: 1, hint: 'decision due' }, { label: 'Past due', value: 1, hint: 'payment retry' }],
    highlights: [{ title: 'Starter', description: 'For small teams getting started.', meta: '$19 / month', badge: '3 seats' }, { title: 'Pro', description: 'Advanced operations and reporting.', meta: '$49 / month', badge: '10 seats' }, { title: 'Enterprise', description: 'SSO, audit logs, and dedicated support.', meta: '$149 / month', badge: '50 seats' }],
  },
  security: {
    ...fallbackConfig,
    icon: Building2,
    workspaceStyle: 'security',
    en: { eyebrow: 'Security operations', title: 'Session and device trust center', description: 'Review active sessions, enrolled devices, and network allowlist posture.', actionLabel: 'Add policy', tableLabel: 'Security records', tableDescription: 'Operational identity and network controls.', highlightsLabel: 'Items requiring attention' },
    zh: { eyebrow: '安全运营', title: '会话与设备信任中心', description: '查看活跃会话、已登记设备和网络白名单状态。', actionLabel: '新增策略', tableLabel: '安全记录', tableDescription: '身份和网络控制的运营记录。', highlightsLabel: '需要关注' },
    metrics: [{ label: 'Trust score', value: '92%', hint: 'healthy posture' }, { label: 'Active sessions', value: 2, hint: 'currently signed in' }, { label: 'Pending devices', value: 1, hint: 'needs approval' }],
    lanes: [{ label: 'Trusted', value: 4, hint: 'managed endpoints' }, { label: 'Idle', value: 1, hint: 'review session' }, { label: 'Restricted', value: 1, hint: 'limited network' }],
    highlights: [{ title: 'Unknown Android', description: 'New device enrollment is waiting for approval.', meta: 'Added Jun 10', badge: 'Pending' }, { title: 'Legacy printer IP', description: 'Restricted allowlist rule only permits business hours.', meta: '198.51.100.42', badge: 'Review' }],
  },
  referral: {
    ...fallbackConfig,
    icon: Users,
    workspaceStyle: 'referral',
    en: { eyebrow: 'Referrals', title: 'Invitation campaign workspace', description: 'Create referral links, track invite status, and understand activation outcomes.', actionLabel: 'Send invite', tableLabel: 'Referral invites', tableDescription: 'Invitation delivery and acceptance records.', highlightsLabel: 'Shareable invitation links' },
    zh: { eyebrow: '推荐邀请', title: '邀请活动工作区', description: '创建推荐链接、跟踪邀请状态并了解激活结果。', actionLabel: '发送邀请', tableLabel: '推荐邀请', tableDescription: '邀请投递和接受记录。', highlightsLabel: '可分享邀请链接' },
    metrics: [{ label: 'Sent', value: 3, hint: 'total invites' }, { label: 'Accepted', value: 1, hint: 'activated' }, { label: 'Conversion', value: '33%', hint: 'acceptance rate' }],
    lanes: [{ label: 'Sent', value: 1, hint: 'waiting' }, { label: 'Accepted', value: 1, hint: 'completed' }, { label: 'Expired', value: 1, hint: 'needs resend' }],
    highlights: [{ title: 'Operations referral', description: 'Invite operators into the shared workspace.', meta: 'OPS-2026-A', badge: 'Accepted' }, { title: 'Team referral', description: 'Reusable campaign link for internal teams.', meta: 'OPS-2026-B', badge: 'Active' }],
  },
} satisfies Record<string, PageConfig>;

export const resourceDescriptions: Record<string, { en: string; zh: string }> = {
  products: {
    en: 'Maintain product master data, pricing, stock thresholds, supplier links, and catalog readiness.',
    zh: '维护商品主数据、价格、库存阈值、供应商关联和目录完整度。',
  },
  skus: {
    en: 'Track SKU codes, variants, lifecycle status, and product-level operational details.',
    zh: '跟踪 SKU 编码、规格变体、生命周期状态和商品运营细节。',
  },
  categories: {
    en: 'Organize catalog categories and keep product grouping rules consistent.',
    zh: '管理目录品类，保持商品分组和分类规则一致。',
  },
  suppliers: {
    en: 'Manage supplier contacts, sourcing ownership, and replenishment communication.',
    zh: '管理供应商联系人、采购负责人和补货沟通信息。',
  },
  warehouses: {
    en: 'Maintain warehouse locations, capacity, utilization, and fulfillment coverage.',
    zh: '维护仓库位置、容量、利用率和履约覆盖信息。',
  },
  stock_movements: {
    en: 'Audit inbound, outbound, transfer, and adjustment movement records.',
    zh: '审计入库、出库、调拨和调整产生的库存流水。',
  },
  stock_transfers: {
    en: 'Coordinate warehouse-to-warehouse transfer requests, quantities, owners, and status.',
    zh: '协调仓库间调拨申请、数量、负责人和处理状态。',
  },
  cycle_counts: {
    en: 'Plan cycle count windows, owners, variance notes, and inventory accuracy checks.',
    zh: '安排循环盘点窗口、负责人、差异备注和库存准确性检查。',
  },
  inventory_adjustments: {
    en: 'Review manual stock corrections with reason codes, approvals, and audit notes.',
    zh: '复核人工库存修正、原因代码、审批状态和审计备注。',
  },
  reorder_rules: {
    en: 'Maintain reorder thresholds, target stock, safety stock, and lead-time policies.',
    zh: '维护补货阈值、目标库存、安全库存和提前期策略。',
  },
  purchase_orders: {
    en: 'Track purchase orders, suppliers, receiving windows, and procurement status.',
    zh: '跟踪采购订单、供应商、到货窗口和采购状态。',
  },
  sales_orders: {
    en: 'Review sales order fulfillment, customer demand, shipment status, and exceptions.',
    zh: '查看销售订单履约、客户需求、发货状态和异常。',
  },
  todos: {
    en: 'Manage operational tasks, priorities, due dates, and ownership.',
    zh: '管理运营待办、优先级、截止时间和负责人。',
  },
  users: {
    en: 'Manage demo users, identities, ownership, and operational activity.',
    zh: '管理演示用户、身份信息、负责人和运营活动。',
  },
  roles: {
    en: 'Maintain access roles, scopes, permission levels, and role descriptions.',
    zh: '维护访问角色、权限范围、权限等级和角色说明。',
  },
  calendar_events: {
    en: 'Plan events, receiving windows, reviews, reminders, and recurring operations.',
    zh: '安排事件、收货窗口、复盘、提醒和周期运营事项。',
  },
  ai_conversations: {
    en: 'Review AI assistant conversations, prompt status, and operational follow-up.',
    zh: '查看 AI 助手对话、提示词状态和运营跟进。',
  },
  ai_prompt: {
    en: 'Maintain reusable AI prompts, ownership, review state, and operational usage guidance.',
    zh: '维护可复用 AI 提示词、负责人、复核状态和运营使用说明。',
  },
  invoice_generator: {
    en: 'Generate invoice documents from customer, line-item, tax, and delivery inputs.',
    zh: '根据客户、明细、税费和投递设置生成发票文档。',
  },
  notifications: {
    en: 'Triage notification priority, read status, owners, and operational alerts.',
    zh: '分拣通知优先级、已读状态、负责人和运营提醒。',
  },
  crm_accounts: {
    en: 'Manage customer accounts, health signals, revenue ownership, and next steps.',
    zh: '管理客户账户、健康信号、收入负责人和下一步动作。',
  },
  crm_contacts: {
    en: 'Maintain customer contacts, roles, communication channels, and relationship notes.',
    zh: '维护客户联系人、角色、沟通渠道和关系备注。',
  },
  crm_deals: {
    en: 'Track revenue opportunities, stages, value, risk, and close plans.',
    zh: '跟踪收入机会、阶段、金额、风险和成交计划。',
  },
  crm_activities: {
    en: 'Review customer calls, meetings, emails, and follow-up activities.',
    zh: '查看客户电话、会议、邮件和跟进活动。',
  },
  properties: {
    en: 'Manage property portfolio details, locations, pricing, and availability.',
    zh: '管理资产组合详情、位置、价格和可用状态。',
  },
  property_agents: {
    en: 'Maintain advisor profiles, service areas, capacity, and assignments.',
    zh: '维护资产顾问资料、服务区域、容量和分配。',
  },
  property_leads: {
    en: 'Track buyer or renter demand, qualification status, budget, and follow-up.',
    zh: '跟踪买家或租客需求、资格状态、预算和跟进。',
  },
  property_showings: {
    en: 'Coordinate tour schedules, participants, property readiness, and outcomes.',
    zh: '协调看房排期、参与人、资产准备状态和结果。',
  },
  store_client_products: {
    en: 'Maintain storefront product cards, pricing, ratings, and availability.',
    zh: '维护商城商品卡片、价格、评分和可售状态。',
  },
  store_client_orders: {
    en: 'Review storefront orders, payment status, shipment progress, and totals.',
    zh: '查看商城订单、付款状态、发货进度和金额。',
  },
};

export { zhText } from './resource-page-zh-text.js';
import { zhText } from './resource-page-zh-text.js';

export function configFor(resource: string): PageConfig {
  const applicationLayout = resolveApplicationLayout(resource);
  if (applicationLayout !== 'default') return appConfigs[applicationLayout];
  if (['users', 'roles'].includes(resource)) return appConfigs['people'];
  if (resource === 'calendar_events') return appConfigs['calendar'];
  if (resource === 'ai_conversations') return appConfigs['ai'];
  if (resource.startsWith('mail_')) return appConfigs['communications'];
  if (resource.startsWith('crm_')) return appConfigs['crm'];
  if (resource.startsWith('property') || resource === 'properties') return appConfigs['property'];
  return fallbackConfig;
}

export function localizeText(value: string | undefined, locale: string): string | undefined {
  if (!value || locale !== 'zh-CN') return value;
  return zhText[value] ?? value;
}

export function resourceDescription(resourceKey: string, label: string, locale: string): string {
  const description = Object.entries(resourceDescriptions).find(([key]) => key === resourceKey)?.[1];
  if (description) return locale === 'zh-CN' ? description.zh : description.en;
  return locale === 'zh-CN'
    ? `管理${label}的列表、创建、编辑和详情流程。`
    : `Manage ${label} list, create, edit, and detail workflows.`;
}

export function viewOverride(resourceKey: string, view: string, locale: string) {
  type ViewOverrideCopy = {
    zh: readonly [string, string, string, string];
    en: readonly [string, string, string, string];
  };
  const overrides: Record<string, Record<string, ViewOverrideCopy>> = {
    sales_orders: {
      customers: {
        zh: ['客户订单视图', '从客户需求、销售订单、发货状态和异常提醒切入库存客户管理。', '新建客户订单', '以客户维度查看销售订单，适合从库存中心的客户入口进入。'],
        en: ['Customer Order View', 'Manage inventory customers through demand, sales orders, shipment state, and exceptions.', 'New customer order', 'Review sales orders by customer context from the inventory customer entry.'],
      },
    },
    reorder_rules: {
      settings: {
        zh: ['库存设置', '集中查看补货策略、安全库存、提前期和自动化阈值。', '新建库存策略', '以设置视角维护补货规则，覆盖阈值、提前期和策略说明。'],
        en: ['Inventory Settings', 'Review replenishment policies, safety stock, lead time, and automation thresholds.', 'New inventory policy', 'Maintain reorder rules as inventory settings with thresholds, lead times, and policy notes.'],
      },
    },
    notifications: {
      direct: {
        zh: ['直接消息', '聚合团队即时沟通、点对点提醒和需要当天回复的消息。', '新建直接消息', '从直接消息入口查看通知中心记录，保留排序、筛选和处理动作。'],
        en: ['Direct Messages', 'Collect team conversations, one-to-one alerts, and same-day replies.', 'New direct message', 'Review notification-center records from the direct message entry with full table actions.'],
      },
      support: {
        zh: ['支持请求', '把客户与内部支持请求放入同一个响应队列。', '新建支持请求', '按支持场景查看通知记录、优先级和后续动作。'],
        en: ['Support Requests', 'Place customer and internal support requests into one response queue.', 'New support request', 'Review notification records by support context, priority, and next action.'],
      },
      feedback: {
        zh: ['反馈收集', '跟踪体验建议、回访结果和需要产品/运营处理的反馈。', '新建反馈', '从反馈入口查看通知记录，并把体验建议转为可执行事项。'],
        en: ['Feedback Inbox', 'Track experience notes, follow-up results, and product or operations feedback.', 'New feedback', 'Review notification records from feedback context and turn notes into action.'],
      },
    },
  } as const;
  const resourceOverrides = Object.entries(overrides).find(([key]) => key === resourceKey)?.[1];
  const override = resourceOverrides ? Object.entries(resourceOverrides).find(([key]) => key === view)?.[1] : undefined;
  if (!override) return undefined;
  const [title, description, actionLabel, tableDescription] = locale === 'zh-CN' ? override.zh : override.en;
  return { title, description, actionLabel, tableDescription };
}
