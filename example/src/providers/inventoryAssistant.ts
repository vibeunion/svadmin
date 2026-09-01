import type { BaseRecord, ChatMessage, ChatProvider, DataProvider, ResourceDefinition } from '@svadmin/core';
import { messageText } from '@svadmin/ai-elements';
import { createMCPServer } from '@svadmin/mcp';

type InventoryResource =
  | 'products'
  | 'purchase_orders'
  | 'calendar_events'
  | 'notifications'
  | 'todos'
  | 'ai_conversations'
  | 'stock_transfers'
  | 'cycle_counts'
  | 'inventory_adjustments'
  | 'reorder_rules';

interface ListPayload {
  data?: BaseRecord[];
  total?: number;
}

interface McpContent {
  type?: string;
  text?: string;
}

interface McpToolResult {
  content?: McpContent[];
}

const assistantResources: InventoryResource[] = [
  'products',
  'purchase_orders',
  'calendar_events',
  'notifications',
  'todos',
  'ai_conversations',
  'stock_transfers',
  'cycle_counts',
  'inventory_adjustments',
  'reorder_rules',
];

const helpText = [
  'I can help with inventory operations using the local demo data.',
  '',
  'Try asking:',
  '- Which products are below minimum stock?',
  '- What should we reorder next?',
  '- What is on the calendar this week?',
  '- Which notifications need attention?',
  '- What Todo items are still open?',
  '- What stock transfers are in progress?',
  '- Are there any pending cycle counts?',
  '- What inventory adjustments were made?',
  '- What reorder rules are active?',
].join('\n');

function latestUserMessage(messages: ChatMessage[]): string {
  const latest = [...messages].reverse().find((message) => message.role === 'user');
  return latest ? messageText(latest) : '';
}

function hasAny(text: string, terms: string[]): boolean {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function recordNumber(record: BaseRecord, key: string): number {
  const value = record[key];
  return typeof value === 'number' ? value : Number(value) || 0;
}

function recordString(record: BaseRecord, key: string): string {
  const value = record[key];
  return value === null || value === undefined ? '' : String(value);
}

function parseListPayload(result: unknown): ListPayload {
  const response = result as { result?: McpToolResult };
  const text = response.result?.content?.find((item) => item.type === 'text')?.text;
  if (!text) return { data: [], total: 0 };
  const parsed = JSON.parse(text) as ListPayload;
  return {
    data: Array.isArray(parsed.data) ? parsed.data : [],
    total: typeof parsed.total === 'number' ? parsed.total : Array.isArray(parsed.data) ? parsed.data.length : 0,
  };
}

function formatBullets(items: string[]): string {
  if (!items.length) return '- No matching records found.';
  return items.map((item) => `- ${item}`).join('\n');
}

export function createInventoryChatProvider(
  dataProvider: DataProvider,
  resourceDefinitions: ResourceDefinition[],
): ChatProvider {
  const server = createMCPServer({
    dataProvider,
    resources: assistantResources,
    resourceDefinitions,
    name: 'svadmin-inventory-assistant',
    version: '0.1.0',
    readOnly: true,
  });

  async function getList(resource: InventoryResource): Promise<BaseRecord[]> {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: `${resource}-${Date.now()}`,
      method: 'tools/call',
      params: {
        name: 'svadmin_getList',
        arguments: {
          resource,
          page: 1,
          pageSize: 100,
        },
      },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return parseListPayload(response).data ?? [];
  }

  async function buildInventorySnapshot() {
    const [
      products,
      purchaseOrders,
      calendarEvents,
      notifications,
      todos,
      conversations,
      transfers,
      cycleCounts,
      adjustments,
      reorderRules,
    ] = await Promise.all([
      getList('products'),
      getList('purchase_orders'),
      getList('calendar_events'),
      getList('notifications'),
      getList('todos'),
      getList('ai_conversations'),
      getList('stock_transfers'),
      getList('cycle_counts'),
      getList('inventory_adjustments'),
      getList('reorder_rules'),
    ]);

    const lowStockProducts = products.filter((product) => recordNumber(product, 'stock') <= recordNumber(product, 'minStock'));
    const openTodos = todos.filter((todo) => recordString(todo, 'status') !== 'done' && !todo.completed);
    const unreadNotifications = notifications.filter((notification) => !notification.read);
    const activeConversations = conversations.filter((conversation) => recordString(conversation, 'status') !== 'resolved');
    const openPurchaseOrders = purchaseOrders.filter((order) => !['received', 'cancelled'].includes(recordString(order, 'status')));
    const activeTransfers = transfers.filter((transfer) => !['received', 'cancelled'].includes(recordString(transfer, 'status')));
    const activeCycleCounts = cycleCounts.filter((count) => !['reconciled', 'cancelled'].includes(recordString(count, 'status')));
    const pendingAdjustments = adjustments.filter((adjustment) => recordString(adjustment, 'status') === 'pending_approval');
    const reorderRulesInReview = reorderRules.filter((rule) => recordString(rule, 'status') === 'review');
    const upcomingEvents = [...calendarEvents].sort((left, right) =>
      recordString(left, 'startDate').localeCompare(recordString(right, 'startDate')),
    );

    return {
      products,
      purchaseOrders,
      calendarEvents,
      notifications,
      todos,
      conversations,
      transfers,
      cycleCounts,
      adjustments,
      reorderRules,
      lowStockProducts,
      openTodos,
      unreadNotifications,
      activeConversations,
      openPurchaseOrders,
      activeTransfers,
      activeCycleCounts,
      pendingAdjustments,
      reorderRulesInReview,
      upcomingEvents,
    };
  }

  async function answerInventoryQuestion(question: string): Promise<string> {
    const snapshot = await buildInventorySnapshot();
    const normalized = question.toLowerCase();

    if (hasAny(normalized, ['help', 'what can you', 'what do you'])) {
      return helpText;
    }

    if (hasAny(normalized, ['reorder rule', 'reorder rules', 'reorder threshold', 'target stock', 'lead time', '补货规则'])) {
      return [
        `Reorder rules under review: ${snapshot.reorderRulesInReview.length}`,
        formatBullets(snapshot.reorderRules.map((rule) =>
          `Product #${recordNumber(rule, 'productId')} at warehouse #${recordNumber(rule, 'warehouseId')}: min ${recordNumber(rule, 'minStock')}, target ${recordNumber(rule, 'targetStock')}, reorder ${recordNumber(rule, 'reorderQuantity')}, ${recordNumber(rule, 'leadTimeDays')} day lead time, status ${recordString(rule, 'status')}.`,
        )),
      ].join('\n\n');
    }

    if (hasAny(normalized, ['low stock', 'below', 'minimum', 'reorder', 'replenish', '补货', '低库存'])) {
      const lines = snapshot.lowStockProducts.map((product) => {
        const stock = recordNumber(product, 'stock');
        const minStock = recordNumber(product, 'minStock');
        const suggested = Math.max(minStock * 2 - stock, minStock - stock);
        return `${recordString(product, 'name')} (${recordString(product, 'sku')}): ${stock}/${minStock} on hand, suggest ordering ${suggested} units.`;
      });

      return [
        'Read-only MCP inventory check complete.',
        '',
        `Low-stock products: ${snapshot.lowStockProducts.length}`,
        formatBullets(lines),
        '',
        `Open purchase orders to consider: ${snapshot.openPurchaseOrders.length}`,
        formatBullets(snapshot.openPurchaseOrders.map((order) =>
          `${recordString(order, 'orderNumber')} is ${recordString(order, 'status')} for $${recordNumber(order, 'totalAmount')}.`,
        )),
      ].join('\n');
    }

    if (hasAny(normalized, ['cycle count', 'cycle counts', 'count plan', 'counting', '盘点'])) {
      return [
        `Active cycle counts: ${snapshot.activeCycleCounts.length}`,
        formatBullets(snapshot.cycleCounts.map((count) =>
          `${recordString(count, 'countNumber')} covers ${recordString(count, 'scope')} on ${recordString(count, 'scheduledDate')} (${recordString(count, 'status')}, variance ${recordNumber(count, 'varianceItems')}).`,
        )),
      ].join('\n\n');
    }

    if (hasAny(normalized, ['calendar', 'schedule', 'receiving', '采购'])) {
      return [
        'Upcoming inventory calendar:',
        formatBullets(snapshot.upcomingEvents.map((event) =>
          `${recordString(event, 'startDate')}: ${recordString(event, 'title')} (${recordString(event, 'type')}, ${recordString(event, 'status')}).`,
        )),
      ].join('\n\n');
    }

    if (hasAny(normalized, ['notification', 'alert', 'unread', 'notice', '通知', '告警'])) {
      return [
        `Unread notifications: ${snapshot.unreadNotifications.length}`,
        formatBullets(snapshot.unreadNotifications.map((notification) =>
          `${recordString(notification, 'severity').toUpperCase()}: ${recordString(notification, 'title')} (${recordString(notification, 'channel')}).`,
        )),
      ].join('\n\n');
    }

    if (hasAny(normalized, ['todo', 'task', 'open item', '待办'])) {
      return [
        `Open Todo items: ${snapshot.openTodos.length}`,
        formatBullets(snapshot.openTodos.map((todo) =>
          `${recordString(todo, 'title')} - ${recordString(todo, 'priority') || 'normal'} priority, due ${recordString(todo, 'dueDate') || 'not set'}.`,
        )),
      ].join('\n\n');
    }

    if (hasAny(normalized, ['conversation', 'ai chat', 'assistant', 'thread', '会话'])) {
      return [
        `Active AI operation threads: ${snapshot.activeConversations.length}`,
        formatBullets(snapshot.activeConversations.map((conversation) =>
          `${recordString(conversation, 'title')} (${recordString(conversation, 'intent')}): ${recordString(conversation, 'lastMessage')}`,
        )),
      ].join('\n\n');
    }

    if (hasAny(normalized, ['transfer', 'stock transfer', 'in transit', '调拨'])) {
      return [
        `Active stock transfers: ${snapshot.activeTransfers.length}`,
        formatBullets(snapshot.activeTransfers.map((transfer) =>
          `${recordString(transfer, 'transferNumber')}: product #${recordNumber(transfer, 'productId')} (${recordNumber(transfer, 'quantity')} units) from warehouse #${recordNumber(transfer, 'fromWarehouseId')} to warehouse #${recordNumber(transfer, 'toWarehouseId')} is ${recordString(transfer, 'status')}, expected ${recordString(transfer, 'expectedDate') || 'not set'}.`,
        )),
      ].join('\n\n');
    }

    if (hasAny(normalized, ['adjustment', 'adjustments', 'adjust', 'variance', 'approval', '调整', '差异'])) {
      return [
        `Pending inventory adjustments: ${snapshot.pendingAdjustments.length}`,
        formatBullets(snapshot.adjustments.map((adjustment) =>
          `${recordString(adjustment, 'adjustmentNumber')} changes product #${recordNumber(adjustment, 'productId')} at warehouse #${recordNumber(adjustment, 'warehouseId')} by ${recordNumber(adjustment, 'quantityChange')} units for ${recordString(adjustment, 'reason')} (${recordString(adjustment, 'status')}).`,
        )),
      ].join('\n\n');
    }

    if (hasAny(normalized, ['summary', 'dashboard', 'status', 'overview', '情况', '概览'])) {
      const totalStock = snapshot.products.reduce((sum, product) => sum + recordNumber(product, 'stock'), 0);
      return [
        'Inventory operations summary:',
        formatBullets([
          `${snapshot.products.length} products tracked with ${totalStock} total units on hand.`,
          `${snapshot.lowStockProducts.length} products are below minimum stock.`,
          `${snapshot.openTodos.length} Todo items remain open.`,
          `${snapshot.upcomingEvents.length} calendar events are scheduled.`,
          `${snapshot.unreadNotifications.length} notifications are unread.`,
          `${snapshot.activeConversations.length} AI operation threads are active.`,
          `${snapshot.activeTransfers.length} stock transfers are active.`,
          `${snapshot.activeCycleCounts.length} cycle counts are active.`,
          `${snapshot.pendingAdjustments.length} inventory adjustments need approval.`,
          `${snapshot.reorderRulesInReview.length} reorder rules are under review.`,
        ]),
      ].join('\n\n');
    }

    return [
      "I checked the local MCP-style inventory tools, but I need a more specific operations question.",
      '',
      helpText,
    ].join('\n');
  }

  return {
    async sendMessage(messages) {
      return answerInventoryQuestion(latestUserMessage(messages));
    },
  };
}
