import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createDirectusDataProvider } from './data-provider';

let fetchDescriptor: PropertyDescriptor | undefined;
beforeEach(() => { fetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch'); });
function respond(value: unknown) {
  globalThis.fetch = Object.assign(async () => Response.json(value), { preconnect: () => {} });
}
afterEach(() => {
  if (fetchDescriptor) Object.defineProperty(globalThis, 'fetch', fetchDescriptor);
  else Reflect.deleteProperty(globalThis, 'fetch');
});

describe('Directus unknown JSON responses', () => {
  const provider = createDirectusDataProvider('https://api.example.test');

  test('does not replace invalid or missing list data with an empty successful result', async () => {
    for (const value of [null, {}, { data: [false], meta: { total_count: 1 } }, { data: [] },
      { data: [], meta: { total_count: '0' } }]) {
      respond(value);
      await expect(provider.getList({ resource: 'posts' })).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: false },
      });
    }
  });

  test('validates single and multiple records', async () => {
    respond({ data: null });
    await expect(provider.getOne({ resource: 'posts', id: 1 })).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    if (!provider.getMany) throw new Error('Missing getMany');
    await expect(provider.getMany({ resource: 'posts', ids: [1] })).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
  });

  test('reports invalid write results without claiming that the write was rolled back', async () => {
    respond({ data: false });
    const params = { resource: 'posts', id: 1, variables: { title: 'Hello' } };
    for (const operation of [() => provider.create(params), () => provider.update(params), () => provider.deleteOne(params)]) {
      await expect(operation()).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true },
      });
    }
  });
});
