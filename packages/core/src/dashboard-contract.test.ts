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

  test('validates and detaches an explicit dashboard time range', () => {
    const timeRange = { from: '2026-10-01T00:00:00Z', to: '2026-10-31T23:59:59Z' };
    const result = decodeDashboardQuery({ dashboardId: 'home', timeRange });
    expect(result.timeRange).toEqual(timeRange);
    result.timeRange!.from = '2026-09-01T00:00:00Z';
    expect(timeRange.from).toBe('2026-10-01T00:00:00Z');
    expect(() => decodeDashboardQuery({
      dashboardId: 'home', timeRange: { from: timeRange.to, to: timeRange.from },
    })).toThrow();
    expect(() => decodeDashboardQuery({
      dashboardId: 'home', timeRange: { from: '2026-10-01T00:00:00+08:00', to: timeRange.to },
    })).toThrow();
    expect(() => decodeDashboardQuery({
      dashboardId: 'home', timeRange: { from: timeRange.from, to: timeRange.to, timezone: 'Asia/Shanghai' },
    })).toThrow();
  });

  test('rejects nonexistent calendar instants and 24:00', () => {
    const to = '2027-01-01T00:00:00Z';
    for (const from of [
      '2026-02-29T00:00:00Z',
      '2026-02-30T00:00:00Z',
      '2026-04-31T00:00:00Z',
      '1900-02-29T00:00:00Z',
      '2026-10-01T24:00:00Z',
      '2026-10-01T23:60:00Z',
      '2026-10-01T23:59:60Z',
    ]) {
      expect(() => decodeDashboardQuery({ dashboardId: 'home', timeRange: { from, to } })).toThrow();
    }
  });

  test('accepts real leap days and bounded fractional seconds', () => {
    const result = decodeDashboardQuery({
      dashboardId: 'home',
      timeRange: { from: '2024-02-29T00:00:00.1Z', to: '2024-02-29T23:59:59.999Z' },
    });
    expect(result.timeRange?.from).toBe('2024-02-29T00:00:00.1Z');
    expect(() => decodeDashboardQuery({
      dashboardId: 'home',
      timeRange: { from: '2000-02-29T00:00:00Z', to: '2000-02-29T23:59:59Z' },
    })).not.toThrow();
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
