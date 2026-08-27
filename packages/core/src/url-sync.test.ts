import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { RouterProvider } from './router-provider';
import { createHashRouterProvider } from './router-provider';
import type { Filter } from './types';

let routerProvider: RouterProvider | undefined;

mock.module('./context.svelte', () => ({
  captureAdminContext: () => ({ routerProvider }),
  getRouterProvider: () => routerProvider,
}));

mock.module('./options.svelte', () => ({
  getAdminOptions: () => ({ defaultPageSize: 10 }),
}));

const { appendListQueryFromPath, readURLState, sanitizeListQueryParams, writeURLState } = await import('./url-sync');

function installMockWindow() {
  let href = 'http://localhost/#/posts';
  const location = {
    get href() { return href; },
    set href(value: string) { href = value; },
    get hash() { return new URL(href).hash; },
    set hash(value: string) {
      const url = new URL(href);
      url.hash = value;
      href = url.href;
    },
  };

  const history = {
    replaceState: (_state: unknown, _title: string, value: string) => { href = value; },
  };

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location,
      history,
      dispatchEvent: () => true,
    },
  });
  Object.defineProperty(globalThis, 'history', { configurable: true, value: history });
  Object.defineProperty(globalThis, 'HashChangeEvent', {
    configurable: true,
    value: class HashChangeEvent extends Event {},
  });

  return {
    setHash(hash: string) { location.hash = hash; },
    getHash() { return location.hash; },
  };
}

describe('url-sync', () => {
  let mockWindow: ReturnType<typeof installMockWindow>;

  beforeEach(() => {
    mockWindow = installMockWindow();
    routerProvider = createHashRouterProvider();
  });

  test('round-trips deeply nested logical filters', () => {
    const filters: Filter[] = [
      {
        operator: 'or',
        value: [
          {
            operator: 'and',
            value: [
              { field: 'status', operator: 'eq', value: 'open' },
              { field: 'priority', operator: 'gte', value: 3 },
            ],
          },
          { field: 'assignee.email', operator: 'contains', value: '@example.com' },
        ],
      },
    ];

    writeURLState({ filters });

    expect(mockWindow.getHash()).toContain('filters=');
    expect(readURLState().filters).toEqual(filters);
  });

  test('round-trips a detail drawer id without discarding other resource state', () => {
    mockWindow.setHash('#/posts?q=active&records=1');

    writeURLState({ detailId: 'post-42' }, undefined, 'push');

    expect(mockWindow.getHash()).toContain('q=active');
    expect(mockWindow.getHash()).toContain('records=1');
    expect(readURLState().detailId).toBe('post-42');

    writeURLState({ detailId: undefined });

    expect(readURLState().detailId).toBeUndefined();
    expect(mockWindow.getHash()).toContain('q=active');
    expect(mockWindow.getHash()).toContain('records=1');
  });

  test('ignores invalid serialized filters', () => {
    mockWindow.setHash('#/posts?filters=%7Bbad-json');
    expect(readURLState().filters).toBeUndefined();
  });

  test('rejects valid JSON that does not match the Filter contract', () => {
    const invalidFilters = [
      { field: 'status', operator: 'drop-table', value: 'open' },
      { operator: 'or', value: { field: 'status', operator: 'eq', value: 'open' } },
    ];
    mockWindow.setHash(`#/posts?filters=${encodeURIComponent(JSON.stringify(invalidFilters))}`);

    expect(readURLState().filters).toBeUndefined();
  });

  test('rejects non-array filter payloads', () => {
    const invalidFilters = { field: 'status', operator: 'eq', value: 'open' };
    mockWindow.setHash(`#/posts?filters=${encodeURIComponent(JSON.stringify(invalidFilters))}`);

    expect(readURLState().filters).toBeUndefined();
  });

  test('sanitizes list query state and drops non-list parameters', () => {
    const filters = [{ field: 'status', operator: 'eq', value: 'open' }];
    expect(sanitizeListQueryParams({
      page: '2', pageSize: '50', sort: 'createdAt', order: 'desc', q: 'open',
      filters: JSON.stringify(filters), records: '1', detail: 'post-1', tenantId: 'tenant-a', token: 'secret',
    })).toEqual({
      page: '2', pageSize: '50', sort: 'createdAt', order: 'desc', q: 'open',
      filters: JSON.stringify(filters), records: '1',
    });
  });

  test('appends only validated list state to a CRUD path', () => {
    const filters = [{ field: 'status', operator: 'eq', value: 'open' }];
    expect(appendListQueryFromPath('/posts/show/1', `/posts?q=open&page=2&filters=${encodeURIComponent(JSON.stringify(filters))}&detail=1`))
      .toBe(`/posts/show/1?page=2&q=open&filters=${encodeURIComponent(JSON.stringify(filters))}`);
  });
});
