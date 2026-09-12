import { describe, expect, test } from 'bun:test';
import { Type } from '@sinclair/typebox';
import { contractProvider, contractFormValues, defineResource, contractKey, type ResourceContract } from './resource-contract';
import { defineCommand, executeCommand } from './command-contract';
import { keys, queryKeyMatches } from './query-keys';
import { DeleteManyPartialError, type DataProvider } from './types';
import ts from 'typescript';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const record = Type.Object({ id: Type.Number(), title: Type.String(), count: Type.Number() });
const row = { id: 1, title: 'Hello', count: 2 };
const rows = [row, { ...row, id: 2 }];
function fixture(configure?: (provider: DataProvider) => void, options: { contract?: ResourceContract; native?: boolean } = {}) {
  const calls: { method: string; params: unknown }[] = [];
  let response: unknown;
  let hasResponse = false;
  let created = 0;
  const resource = options.contract ?? defineResource('posts', {
    record,
    create: Type.Object({ title: Type.String(), count: Type.Number() }),
    update: Type.Object({ title: Type.Optional(Type.String()) }),
    delete: Type.Object({ reason: Type.String() }),
  });
  async function reply(receiver: DataProvider, method: string, params: unknown): Promise<unknown> {
    expect(receiver).toBe(raw);
    calls.push({ method, params });
    if (hasResponse) return response;
    if (method === 'create') return { data: { ...row, id: ++created } };
    const id: unknown = typeof params === 'object' && params !== null
      ? Object.getOwnPropertyDescriptor(params, 'id')?.value : undefined;
    return { data: id === undefined ? row : { ...row, id } };
  }
  const raw: DataProvider = {
    getApiUrl() { return '/api'; },
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: row }),
    create: async () => ({ data: row }),
    update: async () => ({ data: row }),
    deleteOne: async () => ({ data: row }),
  };
  // Inject unknown JavaScript responses without claiming a generic payload type.
  for (const method of ['getList', 'getOne', 'create', 'update', 'deleteOne', 'custom',
    ...(options.native ? batchMethods : [])]) {
    Reflect.set(raw, method, function (this: DataProvider, params: unknown) { return reply(this, method, params); });
  }
  configure?.(raw);
  return { raw, resource, provider: contractProvider(raw, resource), calls,
    setResponse(value: unknown) { response = value; hasResponse = true; } };
}

type BatchMethod = 'getMany' | 'createMany' | 'updateMany' | 'deleteMany';
const batchMethods: BatchMethod[] = ['getMany', 'createMany', 'updateMany', 'deleteMany'];
const identityBatchMethods: Exclude<BatchMethod, 'createMany'>[] = ['getMany', 'updateMany', 'deleteMany'];
const singleMethods: ('getOne' | 'create' | 'update' | 'deleteOne')[] = ['getOne', 'create', 'update', 'deleteOne'];
const singles = { getMany: 'getOne', createMany: 'create', updateMany: 'update', deleteMany: 'deleteOne' } as const;
function batchRequest(method: BatchMethod) {
  const common = { resource: 'posts', meta: { tenant: 'first' } };
  switch (method) {
    case 'getMany': return { ...common, ids: [1, 2] };
    case 'createMany': return { ...common, variables: [{ title: 'Hello', count: 1 }, { title: 'Second', count: 2 }] };
    case 'updateMany': return { ...common, ids: [1, 2], variables: { title: 'Hello' } };
    case 'deleteMany': return { ...common, ids: [1, 2], variables: { reason: 'duplicate' } };
  }
}
async function invoke(provider: Readonly<DataProvider>, method: keyof DataProvider, params: unknown): Promise<unknown> {
  const call = provider[method];
  if (!call) throw new Error('Missing test capability');
  const result: unknown = Reflect.apply(call, provider, [params]);
  return result;
}
function deferred<T>() {
  let resolve = (_value: T) => {};
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

function identityFixture(native = false, configure?: (provider: DataProvider) => void) {
  const id = Type.Union([Type.String(), Type.Number()]);
  const contract = defineResource('posts', {
    record: Type.Object({ id, title: Type.String(), count: Type.Number() }),
    create: Type.Object({ id: Type.Optional(id), title: Type.String(), count: Type.Number() }),
    update: Type.Object({ id: Type.Optional(id), title: Type.Optional(Type.String()) }),
    delete: Type.Object({ reason: Type.String() }),
  });
  return fixture(configure, { contract, native });
}

describe('strict resource contracts', () => {
  test('strictly compiles captured dispatch and rejects unsafe public assumptions', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const virtualPath = resolve(directory, 'resource-contract.test.virtual.ts');
    const accepted = [
      "import { Type } from '@sinclair/typebox';",
      "import { contractProvider, defineResource, contractFormValues } from './resource-contract';",
      "import type { DataProvider, GetOneResult } from './types';",
      'declare const raw: DataProvider;',
      'const contract = defineResource("posts", { record: Type.Object({ id: Type.Number(), title: Type.String() }), create: Type.Object({ title: Type.String() }) });',
      'const provider = contractProvider(raw, contract);',
      'const result: Promise<GetOneResult> = provider.getOne({ resource: "posts", id: 1 });',
      'const field: unknown = (await result).data["title"];',
      'const form: Record<string, unknown> = contractFormValues(contract, "create", { title: "Hello" });',
    ];
    const rejected = [
      'provider.getOne = async () => ({ data: {} });',
      'provider.getApiUrl = () => "/other";',
      'provider.createMany = async () => ({ data: [] });',
      'provider.custom = async () => ({ data: {} });',
      'provider.getOne({ resource: "posts", id: false });',
      'provider.update({ resource: "posts", variables: {} });',
      'provider.getMany?.({ resource: "posts", ids: [null] });',
      'provider.createMany?.({ resource: "posts", variables: {} });',
      'const assumed: string = (await result).data["title"];',
      'const guessed: Promise<{ data: { id: number } }> = result;',
      'contractProvider(raw, { name: "posts" });',
      'defineResource("unsafe", { record: Type.Object({ id: Type.Number(), field: Type.Unknown() }) });',
    ];
    const options: ts.CompilerOptions = {
      strict: true, noEmit: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, noImplicitOverride: true, skipLibCheck: false,
      types: ['bun', 'svelte', 'node'], target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler, allowImportingTsExtensions: true,
    };
    const host = ts.createCompilerHost(options);
    const read = host.readFile;
    const exists = host.fileExists;
    host.readFile = path => path === virtualPath ? [...accepted, ...rejected].join('\n') : read(path);
    host.fileExists = path => path === virtualPath || exists(path);
    const roots = ['resource-contract.ts', 'resource-contract.test.ts', 'resource-schemas.ts', 'resource-schemas.test.ts',
      'resource-transport-config.ts', 'record-decoder.ts', 'plain-data.ts'].map(path => resolve(directory, path));
    const program = ts.createProgram([...roots, virtualPath], options, host);
    const diagnostics = (path: string) => {
      const source = program.getSourceFile(path);
      if (!source) throw new Error(`Missing source: ${path}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    };
    expect(roots.flatMap(diagnostics).map(item =>
      `${item.file?.fileName}: ${ts.flattenDiagnosticMessageText(item.messageText, '\n')}`)).toEqual([]);
    expect(diagnostics(virtualPath).map(item => item.file && item.start !== undefined
      ? item.file.getLineAndCharacterOfPosition(item.start).line : -1))
      .toEqual(rejected.map((_, index) => accepted.length + index));
  }, 30_000);

  test('rejects explicitly undefined optional form and mutation fields', async () => {
    const { resource, provider, calls } = fixture();
    expect(() => contractFormValues(resource, 'edit', { title: undefined })).toThrow();
    await expect(provider.update({ resource: 'posts', id: 1, variables: { title: undefined } }))
      .rejects.toMatchObject({ statusCode: 422, code: 'INVALID_RESOURCE_INPUT' });
    expect(calls).toHaveLength(0);
    expect(contractFormValues(resource, 'edit', {})).toEqual({});
  });
  test('binds immutable schema snapshots and preserves transport receivers', async () => {
    const { raw, resource, provider, calls, setResponse } = fixture();
    expect(contractProvider(raw, resource)).toBe(provider);
    expect(await provider.getOne({ resource: 'posts', id: 1 })).toEqual({ data: row });
    expect(calls).toHaveLength(1);
    const schema = Type.Object({ id: Type.Number(), title: Type.String() });
    const contract = defineResource('snapshot', { record: schema });
    schema.properties.title.minLength = 100;
    const checked = contractProvider(raw, contract);
    setResponse({ data: { id: 1, title: 'Hello' } });
    await expect(checked.getOne({ resource: 'snapshot', id: 1 })).resolves.toEqual({ data: { id: 1, title: 'Hello' } });
  });

  test.each(['1', null, undefined, true, {}, []].map(id => ({ id })))('rejects invalid IDs before dispatch: %j', async ({ id }) => {
    const { provider, calls } = fixture();
    await expect(invoke(provider, 'getOne', { resource: 'posts', id })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(calls).toHaveLength(0);
  });

  test('rejects cross-resource requests and unknown fields without changing input', async () => {
    const { provider, calls } = fixture();
    await expect(provider.getOne({ resource: 'users', id: 1 })).rejects.toMatchObject({ code: 'RESOURCE_SCHEMA_REQUIRED' });
    const variables = { title: 'Hello', count: 1, isAdmin: true };
    await expect(provider.create({ resource: 'posts', variables })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(variables.isAdmin).toBe(true);
    expect(calls).toHaveLength(0);
  });

  test.each([
    { sorters: [{ field: 'missing', order: 'asc' }] },
    { sorters: [{ field: 'title', order: 'sideways' }] },
    { filters: [{ field: 'count', operator: 'eq', value: '2' }] },
    { filters: [{ field: 'count', operator: 'contains', value: 2 }] },
    { filters: [{ field: 'title', operator: 'unknown', value: 'a' }] },
    { filters: [{ operator: 'and', value: [{ field: 'missing', operator: 'eq', value: 1 }] }] },
    { filters: [{ field: 'count', operator: 'between', value: [1] }] },
    { pagination: { current: 0 } },
  ])('validates query parameters from untrusted URLs: %j', async params => {
    const { provider, calls } = fixture();
    await expect(invoke(provider, 'getList', { resource: 'posts', ...params })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(calls).toHaveLength(0);
  });

  test('accepts nested filters, sorters, and pagination', async () => {
    const { provider, calls, setResponse } = fixture();
    setResponse({ data: [row], total: 1 });
    await provider.getList({
      resource: 'posts', pagination: { current: 1, pageSize: 10 },
      sorters: [{ field: 'count', order: 'desc' }],
      filters: [{ operator: 'or', value: [{ field: 'count', operator: 'between', value: [1, 3] }] }],
    });
    expect(calls).toHaveLength(1);
  });

  test('validates a complete fallback batch before the first write', async () => {
    const { provider, calls } = fixture();
    await expect(provider.createMany?.({
      resource: 'posts', variables: [{ title: 'Hello', count: 1 }, { title: 'bad', count: 'bad' }],
    })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    await expect(provider.updateMany?.({
      resource: 'posts', ids: [1, 'bad'], variables: { title: 'Hello' },
    })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    await expect(provider.deleteMany?.({
      resource: 'posts', ids: [1, 'bad'], variables: { reason: 'duplicate' },
    })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(calls).toHaveLength(0);
  });

  test('runs valid fallbacks and forwards deletion variables', async () => {
    const { provider, calls } = fixture();
    expect(await provider.createMany?.({ resource: 'posts', variables: [{ title: 'Hello', count: 1 }] })).toEqual({ data: [row] });
    expect(await provider.getMany?.({ resource: 'posts', ids: [1] })).toEqual({ data: [row] });
    expect(await provider.updateMany?.({ resource: 'posts', ids: [1], variables: { title: 'Hello' } })).toEqual({ data: [row] });
    expect(await provider.deleteMany?.({ resource: 'posts', ids: [1], variables: { reason: 'duplicate' } })).toEqual({ data: [row] });
    expect(calls.at(-1)?.params).toMatchObject({ variables: { reason: 'duplicate' } });
  });

  test('rejects response additions and malformed writes with an uncertain-write marker', async () => {
    const { provider, setResponse } = fixture();
    setResponse({ data: { ...row, isAdmin: true } });
    await expect(provider.getOne({ resource: 'posts', id: 1 })).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    await expect(provider.create({ resource: 'posts', variables: { title: 'Hello', count: 1 } })).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true },
    });
  });

  test('rejects forged contracts and unconstrained schemas', () => {
    const { raw } = fixture();
    expect(() => Reflect.apply(contractProvider, undefined, [raw, { name: 'posts' }])).toThrow();
    for (const value of [Type.Any(), Type.Unknown(), Type.Object({ nested: Type.Any() }), Type.Array(Type.Any())]) {
      expect(() => Reflect.apply(defineResource, undefined, ['unsafe', { record: Type.Object({ id: Type.Number(), value }) }])).toThrow();
    }
    expect(() => Reflect.apply(defineResource, undefined, ['unsafe', { record: Type.Object({ id: Type.Optional(Type.Number()) }) }])).toThrow();
    expect(() => Reflect.apply(defineResource, undefined, ['unsafe', { record: Type.Object({ id: Type.Number() }, { additionalProperties: true }) }])).toThrow();
  });

  test('keeps separate contracts and unchecked queries out of each others caches', () => {
    const { resource } = fixture();
    const another = defineResource('posts', { record });
    const key = keys({ contract: contractKey(resource) }).data.list('posts');
    expect(queryKeyMatches(key, { resource: 'posts' })).toBe(false);
    expect(queryKeyMatches(key, { resource: 'posts', contract: contractKey(resource) })).toBe(true);
    expect(queryKeyMatches(key, { resource: 'posts', contract: contractKey(another) })).toBe(false);
    expect(queryKeyMatches(keys().data.list('posts'), { resource: 'posts', contract: contractKey(resource) })).toBe(false);
  });

  test('projects edit records onto the writable form schema', () => {
    const { resource } = fixture();
    expect(contractFormValues(resource, 'edit', row)).toEqual({ title: 'Hello' });
    expect(() => contractFormValues(resource, 'create', { title: 'Hello' })).toThrow();
  });

  test('ignores unrelated getters and exposes a frozen contract surface', async () => {
    let reads = 0;
    const { raw, resource, provider } = fixture(raw => {
      Object.defineProperty(raw, 'unrelated', { enumerable: true, get() { reads++; throw new Error('secret'); } });
    });
    expect(reads).toBe(0);
    expect(Object.isFrozen(provider)).toBe(true);
    expect(Reflect.set(provider, 'getOne', async () => ({ data: {} }))).toBe(false);
    expect(Reflect.deleteProperty(provider, 'getOne')).toBe(false);
    expect(Reflect.set(provider, 'escape', () => ({}))).toBe(false);
    expect(contractProvider(raw, resource)).toBe(provider);
    await expect(provider.getOne({ resource: 'posts', id: 1 })).resolves.toEqual({ data: row });
    await expect(provider.custom?.({ url: '/unchecked', method: 'get' })).rejects.toMatchObject({ code: 'RESOURCE_SCHEMA_REQUIRED' });
    expect(reads).toBe(0);
  });

  test.each(['getApiUrl', 'getList', 'getOne', 'create', 'update', 'deleteOne', ...batchMethods, 'custom'])(
    'rejects accessor-backed capabilities without invoking them: %s', method => {
      let reads = 0;
      expect(() => fixture(raw => {
        Object.defineProperty(raw, method, { enumerable: true, get() { reads++; return () => ({}); } });
      })).toThrow('Invalid resource provider');
      expect(reads).toBe(0);
    },
  );

  test('captures direct CRUD and URL methods before first use', async () => {
    const { raw, provider, calls, setResponse } = fixture();
    for (const method of ['getApiUrl', 'getList', 'getOne', 'create', 'update', 'deleteOne']) {
      Object.defineProperty(raw, method, { get() { throw new Error('Replacement must not be read'); } });
    }
    expect(provider.getApiUrl()).toBe('/api');
    await provider.getOne({ resource: 'posts', id: 1 });
    await provider.create({ resource: 'posts', variables: { title: 'Hello', count: 1 } });
    await provider.update({ resource: 'posts', id: 1, variables: { title: 'Hello' } });
    await provider.deleteOne({ resource: 'posts', id: 1, variables: { reason: 'duplicate' } });
    setResponse({ data: [row], total: 1 });
    await provider.getList({ resource: 'posts' });
    expect(calls.map(call => call.method)).toEqual(['getOne', 'create', 'update', 'deleteOne', 'getList']);
  });

  test.each(batchMethods)('captures native batch capabilities and receiver: %s', async method => {
    let nativeCalls = 0;
    const { raw, provider, calls } = fixture(raw => {
      Reflect.set(raw, method, function (this: DataProvider) {
        expect(this).toBe(raw);
        nativeCalls++;
        return Promise.resolve({ data: rows });
      });
    });
    await expect(invoke(provider, method, batchRequest(method))).resolves.toEqual({ data: rows });
    Object.defineProperty(raw, method, { get() { throw new Error('Changed native method'); } });
    await expect(invoke(provider, method, batchRequest(method))).resolves.toEqual({ data: rows });
    expect(nativeCalls).toBe(2);
    expect(calls).toHaveLength(0);
  });

  test.each(batchMethods)('retains fallback availability and captured single method: %s', async method => {
    const { raw, provider, calls } = fixture();
    Object.defineProperty(raw, method, { get() { throw new Error('Added native method'); } });
    Object.defineProperty(raw, singles[method], { get() { throw new Error('Changed single method'); } });
    await expect(invoke(provider, method, batchRequest(method))).resolves.toEqual({ data: rows });
    expect(calls.map(call => call.method)).toEqual([singles[method], singles[method]]);
  });

  test.each(batchMethods)('passes isolated closed single-operation requests: %s', async method => {
    const seen: unknown[] = [];
    const { provider } = fixture(raw => {
      Reflect.set(raw, singles[method], async (params: unknown) => {
        seen.push(structuredClone(params));
        if (typeof params !== 'object' || params === null) throw new Error('Expected request');
        expect(Reflect.has(params, 'ids')).toBe(false);
        const meta: unknown = Reflect.get(params, 'meta');
        if (typeof meta === 'object' && meta !== null) Reflect.set(meta, 'tenant', 'changed');
        const variables: unknown = Reflect.get(params, 'variables');
        if (typeof variables === 'object' && variables !== null) Reflect.set(variables, 'injected', true);
        return { data: { ...row, id: seen.length } };
      });
    });
    const request = batchRequest(method);
    const before = structuredClone(request);
    await expect(invoke(provider, method, request)).resolves.toEqual({ data: rows });
    expect(request).toEqual(before);
    const common = { resource: 'posts', meta: { tenant: 'first' } };
    const expected = method === 'createMany'
      ? [{ ...common, variables: { title: 'Hello', count: 1 } }, { ...common, variables: { title: 'Second', count: 2 } }]
      : [1, 2].map(id => ({
        ...common, id,
        ...(method === 'updateMany' ? { variables: { title: 'Hello' } } : {}),
        ...(method === 'deleteMany' ? { variables: { reason: 'duplicate' } } : {}),
      }));
    expect(seen).toEqual(expected);
  });

  test.each(batchMethods)('rejects hostile fallback receipts without evaluating data: %s', async method => {
    const { provider, calls, setResponse } = fixture();
    let reads = 0;
    setResponse({ get data() { reads++; return row; } });
    const failure = method === 'deleteMany'
      ? { name: 'DeleteManyPartialError', succeededIds: [], failedIds: [1, 2],
        causes: [expect.objectContaining({ details: expect.objectContaining({ writeMayHaveSucceeded: true }) }),
          expect.objectContaining({ code: 'INVALID_PROVIDER_RESPONSE' })] }
      : { code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: method !== 'getMany' } };
    await expect(invoke(provider, method, batchRequest(method))).rejects.toMatchObject(failure);
    expect(reads).toBe(0);
    expect(calls).toHaveLength(2);
  });

  test.each(batchMethods)('validates every fallback record before aggregation: %s', async method => {
    const { provider, setResponse } = fixture();
    setResponse({ data: { ...row, count: 'invalid' } });
    await expect(invoke(provider, method, batchRequest(method))).rejects.toMatchObject(
      method === 'deleteMany'
        ? { name: 'DeleteManyPartialError', failedIds: [1, 2] }
        : { code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: method !== 'getMany' } },
    );
  });

  test.each(batchMethods)('waits for all started fallback operations before rejecting: %s', async method => {
    const gate = deferred<{ data: typeof row }>();
    const failure = new Error('First operation failed');
    let started = 0;
    const { provider } = fixture(raw => {
      Reflect.set(raw, singles[method], async () => {
        started++;
        if (started === 1) throw failure;
        return gate.promise;
      });
    });
    let settled = false;
    const outcome = invoke(provider, method, batchRequest(method)).then(
      () => { settled = true; return undefined; },
      (cause: unknown) => { settled = true; return cause; },
    );
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(started).toBe(2);
    const premature = settled;
    gate.resolve({ data: { ...row, id: 2 } });
    const cause = await outcome;
    expect(premature).toBe(false);
    if (method === 'deleteMany') {
      expect(cause).toBeInstanceOf(DeleteManyPartialError);
      expect(cause).toMatchObject({ succeededIds: [2], failedIds: [1],
        causes: [expect.objectContaining({ code: 'RESOURCE_PROVIDER_FAILED',
          details: expect.objectContaining({ writeMayHaveSucceeded: true }) })] });
    } else expect(cause).toMatchObject({
      code: 'RESOURCE_PROVIDER_FAILED', details: { writeMayHaveSucceeded: method !== 'getMany' },
    });
    expect(cause).not.toBe(failure);
  });

  test('retains successful delete IDs alongside uncertain invalid receipts', async () => {
    const { provider } = fixture(raw => {
      raw.deleteOne = async params => ({ data: params.id === 1 ? row : { id: 2, title: 'Invalid' } });
    });
    await expect(provider.deleteMany?.({ resource: 'posts', ids: [1, 2], variables: { reason: 'duplicate' } }))
      .rejects.toMatchObject({
        name: 'DeleteManyPartialError', succeededIds: [1], failedIds: [2],
        causes: [expect.objectContaining({ code: 'INVALID_PROVIDER_RESPONSE',
          details: expect.objectContaining({ writeMayHaveSucceeded: true }) })],
      });
  });

  test('supports delete fallbacks without a request body', async () => {
    const { raw, calls } = fixture();
    const provider = contractProvider(raw, defineResource('posts', { record }));
    await expect(provider.deleteMany?.({ resource: 'posts', ids: [1, 2], variables: undefined }))
      .resolves.toEqual({ data: rows });
    expect(calls.map(call => call.params)).toEqual([{ resource: 'posts', id: 1 }, { resource: 'posts', id: 2 }]);
  });

  test.each(batchMethods)('accepts empty fallback batches without dispatch: %s', async method => {
    const { provider, calls } = fixture();
    const request = { ...batchRequest(method), ...(method === 'createMany' ? { variables: [] } : { ids: [] }) };
    await expect(invoke(provider, method, request)).resolves.toEqual({ data: [] });
    expect(calls).toHaveLength(0);
  });

  test.each(singleMethods)(
    'rejects wrong single-receipt identities and preserves ID types: %s', async method => {
      const { provider, setResponse, calls } = identityFixture();
      const params = {
        resource: 'posts',
        ...(method === 'create' ? { variables: { id: 1, title: 'Hello', count: 1 } } : { id: 1 }),
        ...(method === 'update' ? { variables: { title: 'Hello' } } : {}),
        ...(method === 'deleteOne' ? { variables: { reason: 'duplicate' } } : {}),
      };
      for (const id of [2, '1']) {
        setResponse({ data: { ...row, id, title: 'untrusted-row' } });
        const failure = await invoke(provider, method, params).catch((cause: unknown) => cause);
        expect(failure).toMatchObject({
          code: 'INVALID_PROVIDER_RESPONSE', statusCode: 502,
          details: { resource: 'posts', operation: method, phase: 'response', writeMayHaveSucceeded: method !== 'getOne' },
        });
        expect(JSON.stringify(failure)).not.toContain('untrusted-row');
      }
      expect(calls).toHaveLength(2);
      setResponse({ data: row });
      await expect(invoke(provider, method, params)).resolves.toEqual({ data: row });
    },
  );

  test.each(identityBatchMethods.flatMap(method => [
    { label: 'missing', ids: [1] },
    { label: 'extra', ids: [1, 2, 3] },
    { label: 'duplicate', ids: [1, 1] },
    { label: 'unrequested', ids: [1, 3] },
    { label: 'wrong type', ids: [1, '2'] },
    { label: 'empty', ids: [] },
  ].map(value => ({ method, ...value }))))('rejects invalid native batch identity sets: %j', async ({ method, ids }) => {
    const { provider, setResponse, calls } = identityFixture(true);
    setResponse({ data: ids.map(id => ({ ...row, id })) });
    await expect(invoke(provider, method, batchRequest(method))).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE',
      details: { operation: method, writeMayHaveSucceeded: method !== 'getMany' },
    });
    expect(calls).toHaveLength(1);
  });

  test.each(identityBatchMethods)(
    'accepts reordered complete native identity sets without conflating ID types: %s', async method => {
      const { provider, setResponse } = identityFixture(true);
      const data = [{ ...row, id: '1' }, row];
      setResponse({ data });
      await expect(invoke(provider, method, { ...batchRequest(method), ids: [1, '1'] })).resolves.toEqual({ data });
    },
  );

  test.each(identityBatchMethods)(
    'does not let a correct aggregate identity set hide swapped fallback receipts: %s', async method => {
      const { provider } = identityFixture(false, raw => {
        Reflect.set(raw, singles[method], async (params: { id: string | number }) =>
          ({ data: { ...row, id: params.id === 1 ? 2 : 1 } }));
      });
      await expect(invoke(provider, method, batchRequest(method))).rejects.toMatchObject(
        method === 'deleteMany'
          ? { name: 'DeleteManyPartialError', succeededIds: [], failedIds: [1, 2],
            causes: [expect.objectContaining({ code: 'INVALID_PROVIDER_RESPONSE' }),
              expect.objectContaining({ details: expect.objectContaining({ writeMayHaveSucceeded: true }) })] }
          : { code: 'INVALID_PROVIDER_RESPONSE', details: { operation: method, writeMayHaveSucceeded: method !== 'getMany' } },
      );
    },
  );

  test.each([false, true].flatMap(native =>
    identityBatchMethods.map(method => ({ native, method }))))(
    'rejects duplicate target IDs before native or fallback dispatch: %j', async ({ native, method }) => {
      const { provider, calls } = identityFixture(native);
      await expect(invoke(provider, method, { ...batchRequest(method), ids: [1, 1] })).rejects.toMatchObject({
        code: 'INVALID_RESOURCE_INPUT', details: { writeMayHaveSucceeded: false },
      });
      expect(calls).toHaveLength(0);
    },
  );

  test.each([false, true])('rejects conflicting update IDs before the first write (native=%s)', async native => {
    const { provider, calls } = identityFixture(native);
    for (const id of [2, '1']) {
      await expect(provider.update({ resource: 'posts', id: 1, variables: { id } })).rejects.toMatchObject({
        code: 'INVALID_RESOURCE_INPUT', details: { writeMayHaveSucceeded: false },
      });
    }
    await expect(provider.updateMany?.({ resource: 'posts', ids: [1, 2], variables: { id: 1 } })).rejects.toMatchObject({
      code: 'INVALID_RESOURCE_INPUT', details: { writeMayHaveSucceeded: false },
    });
    expect(calls).toHaveLength(0);
  });

  test('accepts an unchanged update ID', async () => {
    const { provider } = identityFixture();
    await expect(provider.update({ resource: 'posts', id: '1', variables: { id: '1' } }))
      .resolves.toEqual({ data: { ...row, id: '1' } });
    await expect(provider.updateMany?.({ resource: 'posts', ids: [1], variables: { id: 1 } }))
      .resolves.toEqual({ data: [row] });
  });

  test.each([false, true])('rejects duplicate supplied create IDs before writes (native=%s)', async native => {
    const { provider, calls } = identityFixture(native);
    await expect(provider.createMany?.({ resource: 'posts', variables: [
      { id: 1, title: 'First', count: 1 }, { title: 'Generated', count: 2 }, { id: 1, title: 'Last', count: 3 },
    ] })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT', details: { writeMayHaveSucceeded: false } });
    expect(calls).toHaveLength(0);
  });

  test('validates supplied create IDs against the record ID schema before dispatch', async () => {
    const contract = defineResource('posts', {
      record,
      create: Type.Object({ id: Type.Optional(Type.Union([Type.Number(), Type.String()])), title: Type.String(), count: Type.Number() }),
    });
    const { provider, calls } = fixture(undefined, { contract });
    const variables = { id: '1', title: 'Invalid ID type', count: 1 };
    await expect(provider.create({ resource: 'posts', variables })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    await expect(provider.createMany?.({ resource: 'posts', variables: [{ title: 'Valid', count: 1 }, variables] }))
      .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(calls).toHaveLength(0);
  });

  test.each([
    { label: 'missing', ids: [1] }, { label: 'extra', ids: [1, 2, 3] },
    { label: 'duplicate generated ID', ids: [1, 1] },
  ])('rejects invalid native create counts and identities: %j', async ({ ids }) => {
    const { provider, setResponse } = identityFixture(true);
    setResponse({ data: ids.map(id => ({ ...row, id })) });
    await expect(invoke(provider, 'createMany', batchRequest('createMany'))).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { operation: 'createMany', writeMayHaveSucceeded: true },
    });
  });

  test('rejects duplicate generated IDs after every create fallback settles', async () => {
    const { provider, setResponse, calls } = identityFixture();
    setResponse({ data: row });
    await expect(invoke(provider, 'createMany', batchRequest('createMany'))).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true },
    });
    expect(calls).toHaveLength(2);
  });

  test.each([false, true])('rejects swapped caller-supplied create receipts (native=%s)', async native => {
    let count = 0;
    const { provider } = identityFixture(native, raw => {
      if (native) raw.createMany = async () => ({ data: [{ ...row, id: 2 }, row] });
      else raw.create = async () => ({ data: { ...row, id: ++count === 1 ? 2 : 1 } });
    });
    await expect(provider.createMany?.({ resource: 'posts', variables: [
      { id: 1, title: 'First', count: 1 }, { id: 2, title: 'Second', count: 2 },
    ] })).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true } });
    if (!native) expect(count).toBe(2);
  });

  test('accepts mixed supplied and generated create identities without coercion', async () => {
    const { provider, setResponse } = identityFixture(true);
    const data = [row, { ...row, id: '1' }, { ...row, id: 10 }];
    setResponse({ data });
    await expect(provider.createMany?.({ resource: 'posts', variables: [
      { id: 1, title: 'Numeric', count: 1 }, { id: '1', title: 'String', count: 2 }, { title: 'Generated', count: 3 },
    ] })).resolves.toEqual({ data });
  });

  test('does not treat wrong-identity deletes as confirmed successes', async () => {
    const { provider } = identityFixture(false, raw => {
      raw.deleteOne = async () => ({ data: row });
    });
    await expect(invoke(provider, 'deleteMany', batchRequest('deleteMany'))).rejects.toMatchObject({
      name: 'DeleteManyPartialError', succeededIds: [1], failedIds: [2],
      causes: [expect.objectContaining({
        code: 'INVALID_PROVIDER_RESPONSE', details: expect.objectContaining({ operation: 'deleteMany', writeMayHaveSucceeded: true }),
      })],
    });
  });

  test('rejects duplicate list identities but preserves distinct typed IDs and detached extensions', async () => {
    const { provider, setResponse } = identityFixture();
    setResponse({ data: [row, row], total: 2 });
    await expect(provider.getList({ resource: 'posts' })).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { operation: 'getList', writeMayHaveSucceeded: false },
    });
    const response = { data: [row, { ...row, id: '1' }], total: 2, cursor: { token: 'next' } };
    setResponse(response);
    const result = await provider.getList({ resource: 'posts' });
    expect(result).toEqual(response);
    response.cursor.token = 'changed';
    expect(result['cursor']).toEqual({ token: 'next' });
  });

  test.each(batchMethods)('validates empty native receipts without inventing records: %s', async method => {
    const { provider, setResponse } = identityFixture(true);
    const params = { ...batchRequest(method), ...(method === 'createMany' ? { variables: [] } : { ids: [] }) };
    setResponse({ data: [] });
    await expect(invoke(provider, method, params)).resolves.toEqual({ data: [] });
    setResponse({ data: [row] });
    await expect(invoke(provider, method, params)).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: method !== 'getMany' },
    });
  });

  test.each(singleMethods)('checks the original identity when a single transport mutates its request: %s', async method => {
    const { provider } = identityFixture(false, raw => {
      Reflect.set(raw, method, async (params: { id?: string | number; variables?: { id?: string | number } }) => {
        if (method === 'create') {
          if (!params.variables) throw new Error('Expected create variables');
          params.variables.id = 9;
        } else params.id = 9;
        return { data: { ...row, id: 9 } };
      });
    });
    const request = {
      resource: 'posts',
      ...(method === 'create' ? { variables: { id: 1, title: 'Hello', count: 1 } } : { id: 1 }),
      ...(method === 'update' ? { variables: { title: 'Hello' } } : {}),
      ...(method === 'deleteOne' ? { variables: { reason: 'duplicate' } } : {}),
    };
    const before = structuredClone(request);
    await expect(invoke(provider, method, request)).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: method !== 'getOne' },
    });
    expect(request).toEqual(before);
  });

  test.each(identityBatchMethods)('checks the original identity set when a native transport changes target IDs: %s', async method => {
    const { provider } = identityFixture(true, raw => {
      Reflect.set(raw, method, async (params: { ids: (string | number)[] }) => {
        params.ids.splice(0, params.ids.length, 3, 4);
        return { data: params.ids.map(id => ({ ...row, id })) };
      });
    });
    const request = batchRequest(method);
    const before = structuredClone(request);
    await expect(invoke(provider, method, request)).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: method !== 'getMany' },
    });
    expect(request).toEqual(before);
  });

  test('retains supplied native create identities when the transport rewrites its copied variables', async () => {
    const { provider } = identityFixture(true, raw => {
      Reflect.set(raw, 'createMany', async (params: { variables: { id: number }[] }) => {
        for (const variable of params.variables) variable.id += 10;
        return { data: params.variables.map(variable => ({ ...row, id: variable.id })) };
      });
    });
    const request = { resource: 'posts', variables: [
      { id: 1, title: 'First', count: 1 }, { id: 2, title: 'Second', count: 2 },
    ] };
    const before = structuredClone(request);
    await expect(provider.createMany?.(request)).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true },
    });
    expect(request).toEqual(before);
  });

  test('retains caller IDs while a native response is pending', async () => {
    const gate = deferred<{ data: typeof rows }>();
    const { provider } = identityFixture(true, raw => {
      raw.getMany = async () => gate.promise;
    });
    const request = { resource: 'posts', ids: [1, 2] };
    const pending = provider.getMany?.(request);
    request.ids.splice(0, 2, 3, 4);
    gate.resolve({ data: rows });
    await expect(pending).resolves.toEqual({ data: rows });
  });

  test.each(singleMethods.flatMap(method => [0, ''].map(id => ({ method, id }))))(
    'does not skip falsy supplied or target identities: %j', async ({ method, id }) => {
      const { provider, setResponse } = identityFixture();
      const params = {
        resource: 'posts',
        ...(method === 'create' ? { variables: { id, title: 'Hello', count: 1 } } : { id }),
        ...(method === 'update' ? { variables: { title: 'Hello' } } : {}),
        ...(method === 'deleteOne' ? { variables: { reason: 'duplicate' } } : {}),
      };
      setResponse({ data: row });
      await expect(invoke(provider, method, params)).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
      const data = { ...row, id };
      setResponse({ data });
      await expect(invoke(provider, method, params)).resolves.toEqual({ data });
    },
  );

  test('checks an explicitly supplied update ID even for an empty native batch', async () => {
    const contract = defineResource('posts', {
      record,
      update: Type.Object({ id: Type.Optional(Type.Union([Type.Number(), Type.String()])) }),
    });
    const { provider, calls } = fixture(undefined, { contract, native: true });
    await expect(provider.updateMany?.({ resource: 'posts', ids: [], variables: { id: 'invalid' } }))
      .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT', details: { writeMayHaveSucceeded: false } });
    expect(calls).toHaveLength(0);
  });
});

describe('strict command contracts', () => {
  test('rejects explicitly undefined optional command fields from JavaScript callers', async () => {
    const { raw, calls, setResponse } = fixture();
    const optional = defineCommand('optional', {
      url: '/optional', method: 'post',
      input: Type.Object({ label: Type.Optional(Type.String()) }),
      output: Type.Object({ count: Type.Optional(Type.Number()) }),
    });
    const pending: unknown = Reflect.apply(executeCommand, undefined, [raw, optional, { label: undefined }]);
    await expect(pending).rejects.toMatchObject({ code: 'INVALID_COMMAND_INPUT' });
    expect(calls).toHaveLength(0);
    setResponse({ data: { count: undefined } });
    await expect(executeCommand(raw, optional, {})).rejects.toMatchObject({
      code: 'INVALID_COMMAND_RESPONSE', details: { writeMayHaveSucceeded: true },
    });
    setResponse({ data: {} });
    await expect(executeCommand(raw, optional, {})).resolves.toEqual({ data: {} });
  });
  const command = defineCommand('report', {
    url: '/report', method: 'get', input: Type.Object({ year: Type.Number() }),
    output: Type.Object({ count: Type.Number() }),
  });
  test('validates input and binds the endpoint before sending', async () => {
    const { raw, calls, setResponse } = fixture();
    const invalid: unknown = Reflect.apply(executeCommand, undefined, [raw, command, { year: 'bad' }]);
    await expect(invalid).rejects.toMatchObject({ code: 'INVALID_COMMAND_INPUT' });
    expect(calls).toHaveLength(0);
    setResponse({ data: { count: 2 } });
    expect(await executeCommand(raw, command, { year: 2026 })).toEqual({ data: { count: 2 } });
    expect(calls[0]?.params).toEqual({ url: '/report', method: 'get', query: { year: 2026 } });
  });
  test('rejects malformed command responses and forged commands', async () => {
    const { raw, setResponse } = fixture();
    setResponse({ data: { count: 'bad' } });
    await expect(executeCommand(raw, command, { year: 2026 })).rejects.toMatchObject({ code: 'INVALID_COMMAND_RESPONSE' });
    const forged: unknown = Reflect.apply(executeCommand, undefined, [raw, { name: 'forged' }, {}]);
    await expect(forged).rejects.toMatchObject({ code: 'INVALID_COMMAND_CONTRACT' });
  });
  test('marks write responses as uncertain without exposing rejected values', async () => {
    const { raw } = fixture();
    const write = defineCommand('write', {
      url: '/write', method: 'post', input: Type.Object({ name: Type.String() }), output: Type.Boolean(),
    });
    await expect(executeCommand(raw, write, { name: 'Hello' })).rejects.toMatchObject({
      code: 'INVALID_COMMAND_RESPONSE', details: { writeMayHaveSucceeded: true },
    });
  });
});
