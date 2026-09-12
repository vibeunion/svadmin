import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createElysiaDataProvider } from './data-provider';

let fetchDescriptor: PropertyDescriptor | undefined;
beforeEach(() => { fetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch'); });
function respond(value: unknown) {
  globalThis.fetch = Object.assign(
    async () => Response.json(value),
    { preconnect: () => {} },
  );
}
afterEach(() => {
  if (fetchDescriptor) Object.defineProperty(globalThis, 'fetch', fetchDescriptor);
  else Reflect.deleteProperty(globalThis, 'fetch');
});

describe('Elysia untrusted response boundary', () => {
  const provider = createElysiaDataProvider({ apiUrl: 'https://api.example.test' });

  test('rejects invalid rows and totals without numeric coercion', async () => {
    for (const value of [
      null, 'private-payload', { items: [null], total: 1 },
      { items: [{ id: 1 }], total: '1' },
      { data: [], total: -1 }, { data: [], total: 0.5 },
      { items: [], total: Number.MAX_SAFE_INTEGER + 1 },
    ]) {
      respond(value);
      await expect(provider.getList({ resource: 'posts' })).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE',
        details: { writeMayHaveSucceeded: false },
      });
    }
  });

  test('validates custom global and per-resource parser results', async () => {
    respond({ secret: 'do-not-expose' });
    for (const options of [
      { parseListResponse: () => ({ data: [false], total: 1 }) },
      { resourceAdapters: [{ match: 'posts', parseListResponse: () => ({ data: [], total: '0' }) }] },
    ]) {
      const adapted = createElysiaDataProvider({ apiUrl: 'https://api.example.test', ...options });
      await expect(adapted.getList({ resource: 'posts' })).rejects.toMatchObject({
        message: 'Invalid provider response', code: 'INVALID_PROVIDER_RESPONSE',
      });
    }
  });

  test('rejects invalid single and bulk read responses', async () => {
    respond(false);
    await expect(provider.getOne({ resource: 'posts', id: 1 })).rejects.toMatchObject({
      details: { writeMayHaveSucceeded: false },
    });
    if (!provider.getMany) throw new Error('Missing getMany');
    await expect(provider.getMany({ resource: 'posts', ids: [1] })).rejects.toMatchObject({
      details: { writeMayHaveSucceeded: false },
    });
  });

  test('marks invalid single and bulk write responses as potentially committed', async () => {
    respond(false);
    const params = { resource: 'posts', id: 1, ids: [1], variables: { title: 'Hello' } };
    if (!provider.createMany || !provider.updateMany || !provider.deleteMany) throw new Error('Missing bulk operations');
    for (const operation of [
      () => provider.create(params),
      () => provider.update(params),
      () => provider.deleteOne(params),
      () => provider.createMany?.({ resource: 'posts', variables: [params.variables] }),
      () => provider.updateMany?.(params),
      () => provider.deleteMany?.(params),
    ]) {
      await expect(operation()).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE',
        details: { writeMayHaveSucceeded: true },
      });
    }
  });

  test('represents no-content deletion as an id-only record', async () => {
    globalThis.fetch = Object.assign(
      async () => new Response(null, { status: 204 }),
      { preconnect: () => {} },
    );
    await expect(provider.deleteOne({ resource: 'posts', id: 3 })).resolves.toEqual({ data: { id: 3 } });
  });
});
