import { describe, expect, test, vi } from 'bun:test';
import { createCursorPageCache, createCursorProvider } from './cursor-provider';

describe('cursor provider', () => {
  test('forwards typed query, cursor, and options to the page fetcher', async () => {
    const fetchPage = vi.fn(async (input: { query: { status: string }; cursor?: string | null; options?: { signal: string } }) => ({
      items: [{ id: input.query.status }],
      nextCursor: input.cursor ? null : 'next',
    }));
    const provider = createCursorProvider(fetchPage);

    await expect(provider.getList({
      query: { status: 'open' },
      cursor: null,
      options: { signal: 'request-1' },
    })).resolves.toEqual({ items: [{ id: 'open' }], nextCursor: 'next' });
    expect(fetchPage).toHaveBeenCalledWith({
      query: { status: 'open' },
      cursor: null,
      options: { signal: 'request-1' },
    });
  });

  test('caches visited pages and invalidates the forward chain after an earlier page changes', () => {
    const cache = createCursorPageCache<{ id: string }>();

    expect(cache.cursorForPage(1)).toBeNull();
    expect(cache.cursorForPage(2)).toBeUndefined();
    cache.save(1, { items: [{ id: 'a' }], nextCursor: 'cursor-2' });
    cache.save(2, { items: [{ id: 'b' }], nextCursor: 'cursor-3' });
    expect(cache.cursorForPage(2)).toBe('cursor-2');
    expect(cache.cursorForPage(3)).toBe('cursor-3');

    cache.save(1, { items: [{ id: 'a2' }], nextCursor: 'cursor-2b' });
    expect(cache.page(2)).toBeUndefined();
    expect(cache.cursorForPage(2)).toBe('cursor-2b');
    expect(cache.cursorForPage(3)).toBeUndefined();

    cache.reset();
    expect(cache.page(1)).toBeUndefined();
    expect(cache.cursorForPage(1)).toBeNull();
  });
});
