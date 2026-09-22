import type { DemoResource } from '../resource-schemas';

export type FeatureModule =
  | 'ai'
  | 'calendar'
  | 'case'
  | 'catalog'
  | 'crm'
  | 'domain'
  | 'mail'
  | 'operations'
  | 'people'
  | 'planning'
  | 'property'
  | 'showcase';

export const featureResourceModules = {
  case_workspace: 'case',
  categories: 'domain',
  suppliers: 'domain',
  warehouses: 'domain',
  products: 'catalog',
  skus: 'domain',
  stock_movements: 'operations',
  purchase_orders: 'operations',
  sales_orders: 'operations',
  todos: 'planning',
  roles: 'people',
  users: 'people',
  permissions: 'people',
  user_accounts: 'people',
  user_logs: 'people',
  user_settings: 'people',
  calendar_events: 'calendar',
  ai_conversations: 'ai',
  notifications: 'domain',
  stock_transfers: 'operations',
  cycle_counts: 'operations',
  inventory_adjustments: 'operations',
  reorder_rules: 'operations',
  crm_accounts: 'crm',
  crm_contacts: 'crm',
  crm_deals: 'crm',
  crm_activities: 'crm',
  property_agents: 'property',
  properties: 'property',
  property_leads: 'property',
  property_showings: 'property',
  mail_inbox: 'mail',
  mail_draft: 'mail',
  mail_sent: 'mail',
  mail_archive: 'mail',
  mail_snoozed: 'mail',
  mail_spam: 'mail',
  mail_trash: 'mail',
  store_client_products: 'domain',
  store_client_orders: 'domain',
  project_planning: 'domain',
  store_admin: 'domain',
  store_services: 'domain',
  ai_prompt: 'domain',
  invoice_generator: 'domain',
  billing_plans: 'domain',
  billing_invoices: 'domain',
  billing_subscriptions: 'domain',
  security_sessions: 'domain',
  security_devices: 'domain',
  security_allowed_ips: 'domain',
  referral_invites: 'domain',
} as const satisfies Record<DemoResource, FeatureModule>;

export type ResourcesForFeature<Module extends FeatureModule> = {
  [Name in DemoResource]: (typeof featureResourceModules)[Name] extends Module ? Name : never;
}[DemoResource] | (Module extends 'showcase' ? 'design_principles' : never);

export function assertFeatureResourceCoverage(names: readonly string[]): void {
  const missing = names.filter((name) => !Object.hasOwn(featureResourceModules, name));
  if (missing.length > 0) {
    throw new Error(`Resources must declare a feature module: ${missing.join(', ')}`);
  }
}
