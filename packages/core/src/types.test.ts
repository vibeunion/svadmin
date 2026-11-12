import { describe, expect, test } from 'bun:test';
import type { CursorPageInfo, GetListResult, Pagination } from './types';

describe('core types', () => {
  test('GetListResult preserves provider extension fields', () => {
    const result = {
      data: [{ id: 1 }],
      total: 1,
      summary: { locked: 2 },
      facets: { status: ['open', 'closed'] },
    } satisfies GetListResult;

    expect(result.summary.locked).toBe(2);
    expect(result.facets.status).toEqual(['open', 'closed']);
  });

  test('exposes cursor pagination without changing offset result requirements', () => {
    const pagination = { mode: 'cursor', pageSize: 50, cursor: 'opaque-next' } satisfies Pagination;
    const cursor: CursorPageInfo = {
      nextCursor: null,
      hasNextPage: false,
      hasPreviousPage: true,
    };
    const result = { data: [{ id: 'row-1' }], total: 1, cursor } satisfies GetListResult;

    expect(pagination.mode).toBe('cursor');
    expect(result.cursor?.hasPreviousPage).toBe(true);
  });
});
