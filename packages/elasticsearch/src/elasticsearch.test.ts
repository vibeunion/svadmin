import { describe, expect, it } from 'bun:test';
import { createElasticsearchDataProvider, type FetchLike } from './elasticsearch-data-provider';

describe('@svadmin/elasticsearch DataProvider', () => {
  it('executes search queries with pagination, filters, and sorters', async () => {
    let capturedUrl = '';
    let capturedBody: Record<string, unknown> = {};

    const mockFetch: FetchLike = async (input, init) => {
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
      fetch: mockFetch,
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
    expect(capturedBody['from']).toBe(10);
    expect(capturedBody['size']).toBe(10);
    expect(capturedBody['sort']).toEqual([{ timestamp: { order: 'desc' } }]);
    const query = capturedBody['query'];
    expect(query).toBeDefined();
    if (query === null || typeof query !== 'object') throw new Error('Expected an Elasticsearch query object');
    expect((query as Record<string, unknown>)['bool']).toBeDefined();

    expect(result.total).toBe(42);
    expect(result.data.length).toBe(2);
    expect(result.data[0]?.['id']).toBe('doc-1');
  });

  it('retrieves a single document by id via getOne', async () => {
    const mockFetch: FetchLike = async (input) => {
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
      fetch: mockFetch,
    });

    const result = await provider.getOne({
      resource: 'audit-logs',
      id: 'item-99',
    });

    expect(result.data['id']).toBe('item-99');
    expect(result.data['action']).toBe('user.login');
  });

  it('preserves nested logical filters in the search query', async () => {
    let body: Record<string, unknown> = {};
    const mockFetch: FetchLike = async (_input, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ hits: { total: 0, hits: [] } }), { status: 200 });
    };
    const provider = createElasticsearchDataProvider({ node: 'http://localhost:9200', fetch: mockFetch });

    await provider.getList({
      resource: 'logs',
      filters: [{
        operator: 'or',
        value: [
          { field: 'level', operator: 'eq', value: 'error' },
          { field: 'level', operator: 'eq', value: 'warning' },
        ],
      }],
    });

    const query = body['query'];
    if (query === null || typeof query !== 'object') throw new Error('Expected an Elasticsearch query object');
    const bool = (query as Record<string, unknown>)['bool'];
    if (bool === null || typeof bool !== 'object') throw new Error('Expected a bool query');
    expect((bool as Record<string, unknown>)['should']).toHaveLength(2);
  });
});
