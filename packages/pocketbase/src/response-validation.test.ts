import { describe, expect, test } from 'bun:test';
import { createPocketBaseDataProvider } from './data-provider';

function fixture(response: unknown) {
  let writes = 0;
  const collection = {
    getList: async () => response,
    getOne: async () => response,
    getFullList: async () => response,
    create: async () => { writes++; return response; },
    update: async () => { writes++; return response; },
    delete: async () => { writes++; return response; },
  };
  const provider = createPocketBaseDataProvider({
    pb: { collection: () => collection, buildUrl: path => `https://api.example.test${path}` },
  });
  return { provider, writes: () => writes };
}

describe('PocketBase unknown SDK responses', () => {
  test('rejects malformed list envelopes, rows, and totals', async () => {
    for (const value of [null, { items: [false], totalItems: 1 }, { items: [], totalItems: '0' }]) {
      await expect(fixture(value).provider.getList({ resource: 'posts' })).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: false },
      });
    }
    const { provider } = fixture(null);
    await expect(provider.getOne({ resource: 'posts', id: 1 })).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    if (!provider.getMany) throw new Error('Missing getMany');
    await expect(provider.getMany({ resource: 'posts', ids: [1] })).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
  });

  test('rejects invalid input before calling a write', async () => {
    const { provider, writes } = fixture({ id: 1 });
    for (const variables of [null, [], 'title', false]) {
      await expect(provider.create({ resource: 'posts', variables })).rejects.toThrow('variables must be an object');
      await expect(provider.update({ resource: 'posts', id: 1, variables })).rejects.toThrow('variables must be an object');
    }
    expect(writes()).toBe(0);
  });

  test('does not invent successful deletions from false or malformed SDK results', async () => {
    for (const value of [false, null, 'true', {}]) {
      const { provider } = fixture(value);
      await expect(provider.deleteOne({ resource: 'posts', id: 1 })).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true },
      });
      if (!provider.deleteMany) throw new Error('Missing deleteMany');
      await expect(provider.deleteMany({ resource: 'posts', ids: [1, 2] })).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true },
      });
    }
  });

  test('marks malformed create and update responses as potentially committed', async () => {
    const { provider } = fixture(false);
    const params = { resource: 'posts', id: 1, variables: { title: 'Hello' } };
    await expect(provider.create(params)).rejects.toMatchObject({ details: { writeMayHaveSucceeded: true } });
    await expect(provider.update(params)).rejects.toMatchObject({ details: { writeMayHaveSucceeded: true } });
  });
});
