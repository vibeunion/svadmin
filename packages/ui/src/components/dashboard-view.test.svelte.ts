import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/svelte';
import { createEnterpriseRequestContext, resetContext, type DashboardDrilldown, type DashboardProvider, type DataProvider } from '@svadmin/core';
import type { ComponentProps } from 'svelte';
import DashboardView from './DashboardView.svelte';
import ReactiveHost from './dashboard-view.reactive.test-host.svelte';
import Host from './dashboard-view.test-host.svelte';
import { requireValue } from '../../../../scripts/test-assertions';

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
type DashboardSettings = Omit<ComponentProps<typeof DashboardView>, 'provider'>;
function mount(provider: DashboardProvider, settings: Partial<DashboardSettings> = {}) {
  return render(Host, { provider: dataProvider, settings: { provider, dashboardId: 'home', requestContext, ...settings } });
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

  it('passes global filters and time range to the provider and reloads when they change', async () => {
    const source: DashboardProvider = { get: vi.fn(async () => snapshot) };
    const filters = [{ field: 'region', value: 'east' }];
    const timeRange = { from: '2026-10-01T00:00:00Z', to: '2026-10-31T23:59:59Z' };
    const view = mount(source, { filters, timeRange });
    await waitFor(() => expect(source.get).toHaveBeenCalledWith(requestContext, {
      dashboardId: 'home', filters, timeRange,
    }));
    const nextFilters = [{ field: 'region', value: 'west' }];
    const nextRange = { from: '2026-11-01T00:00:00Z', to: '2026-11-30T23:59:59Z' };
    await view.rerender({ settings: {
      provider: source, dashboardId: 'home', requestContext, filters: nextFilters, timeRange: nextRange,
    } });
    await waitFor(() => expect(source.get).toHaveBeenLastCalledWith(requestContext, {
      dashboardId: 'home', filters: nextFilters, timeRange: nextRange,
    }));
  });

  it('discards a late response from a previous filter selection', async () => {
    let resolveOld!: (value: unknown) => void;
    const source: DashboardProvider = { get: vi.fn((_context, query) =>
      query.filters?.[0]?.value === 'east'
        ? new Promise(resolve => { resolveOld = resolve; })
        : Promise.resolve({ ...snapshot, widgets: [{ ...snapshot.widgets[1], text: 'West dashboard' }] }))};
    const view = mount(source, { filters: [{ field: 'region', value: 'east' }] });
    await waitFor(() => expect(source.get).toHaveBeenCalledOnce());
    await view.rerender({ settings: {
      provider: source, dashboardId: 'home', requestContext, filters: [{ field: 'region', value: 'west' }],
    } });
    await view.findByText('West dashboard');
    resolveOld({ ...snapshot, widgets: [{ ...snapshot.widgets[1], text: 'Obsolete dashboard' }] });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(view.queryByText('Obsolete dashboard')).toBeNull();
    expect(view.getByText('West dashboard')).toBeTruthy();
  });

  it('hides old data on failure and retries with the current filters', async () => {
    const source: DashboardProvider = {
      get: vi.fn()
        .mockResolvedValueOnce(snapshot)
        .mockRejectedValueOnce(new Error('private dashboard failure'))
        .mockResolvedValueOnce({ ...snapshot, widgets: [{ ...snapshot.widgets[1], text: 'Recovered dashboard' }] }),
    };
    const view = mount(source, { filters: [{ field: 'region', value: 'east' }] });
    await view.findByText('Review queue');
    await view.rerender({ settings: {
      provider: source, dashboardId: 'home', requestContext, filters: [{ field: 'region', value: 'west' }],
    } });
    const alert = await view.findByRole('alert');
    expect(alert.textContent).not.toContain('private dashboard failure');
    expect(view.queryByText('Review queue')).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    await view.findByText('Recovered dashboard');
    expect(source.get).toHaveBeenLastCalledWith(requestContext, {
      dashboardId: 'home', filters: [{ field: 'region', value: 'west' }],
    });
  });

  it('emits typed drill-down events for metrics and text widgets', async () => {
    const onDrillDown = vi.fn();
    const filters = [{ field: 'region', value: 'east' }];
    const timeRange = { from: '2026-10-01T00:00:00Z', to: '2026-10-31T23:59:59Z' };
    const view = mount({ get: vi.fn(async () => snapshot) }, { filters, timeRange, onDrillDown });
    await view.findByText('Review queue');
    await fireEvent.click(view.getByRole('button', { name: /Total/ }));
    expect(onDrillDown).toHaveBeenCalledWith({
      dashboardId: 'home',
      widget: { id: 'sales', title: 'Sales', kind: 'metric' },
      metric: { id: 'total', label: 'Total', value: 12, tone: 'success', href: '/sales' },
      filters,
      timeRange,
    });
    await fireEvent.click(view.getByRole('button', { name: /View details.*Notice/ }));
    expect(onDrillDown).toHaveBeenLastCalledWith({
      dashboardId: 'home',
      widget: { id: 'notice', title: 'Notice', kind: 'text' },
      filters,
      timeRange,
    });
  });

  it('binds drill-down payload to the loaded query rather than later prop mutations', async () => {
    const filters = [{ field: 'region', value: 'east' }];
    const timeRange = { from: '2026-10-01T00:00:00Z', to: '2026-10-31T23:59:59Z' };
    const onDrillDown = vi.fn();
    const view = mount({ get: vi.fn(async () => snapshot) }, { filters, timeRange, onDrillDown });
    await view.findByText('Review queue');
    requireValue(filters[0]).value = 'west';
    timeRange.from = '2026-09-01T00:00:00Z';
    await fireEvent.click(view.getByRole('button', { name: /Total/ }));
    expect(onDrillDown).toHaveBeenCalledWith({
      dashboardId: 'home',
      widget: { id: 'sales', title: 'Sales', kind: 'metric' },
      metric: { id: 'total', label: 'Total', value: 12, tone: 'success', href: '/sales' },
      filters: [{ field: 'region', value: 'east' }],
      timeRange: { from: '2026-10-01T00:00:00Z', to: '2026-10-31T23:59:59Z' },
    });
  });

  it('shows a sanitized alert for a synchronous drill failure and clears it after a later success', async () => {
    const onDrillDown = vi.fn()
      .mockImplementationOnce(() => { throw new Error('private sync drill failure'); })
      .mockImplementationOnce(() => undefined);
    const view = mount({ get: vi.fn(async () => snapshot) }, { onDrillDown });
    await view.findByText('Review queue');
    await fireEvent.click(view.getByRole('button', { name: /Total/ }));
    const alert = await view.findByRole('alert');
    expect(alert.textContent).not.toContain('private sync drill failure');
    expect(view.getByText('Review queue')).toBeTruthy();
    expect(view.queryByText('Unable to load dashboard data.')).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: /Total/ }));
    await waitFor(() => expect(view.queryByRole('alert')).toBeNull());
    expect(view.getByText('Review queue')).toBeTruthy();
  });

  it('shows a sanitized alert for an asynchronous drill rejection and clears it on success', async () => {
    let rejectDrill!: (reason: unknown) => void;
    const onDrillDown = vi.fn()
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectDrill = reject; }))
      .mockImplementationOnce(() => Promise.resolve());
    const view = mount({ get: vi.fn(async () => snapshot) }, { onDrillDown });
    await view.findByText('Review queue');
    await fireEvent.click(view.getByRole('button', { name: /Total/ }));
    rejectDrill(new Error('private async drill failure'));
    const alert = await view.findByRole('alert');
    expect(alert.textContent).not.toContain('private async drill failure');
    expect(view.getByText('Review queue')).toBeTruthy();
    await fireEvent.click(view.getByRole('button', { name: /Total/ }));
    await waitFor(() => expect(view.queryByRole('alert')).toBeNull());
  });

  it('does not let an old drill failure pollute a newer query', async () => {
    let rejectOld!: (reason: unknown) => void;
    const onDrillDown = vi.fn((_input: DashboardDrilldown) => new Promise<void>((_resolve, reject) => { rejectOld = reject; }));
    const source: DashboardProvider = {
      get: vi.fn(async (_context, query) => query.filters?.[0]?.value === 'west'
        ? { ...snapshot, widgets: [{ ...snapshot.widgets[1], text: 'West dashboard' }] }
        : snapshot),
    };
    const view = mount(source, { filters: [{ field: 'region', value: 'east' }], onDrillDown });
    await view.findByText('Review queue');
    await fireEvent.click(view.getByRole('button', { name: /Total/ }));
    await waitFor(() => expect(onDrillDown).toHaveBeenCalledOnce());
    await view.rerender({ settings: {
      provider: source, dashboardId: 'home', requestContext, filters: [{ field: 'region', value: 'west' }], onDrillDown,
    } });
    await view.findByText('West dashboard');
    rejectOld(new Error('private old drill failure'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getByText('West dashboard')).toBeTruthy();
  });

  it('ignores a drill failure after unmount', async () => {
    let rejectOld!: (reason: unknown) => void;
    const onDrillDown = vi.fn((_input: DashboardDrilldown) => new Promise<void>((_resolve, reject) => { rejectOld = reject; }));
    const view = mount({ get: vi.fn(async () => snapshot) }, { onDrillDown });
    await view.findByText('Review queue');
    await fireEvent.click(view.getByRole('button', { name: /Total/ }));
    await waitFor(() => expect(onDrillDown).toHaveBeenCalledOnce());
    view.unmount();
    rejectOld(new Error('private unmounted drill failure'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(view.queryByRole('alert')).toBeNull();
  });

  it('keeps drill payload detached when the provider mutates its request', async () => {
    const filters = [{ field: 'region', value: 'east' }];
    const timeRange = { from: '2026-10-01T00:00:00Z', to: '2026-10-31T23:59:59Z' };
    const onDrillDown = vi.fn();
    const source: DashboardProvider = {
      get: vi.fn(async (_context, query) => {
        query.dashboardId = 'tampered';
        if (query.filters) requireValue(query.filters[0]).value = 'tampered';
        if (query.timeRange) query.timeRange.from = '1999-01-01T00:00:00Z';
        return snapshot;
      }),
    };
    const view = mount(source, { filters, timeRange, onDrillDown });
    await view.findByText('Review queue');
    await fireEvent.click(view.getByRole('button', { name: /Total/ }));
    expect(onDrillDown).toHaveBeenCalledWith({
      dashboardId: 'home',
      widget: { id: 'sales', title: 'Sales', kind: 'metric' },
      metric: { id: 'total', label: 'Total', value: 12, tone: 'success', href: '/sales' },
      filters: [{ field: 'region', value: 'east' }],
      timeRange: { from: '2026-10-01T00:00:00Z', to: '2026-10-31T23:59:59Z' },
    });
  });

  it('keeps the original href link when no drill-down handler is provided', async () => {
    const view = mount({ get: vi.fn(async () => snapshot) });
    await view.findByText('Review queue');
    const link = view.getByRole('link', { name: /Total/ });
    expect(link.getAttribute('href')).toBe('/sales');
    expect(view.queryByRole('button', { name: /Total/ })).toBeNull();
  });

  it('reloads when a reactive host mutates nested filter and time range values in place', async () => {
    const source: DashboardProvider = { get: vi.fn(async () => snapshot) };
    const view = render(ReactiveHost, { provider: source, dataProvider });
    await waitFor(() => expect(source.get).toHaveBeenCalledWith(expect.anything(), {
      dashboardId: 'home',
      filters: [{ field: 'region', value: 'east' }],
      timeRange: { from: '2026-10-01T00:00:00Z', to: '2026-10-31T23:59:59Z' },
    }));
    await fireEvent.input(view.getByLabelText('Region'), { target: { value: 'west' } });
    await waitFor(() => expect(source.get).toHaveBeenLastCalledWith(expect.anything(), {
      dashboardId: 'home',
      filters: [{ field: 'region', value: 'west' }],
      timeRange: { from: '2026-10-01T00:00:00Z', to: '2026-10-31T23:59:59Z' },
    }));
    await fireEvent.input(view.getByLabelText('From'), { target: { value: '2026-09-01T00:00:00Z' } });
    await waitFor(() => expect(source.get).toHaveBeenLastCalledWith(expect.anything(), {
      dashboardId: 'home',
      filters: [{ field: 'region', value: 'west' }],
      timeRange: { from: '2026-09-01T00:00:00Z', to: '2026-10-31T23:59:59Z' },
    }));
  });

  it('hides old data, discards late responses and retries after in-place nested edits', async () => {
    let resolveLate!: (value: unknown) => void;
    let rejectCurrent!: (reason: unknown) => void;
    let currentAttempts = 0;
    const source: DashboardProvider = {
      get: vi.fn((_context, query) => {
        if (query.timeRange?.from === '2026-09-01T00:00:00Z') {
          currentAttempts += 1;
          return currentAttempts === 1
            ? new Promise((_resolve, reject) => { rejectCurrent = reject; })
            : Promise.resolve({ ...snapshot, widgets: [{ ...snapshot.widgets[1], text: 'Recovered dashboard' }] });
        }
        if (query.filters?.[0]?.value === 'west') {
          return new Promise(resolve => { resolveLate = resolve; });
        }
        return Promise.resolve(snapshot);
      }),
    };
    const view = render(ReactiveHost, { provider: source, dataProvider });
    await view.findByText('Review queue');
    await fireEvent.input(view.getByLabelText('Region'), { target: { value: 'west' } });
    await waitFor(() => expect(source.get).toHaveBeenCalledTimes(2));
    expect(view.queryByText('Review queue')).toBeNull();
    await fireEvent.input(view.getByLabelText('From'), { target: { value: '2026-09-01T00:00:00Z' } });
    await waitFor(() => expect(source.get).toHaveBeenCalledTimes(3));
    resolveLate({ ...snapshot, widgets: [{ ...snapshot.widgets[1], text: 'Late west dashboard' }] });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(view.queryByText('Late west dashboard')).toBeNull();
    rejectCurrent(new Error('private nested failure'));
    const alert = await view.findByRole('alert');
    expect(alert.textContent).not.toContain('private nested failure');
    expect(view.queryByText('Review queue')).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    await view.findByText('Recovered dashboard');
    expect(source.get).toHaveBeenLastCalledWith(expect.anything(), {
      dashboardId: 'home',
      filters: [{ field: 'region', value: 'west' }],
      timeRange: { from: '2026-09-01T00:00:00Z', to: '2026-10-31T23:59:59Z' },
    });
  });
});
