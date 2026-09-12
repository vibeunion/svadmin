import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createSupabaseRpc } from './rpc';

mock.module('@refinedev/supabase', () => ({
  dataProvider: () => ({
    getList: async () => ({ data: [{ id: 1, title: 'Item 1' }], total: 1 }),
    getOne: async () => ({ data: { id: 1, title: 'Item 1' } }),
    create: async () => ({ data: { id: 2, title: 'New Item' } }),
    update: async () => ({ data: { id: 1, title: 'Updated' } }),
    deleteOne: async () => ({ data: { id: 1, title: 'Deleted' } }),
  }),
}));

const { createSupabaseDataProvider } = await import('./data-provider');

function fixture(response: unknown) {
  const calls: { name: string; args: unknown[] }[] = [];
  const promise = Promise.resolve(response);
  const builder = {
    select(...args: unknown[]) { calls.push({ name: 'select', args }); return this; },
    insert(...args: unknown[]) { calls.push({ name: 'insert', args }); return this; },
    update(...args: unknown[]) { calls.push({ name: 'update', args }); return this; },
    delete(...args: unknown[]) { calls.push({ name: 'delete', args }); return this; },
    eq(...args: unknown[]) { calls.push({ name: 'eq', args }); return this; },
    order(...args: unknown[]) { calls.push({ name: 'order', args }); return this; },
    then: promise.then.bind(promise),
  };
  const from = (...args: unknown[]) => { calls.push({ name: 'from', args }); return builder; };
  const rpc = async (...args: unknown[]) => { calls.push({ name: 'rpc', args }); return response; };
  const client = {
    from, rpc,
    schema: (...args: unknown[]) => { calls.push({ name: 'schema', args }); return { from, rpc }; },
    functions: { invoke: async (...args: unknown[]) => { calls.push({ name: 'invoke', args }); return response; } },
  };
  const provider = createSupabaseDataProvider(client);
  if (!provider.custom) throw new Error('Expected custom transport');
  return { calls, request: provider.custom };
}

let fetchDescriptor: PropertyDescriptor | undefined;
beforeEach(() => { fetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch'); });
afterEach(() => {
  if (fetchDescriptor) Object.defineProperty(globalThis, 'fetch', fetchDescriptor);
  else Reflect.deleteProperty(globalThis, 'fetch');
});

describe('Supabase validated custom transport', () => {
  test('rejects non-object clients and missing callable SDK methods', async () => {
    for (const client of [null, false, [], 'client']) expect(() => createSupabaseDataProvider(client)).toThrow('must be an object');
    const provider = createSupabaseDataProvider({ rpc: 'not-callable' });
    if (!provider.custom) throw new Error('Expected custom transport');
    await expect(provider.custom({ url: 'rpc/work', method: 'post' })).rejects.toThrow('method rpc is unavailable');
  });

  test('does not admit malformed SDK envelopes as successful custom responses', async () => {
    for (const response of [null, [], { data: true }, { error: null }, { data: true, error: false }, { data: null, error: { message: 42 } }]) {
      const { request } = fixture(response);
      await expect(request({ url: 'rpc/work', method: 'post' })).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true },
      });
      await expect(request({ url: 'functions/work', method: 'get' })).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: false },
      });
    }
  });

  test('keeps validated RPC payloads unknown without changing falsy values', async () => {
    for (const data of [0, false, '', null]) {
      await expect(fixture({ data, error: null }).request({ url: 'rpc/work', method: 'post' })).resolves.toEqual({ data });
    }
  });

  test('rejects malformed table data and ambiguous single-row write results', async () => {
    for (const data of [null, 'row', [false]]) {
      await expect(fixture({ data, error: null }).request({ url: 'posts', method: 'get' })).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    }
    for (const data of [[], [{ id: 1 }, { id: 2 }], { id: 1 }]) {
      await expect(fixture({ data, error: null }).request({ url: 'posts', method: 'post', payload: { title: 'Hello' } })).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true },
      });
    }
  });

  test('validates metadata and record inputs before calling the SDK', async () => {
    const { request, calls } = fixture({ data: [], error: null });
    for (const meta of [{ schema: 42 }, { select: false }, { rpc: 'true' }, { function: 1 }, { edgeFunction: 'yes' }, { head: 'false' }, { get: 1 }, { count: 'always' }]) {
      await expect(request({ url: 'posts', method: 'get', meta })).rejects.toBeInstanceOf(TypeError);
    }
    for (const payload of [null, false, 'record', [], new Date()]) {
      await expect(request({ url: 'rpc/work', method: 'post', payload })).rejects.toBeInstanceOf(TypeError);
      await expect(request({ url: 'posts', method: 'patch', payload })).rejects.toBeInstanceOf(TypeError);
    }
    expect(calls).toEqual([]);
  });

  test('validates function bodies and preserves the selected HTTP method', async () => {
    const { request, calls } = fixture({ data: { ok: true }, error: null });
    for (const payload of [false, 42, [], new Date()]) {
      await expect(request({ url: 'functions/work', method: 'post', payload })).rejects.toBeInstanceOf(TypeError);
    }
    await expect(request({ url: 'functions/work', method: 'get', payload: {} })).rejects.toThrow('cannot have a body');
    expect(calls).toEqual([]);
    await request({ url: 'functions/work', method: 'patch', payload: { enabled: true } });
    expect(calls).toEqual([{ name: 'invoke', args: ['work', { body: { enabled: true }, method: 'PATCH' }] }]);
  });

  test('does not reinterpret unsupported filters as equality or ignore write filters', async () => {
    const { request, calls } = fixture({ data: [{ id: 1 }], error: null });
    await expect(request({ url: 'posts', method: 'get', filters: [{ field: 'count', operator: 'gt', value: 1 }] })).rejects.toThrow('only equality');
    await expect(request({ url: 'posts', method: 'delete', query: { id: null } })).rejects.toThrow('non-null');
    await expect(request({ url: 'posts', method: 'delete', filters: [{ field: 'id', operator: 'eq', value: null }] })).rejects.toThrow('non-null');
    expect(calls).toEqual([]);
    await request({ url: 'posts', method: 'patch', payload: { title: 'Hello' }, filters: [{ field: 'id', operator: 'eq', value: 1 }] });
    expect(calls).toContainEqual({ name: 'eq', args: ['id', 1] });
    expect(calls).toContainEqual({ name: 'select', args: ['*'] });
  });

  test('uses the actual RPC request mode in write uncertainty diagnostics', async () => {
    const { request, calls } = fixture({});
    await expect(request({ url: 'rpc/work', method: 'get' })).rejects.toMatchObject({ details: { writeMayHaveSucceeded: false } });
    expect(calls).toContainEqual({ name: 'rpc', args: ['work', {}, { get: true }] });
    await expect(request({ url: 'rpc/work', method: 'get', meta: { get: false } })).rejects.toMatchObject({ details: { writeMayHaveSucceeded: true } });
    await expect(request({ url: 'rpc/work', method: 'post', meta: { head: true } })).rejects.toMatchObject({ details: { writeMayHaveSucceeded: false } });
  });

  test('preserves falsy HTTP payloads and no-content responses', async () => {
    const { request } = fixture(null);
    let body: BodyInit | null | undefined;
    globalThis.fetch = Object.assign(async (_input: RequestInfo | URL, init?: RequestInit) => {
      body = init?.body;
      return new Response(null, { status: 204 });
    }, { preconnect: () => {} });
    for (const payload of [false, 0, '']) {
      await expect(request({ url: 'https://api.example.test/command', method: 'post', payload })).resolves.toEqual({ data: undefined });
      expect(body).toBe(JSON.stringify(payload));
    }
  });

  test('applies the same response and input validation to the standalone RPC helper', async () => {
    const call=mock(async () => ({ error: null }));
    const rpc=createSupabaseRpc({ rpc: call });
    await expect(rpc.call('work')).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true },
    });
    await expect(rpc.call('work',{}, { get: true })).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: false },
    });
    call.mockClear();
    await expect(Reflect.apply(rpc.call,rpc,['work',null])).rejects.toThrow('must be an object');
    await expect(Reflect.apply(rpc.call,rpc,['work',{}, { get: 'false' }])).rejects.toThrow('must be a boolean');
    expect(call).not.toHaveBeenCalled();
  });

  test('lets RPC call options override validated defaults without supplying absent fields', async () => {
    const calls: unknown[][]=[];
    const invoke=async (...args: unknown[]) => { calls.push(args); return { data: 0,error: null }; };
    const rpc=createSupabaseRpc({
      schema: (name: string) => {
        expect(name).toBe('reporting');
        return { rpc: invoke };
      },
    },{ schema: 'private', get: false });
    await expect(rpc.call('summary',{}, { schema: 'reporting', get: true })).resolves.toBe(0);
    expect(calls).toEqual([['summary',{}, { get: true }]]);
  });
});
