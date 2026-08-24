import { describe, expect, it } from 'vitest';
import { resolveApplicationLayout, specializedApplicationResources } from '../src/applicationLayouts';

describe('application layout resolution', () => {
  it('assigns materially different layouts to the example application families', () => {
    expect(resolveApplicationLayout('products')).toBe('inventory');
    expect(resolveApplicationLayout('stock_transfers')).toBe('operations');
    expect(resolveApplicationLayout('sales_orders')).toBe('orders');
    expect(resolveApplicationLayout('notifications')).toBe('communications');
    expect(resolveApplicationLayout('ai_prompt')).toBe('ai');
    expect(resolveApplicationLayout('store_client_products')).toBe('store');
    expect(resolveApplicationLayout('project_planning')).toBe('planning');
    expect(resolveApplicationLayout('invoice_generator')).toBe('generation');
    expect(resolveApplicationLayout('billing_plans')).toBe('billing');
    expect(resolveApplicationLayout('security_sessions')).toBe('security');
    expect(resolveApplicationLayout('referral_invites')).toBe('referral');
  });

  it('keeps the specialized resource list unique and uses default only for unknown resources', () => {
    expect(new Set(specializedApplicationResources).size).toBe(specializedApplicationResources.length);
    expect(resolveApplicationLayout('unknown_resource')).toBe('default');
    expect(resolveApplicationLayout('project_planning')).not.toBe(resolveApplicationLayout('ai_prompt'));
    expect(resolveApplicationLayout('project_planning')).not.toBe(resolveApplicationLayout('invoice_generator'));
  });
});
