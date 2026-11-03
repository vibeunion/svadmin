import { describe, expect, it } from 'bun:test';
import { createElasticsearchDataProvider } from './elasticsearch-data-provider';

describe('@svadmin/elasticsearch DataProvider', () => {
  it('executes search queries with pagination, filters, and sorters', async () => {
    let capturedUrl = '';
    let capturedBody: any = null;

    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
      return new Response(
        JSON.stringify({
          hits: {
            total: { value: 42 },
            hits: [
              { _id: 'doc-1', _source: { title: 'First Log', level: 'info' } },
              { _id: 'doc-2', _source: { title: 'Second Log', level: 'error' } },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const provider = createElasticsearchDataProvider({
      node: 'http://localhost:9200',
      apiKey: 'test-api-key',
      fetch: mockFetch as any,
    });

    const result = await provider.getList({
      resource: 'logs',
      pagination: { current: 2, pageSize: 10 },
      sorters: [{ field: 'timestamp', order: 'desc' }],
      filters: [
        { field: 'level', operator: 'eq', value: 'error' },
        { field: 'message', operator: 'contains', value: 'timeout' },
      ],
    });

    expect(capturedUrl).toBe('http://localhost:9200/logs/_search');
    expect(capturedBody.from).toBe(10);
    expect(capturedBody.size).toBe(10);
    expect(capturedBody.sort).toEqual([{ timestamp: { order: 'desc' } }]);
    expect(capturedBody.query.bool.must).toBeDefined();

    expect(result.total).toBe(42);
    expect(result.data.length).toBe(2);
    expect(result.data[0].id).toBe('doc-1');
  });

  it('retrieves a single document by id via getOne', async () => {
    const mockFetch = async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('http://localhost:9200/audit-logs/_doc/item-99');
      return new Response(
        JSON.stringify({
          _id: 'item-99',
          _source: { action: 'user.login', userId: 'usr-1' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const provider = createElasticsearchDataProvider({
      node: 'http://localhost:9200',
      fetch: mockFetch as any,
    });

    const result = await provider.getOne({
      resource: 'audit-logs',
      id: 'item-99',
    });

    expect(result.data.id).toBe('item-99');
    expect((result.data as any).action).toBe('user.login');
  });
});
