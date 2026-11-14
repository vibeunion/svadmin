export const dashboardTranslationsZh: Record<string, string> = {
  'dashboard.pageTitle': '运营工作台',
  'dashboard.pageDescription': '库存风险、订单与团队待办',
  'dashboard.status.unavailable': '部分数据不可用',
  'dashboard.status.updating': '更新中',
  'dashboard.status.synced': '已同步',
  'dashboard.error.title': '部分数据未能更新',
  'dashboard.error.description': '暂不可用的指标显示为 —，请重试后再作判断。',
  'dashboard.workspace.heading': '企业仪表盘工作区',
  'dashboard.workspace.description': '基于企业级快照数据源的动态汇总视图',
  'dashboard.workspace.title': '仪表盘工作区',
  'dashboard.metric.stockAtRisk': '库存风险',
  'dashboard.metric.outOfStock': '项缺货',
  'dashboard.metric.openWork': '未结事项',
  'dashboard.metric.workDetail': '待办、调拨与审批',
  'dashboard.metric.inventoryValue': '库存资产',
  'dashboard.metric.unitsInStock': '件库存',
  'dashboard.stat.totalAssetValue': '资产价值',
  'dashboard.stat.available': '可用商品',
  'dashboard.stat.stockUnits': '库存件数',
  'dashboard.stat.warehouses': '仓库',
  'dashboard.stat.suppliers': '供应商',
  'dashboard.stat.settings': '库存设置',
  'dashboard.order.purchaseOrders': '采购订单',
  'dashboard.order.salesOrders': '销售订单',
  'dashboard.order.openTodo': '待办未结',
  'dashboard.order.stockTransfers': '库存调拨',
  'dashboard.order.cycleCounts': '循环盘点',
  'dashboard.order.adjustments': '库存调整',
  'dashboard.order.reorderRules': '补货规则',
  'dashboard.module.userManagement': '用户管理',
  'dashboard.module.calendar': '日历',
  'dashboard.module.aiChat': 'AI 对话',
  'dashboard.module.notificationCenter': '通知中心',
  'dashboard.module.calendarMeta': '采购与盘点计划',
  'dashboard.module.aiChatMeta': '进行中的运营对话',
  'dashboard.module.notificationCenterMeta': '未读提醒',
  'dashboard.module.roles': '个角色',
  'dashboard.section.stockRisk': '库存风险清单',
  'dashboard.section.stockHealthy': '所有跟踪商品均高于库存下限。',
  'dashboard.section.onHandMin': '现有 / 下限',
  'dashboard.section.products': '商品档案',
  'dashboard.section.operationsQueue': '运营队列',
  'dashboard.section.inventoryPerformance': '库存绩效',
  'dashboard.section.bestSellers': '高频商品',
  'dashboard.section.fastMoving': '高频流转',
  'dashboard.section.deadStock': '呆滞库存',
  'dashboard.section.deadStockDesc': '周转滞缓',
  'dashboard.section.salesActivity': '销售动态',
  'dashboard.section.pending': '待处理',
  'dashboard.section.processing': '处理中',
  'dashboard.section.shipped': '已发货',
  'dashboard.section.recentOrders': '近期订单',
  'dashboard.section.noRecentOrders': '暂无近期订单。',
  'dashboard.section.scheduleCollaboration': '日程与协作',
  'dashboard.section.calendar': '日历',
  'dashboard.section.noEvents': '暂无计划日程。',
  'dashboard.section.aiOperations': 'AI 运营',
  'dashboard.section.noAI': '暂无 AI 对话。',
  'dashboard.section.notifications': '通知',
  'dashboard.section.noNotifications': '暂无通知。',
  'dashboard.section.stockMovementsExt': '库存流水与扩展',
  'dashboard.section.recentMovements': '近期库存流水',
  'dashboard.section.noMovements': '暂无库存流水。',
  'dashboard.section.viewAll': '查看全部',
  'dashboard.section.loadingDeclarativeSurface': '正在加载声明式 Surface',
  'dashboard.section.failedDeclarativeSurface': '声明式 Surface 加载失败',

  // Event types
  'dashboard.eventType.cycle_count': '盘点',
  'dashboard.eventType.receiving': '收货',
  'dashboard.eventType.purchase': '采购',

  // Event titles
  'dashboard.eventTitle.warehouse_cycle_count': '仓库循环盘点',
  'dashboard.eventTitle.supplier_delivery_window': '供应商到货窗口',
  'dashboard.eventTitle.monthly_purchase_review': '月度采购复盘',

  // Conversation titles
  'dashboard.conversationTitle.reorder_planning_assistant': '补货计划助手',
  'dashboard.conversationTitle.forecast_variance_review': '预测偏差复核',
  'dashboard.conversationTitle.receiving_exception_triage': '收货异常分诊',

  // Conversation statuses
  'dashboard.conversationStatus.open': '进行中',
  'dashboard.conversationStatus.waiting': '等待',
  'dashboard.conversationStatus.resolved': '已解决',

  // Notification titles
  'dashboard.notificationTitle.two_products_below_minimum_stock': '两个商品低于最低库存',
  'dashboard.notificationTitle.po_2026_002_delivery_scheduled': 'PO-2026-002 已安排到货',
  'dashboard.notificationTitle.new_analyst_invitation_pending': '新分析师邀请待完成',

  // Notification severities
  'dashboard.severity.critical': '紧急',
  'dashboard.severity.warning': '预警',
  'dashboard.severity.info': '信息',

  // Movement notes
  'dashboard.movementNote.initial_receiving': '初始入库',
  'dashboard.movementNote.sales_order_shipment': '销售订单出库',
  'dashboard.movementNote.supplier_delivery': '供应商到货',
  'dashboard.movementNote.packing_line_consumption': '包装线消耗',

  // Order status
  'dashboard.orderStatus.pending': '待处理',
  'dashboard.orderStatus.processing': '处理中',
  'dashboard.orderStatus.shipped': '已发货',
  'dashboard.orderStatus.cancelled': '已取消',
};

export const dashboardTranslationsEn: Record<string, string> = {
  'dashboard.pageTitle': 'Operations workspace',
  'dashboard.pageDescription': 'Inventory health, orders and team priorities',
  'dashboard.status.unavailable': 'Some data unavailable',
  'dashboard.status.updating': 'Updating',
  'dashboard.status.synced': 'Up to date',
  'dashboard.error.title': 'Some data could not be updated',
  'dashboard.error.description': 'Unavailable metrics show —. Retry before making a decision.',
  'dashboard.workspace.heading': 'Enterprise dashboard workspace',
  'dashboard.workspace.description': 'Dynamic consolidated overview powered by enterprise snapshot provider',
  'dashboard.workspace.title': 'Dashboard workspace',
  'dashboard.metric.stockAtRisk': 'Stock at risk',
  'dashboard.metric.outOfStock': 'out of stock',
  'dashboard.metric.openWork': 'Open work',
  'dashboard.metric.workDetail': 'Todos, transfers, approvals',
  'dashboard.metric.inventoryValue': 'Inventory value',
  'dashboard.metric.unitsInStock': 'units in stock',
  'dashboard.stat.totalAssetValue': 'Total Asset Value',
  'dashboard.stat.available': 'Available',
  'dashboard.stat.stockUnits': 'Stock Units',
  'dashboard.stat.warehouses': 'Warehouses',
  'dashboard.stat.suppliers': 'Suppliers',
  'dashboard.stat.settings': 'Settings',
  'dashboard.order.purchaseOrders': 'Purchase Orders',
  'dashboard.order.salesOrders': 'Sales Orders',
  'dashboard.order.openTodo': 'Open Todo',
  'dashboard.order.stockTransfers': 'Stock Transfers',
  'dashboard.order.cycleCounts': 'Cycle Counts',
  'dashboard.order.adjustments': 'Adjustments',
  'dashboard.order.reorderRules': 'Reorder Rules',
  'dashboard.module.userManagement': 'User Management',
  'dashboard.module.calendar': 'Calendar',
  'dashboard.module.aiChat': 'AI Chat',
  'dashboard.module.notificationCenter': 'Notification Center',
  'dashboard.module.calendarMeta': 'purchase and count planning',
  'dashboard.module.aiChatMeta': 'open operations threads',
  'dashboard.module.notificationCenterMeta': 'unread notices',
  'dashboard.module.roles': 'roles',
  'dashboard.section.stockRisk': 'Stock risk queue',
  'dashboard.section.stockHealthy': 'All tracked products are above threshold.',
  'dashboard.section.onHandMin': 'on hand / minimum',
  'dashboard.section.products': 'Products',
  'dashboard.section.operationsQueue': 'Operations Queue',
  'dashboard.section.inventoryPerformance': 'Inventory performance',
  'dashboard.section.bestSellers': 'Best sellers',
  'dashboard.section.fastMoving': 'Fast moving',
  'dashboard.section.deadStock': 'Dead Stock',
  'dashboard.section.deadStockDesc': 'Low turnover',
  'dashboard.section.salesActivity': 'Sales activity',
  'dashboard.section.pending': 'Pending',
  'dashboard.section.processing': 'Processing',
  'dashboard.section.shipped': 'Shipped',
  'dashboard.section.recentOrders': 'Recent Orders',
  'dashboard.section.noRecentOrders': 'No recent orders.',
  'dashboard.section.scheduleCollaboration': 'Schedule and collaboration',
  'dashboard.section.calendar': 'Calendar',
  'dashboard.section.noEvents': 'No scheduled events.',
  'dashboard.section.aiOperations': 'AI Operations',
  'dashboard.section.noAI': 'No AI threads yet.',
  'dashboard.section.notifications': 'Notifications',
  'dashboard.section.noNotifications': 'No notifications yet.',
  'dashboard.section.stockMovementsExt': 'Stock movements and extensions',
  'dashboard.section.recentMovements': 'Recent Stock Movements',
  'dashboard.section.noMovements': 'No movements recorded yet.',
  'dashboard.section.viewAll': 'View all',
  'dashboard.section.loadingDeclarativeSurface': 'Loading declarative Surface',
  'dashboard.section.failedDeclarativeSurface': 'Unable to load the declarative Surface',

  // Event types
  'dashboard.eventType.cycle_count': 'Cycle count',
  'dashboard.eventType.receiving': 'Receiving',
  'dashboard.eventType.purchase': 'Purchase',

  // Event titles
  'dashboard.eventTitle.warehouse_cycle_count': 'Warehouse cycle count',
  'dashboard.eventTitle.supplier_delivery_window': 'Supplier delivery window',
  'dashboard.eventTitle.monthly_purchase_review': 'Monthly purchase review',

  // Conversation titles
  'dashboard.conversationTitle.reorder_planning_assistant': 'Reorder planning assistant',
  'dashboard.conversationTitle.forecast_variance_review': 'Forecast variance review',
  'dashboard.conversationTitle.receiving_exception_triage': 'Receiving exception triage',

  // Conversation statuses
  'dashboard.conversationStatus.open': 'Open',
  'dashboard.conversationStatus.waiting': 'Waiting',
  'dashboard.conversationStatus.resolved': 'Resolved',

  // Notification titles
  'dashboard.notificationTitle.two_products_below_minimum_stock': 'Two products below minimum stock',
  'dashboard.notificationTitle.po_2026_002_delivery_scheduled': 'PO-2026-002 delivery scheduled',
  'dashboard.notificationTitle.new_analyst_invitation_pending': 'New analyst invitation pending',

  // Notification severities
  'dashboard.severity.critical': 'Critical',
  'dashboard.severity.warning': 'Warning',
  'dashboard.severity.info': 'Info',

  // Movement notes
  'dashboard.movementNote.initial_receiving': 'Initial receiving',
  'dashboard.movementNote.sales_order_shipment': 'Sales order shipment',
  'dashboard.movementNote.supplier_delivery': 'Supplier delivery',
  'dashboard.movementNote.packing_line_consumption': 'Packing line consumption',

  // Order status
  'dashboard.orderStatus.pending': 'Pending',
  'dashboard.orderStatus.processing': 'Processing',
  'dashboard.orderStatus.shipped': 'Shipped',
  'dashboard.orderStatus.cancelled': 'Cancelled',
};

let registered = false;

export function registerDashboardTranslations(
  addFn?: (locale: string, translations: Record<string, string>) => void,
): void {
  if (registered || !addFn) return;
  addFn('zh-CN', dashboardTranslationsZh);
  addFn('en', dashboardTranslationsEn);
  registered = true;
}
