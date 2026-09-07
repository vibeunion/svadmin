import { afterEach, describe, expect, mock, test } from 'bun:test';
import { createElysiaDataProvider } from './data-provider';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

const provider = createElysiaDataProvider({ apiUrl: 'https://api.example.test' });
const reads = {
  list: (signal: AbortSignal) => provider.getList({ resource: 'posts', signal }),
  one: (signal: AbortSignal) => provider.getOne({ resource: 'posts', id: 1, signal }),
  many: (signal: AbortSignal) => {
    if (!provider.getMany) throw new Error('Elysia must implement getMany');
    return provider.getMany({ resource: 'posts', ids: [1, 2], signal });
  },
  custom: (signal: AbortSignal) => {
    if (!provider.custom) throw new Error('Elysia must implement custom');
    return provider.custom({ url: '/posts/search', method: 'get', signal });
  },
};

describe('Elysia read cancellation', () => {
  for (const [name, read] of Object.entries(reads)) {
    test(`${name} forwards the exact signal to fetch and preserves abort rejection`, async () => {
      const controller = new AbortController();
      const reason = new DOMException('cancelled', 'AbortError');
      const fetcher = mock(async (url: unknown, init?: RequestInit) => {
        expect(init?.signal).toBe(controller.signal);
        expect(String(url)).not.toContain('signal');
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
        });
      });
      globalThis.fetch = fetcher as unknown as typeof fetch;
      const pending = read(controller.signal);
      controller.abort(reason);
      await expect(pending).rejects.toBe(reason);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  }

  test('an already cancelled caller cannot start a fetch', async () => {
    const fetcher = mock(async () => Response.json({ items: [], total: 0 }));
    globalThis.fetch = fetcher as unknown as typeof fetch;
    const controller = new AbortController();
    controller.abort();
    for (const read of Object.values(reads)) {
      await expect(read(controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
});
