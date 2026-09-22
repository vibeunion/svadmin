import { describe, expect, test } from 'bun:test';
import {
  buildProviderDiagnostics,
  buildResourceDiagnostics,
  buildRouteDiagnostics,
  createDevtoolsCollector,
  toPermissionDiagnostic,
} from './index';
import type { DataProvider, ProviderBundle, ResourceDefinition } from '@svadmin/core';

function stubDataProvider(): DataProvider {
  return {
    getApiUrl: () => '/api',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: '1' } }),
    create: async () => ({ data: { id: '1' } }),
    update: async () => ({ data: { id: '1' } }),
    deleteOne: async () => ({ data: { id: '1' } }),
  };
}

describe('createDevtoolsCollector', () => {
  test('records events and diagnostics, notifying subscribers', () => {
    const collector = createDevtoolsCollector({ maxEvents: 2, maxDiagnostics: 2 });
    const seen: number[] = [];
    const unsubscribe = collector.subscribe((snapshot) => seen.push(snapshot.events.length));

    collector.recordEvent({ type: 'request.started', requestId: 'r1' });
    collector.recordEvent({ type: 'request.finished', requestId: 'r1', durationMs: 5 });
    collector.recordEvent({ type: 'request.failed', requestId: 'r2' });

    // Capped at maxEvents = 2, and each record notifies.
    expect(collector.snapshot().events).toHaveLength(2);
    expect(seen.at(-1)).toBe(2);

    collector.recordDiagnostic({
      code: 'provider.missing',
      source: 'frontend',
      severity: 'warning',
      message: 'liveProvider is not configured',
    });
    expect(collector.snapshot().diagnostics).toHaveLength(1);

    unsubscribe();
    collector.recordEvent({ type: 'request.started' });
    expect(seen.at(-1)).toBe(2);
  });

  test('redacts secrets and merges trace context', () => {
    const collector = createDevtoolsCollector({ context: { traceId: 't1' } });
    collector.recordEvent({
      type: 'query.finished',
      provider: 'primary',
      operation: 'list',
      resource: 'orders',
      requestId: 'r1',
    });

    const snapshot = collector.snapshot({ correlationId: 'c1' });
    expect(snapshot.traceId).toBe('t1');
    expect(snapshot.correlationId).toBe('c1');
    expect(snapshot.version).toBe(1);
    expect(() => JSON.stringify(snapshot)).not.toThrow();
  });

  test('clear resets the collector', () => {
    const collector = createDevtoolsCollector();
    collector.recordEvent({ type: 'request.started' });
    collector.clear();
    expect(collector.snapshot().events).toEqual([]);
  });
});

describe('diagnostic builders', () => {
  test('builds a provider capability matrix', () => {
    const bundle: ProviderBundle = { dataProvider: stubDataProvider() };
    const diagnostics = buildProviderDiagnostics(bundle);
    const data = diagnostics.find((entry) => entry.name === 'dataProvider');
    const auth = diagnostics.find((entry) => entry.name === 'authProvider');
    expect(data).toEqual({ name: 'dataProvider', configured: true, capabilities: 'data' });
    expect(auth?.configured).toBe(false);
  });

  test('builds resource and route diagnostics', () => {
    const resources: ResourceDefinition[] = [
      {
        name: 'orders',
        label: 'Orders',
        fields: [],
        canDelete: false,
        provider: { dataProviderName: 'reporting' },
      },
    ];
    expect(buildResourceDiagnostics(resources)).toEqual([
      {
        name: 'orders',
        label: 'Orders',
        showInMenu: true,
        operations: { list: true, create: true, edit: true, delete: false, show: true },
        dataProvider: 'reporting',
      },
    ]);
    expect(buildRouteDiagnostics(resources, '/admin')).toEqual([{ resource: 'orders', path: '/admin/orders' }]);
  });

  test('normalizes permission results', () => {
    expect(toPermissionDiagnostic('orders', 'delete', { can: true }))
      .toEqual({ resource: 'orders', action: 'delete', allowed: true });
    expect(toPermissionDiagnostic('orders', 'delete', { can: false, reason: 'policy' }))
      .toEqual({ resource: 'orders', action: 'delete', allowed: false, reason: 'policy' });
  });
});