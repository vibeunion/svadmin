import { createResourceRendering, type ResourceRendering } from '@svadmin/ui/rendering';
import { demoContracts } from './resource-contracts';
import { isDemoResource } from './resource-schemas';

// 显式键保留每个页面的资源字段类型；目录测试保证新增资源不会漏接。
export const demoRenderers = Object.freeze({
  case_workspace: createResourceRendering(demoContracts.case_workspace),
  categories: createResourceRendering(demoContracts.categories),
  suppliers: createResourceRendering(demoContracts.suppliers),
  warehouses: createResourceRendering(demoContracts.warehouses),
  products: createResourceRendering(demoContracts.products),
  skus: createResourceRendering(demoContracts.skus),
  stock_movements: createResourceRendering(demoContracts.stock_movements),
  purchase_orders: createResourceRendering(demoContracts.purchase_orders),
  sales_orders: createResourceRendering(demoContracts.sales_orders),
  todos: createResourceRendering(demoContracts.todos),
  roles: createResourceRendering(demoContracts.roles),
  users: createResourceRendering(demoContracts.users),
  permissions: createResourceRendering(demoContracts.permissions),
  user_accounts: createResourceRendering(demoContracts.user_accounts),
  user_logs: createResourceRendering(demoContracts.user_logs),
  user_settings: createResourceRendering(demoContracts.user_settings),
  calendar_events: createResourceRendering(demoContracts.calendar_events),
  ai_conversations: createResourceRendering(demoContracts.ai_conversations),
  notifications: createResourceRendering(demoContracts.notifications),
  stock_transfers: createResourceRendering(demoContracts.stock_transfers),
  cycle_counts: createResourceRendering(demoContracts.cycle_counts),
  inventory_adjustments: createResourceRendering(demoContracts.inventory_adjustments),
  reorder_rules: createResourceRendering(demoContracts.reorder_rules),
  crm_accounts: createResourceRendering(demoContracts.crm_accounts),
  crm_contacts: createResourceRendering(demoContracts.crm_contacts),
  crm_deals: createResourceRendering(demoContracts.crm_deals),
  crm_activities: createResourceRendering(demoContracts.crm_activities),
  property_agents: createResourceRendering(demoContracts.property_agents),
  properties: createResourceRendering(demoContracts.properties),
  property_leads: createResourceRendering(demoContracts.property_leads),
  property_showings: createResourceRendering(demoContracts.property_showings),
  mail_inbox: createResourceRendering(demoContracts.mail_inbox),
  mail_draft: createResourceRendering(demoContracts.mail_draft),
  mail_sent: createResourceRendering(demoContracts.mail_sent),
  mail_archive: createResourceRendering(demoContracts.mail_archive),
  mail_snoozed: createResourceRendering(demoContracts.mail_snoozed),
  mail_spam: createResourceRendering(demoContracts.mail_spam),
  mail_trash: createResourceRendering(demoContracts.mail_trash),
  store_client_products: createResourceRendering(demoContracts.store_client_products),
  store_client_orders: createResourceRendering(demoContracts.store_client_orders),
  project_planning: createResourceRendering(demoContracts.project_planning),
  store_admin: createResourceRendering(demoContracts.store_admin),
  store_services: createResourceRendering(demoContracts.store_services),
  ai_prompt: createResourceRendering(demoContracts.ai_prompt),
  invoice_generator: createResourceRendering(demoContracts.invoice_generator),
  billing_plans: createResourceRendering(demoContracts.billing_plans),
  billing_invoices: createResourceRendering(demoContracts.billing_invoices),
  billing_subscriptions: createResourceRendering(demoContracts.billing_subscriptions),
  security_sessions: createResourceRendering(demoContracts.security_sessions),
  security_devices: createResourceRendering(demoContracts.security_devices),
  security_allowed_ips: createResourceRendering(demoContracts.security_allowed_ips),
  referral_invites: createResourceRendering(demoContracts.referral_invites),
});

/** 只有动态路由入口擦除类型；具体业务视图使用 demoRenderers.<resource>。 */
export function demoRendering(name: string): ResourceRendering {
  if (!isDemoResource(name)) throw new TypeError(`Unknown rendering resource: ${name}`);
  return demoRenderers[name];
}
