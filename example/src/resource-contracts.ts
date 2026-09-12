import { defineResource, type ResourceContract } from '@svadmin/core';
import { Type } from '@sinclair/typebox';
import { demoSchemas as schemas, isDemoResource } from './resource-schemas';

export const demoContracts = {
  case_workspace: defineResource('case_workspace', { record: schemas.case_workspace }),
  categories: defineResource('categories', { record: schemas.categories }),
  suppliers: defineResource('suppliers', { record: schemas.suppliers }),
  warehouses: defineResource('warehouses', { record: schemas.warehouses }),
  products: defineResource('products', { record: schemas.products }),
  skus: defineResource('skus', { record: schemas.skus }),
  stock_movements: defineResource('stock_movements', { record: schemas.stock_movements }),
  purchase_orders: defineResource('purchase_orders', { record: schemas.purchase_orders }),
  sales_orders: defineResource('sales_orders', { record: schemas.sales_orders }),
  todos: defineResource('todos', { record: schemas.todos }),
  roles: defineResource('roles', { record: schemas.roles }),
  users: defineResource('users', { record: schemas.users }),
  permissions: defineResource('permissions', { record: schemas.permissions }),
  user_accounts: defineResource('user_accounts', { record: schemas.user_accounts }),
  user_logs: defineResource('user_logs', { record: schemas.user_logs }),
  user_settings: defineResource('user_settings', { record: schemas.user_settings }),
  calendar_events: defineResource('calendar_events', { record: schemas.calendar_events }),
  ai_conversations: defineResource('ai_conversations', { record: schemas.ai_conversations }),
  notifications: defineResource('notifications', { record: schemas.notifications }),
  stock_transfers: defineResource('stock_transfers', { record: schemas.stock_transfers }),
  cycle_counts: defineResource('cycle_counts', { record: schemas.cycle_counts }),
  inventory_adjustments: defineResource('inventory_adjustments', { record: schemas.inventory_adjustments }),
  reorder_rules: defineResource('reorder_rules', { record: schemas.reorder_rules }),
  crm_accounts: defineResource('crm_accounts', { record: schemas.crm_accounts }),
  crm_contacts: defineResource('crm_contacts', { record: schemas.crm_contacts }),
  crm_deals: defineResource('crm_deals', { record: schemas.crm_deals }),
  crm_activities: defineResource('crm_activities', { record: schemas.crm_activities }),
  property_agents: defineResource('property_agents', { record: schemas.property_agents }),
  properties: defineResource('properties', { record: schemas.properties }),
  property_leads: defineResource('property_leads', { record: schemas.property_leads }),
  property_showings: defineResource('property_showings', { record: schemas.property_showings }),
  mail_inbox: defineResource('mail_inbox', { record: schemas.mail_inbox }),
  mail_draft: defineResource('mail_draft', { record: schemas.mail_draft }),
  mail_sent: defineResource('mail_sent', { record: schemas.mail_sent }),
  mail_archive: defineResource('mail_archive', { record: schemas.mail_archive }),
  mail_snoozed: defineResource('mail_snoozed', { record: schemas.mail_snoozed }),
  mail_spam: defineResource('mail_spam', { record: schemas.mail_spam }),
  mail_trash: defineResource('mail_trash', { record: schemas.mail_trash }),
  store_client_products: defineResource('store_client_products', { record: schemas.store_client_products }),
  store_client_orders: defineResource('store_client_orders', { record: schemas.store_client_orders }),
  project_planning: defineResource('project_planning', { record: schemas.project_planning }),
  store_admin: defineResource('store_admin', { record: schemas.store_admin }),
  store_services: defineResource('store_services', { record: schemas.store_services }),
  ai_prompt: defineResource('ai_prompt', { record: schemas.ai_prompt }),
  invoice_generator: defineResource('invoice_generator', { record: schemas.invoice_generator }),
  billing_plans: defineResource('billing_plans', { record: schemas.billing_plans }),
  billing_invoices: defineResource('billing_invoices', { record: schemas.billing_invoices }),
  billing_subscriptions: defineResource('billing_subscriptions', { record: schemas.billing_subscriptions }),
  security_sessions: defineResource('security_sessions', {
    record: schemas.security_sessions,
    update: Type.Object({ status: Type.Literal('revoked') }),
  }),
  security_devices: defineResource('security_devices', { record: schemas.security_devices }),
  security_allowed_ips: defineResource('security_allowed_ips', { record: schemas.security_allowed_ips }),
  referral_invites: defineResource('referral_invites', { record: schemas.referral_invites }),
};

/** Dynamic pages keep fields unknown, but still validate against the selected schema. */
export function demoContract(name: string): ResourceContract {
  if (!isDemoResource(name)) throw new Error(`Unknown demo resource: ${name}`);
  return demoContracts[name];
}
