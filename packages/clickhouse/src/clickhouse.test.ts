import { describe, expect, it, mock } from 'bun:test';
import { createClickHouseDataProvider, type ClickHouseClientLike } from './index.js';

describe('createClickHouseDataProvider', () => {
  it('constructs correct query and pagination in getList', async () => {
    const executedQueries: string[] = [];
    const client: ClickHouseClientLike = {
      query: mock(({ query }) => {
        executedQueries.push(query);
        if (query.includes('count()')) {
          return Promise.resolve({
            json: () => Promise.resolve({ data: [{ total: 42 }] }),
          });
        }
        return Promise.resolve({
          json: () => Promise.resolve({
            data: [
              { id: '1', event: 'login', timestamp: '2026-11-09' },
              { id: '2', event: 'logout', timestamp: '2026-11-09' },
            ],
          }),
        });
      }),
    };

    const provider = createClickHouseDataProvider(client);
    const result = await provider.getList({
      resource: 'audit_events',
      pagination: { current: 2, pageSize: 10 },
      sorters: [{ field: 'timestamp', order: 'desc' }],
      filters: [{ field: 'event', operator: 'eq', value: 'login' }],
    });

    expect(result.total).toBe(42);
    expect(result.data).toHaveLength(2);
    expect(executedQueries.some(q => q.includes("LIMIT 10 OFFSET 10"))).toBe(true);
    expect(executedQueries.some(q => q.includes("event = 'login'"))).toBe(true);
    expect(executedQueries.some(q => q.includes("ORDER BY timestamp DESC"))).toBe(true);
  });

  it('retrieves single record with getOne', async () => {
    const client: ClickHouseClientLike = {
      query: mock(() =>
        Promise.resolve({
          json: () => Promise.resolve({ data: [{ id: 'evt_101', name: 'metric_spike' }] }),
        }),
      ),
    };

    const provider = createClickHouseDataProvider(client);
    const result = await provider.getOne({
      resource: 'metrics',
      id: 'evt_101',
    });

    expect(result.data).toEqual({ id: 'evt_101', name: 'metric_spike' });
  });

  it('supports custom aggregation queries', async () => {
    const customQuery = 'SELECT toDate(time) AS day, count() AS total FROM events GROUP BY day FORMAT JSON';
    const client: ClickHouseClientLike = {
      query: mock(() =>
        Promise.resolve({
          json: () => Promise.resolve({ data: [{ day: '2026-11-09', total: 1200 }] }),
        }),
      ),
    };

    const provider = createClickHouseDataProvider(client);
    if (!provider.custom) throw new Error('custom provider method is required');
    const result = await provider.custom({
      url: customQuery,
      method: 'get',
    });

    expect(result.data).toEqual([{ day: '2026-11-09', total: 1200 }]);
  });
});
