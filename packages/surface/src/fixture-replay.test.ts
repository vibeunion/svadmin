import { describe, expect, test } from 'vitest';
import { validateSurfaceSpec } from './validation.js';
import { defaultSurfaceCatalog } from './catalog.js';
import { loadSurfaceSource } from './runtime.js';
import { resolveSurfaceWidgetData } from './binding.js';
import type {
  SurfaceSpec,
  SurfacePolicy,
  SurfaceDataProvider,
  ResourceListDataSource,
  SurfaceResourcePolicy,
} from './types.js';

describe('Deterministic zero-key fixture replay', () => {
  // Fixture: offline administrative dashboard spec
  const fixtureSpec: SurfaceSpec = {
    schemaVersion: 'surface/v1',
    catalogVersion: 'svadmin/v1',
    surfaceId: 'sales-overview',
    title: 'Sales Overview',
    layout: { type: 'grid', columns: 12, gap: 'md' },
    dataSources: [
      {
        id: 'orders-source',
        type: 'resource-list',
        resource: 'orders',
        pageSize: 5,
        sorters: [{ field: 'amount', order: 'desc' }],
      },
    ],
    widgets: [
      {
        id: 'total-orders-metric',
        type: 'metric',
        props: { label: 'Total Orders', format: 'number' },
        binding: { sourceId: 'orders-source', pointer: '/total' },
        placement: { columnSpan: 4 },
      },
      {
        id: 'revenue-chart',
        type: 'bar-chart',
        props: { title: 'Order Amounts', labelField: 'customer', valueField: 'amount' },
        binding: { sourceId: 'orders-source', pointer: '/items' },
        placement: { columnSpan: 8 },
      },
    ],
  };

  const fixturePolicy: SurfacePolicy = {
    resources: {
      orders: {
        readFields: ['id', 'customer', 'amount', 'status'],
        sortFields: ['amount', 'status'],
        maxPageSize: 20,
      },
    },
  };

  // Fixture: offline data with hidden/unauthorized fields
  const fixtureRecords = [
    { id: 101, customer: 'Acme Corp', amount: 1500, status: 'completed', internalSecret: 'stripe_sk_test_123' },
    { id: 102, customer: 'Beta LLC', amount: 820, status: 'pending', internalSecret: 'stripe_sk_test_456' },
  ];

  test('validates offline spec without network or credentials', () => {
    const result = validateSurfaceSpec(fixtureSpec, defaultSurfaceCatalog, fixturePolicy);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.surfaceId).toBe('sales-overview');
    }
  });

  test('deterministically loads source, strips unauthorized fields, and projects read models', async () => {
    const mockProvider: SurfaceDataProvider = {
      getList: (async () => ({
        data: fixtureRecords,
        total: 2,
      })) as SurfaceDataProvider['getList'],
      getOne: (async () => ({ data: fixtureRecords[0] })) as SurfaceDataProvider['getOne'],
    };

    const source = fixtureSpec.dataSources[0] as ResourceListDataSource;
    const resourcePolicy = fixturePolicy.resources.orders as SurfaceResourcePolicy;

    const sourceState = await loadSurfaceSource({
      source,
      resourcePolicy,
      provider: mockProvider,
      authorize: async () => ({ can: true }),
    });

    expect(sourceState.status).toBe('ready');
    if (sourceState.status === 'ready' && sourceState.value) {
      const readyValue = sourceState.value as { total: number; items: Record<string, unknown>[] };
      expect(readyValue.total).toBe(2);
      expect(readyValue.items).toHaveLength(2);
      // internalSecret must be stripped out deterministically
      expect(readyValue.items[0]).toEqual({
        id: 101,
        customer: 'Acme Corp',
        amount: 1500,
        status: 'completed',
      });
      expect(readyValue.items[0].internalSecret).toBeUndefined();

      // Resolve metric widget binding (/total)
      const metricState = resolveSurfaceWidgetData(fixtureSpec.widgets[0], {
        'orders-source': sourceState,
      });
      expect(metricState.status).toBe('ready');
      if (metricState.status === 'ready') {
        expect(metricState.value).toBe(2);
      }

      // Resolve bar chart widget binding (/items)
      const chartState = resolveSurfaceWidgetData(fixtureSpec.widgets[1], {
        'orders-source': sourceState,
      });
      expect(chartState.status).toBe('ready');
      if (chartState.status === 'ready') {
        expect(chartState.value).toEqual(readyValue.items);
      }
    }
  });

  test('fails closed on malformed spec with injection attempts', () => {
    const maliciousSpec = {
      ...fixtureSpec,
      surfaceId: 'malicious-test',
      widgets: [
        {
          id: 'xss-widget',
          type: 'metric',
          props: { label: 'Metric', format: 'invalid-format-type' },
          binding: { sourceId: 'orders-source', pointer: '/total' },
        },
      ],
    };

    const result = validateSurfaceSpec(maliciousSpec, defaultSurfaceCatalog, fixturePolicy);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });
});
