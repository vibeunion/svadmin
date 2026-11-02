import { describe, expect, it } from 'bun:test';
import { ConcurrencyLimitClearedError, createConcurrencyLimiter, withRetry, wrapDataProviderWithResult } from './resilience';
import type { DataProvider } from './types';

describe('Resilience Utilities', () => {
  describe('createConcurrencyLimiter', () => {
    it('limits concurrent tasks correctly', async () => {
      const limit = createConcurrencyLimiter(2);
      let running = 0;
      let maxRunning = 0;

      const task = async (delayMs: number) => {
        return limit(async () => {
          running++;
          maxRunning = Math.max(maxRunning, running);
          await new Promise((r) => setTimeout(r, delayMs));
          running--;
          return true;
        });
      };

      await Promise.all([
        task(20),
        task(20),
        task(20),
        task(20),
      ]);

      expect(maxRunning).toBe(2);
    });

    it('rejects invalid concurrency count', () => {
      expect(() => createConcurrencyLimiter(0)).toThrow(RangeError);
    });

    it('rejects queued work when cleared', async () => {
      const limit = createConcurrencyLimiter(1);
      let releaseFirst: ((value: string) => void) | undefined;
      const first = limit(() => new Promise<string>((resolve) => { releaseFirst = resolve; }));
      await Promise.resolve();
      let secondStarted = false;
      const second = limit(async () => { secondStarted = true; return 'second'; });
      const cleared = second.then(() => undefined, (error: unknown) => error);
      limit.clear();
      if (!releaseFirst) throw new Error('first task did not start');
      releaseFirst('first');
      await expect(first).resolves.toBe('first');
      await expect(cleared).resolves.toBeInstanceOf(ConcurrencyLimitClearedError);
      expect(secondStarted).toBe(false);
      expect(limit.pendingCount).toBe(0);
      expect(limit.activeCount).toBe(0);
    });
  });

  describe('withRetry', () => {
    it('retries until success within limit', async () => {
      let attempts = 0;
      const res = await withRetry(
        async (attempt) => {
          attempts = attempt;
          if (attempt < 3) {
            throw new Error('Temporary failure');
          }
          return 'ok';
        },
        { retries: 3, minTimeout: 5, maxTimeout: 20 },
      );

      expect(res).toBe('ok');
      expect(attempts).toBe(3);
    });

    it('throws if max retries exceeded', async () => {
      let attempts = 0;
      await expect(
        withRetry(
          async (attempt) => {
            attempts = attempt;
            throw new Error('Persistent fail');
          },
          { retries: 2, minTimeout: 5, maxTimeout: 10 },
        ),
      ).rejects.toThrow('Persistent fail');

      expect(attempts).toBe(3); // attempt 1 + 2 retries
    });
  });

  describe('wrapDataProviderWithResult', () => {
    it('wraps getList into Result.ok and Result.err', async () => {
      const mockProvider: DataProvider = {
        getApiUrl: () => 'https://api.example.com',
        getList: async () => ({ data: [{ id: 1, name: 'Alice' }], total: 1 }),
        getOne: async () => { throw new Error('Not found'); },
        create: async () => ({ data: { id: 2 } }),
        update: async () => ({ data: { id: 2 } }),
        deleteOne: async () => ({ data: { id: 2 } }),
      };

      const safeProvider = wrapDataProviderWithResult(mockProvider);
      expect(safeProvider.getApiUrl()).toBe('https://api.example.com');

      const listResult = await safeProvider.getList({ resource: 'users' });
      expect(listResult.ok).toBe(true);
      if (listResult.ok) {
        expect(listResult.value.total).toBe(1);
      }

      const oneResult = await safeProvider.getOne({ resource: 'users', id: 999 });
      expect(oneResult.ok).toBe(false);
      if (!oneResult.ok) {
        expect(oneResult.error._tag).toBe('ServerInternalError');
        expect(oneResult.error.message).toBe('Not found');
      }
    });

    it('captures synchronous provider throws as Result.err', async () => {
      const mockProvider: DataProvider = {
        getApiUrl: () => 'https://api.example.com',
        getList: () => { throw new Error('sync boom'); },
        getOne: async () => ({ data: { id: 1 } }),
        create: async () => ({ data: { id: 2 } }),
        update: async () => ({ data: { id: 2 } }),
        deleteOne: async () => ({ data: { id: 2 } }),
      };
      const safeProvider = wrapDataProviderWithResult(mockProvider);
      const listResult = await safeProvider.getList({ resource: 'users' });
      expect(listResult.ok).toBe(false);
      if (!listResult.ok) {
        expect(listResult.error._tag).toBe('ServerInternalError');
        expect(listResult.error.message).toBe('sync boom');
      }
    });
  });
});
