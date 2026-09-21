import { describe, expect, test } from 'bun:test';
import { decodeDashboardQuery, decodeDashboardSnapshot, type DashboardSnapshot } from './dashboard-contract';

import { requireValue } from '../../../scripts/test-assertions';
const snapshot: DashboardSnapshot = {
  version: 3,
  widgets: [{
    id: 'revenue',
    title: 'Revenue',
    kind: 'metric',
    metrics: [{ id: 'total', label: 'Total', value: 42, tone: 'success', href: '/reports/revenue' }],
  }, {
    id: 'notice',
    title: 'Notice',
    kind: 'text',
    metrics: [],
    text: 'Review pending items.',
  }],
};

describe('dashboard contract', () => {
  test('bounds and detaches dashboard queries', () => {
    const filters = [{ field: 'region', value: 'east' }];
    const result = decodeDashboardQuery({ dashboardId: 'home', filters });
    requireValue(requireValue(result.filters)[0]).field = 'changed';
    expect(requireValue(filters[0]).field).toBe('region');
    expect(() => decodeDashboardQuery({ dashboardId: 'home', filters: Array.from({ length: 51 }, () => ({ field: 'x', value: 1 })) })).toThrow();
    expect(() => decodeDashboardQuery({ dashboardId: 'home', extra: true })).toThrow();
  });

  test('detaches a valid snapshot', () => {
    const result = decodeDashboardSnapshot(snapshot);
    requireValue(requireValue(result.widgets[0]).metrics[0]).label = 'Changed';
    expect(requireValue(requireValue(snapshot.widgets[0]).metrics[0]).label).toBe('Total');
  });

  test.each([
    { version: 0 },
    { widgets: [{ ...snapshot.widgets[0], metrics: [{ ...requireValue(snapshot.widgets[0]).metrics[0], href: 'javascript:alert(1)' }] }, snapshot.widgets[1]] },
    { widgets: [{ ...snapshot.widgets[0], metrics:requireValue( snapshot.widgets[0]).metrics }, { ...snapshot.widgets[1], id: 'revenue' }] },
    { widgets: [{ ...snapshot.widgets[0], metrics: [] }] },
    { widgets: [{ ...snapshot.widgets[1], text: undefined }] },
  ])('rejects unsafe or incomplete snapshots %j', patch => {
    expect(() => decodeDashboardSnapshot({ ...snapshot, ...patch })).toThrow();
  });
});
