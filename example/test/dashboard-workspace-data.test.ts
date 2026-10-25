import { describe, expect, test } from 'vitest';
import type { BaseRecord, DashboardQuery, DataProvider, GetListParams, GetListResult } from '@svadmin/core';
import {
  loadDashboardWorkspace, selectWorkspaceDrilldownRecords,
  type WorkspaceDrilldownTarget,
} from '../src/features/dashboard/dashboard-workspace-data';

const movements = [
  { id: 1, productId: 1, warehouseId: 1, quantity: 5, type: 'in', note: 'East in range', date: '2026-06-05' },
  { id: 2, productId: 1, warehouseId: 2, quantity: 9, type: 'in', note: 'West in range', date: '2026-06-05' },
  { id: 3, productId: 1, warehouseId: 1, quantity: 4, type: 'out', note: 'East later', date: '2026-06-20' },
];
const orders = [
  {
    id: 10, orderNumber: 'SO-10', customerName: 'Acme', status: 'shipped',
    totalAmount: 100, orderDate: '2026-06-10', shippingDate: '2026-06-12',
  },
  {
    id: 11, orderNumber: 'SO-11', customerName: 'Globex', status: 'pending',
    totalAmount: 200, orderDate: '2026-06-20', shippingDate: '2026-06-22',
  },
];
const todos = [
  {
    id: 20, title: 'Open east task', assigneeId: 1, dueDate: '2026-05-01',
    priority: 'high', status: 'open', completed: false, notes: '',
  },
  {
    id: 21, title: 'Completed task', assigneeId: 1, dueDate: '2026-06-01',
    priority: 'low', status: 'done', completed: true, notes: '',
  },
  {
    id: 22, title: 'Open global task', assigneeId: 2, dueDate: '2026-07-01',
    priority: 'medium', status: 'waiting', completed: false, notes: '',
  },
];
const query: DashboardQuery = {
  dashboardId: 'operations-dashboard',
  filters: [{ field: 'region', value: 'east' }],
  timeRange: { from: '2026-06-01T00:00:00Z', to: '2026-06-15T23:59:59Z' },
};

function createProvider(options: { failStockOnce?: boolean } = {}) {
  const calls: GetListParams[] = [];
  let stockCalls = 0;
  const rows: Record<string, BaseRecord[]> = {
    stock_movements: movements,
    sales_orders: orders,
    todos,
  };
  const provider = {
    getApiUrl: () => '/test',
    getList: (async (params: GetListParams): Promise<GetListResult> => {
      calls.push(structuredClone(params));
      if (params.resource === 'stock_movements' && options.failStockOnce && stockCalls++ === 0) {
        throw new Error('PRIVATE_DASHBOARD_LOAD');
      }
      const data = rows[params.resource] ?? [];
      return { data, total: data.length };
    }) as DataProvider['getList'],
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  } as DataProvider;
  return { provider, calls };
}

function target(metricId: string): WorkspaceDrilldownTarget {
  return {
    widgetId: 'workspace-metrics',
    widgetTitle: 'Workspace metrics',
    kind: 'metric',
    metricId,
    filters: query.filters ?? [],
    timeRange: query.timeRange,
  };
}

describe('dashboard workspace consumer data', () => {
  test('uses exact warehouse/date scopes and publishes explicit metric labels', async () => {
    const { provider, calls } = createProvider();
    const result = await loadDashboardWorkspace(provider, query, { isZh: false });
    expect(calls).toEqual([
      { resource: 'stock_movements', pagination: { mode: 'off' } },
      { resource: 'sales_orders', pagination: { mode: 'off' } },
      { resource: 'todos', pagination: { mode: 'off' } },
    ]);
    expect(result.data.movements.map(row => row.id)).toEqual([1]);
    expect(result.data.orders.map(row => row.id)).toEqual([10]);
    expect(result.data.openTodos.map(row => row.id)).toEqual([20, 22]);
    expect(result.data.unitsMoved).toBe(5);
    const metrics = result.snapshot.widgets.find(widget => widget.id === 'workspace-metrics');
    expect(metrics?.metrics.map(metric => ({ id: metric.id, label: metric.label, value: metric.value }))).toEqual([
      { id: 'units', label: 'Units moved (warehouse/date)', value: 5 },
      { id: 'orders', label: 'Sales orders (date)', value: 1 },
      { id: 'todos', label: 'Open todos (all regions/dates)', value: 2 },
    ]);
    const scope = result.snapshot.widgets.find(widget => widget.id === 'workspace-scope');
    expect(scope?.text).toContain('Region east · 2026-06-01 to 2026-06-15');
    expect(scope?.text).toContain('Open todos: all regions/dates');
    expect(selectWorkspaceDrilldownRecords(result.data, target('units')).map(row => `${row.resource}:${row.id}`))
      .toEqual(['stock_movements:1']);
    expect(selectWorkspaceDrilldownRecords(result.data, target('orders')).map(row => `${row.resource}:${row.id}`))
      .toEqual(['sales_orders:10']);
    expect(selectWorkspaceDrilldownRecords(result.data, target('todos')).map(row => `${row.resource}:${row.id}`))
      .toEqual(['todos:20', 'todos:22']);
  });

  test('propagates provider failure and reads fresh data on retry instead of returning zero', async () => {
    const { provider, calls } = createProvider({ failStockOnce: true });
    await expect(loadDashboardWorkspace(provider, query, { isZh: false })).rejects.toThrow('PRIVATE_DASHBOARD_LOAD');
    expect(calls).toHaveLength(3);
    const retried = await loadDashboardWorkspace(provider, query, { isZh: false });
    expect(retried.data.unitsMoved).toBe(5);
    expect(calls).toHaveLength(6);
  });

  test('rejects an unknown region without widening to all', async () => {
    const { provider, calls } = createProvider();
    await expect(loadDashboardWorkspace(provider, {
      ...query, filters: [{ field: 'region', value: 'central' }],
    }, { isZh: false })).rejects.toThrow('Unsupported dashboard region');
    expect(calls).toHaveLength(0);
  });

  test('rejects malformed or inverted date ranges before reading data', async () => {
    const { provider, calls } = createProvider();
    await expect(loadDashboardWorkspace(provider, {
      ...query, timeRange: { from: '2026-06-15T00:00:00Z', to: '2026-06-01T23:59:59Z' },
    }, { isZh: false })).rejects.toThrow('Dashboard time range');
    await expect(loadDashboardWorkspace(provider, {
      ...query, timeRange: { from: '2026-02-29T00:00:00Z', to: '2026-06-01T23:59:59Z' },
    }, { isZh: false })).rejects.toThrow('Dashboard time range');
    expect(calls).toHaveLength(0);
  });

  test('accepts equal UTC instants written with different fractional precision', async () => {
    const { provider, calls } = createProvider();
    const result = await loadDashboardWorkspace(provider, {
      ...query,
      timeRange: { from: '2026-06-01T00:00:00.1Z', to: '2026-06-01T00:00:00.10Z' },
    }, { isZh: false });
    expect(calls).toHaveLength(3);
    expect(result.data.movements).toEqual([]);
    expect(result.data.orders).toEqual([]);
  });

  test('rejects reverse order within the same second using timestamp semantics', async () => {
    const { provider, calls } = createProvider();
    await expect(loadDashboardWorkspace(provider, {
      ...query,
      timeRange: { from: '2026-06-01T00:00:00.11Z', to: '2026-06-01T00:00:00.1Z' },
    }, { isZh: false })).rejects.toThrow('Dashboard time range');
    expect(calls).toHaveLength(0);
  });
});