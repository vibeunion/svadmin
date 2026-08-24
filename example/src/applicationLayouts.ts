export type SpecializedApplicationLayout =
  | 'inventory'
  | 'operations'
  | 'orders'
  | 'communications'
  | 'ai'
  | 'store'
  | 'planning'
  | 'generation'
  | 'billing'
  | 'security'
  | 'referral';

export type ApplicationLayout = SpecializedApplicationLayout | 'default';

const layoutResources = {
  inventory: ['products', 'skus', 'categories', 'suppliers', 'warehouses'],
  operations: ['stock_movements', 'stock_transfers', 'cycle_counts', 'inventory_adjustments', 'reorder_rules'],
  orders: ['purchase_orders', 'sales_orders'],
  communications: ['notifications'],
  ai: ['ai_prompt'],
  store: ['store_client_products', 'store_client_orders', 'store_admin', 'store_services'],
  planning: ['project_planning'],
  generation: ['invoice_generator'],
  billing: ['billing_plans', 'billing_invoices', 'billing_subscriptions'],
  security: ['security_sessions', 'security_devices', 'security_allowed_ips'],
  referral: ['referral_invites'],
} as const satisfies Record<SpecializedApplicationLayout, readonly string[]>;

const resourceLayouts = new Map<string, SpecializedApplicationLayout>(
  Object.entries(layoutResources).flatMap(([layout, resources]) =>
    resources.map((resource) => [resource, layout as SpecializedApplicationLayout] as const),
  ),
);

export const specializedApplicationResources = [...resourceLayouts.keys()];

export function resolveApplicationLayout(resourceName: string): ApplicationLayout {
  return resourceLayouts.get(resourceName) ?? 'default';
}
