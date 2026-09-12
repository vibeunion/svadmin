import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createSanityDataProvider } from './data-provider';

let fetchDescriptor: PropertyDescriptor | undefined;
beforeEach(() => { fetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch'); });
let calls = 0;
function respond(value: unknown) {
  calls = 0;
  globalThis.fetch = Object.assign(async () => { calls++; return Response.json(value); }, { preconnect: () => {} });
}
afterEach(() => {
  if (fetchDescriptor) Object.defineProperty(globalThis, 'fetch', fetchDescriptor);
  else Reflect.deleteProperty(globalThis, 'fetch');
});

describe('Sanity unknown response boundary', () => {
  const provider = createSanityDataProvider('project', 'dataset');

  test('rejects missing documents and invalid document identities', async () => {
    for (const result of [null, false, {}, { _id: 1, _type: 'post' }, { _id: '', _type: 'post' }, { _id: '1' }]) {
      respond({ result });
      await expect(provider.getOne({ resource: 'post', id: '1' })).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: false },
      });
      if (!provider.getMany) throw new Error('Missing getMany');
      respond({ result: [result] });
      await expect(provider.getMany({ resource: 'post', ids: ['1'] })).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE',
      });
    }
  });

  test('derives record id only from validated Sanity identity', async () => {
    respond({ result: { _id: '1', _type: 'post', id: 'untrusted', title: 'Hello' } });
    await expect(provider.getOne({ resource: 'post', id: '1' })).resolves.toMatchObject({ data: { id: '1', title: 'Hello' } });
  });

  test('validates every mutation receipt rather than echoing an unconfirmed write', async () => {
    const params = { resource: 'post', id: '1', variables: { title: 'Hello' } };
    for (const value of [null, {}, { results: [] }, { results: [{ id: 1 }] }, { results: [{ id: '' }] }]) {
      respond(value);
      for (const operation of [() => provider.create(params), () => provider.update(params), () => provider.deleteOne(params)]) {
        await expect(operation()).rejects.toMatchObject({
          code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true },
        });
      }
    }
    respond({ results: [{ id: 'other' }] });
    await expect(provider.update(params)).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    await expect(provider.deleteOne(params)).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    respond({ results: [{ id: '1' }] });
    await expect(provider.create(params)).resolves.toMatchObject({ data: { id: '1', title: 'Hello' } });
    await expect(provider.update(params)).resolves.toMatchObject({ data: { id: '1', title: 'Hello' } });
    await expect(provider.deleteOne(params)).resolves.toEqual({ data: { id: '1' } });
  });

  test('rejects non-object input before dispatch', async () => {
    respond({ results: [{ id: '1' }] });
    for (const variables of [null, [], false]) {
      await expect(provider.create({ resource: 'post', variables })).rejects.toThrow('variables must be an object');
      await expect(provider.update({ resource: 'post', id: '1', variables })).rejects.toThrow('variables must be an object');
    }
    expect(calls).toBe(0);
  });
});
