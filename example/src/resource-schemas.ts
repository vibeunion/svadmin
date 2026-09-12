import { Type, type Static } from '@sinclair/typebox';

const id = Type.Number();
const text = Type.String();
const number = Type.Number();
const boolean = Type.Boolean();
const nullableNumber = Type.Union([number, Type.Null()]);
const receivedMail = Type.Object({
  id, sender: text, subject: text, body: text, date: text, unread: boolean,
}, { additionalProperties: false });

// Demo records, stored data, and page types share these closed schemas.
export const demoSchemas = {
  case_workspace: Type.Object({ id }, { additionalProperties: false }),
  categories: Type.Object({ id, name: text, code: text, description: text }, { additionalProperties: false }),
  suppliers: Type.Object({ id, name: text, contactName: text, email: text, phone: text, address: text }, { additionalProperties: false }),
  warehouses: Type.Object({ id, name: text, code: text, location: text, capacity: number, utilization: number }, { additionalProperties: false }),
  products: Type.Object({ id, name: text, sku: text, categoryId: number, supplierId: number, price: number, stock: number, minStock: number, description: text }, { additionalProperties: false }),
  skus: Type.Object({ id, sku: text, productId: number, barcode: text, variant: text, status: text }, { additionalProperties: false }),
  stock_movements: Type.Object({ id, productId: number, warehouseId: number, quantity: number, type: text, note: text, date: text }, { additionalProperties: false }),
  purchase_orders: Type.Object({ id, orderNumber: text, supplierId: number, status: text, totalAmount: number, orderDate: text, deliveryDate: text }, { additionalProperties: false }),
  sales_orders: Type.Object({ id, orderNumber: text, customerName: text, status: text, totalAmount: number, orderDate: text, shippingDate: text }, { additionalProperties: false }),
  todos: Type.Object({ id, title: text, assigneeId: number, dueDate: text, priority: text, status: text, completed: boolean, notes: text }, { additionalProperties: false }),
  roles: Type.Object({ id, name: text, slug: text, scope: text, level: text, description: text }, { additionalProperties: false }),
  users: Type.Object({ id, name: text, email: text, roleId: number, status: text, department: text, lastActiveAt: text }, { additionalProperties: false }),
  permissions: Type.Object({ id, module: text, action: text, roleId: number, effect: text, updatedAt: text, notes: text }, { additionalProperties: false }),
  user_accounts: Type.Object({ id, userId: number, accountType: text, status: text, lastSignInAt: text, notes: text }, { additionalProperties: false }),
  user_logs: Type.Object({ id, userId: number, event: text, ipAddress: text, severity: text, createdAt: text, details: text }, { additionalProperties: false }),
  user_settings: Type.Object({ id, setting: text, scope: text, status: text, ownerId: number, updatedAt: text }, { additionalProperties: false }),
  calendar_events: Type.Object({ id, title: text, type: text, startDate: text, endDate: text, ownerId: number, warehouseId: number, status: text, notes: text }, { additionalProperties: false }),
  ai_conversations: Type.Object({ id, title: text, intent: text, ownerId: number, status: text, lastMessage: text, updatedAt: text }, { additionalProperties: false }),
  notifications: Type.Object({ id, title: text, channel: text, severity: text, recipientId: number, read: boolean, createdAt: text, body: text }, { additionalProperties: false }),
  stock_transfers: Type.Object({ id, transferNumber: text, productId: number, fromWarehouseId: number, toWarehouseId: number, quantity: number, status: text, requestedById: number, requestedDate: text, expectedDate: text, notes: text }, { additionalProperties: false }),
  cycle_counts: Type.Object({ id, countNumber: text, warehouseId: number, ownerId: number, scheduledDate: text, status: text, scope: text, expectedItems: number, countedItems: number, varianceItems: number, notes: text }, { additionalProperties: false }),
  inventory_adjustments: Type.Object({ id, adjustmentNumber: text, productId: number, warehouseId: number, quantityChange: number, reason: text, status: text, requestedById: number, approvedById: nullableNumber, requestedDate: text, notes: text }, { additionalProperties: false }),
  reorder_rules: Type.Object({ id, productId: number, warehouseId: number, minStock: number, targetStock: number, reorderQuantity: number, supplierId: number, leadTimeDays: number, status: text, lastReviewedAt: text, notes: text }, { additionalProperties: false }),
  crm_accounts: Type.Object({ id, accountName: text, segment: text, ownerId: number, health: text, annualValue: number, nextReview: text, notes: text }, { additionalProperties: false }),
  crm_contacts: Type.Object({ id, fullName: text, accountId: number, email: text, phone: text, roleTitle: text, influence: text, status: text, lastTouchDate: text, notes: text }, { additionalProperties: false }),
  crm_deals: Type.Object({ id, dealName: text, accountId: number, contactId: number, ownerId: number, stage: text, amount: number, probability: number, closeDate: text, nextStep: text }, { additionalProperties: false }),
  crm_activities: Type.Object({ id, subject: text, accountId: number, contactId: number, dealId: number, ownerId: number, type: text, status: text, dueDate: text, outcome: text }, { additionalProperties: false }),
  property_agents: Type.Object({ id, name: text, email: text, phone: text, territory: text, status: text, capacityScore: number, notes: text }, { additionalProperties: false }),
  properties: Type.Object({ id, propertyName: text, market: text, assetType: text, status: text, managerId: number, units: number, occupancy: number, askingPrice: number, notes: text }, { additionalProperties: false }),
  property_leads: Type.Object({ id, leadName: text, propertyId: number, agentId: number, source: text, budget: number, status: text, targetMoveDate: text, notes: text }, { additionalProperties: false }),
  property_showings: Type.Object({ id, showingNumber: text, propertyId: number, leadId: number, agentId: number, scheduledDate: text, status: text, feedbackScore: nullableNumber, notes: text }, { additionalProperties: false }),
  mail_inbox: receivedMail,
  mail_draft: Type.Object({ id, to: text, subject: text, body: text, updatedAt: text }, { additionalProperties: false }),
  mail_sent: Type.Object({ id, to: text, subject: text, body: text, sentAt: text }, { additionalProperties: false }),
  mail_archive: receivedMail,
  mail_snoozed: receivedMail,
  mail_spam: receivedMail,
  mail_trash: receivedMail,
  store_client_products: Type.Object({ id, name: text, price: number, category: text, rating: number, stock: number }, { additionalProperties: false }),
  store_client_orders: Type.Object({ id, orderNumber: text, totalAmount: number, status: text, orderDate: text }, { additionalProperties: false }),
  project_planning: Type.Object({ id, milestone: text, ownerId: number, dueDate: text, status: text, confidence: number, notes: text }, { additionalProperties: false }),
  store_admin: Type.Object({ id, module: text, ownerId: number, status: text, targetDate: text, notes: text }, { additionalProperties: false }),
  store_services: Type.Object({ id, serviceName: text, runtime: text, status: text, latencyBudgetMs: number, notes: text }, { additionalProperties: false }),
  ai_prompt: Type.Object({ id, promptName: text, audience: text, status: text, usageCount: number, content: text }, { additionalProperties: false }),
  invoice_generator: Type.Object({ id, templateName: text, channel: text, status: text, nextRunAt: text, notes: text }, { additionalProperties: false }),
  billing_plans: Type.Object({ id, planName: text, tier: text, priceMonthly: number, seatsIncluded: number, status: text, description: text }, { additionalProperties: false }),
  billing_invoices: Type.Object({ id, invoiceNumber: text, amount: number, status: text, issuedDate: text, periodStart: text, periodEnd: text }, { additionalProperties: false }),
  billing_subscriptions: Type.Object({ id, subscriber: text, planId: number, billingCycle: text, status: text, renewsOn: text, notes: text }, { additionalProperties: false }),
  security_sessions: Type.Object({ id, device: text, ipAddress: text, location: text, lastActive: text, status: text, current: boolean }, { additionalProperties: false }),
  security_devices: Type.Object({ id, deviceName: text, ownerId: number, platform: text, status: text, enrolledAt: text, notes: text }, { additionalProperties: false }),
  security_allowed_ips: Type.Object({ id, cidr: text, label: text, status: text, addedAt: text, notes: text }, { additionalProperties: false }),
  referral_invites: Type.Object({ id, inviteeEmail: text, inviterId: number, code: text, status: text, sentAt: text, acceptedAt: text }, { additionalProperties: false }),
};

export type DemoResource = keyof typeof demoSchemas;
export type DemoRow<R extends DemoResource> = Static<typeof demoSchemas[R]>;
export type DemoDatabase = { [R in DemoResource]: DemoRow<R>[] };

export function isDemoResource(name: string): name is DemoResource {
  return Object.hasOwn(demoSchemas, name);
}
