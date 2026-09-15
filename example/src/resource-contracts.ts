import { defineResource, type ResourceContract } from '@svadmin/core/resource-contract';
import { Type, type TObject } from '@sinclair/typebox';
import { demoSchemas as schemas, isDemoResource, type DemoResource } from './resource-schemas';

/** 演示资源从表记录派生 create/update，否则 AutoForm 无法渲染。 */
function withWriteSchemas(record: TObject) {
  const create = Type.Omit(record, ['id']);
  return { record, create, update: Type.Partial(create) };
}

function defineDemo<K extends DemoResource>(name: K, extras: { create?: TObject; update?: TObject } = {}) {
  return defineResource(name, { ...withWriteSchemas(schemas[name]), ...extras });
}

export const demoContracts = {
  case_workspace: defineDemo('case_workspace'),
  categories: defineDemo('categories'),
  suppliers: defineDemo('suppliers'),
  warehouses: defineDemo('warehouses'),
  products: defineDemo('products'),
  skus: defineDemo('skus'),
  stock_movements: defineDemo('stock_movements'),
  purchase_orders: defineDemo('purchase_orders'),
  sales_orders: defineDemo('sales_orders'),
  todos: defineDemo('todos'),
  roles: defineDemo('roles'),
  users: defineDemo('users'),
  permissions: defineDemo('permissions'),
  user_accounts: defineDemo('user_accounts'),
  user_logs: defineDemo('user_logs'),
  user_settings: defineDemo('user_settings'),
  calendar_events: defineDemo('calendar_events'),
  ai_conversations: defineDemo('ai_conversations'),
  notifications: defineDemo('notifications'),
  stock_transfers: defineDemo('stock_transfers'),
  cycle_counts: defineDemo('cycle_counts'),
  inventory_adjustments: defineDemo('inventory_adjustments'),
  reorder_rules: defineDemo('reorder_rules'),
  crm_accounts: defineDemo('crm_accounts'),
  crm_contacts: defineDemo('crm_contacts'),
  crm_deals: defineDemo('crm_deals'),
  crm_activities: defineDemo('crm_activities'),
  property_agents: defineDemo('property_agents'),
  properties: defineDemo('properties'),
  property_leads: defineDemo('property_leads'),
  property_showings: defineDemo('property_showings'),
  mail_inbox: defineDemo('mail_inbox'),
  mail_draft: defineDemo('mail_draft'),
  mail_sent: defineDemo('mail_sent'),
  mail_archive: defineDemo('mail_archive'),
  mail_snoozed: defineDemo('mail_snoozed'),
  mail_spam: defineDemo('mail_spam'),
  mail_trash: defineDemo('mail_trash'),
  store_client_products: defineDemo('store_client_products'),
  store_client_orders: defineDemo('store_client_orders'),
  project_planning: defineDemo('project_planning'),
  store_admin: defineDemo('store_admin'),
  store_services: defineDemo('store_services'),
  ai_prompt: defineDemo('ai_prompt'),
  invoice_generator: defineDemo('invoice_generator'),
  billing_plans: defineDemo('billing_plans'),
  billing_invoices: defineDemo('billing_invoices'),
  billing_subscriptions: defineDemo('billing_subscriptions'),
  security_sessions: defineDemo('security_sessions', {
    update: Type.Object({ status: Type.Literal('revoked') }),
  }),
  security_devices: defineDemo('security_devices'),
  security_allowed_ips: defineDemo('security_allowed_ips'),
  referral_invites: defineDemo('referral_invites'),
};

/** Dynamic pages keep fields unknown, but still validate against the selected schema. */
export function demoContract(name: string): ResourceContract {
  if (!isDemoResource(name)) throw new Error(`Unknown demo resource: ${name}`);
  return demoContracts[name];
}
