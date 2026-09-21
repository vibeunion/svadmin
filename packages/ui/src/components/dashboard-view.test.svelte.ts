import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEnterpriseRequestContext, resetContext, type DashboardProvider, type DataProvider } from '@svadmin/core';
import Host from './dashboard-view.test-host.svelte';

const dataProvider: DataProvider = {
  getList: async () => ({ data: [], total: 0 }), getOne: async () => ({ data: {} }),
  create: async () => ({ data: {} }), update: async () => ({ data: {} }),
  deleteOne: async () => ({ data: {} }), getApiUrl: () => '',
};
const requestContext = createEnterpriseRequestContext({ tenantId: 'tenant-a', requestId: 'dashboard-1', traceId: 'trace-1' });
const snapshot = {
  version: 1,
  widgets: [{
    id: 'sales', title: 'Sales', kind: 'metric' as const,
    metrics: [{ id: 'total', label: 'Total', value: 12, tone: 'success' as const, href: '/sales' }],
  }, {
    id: 'notice', title: 'Notice', kind: 'text' as const, metrics: [], text: 'Review queue',
  }],
};
function mount(provider: DashboardProvider) {
  return render(Host, { provider: dataProvider, settings: { provider, dashboardId: 'home', requestContext } });
}
afterEach(() => { cleanup(); resetContext(); });

describe('DashboardView', () => {
  it('loads scoped widgets and renders metrics and text', async () => {
    const source: DashboardProvider = { get: vi.fn(async () => snapshot) };
    const view = mount(source);
    await waitFor(() => expect(view.getByText('Review queue')).toBeTruthy());
    expect(view.getByText('Total')).toBeTruthy();
    expect(view.getByText('12')).toBeTruthy();
    expect(source.get).toHaveBeenCalledWith(requestContext, { dashboardId: 'home' });
  });

  it('does not restore a late snapshot after provider replacement', async () => {
    let resolveOld!: (value: unknown) => void;
    const old: DashboardProvider = { get: vi.fn(() => new Promise(resolve => { resolveOld = resolve; })) };
    const view = mount(old);
    await waitFor(() => expect(old.get).toHaveBeenCalledOnce());
    const next: DashboardProvider = { get: vi.fn(async () => ({ ...snapshot, widgets: [{ ...snapshot.widgets[1], text: 'Current dashboard' }] })) };
    await view.rerender({ settings: { provider: next, dashboardId: 'home', requestContext } });
    await view.findByText('Current dashboard');
    resolveOld({ ...snapshot, widgets: [{ ...snapshot.widgets[1], text: 'Obsolete dashboard' }] });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(view.queryByText('Obsolete dashboard')).toBeNull();
  });
});
