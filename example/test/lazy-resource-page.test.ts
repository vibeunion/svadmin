// @vitest-environment happy-dom
import { mount, unmount } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import LazyResourcePage from '../src/components/LazyResourcePage.svelte';

vi.mock('../src/features/resource/ExampleResourcePage.svelte', async () => {
  const page = await import('./fixtures/LazyResourceDefaultDouble.svelte');
  return { default: page.default };
});

vi.mock('../src/features/planning/TodoWorkspacePage.svelte', async () => {
  const page = await import('./fixtures/LazyResourceTodoDouble.svelte');
  return { default: page.default };
});

vi.mock('../src/features/operations/OperationsWorkspacePage.svelte', async () => {
  const page = await import('./fixtures/LazyResourceOperationsDouble.svelte');
  return { default: page.default };
});

vi.mock('../src/features/catalog/ProductsPage.svelte', async () => {
  const page = await import('./fixtures/LazyResourceProductsDouble.svelte');
  return { default: page.default };
});

vi.mock('../src/features/domain/DomainWorkspacePage.svelte', async () => {
  const page = await import('./fixtures/LazyResourceDomainDouble.svelte');
  return { default: page.default };
});

vi.mock('../src/features/case/CaseWorkspacePage.svelte', async () => {
  const page = await import('./fixtures/LazyResourceCaseWorkspaceDouble.svelte');
  return { default: page.default };
});

describe('LazyResourcePage', () => {
  it('loads the case workspace vertical slice', async () => {
    const target = document.createElement('div');
    const page = mount(LazyResourcePage, { target, props: { resourceName: 'case_workspace' } });

    await vi.waitFor(() => expect(target.textContent).toContain('case-workspace:case_workspace'));

    await unmount(page);
  });

  it('loads the dedicated workspace page for a specialized resource', async () => {
    const target = document.createElement('div');
    const page = mount(LazyResourcePage, { target, props: { resourceName: 'todos' } });

    await vi.waitFor(() => expect(target.textContent).toContain('todo:todos'));

    await unmount(page);
  });

  it.each([
    'skus',
    'categories',
    'suppliers',
    'warehouses',
    'notifications',
    'store_client_products',
    'store_client_orders',
    'project_planning',
    'store_admin',
    'store_services',
    'ai_prompt',
    'invoice_generator',
    'billing_plans',
    'billing_invoices',
    'billing_subscriptions',
    'security_sessions',
    'security_devices',
    'security_allowed_ips',
    'referral_invites',
  ])('loads the domain workspace for %s', async (resourceName) => {
    const target = document.createElement('div');
    const page = mount(LazyResourcePage, { target, props: { resourceName } });

    await vi.waitFor(() => expect(target.textContent).toContain(`domain:${resourceName}`));

    await unmount(page);
  });

  it('loads the catalog feature for products', async () => {
    const target = document.createElement('div');
    const page = mount(LazyResourcePage, { target, props: { resourceName: 'products' } });

    await vi.waitFor(() => expect(target.textContent).toContain('products:products'));

    await unmount(page);
  });

  it.each([
    'stock_movements',
    'stock_transfers',
    'cycle_counts',
    'inventory_adjustments',
    'reorder_rules',
    'purchase_orders',
    'sales_orders',
  ])('loads the operations workspace for %s', async (resourceName) => {
    const target = document.createElement('div');
    const page = mount(LazyResourcePage, { target, props: { resourceName } });

    await vi.waitFor(() => expect(target.textContent).toContain(`operations:${resourceName}`));

    await unmount(page);
  });

  it('falls back to the general resource page', async () => {
    const target = document.createElement('div');
    const page = mount(LazyResourcePage, { target, props: { resourceName: 'unknown_resource' } });

    await vi.waitFor(() => expect(target.textContent).toContain('default:unknown_resource'));

    await unmount(page);
  });
});
