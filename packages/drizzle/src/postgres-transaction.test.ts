import { describe, expect, it } from 'bun:test';
import { createRequire } from 'node:module';
import { PgDialect } from 'drizzle-orm/pg-core/dialect';
import { PostgresJsSession } from 'drizzle-orm/postgres-js/session';

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}

async function invoke(callback: unknown, receiver: unknown, args: unknown[]): Promise<unknown> {
  if (typeof callback !== 'function') throw new TypeError('Expected a callback');
  const result: unknown = await Reflect.apply(callback, receiver, args);
  return result;
}

async function call(target: unknown, method: string, args: unknown[]): Promise<unknown> {
  if (!isObject(target)) throw new TypeError('Expected an object');
  return invoke(target[method], target, args);
}

// These doubles exercise transaction dispatch, not query execution or SQL transport.
function transactionClient(events: string[]) {
  return {
    async savepoint(callback: unknown): Promise<unknown> {
      events.push('savepoint');
      return invoke(callback, undefined, [this]);
    },
  };
}

function createSession(constructor: unknown, client: unknown): unknown {
  if (typeof constructor !== 'function') throw new TypeError('Expected a constructor');
  const result: unknown = Reflect.construct(constructor, [client, new PgDialect(), {}]);
  return result;
}

const cjs: unknown = createRequire(import.meta.url)('drizzle-orm/postgres-js/session');
if (!isObject(cjs)) throw new TypeError('Expected CommonJS exports');

for (const [format, constructor] of [
  ['ESM', PostgresJsSession],
  ['CommonJS', cjs['PostgresJsSession']],
] as const) {
  describe(`PostgreSQL transaction sessions (${format})`, () => {
    it('uses begin once and savepoint for nested transactions', async () => {
      const events: string[] = [];
      const nested = transactionClient(events);
      const client = {
        async begin(callback: unknown): Promise<unknown> {
          expect(this).toBe(client);
          events.push('begin');
          return invoke(callback, undefined, [nested]);
        },
      };
      const session = createSession(constructor, client);
      const result = await call(session, 'transaction', [
        (tx: unknown) => call(tx, 'transaction', [async () => ({ saved: true })]),
      ]);
      expect(result).toEqual({ saved: true });
      expect(events).toEqual(['begin', 'savepoint']);
    });

    it('accepts a transaction-only client without calling a nonexistent begin', async () => {
      const events: string[] = [];
      const client = transactionClient(events);
      expect(client).not.toHaveProperty('begin');
      const session = createSession(constructor, client);
      expect(await call(session, 'transaction', [async () => 42])).toBe(42);
      expect(events).toEqual(['savepoint']);
    });

    it('rejects transaction configuration inside a savepoint before dispatch', async () => {
      const events: string[] = [];
      const session = createSession(constructor, transactionClient(events));
      await expect(call(session, 'transaction', [
        async () => 'not called',
        { isolationLevel: 'serializable' },
      ])).rejects.toThrow('Nested transactions do not accept transaction configuration');
      expect(events).toEqual([]);
    });

    it('propagates callback failures without retrying through a different path', async () => {
      const events: string[] = [];
      const session = createSession(constructor, transactionClient(events));
      const failure = new Error('transaction failed');
      await expect(call(session, 'transaction', [async () => { throw failure; }]))
        .rejects.toBe(failure);
      expect(events).toEqual(['savepoint']);
    });
  });
}
