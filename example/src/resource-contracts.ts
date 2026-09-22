import { defineResource, type ResourceContract } from '@svadmin/core/resource-contract';
import { Type, type TObject } from '@sinclair/typebox';
import { demoSchemas as schemas, isDemoResource, type DemoResource } from './resource-schemas';

/** 演示资源从表记录派生 create/update，否则 AutoForm 无法渲染。 */
function writable<T extends TObject>(record: T) {
  const create = Type.Omit(record, ['id']);
  return { record, create, update: Type.Partial(create) };
}

export const demoContracts = {
  case_workspace: defineResource('case_workspace', writable(schemas.case_workspace)),
  categories: defineResource('categories', writable(schemas.categories)),
  suppliers: defineResource('suppliers', writable(schemas.suppliers)),
  warehouses: defineResource('warehouses', writable(schemas.warehouses)),
  products: defineResource('products', writable(schemas.products)),
  skus: defineResource('skus', writable(schemas.skus)),
  stock_movements: defineResource('stock_movements', writable(schemas.stock_movements)),
  purchase_orders: defineResource('purchase_orders', writable(schemas.purchase_orders)),
  sales_orders: defineResource('sales_orders', writable(schemas.sales_orders)),
  todos: defineResource('todos', writable(schemas.todos)),
  roles: defineResource('roles', writable(schemas.roles)),
  users: defineResource('users', writable(schemas.users)),
  permissions: defineResource('permissions', writable(schemas.permissions)),
  user_accounts: defineResource('user_accounts', writable(schemas.user_accounts)),
  user_logs: defineResource('user_logs', writable(schemas.user_logs)),
  user_settings: defineResource('user_settings', writable(schemas.user_settings)),
  calendar_events: defineResource('calendar_events', writable(schemas.calendar_events)),
  ai_conversations: defineResource('ai_conversations', writable(schemas.ai_conversations)),
  notifications: defineResource('notifications', writable(schemas.notifications)),
  stock_transfers: defineResource('stock_transfers', writable(schemas.stock_transfers)),
  cycle_counts: defineResource('cycle_counts', writable(schemas.cycle_counts)),
  inventory_adjustments: defineResource('inventory_adjustments', writable(schemas.inventory_adjustments)),
  reorder_rules: defineResource('reorder_rules', writable(schemas.reorder_rules)),
  crm_accounts: defineResource('crm_accounts', writable(schemas.crm_accounts)),
  crm_contacts: defineResource('crm_contacts', writable(schemas.crm_contacts)),
  crm_deals: defineResource('crm_deals', writable(schemas.crm_deals)),
  crm_activities: defineResource('crm_activities', writable(schemas.crm_activities)),
  property_agents: defineResource('property_agents', writable(schemas.property_agents)),
  properties: defineResource('properties', writable(schemas.properties)),
  property_leads: defineResource('property_leads', writable(schemas.property_leads)),
  property_showings: defineResource('property_showings', writable(schemas.property_showings)),
  mail_inbox: defineResource('mail_inbox', writable(schemas.mail_inbox)),
  mail_draft: defineResource('mail_draft', writable(schemas.mail_draft)),
  mail_sent: defineResource('mail_sent', writable(schemas.mail_sent)),
  mail_archive: defineResource('mail_archive', writable(schemas.mail_archive)),
  mail_snoozed: defineResource('mail_snoozed', writable(schemas.mail_snoozed)),
  mail_spam: defineResource('mail_spam', writable(schemas.mail_spam)),
  mail_trash: defineResource('mail_trash', writable(schemas.mail_trash)),
  store_client_products: defineResource('store_client_products', writable(schemas.store_client_products)),
  store_client_orders: defineResource('store_client_orders', writable(schemas.store_client_orders)),
  project_planning: defineResource('project_planning', writable(schemas.project_planning)),
  store_admin: defineResource('store_admin', writable(schemas.store_admin)),
  store_services: defineResource('store_services', writable(schemas.store_services)),
  ai_prompt: defineResource('ai_prompt', writable(schemas.ai_prompt)),
  invoice_generator: defineResource('invoice_generator', writable(schemas.invoice_generator)),
  billing_plans: defineResource('billing_plans', writable(schemas.billing_plans)),
  billing_invoices: defineResource('billing_invoices', writable(schemas.billing_invoices)),
  billing_subscriptions: defineResource('billing_subscriptions', writable(schemas.billing_subscriptions)),
  security_sessions: defineResource('security_sessions', {
    ...writable(schemas.security_sessions),
    update: Type.Object({ status: Type.Literal('revoked') }),
  }),
  security_devices: defineResource('security_devices', writable(schemas.security_devices)),
  security_allowed_ips: defineResource('security_allowed_ips', writable(schemas.security_allowed_ips)),
  referral_invites: defineResource('referral_invites', writable(schemas.referral_invites)),
} satisfies { [Name in DemoResource]: ResourceContract };

/** Dynamic pages keep fields unknown, but still validate against the selected schema. */
export function demoContract(name: string): ResourceContract {
  if (!isDemoResource(name)) throw new Error(`Unknown demo resource: ${name}`);
  return demoContracts[name];
}
