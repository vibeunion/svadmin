import { describe, expect, test } from 'bun:test';
import { Kind, Type } from '@sinclair/typebox';
import { withResourceSchemas, createResourceRequestValidator } from './resource-schemas';
import { DeleteManyPartialError, HttpError } from './types';
import type { DataProvider } from './types';
import ts from 'typescript';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineResource, contractProvider } from './resource-contract';

const RecordSchema = Type.Object({
  id: Type.Number(),
  title: Type.String(),
}, { additionalProperties: false });
const CreateSchema = Type.Omit(RecordSchema, ['id']);
const UpdateSchema = Type.Partial(CreateSchema);
const schemas = { posts: { record: RecordSchema, create: CreateSchema, update: UpdateSchema } };
const row = { id: 1, title: 'Hello' };

function fixture() {
  let response: unknown = { data: row };
  let failure: unknown;
  let failed = false;
  const calls: { operation: string; params: unknown }[] = [];

  async function respond(receiver: DataProvider, operation: string, params: unknown): Promise<unknown> {
    expect(receiver).toBe(raw);
    calls.push({ operation, params });
    if (failed) throw failure;
    return response;
  }

  const raw: DataProvider = {
    getApiUrl() {
      expect(this).toBe(raw);
      return '/api';
    },
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: row }),
    create: async () => ({ data: row }),
    update: async () => ({ data: row }),
    deleteOne: async () => ({ data: row }),
  };
  // Exercise an untrusted JavaScript transport without claiming its payload has a generic type.
  for (const operation of ['getList', 'getOne', 'getMany', 'create', 'createMany',
    'update', 'updateMany', 'deleteOne', 'deleteMany', 'custom']) {
    Reflect.set(raw, operation, function (this: DataProvider, params: unknown) { return respond(this, operation, params); });
  }
  return {
    raw,
    calls,
    provider: withResourceSchemas(raw, schemas),
    setResponse(value: unknown) { response = value; },
    setFailure(error: unknown) { failure = error; failed = true; },
  };
}

const operations = ['getList', 'getOne', 'getMany', 'create', 'createMany',
  'update', 'updateMany', 'deleteOne', 'deleteMany'] as const;
type Operation = typeof operations[number];
function requestFor(operation: Operation): Record<string, unknown> {
  const common = { resource: 'posts', meta: { tenantId: 'first' } };
  switch (operation) {
    case 'getList': return { ...common, filters: [{ field: 'id', operator: 'in', value: [1, 2] }] };
    case 'getOne': case 'deleteOne': return { ...common, id: 1 };
    case 'getMany': case 'deleteMany': return { ...common, ids: [1, 2] };
    case 'create': return { ...common, variables: { title: 'Hello' } };
    case 'createMany': return { ...common, variables: [{ title: 'Hello' }, { title: 'Second' }] };
    case 'update': return { ...common, id: 1, variables: { title: 'Hello' } };
    case 'updateMany': return { ...common, ids: [1, 2], variables: { title: 'Hello' } };
  }
}
function responseFor(operation: Operation) {
  const row = { id: 1, title: 'Hello' };
  return operation === 'getList' ? { data: [row], total: 1 }
    : operation.endsWith('Many') ? { data: [row] } : { data: row };
}
async function invoke(provider: DataProvider, operation: Operation, params: unknown): Promise<unknown> {
  const method = provider[operation];
  if (typeof method !== 'function') throw new Error('Missing fixture capability');
  const result: unknown = Reflect.apply(method, provider, [params]);
  return result;
}
function deferred<T>() {
  let resolve = (_value: T) => {};
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
async function rejected(pending: Promise<unknown>): Promise<HttpError> {
  try { await pending; }
  catch (cause: unknown) {
    if (cause instanceof HttpError) return cause;
    throw new Error('Expected a checked HttpError', { cause });
  }
  throw new Error('Expected rejection');
}
function contractFixture(fallback = false) {
  const context = fixture();
  if (fallback) {
    for (const method of ['getMany', 'createMany', 'updateMany', 'deleteMany']) Reflect.deleteProperty(context.raw, method);
  }
  const resource = defineResource('posts', { record: RecordSchema, create: CreateSchema, update: UpdateSchema });
  return { ...context, provider: contractProvider(context.raw, resource) };
}

class ClassTransport {
  #title = 'Class record';
  getApiUrl() { return '/class-api'; }
  async getList() { return { data: [{ id: 1, title: this.#title }], total: 1 }; }
  async getOne() { return { data: { id: 1, title: this.#title } }; }
  async create() { return this.getOne(); }
  async update() { return this.getOne(); }
  async deleteOne() { return this.getOne(); }
}

describe('withResourceSchemas', () => {
  test('strictly compiles transport boundaries and rejects unsafe public result assumptions', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const virtualPath = resolve(directory, 'resource-schemas.test.virtual.ts');
    const accepted = [
      "import { Type } from '@sinclair/typebox';",
      "import { withResourceSchemas, createResourceRequestValidator } from './resource-schemas';",
      "import type { DataProvider, GetOneResult, GetListResult } from './types';",
      'declare const raw: DataProvider;',
      'const provider = withResourceSchemas(raw, { posts: { record: Type.Object({ id: Type.Number() }) } });',
      'const one: Promise<GetOneResult> = provider.getOne({ resource: "posts", id: 1 });',
      'const list: Promise<GetListResult> = provider.getList({ resource: "posts", filters: [{ operator: "and", value: [{ field: "id", operator: "in", value: [1] }] }] });',
      'const dynamic: unknown = (await provider.getOne({ resource: "posts", id: 1 })).data["id"];',
      'const prepare = createResourceRequestValidator({ posts: { record: Type.Object({ id: Type.Number() }) } });',
      'declare const untrusted: unknown;',
      'const capturedId: string | number = prepare("getOne", untrusted).id;',
      'const capturedInput: unknown = prepare("create", untrusted).variables;',
      'const capturedIds: (string | number)[] = prepare("getMany", untrusted).ids;',
    ];
    const rejected = [
      'provider.getOne({ resource: "posts", id: true });',
      'provider.getOne({ resource: "posts" });',
      'provider.create({ resource: "posts" });',
      'provider.update({ resource: "posts", variables: {} });',
      'provider.deleteOne({ resource: "posts", id: {} });',
      'provider.getList({ resource: "posts", filters: [{ field: "id", operator: "invalid", value: 1 }] });',
      'provider.getList({ resource: "posts", sorters: [{ field: "id", order: "up" }] });',
      'provider.getList({ resource: "posts", pagination: { current: "1" } });',
      'if (provider.getMany) provider.getMany({ resource: "posts", ids: [false] });',
      'if (provider.createMany) provider.createMany({ resource: "posts", variables: {} });',
      'const assumed: number = (await provider.getOne({ resource: "posts", id: 1 })).data["id"];',
      'const guessed: Promise<{ data: { id: number } }> = provider.getOne({ resource: "posts", id: 1 });',
      'provider.getOne = async () => ({ data: {} });',
      'provider.getApiUrl = () => "/other";',
      'provider.custom = async () => ({ data: {} });',
      'provider.createMany = async () => ({ data: [] });',
      'prepare("unchecked", untrusted);',
      'prepare("getOne", untrusted).variables;',
      'prepare("getMany", untrusted).id;',
      'const guessedInput: { title: string } = prepare("create", untrusted).variables;',
      'const guessedId: number = prepare("getOne", untrusted).id;',
      'prepare<"getOne">("getMany", untrusted);',
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
    const roots = ['resource-schemas.ts', 'resource-transport-config.ts', 'resource-schemas.test.ts', 'resource-contract.ts', 'resource-contract.test.ts',
      'record-decoder.ts', 'plain-data.ts'].map(path => resolve(directory, path));
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

  test('rejects explicitly undefined optional input and response fields', async () => {
    const { raw, calls, setResponse } = fixture();
    const provider = withResourceSchemas(raw, {
      posts: {
        record: Type.Object({ id: Type.Number(), title: Type.Optional(Type.String()) }),
        update: UpdateSchema,
      },
    });
    await expect(provider.update({ resource: 'posts', id: 1, variables: { title: undefined } }))
      .rejects.toMatchObject({ statusCode: 422, code: 'INVALID_RESOURCE_INPUT' });
    expect(calls).toHaveLength(0);
    setResponse({ data: { id: 1, title: undefined } });
    await expect(provider.getOne({ resource: 'posts', id: 1 }))
      .rejects.toMatchObject({ statusCode: 502, code: 'INVALID_PROVIDER_RESPONSE' });
    setResponse({ data: { id: 1 } });
    await expect(provider.update({ resource: 'posts', id: 1, variables: {} }))
      .resolves.toEqual({ data: { id: 1 } });
  });
  test('preserves valid values and list extension fields while detaching parameters and responses', async () => {
    const { provider, calls, setResponse } = fixture();
    const response = { data: [row], total: 1, summary: { published: 1 } };
    const params = { resource: 'posts', meta: { tenantId: 'tenant-1' }, pagination: { pageSize: 20 } };
    setResponse(response);
    const result = await provider.getList(params);
    expect(result).toEqual(response);
    expect(result).not.toBe(response);
    expect(result.data).not.toBe(response.data);
    expect(result['summary']).not.toBe(response.summary);
    expect(calls).toEqual([{ operation: 'getList', params }]);
    expect(calls[0]?.params).not.toBe(params);
    expect(provider.getApiUrl()).toBe('/api');
  });

  test.each([null, {}, { data: row }, { data: [row], total: -1 }, { data: [row], total: 1.5 }, {
    data: [{ id: 1, title: 42 }], total: 1,
  }])('rejects a malformed list envelope or record: %j', async (response) => {
    const { provider, setResponse } = fixture();
    setResponse(response);
    await expect(provider.getList({ resource: 'posts' })).rejects.toMatchObject({
      statusCode: 502,
      code: 'INVALID_PROVIDER_RESPONSE',
      details: { operation: 'getList', phase: 'response', writeMayHaveSucceeded: false },
    });
  });

  test.each([null, {}, { data: null }, { data: [] }, { data: { id: '1', title: 'Hello' } }])(
    'rejects malformed single records: %j', async (response) => {
      const { provider, setResponse } = fixture();
      setResponse(response);
      await expect(provider.getOne({ resource: 'posts', id: 1 })).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE',
      });
    },
  );

  test.each(['create', 'update'] as const)('rejects invalid %s inputs before calling the provider', async (operation) => {
    const { provider, calls } = fixture();
    await expect(provider[operation]({
      resource: 'posts', id: 1, variables: { title: 42 },
    })).rejects.toMatchObject({
      statusCode: 422,
      code: 'INVALID_RESOURCE_INPUT',
      details: { phase: 'input', operation, writeMayHaveSucceeded: false },
    });
    expect(calls).toHaveLength(0);
  });

  test('does not coerce, strip unknown fields, or mutate invalid inputs', async () => {
    const { provider, calls } = fixture();
    const variables = { title: 'Hello', adminOnly: true };
    await expect(provider.create({ resource: 'posts', variables })).rejects.toMatchObject({
      code: 'INVALID_RESOURCE_INPUT',
    });
    expect(variables).toEqual({ title: 'Hello', adminOnly: true });
    expect(calls).toHaveLength(0);
  });

  test('validates every batch input before the first provider call', async () => {
    const { provider, calls } = fixture();
    const createMany = provider.createMany;
    if (!createMany) throw new Error('Expected batch support');
    await expect(createMany({
      resource: 'posts', variables: [{ title: 'valid' }, { title: 42 }],
    })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(calls).toHaveLength(0);
  });

  test('validates all batch methods and their responses', async () => {
    const { provider, setResponse, calls } = fixture();
    if (!provider.getMany || !provider.createMany || !provider.updateMany || !provider.deleteMany) {
      throw new Error('Expected batch support');
    }
    setResponse({ data: [row] });
    await provider.getMany({ resource: 'posts', ids: [1] });
    await provider.createMany({ resource: 'posts', variables: [{ title: 'Hello' }] });
    await provider.updateMany({ resource: 'posts', ids: [1], variables: { title: 'Hello' } });
    await provider.deleteMany({ resource: 'posts', ids: [1] });
    expect(calls.map(({ operation }) => operation)).toEqual(['getMany', 'createMany', 'updateMany', 'deleteMany']);

    setResponse({ data: [row, { id: 2, title: null }] });
    await expect(provider.getMany({ resource: 'posts', ids: [1, 2] })).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE',
    });
    await expect(provider.createMany({ resource: 'posts', variables: [{ title: 'Hello' }] })).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true },
    });
    await expect(provider.updateMany({ resource: 'posts', ids: [1], variables: {} })).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true },
    });
    await expect(provider.deleteMany({ resource: 'posts', ids: [1] })).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true },
    });
  });

  test('does not invent optional batch or custom capabilities', () => {
    const { raw } = fixture();
    delete raw.getMany;
    delete raw.createMany;
    delete raw.updateMany;
    delete raw.deleteMany;
    delete raw.custom;
    const provider = withResourceSchemas(raw, schemas);
    expect(provider.getMany).toBeUndefined();
    expect(provider.createMany).toBeUndefined();
    expect(provider.updateMany).toBeUndefined();
    expect(provider.deleteMany).toBeUndefined();
    expect(provider.custom).toBeUndefined();
  });

  test.each(['missing', '__proto__', 'constructor'])('rejects unregistered resource %s before I/O', async (resource) => {
    const { provider, calls } = fixture();
    await expect(provider.getOne({ resource, id: 1 })).rejects.toMatchObject({
      code: 'RESOURCE_SCHEMA_REQUIRED',
    });
    await expect(provider.create({ resource, variables: {} })).rejects.toMatchObject({
      code: 'RESOURCE_SCHEMA_REQUIRED',
    });
    expect(calls).toHaveLength(0);
  });

  test('requires explicit create and update schemas', async () => {
    const { raw, calls } = fixture();
    const provider = withResourceSchemas(raw, { posts: { record: RecordSchema } });
    await expect(provider.create({ resource: 'posts', variables: {} })).rejects.toMatchObject({
      code: 'RESOURCE_SCHEMA_REQUIRED',
    });
    await expect(provider.update({ resource: 'posts', id: 1, variables: {} })).rejects.toMatchObject({
      code: 'RESOURCE_SCHEMA_REQUIRED',
    });
    expect(calls).toHaveLength(0);
  });

  test('requires a delete schema for extra variables but allows bodyless deletes', async () => {
    const { provider, raw, calls } = fixture();
    await expect(provider.deleteOne({ resource: 'posts', id: 1, variables: { reason: 'duplicate' } }))
      .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(calls).toHaveLength(0);
    await provider.deleteOne({ resource: 'posts', id: 1 });
    const guarded = withResourceSchemas(raw, {
      posts: { record: RecordSchema, delete: Type.Object({ reason: Type.String() }) },
    });
    await guarded.deleteOne({ resource: 'posts', id: 1, variables: { reason: 'duplicate' } });
    await expect(guarded.deleteOne({ resource: 'posts', id: 1 })).rejects.toMatchObject({
      code: 'INVALID_RESOURCE_INPUT',
    });
    expect(calls).toHaveLength(2);
  });

  test.each(['create', 'update', 'deleteOne'] as const)(
    'marks invalid %s responses as possibly committed without retrying', async (operation) => {
      const { provider, calls, setResponse } = fixture();
      setResponse({ data: { id: 1 } });
      const promise = operation === 'deleteOne'
        ? provider.deleteOne({ resource: 'posts', id: 1 })
        : operation === 'update' ? provider.update({ resource: 'posts', id: 1, variables: { title: 'Hello' } })
          : provider.create({ resource: 'posts', variables: { title: 'Hello' } });
      await expect(promise).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE', details: { operation, writeMayHaveSucceeded: true },
      });
      expect(calls).toHaveLength(1);
    },
  );

  test('does not turn custom endpoints into an unchecked escape hatch', async () => {
    const { provider, calls } = fixture();
    if (!provider.custom) throw new Error('Expected custom capability');
    await expect(provider.custom({ url: '/command', method: 'post', payload: {} }))
      .rejects.toMatchObject({ code: 'RESOURCE_SCHEMA_REQUIRED', details: { operation: 'custom' } });
    expect(calls).toHaveLength(0);
  });

  test('normalizes provider failures without preserving their object identity or retrying', async () => {
    const { provider, calls, setFailure } = fixture();
    const failure = new HttpError('Unavailable', 503);
    setFailure(failure);
    const cause = await provider.getOne({ resource: 'posts', id: 1 }).catch((cause: unknown) => cause);
    expect(cause).not.toBe(failure);
    expect(cause).toMatchObject({
      message: 'Resource provider failed', statusCode: 503, code: 'RESOURCE_PROVIDER_FAILED',
      details: { resource: 'posts', operation: 'getOne', phase: 'transport', writeMayHaveSucceeded: false },
    });
    expect(calls).toHaveLength(1);
  });

  test.each([...operations])('normalizes async %s failures and ignores forged local-validation claims', async operation => {
    const { provider, setFailure, calls } = fixture();
    const cause = new HttpError('private-message', 401, { title: 'private-field-error' }, {
      code: 'INVALID_RESOURCE_INPUT', details: { phase: 'input', writeMayHaveSucceeded: false, token: 'private-detail' },
      body: { token: 'private-body' }, cause: new Error('private-cause'),
    });
    setFailure(cause);
    const error = await rejected(invoke(provider, operation, requestFor(operation)));
    expect(error).not.toBe(cause);
    expect(error).toMatchObject({
      message: 'Resource provider failed', statusCode: 401, code: 'RESOURCE_PROVIDER_FAILED',
      details: { resource: 'posts', operation, phase: 'transport', writeMayHaveSucceeded: !operation.startsWith('get') },
    });
    expect(error.errors).toBeUndefined();
    expect(error.body).toBeUndefined();
    expect(error.cause).toBeUndefined();
    expect(`${error.stack}\n${JSON.stringify(error)}`).not.toContain('private-');
    expect(calls).toHaveLength(1);
  });

  test.each([...operations])('normalizes synchronous %s throws without retrying', async operation => {
    const { raw } = fixture();
    let called = 0;
    Reflect.set(raw, operation, () => { called++; throw { statusCode: 503, message: 'private-message' }; });
    const provider = withResourceSchemas(raw, schemas);
    const error = await rejected(invoke(provider, operation, requestFor(operation)));
    expect(error).toMatchObject({
      statusCode: 503, code: 'RESOURCE_PROVIDER_FAILED',
      details: { operation, phase: 'transport', writeMayHaveSucceeded: !operation.startsWith('get') },
    });
    expect(called).toBe(1);
  });

  test.each([undefined, null, false, 0, NaN, 'private-message', Symbol('private-symbol'), () => {}, [],
    new Error('private-message'), { message: 'private-message' }].map(value => ({ value })))(
    'normalizes arbitrary JavaScript rejection values %#', async ({ value }) => {
      const { provider, setFailure } = fixture();
      setFailure(value);
      const error = await rejected(provider.create({ resource: 'posts', variables: { title: 'Hello' } }));
      expect(error).toMatchObject({
        statusCode: 502, code: 'RESOURCE_PROVIDER_FAILED',
        details: { operation: 'create', writeMayHaveSucceeded: true },
      });
      expect(`${error.stack}\n${JSON.stringify(error)}`).not.toContain('private-');
    },
  );

  test.each([400, 401, 403, 404, 409, 422, 500, 503, 599])('preserves valid own statusCode data: %s', async statusCode => {
    const { provider, setFailure } = fixture();
    setFailure(Object.defineProperty({}, 'statusCode', { value: statusCode }));
    await expect(provider.getOne({ resource: 'posts', id: 1 })).rejects.toMatchObject({
      statusCode, code: 'RESOURCE_PROVIDER_FAILED',
    });
  });

  test.each([undefined, null, false, '401', 200, 399, 600, 401.5, NaN, Infinity, {}, []].map(value => ({ value })))(
    'does not coerce invalid statusCode data %#', async ({ value }) => {
      const { provider, setFailure } = fixture();
      setFailure({ statusCode: value });
      await expect(provider.getOne({ resource: 'posts', id: 1 })).rejects.toMatchObject({ statusCode: 502 });
    },
  );

  test('does not read inherited status values or error getters', async () => {
    const { provider, setFailure } = fixture();
    let reads = 0;
    const cause: object = Object.create({ get statusCode() { reads++; return 401; } });
    for (const name of ['name', 'message', 'stack', 'errors', 'code', 'details', 'body', 'cause', 'then', 'toJSON']) {
      Object.defineProperty(cause, name, { get() { reads++; throw new Error('private-accessor'); } });
    }
    setFailure(cause);
    const error = await rejected(provider.getOne({ resource: 'posts', id: 1 }));
    expect(error.statusCode).toBe(502);
    expect(error.code).toBe('RESOURCE_PROVIDER_FAILED');
    expect(reads).toBe(0);
    Object.defineProperty(cause, 'statusCode', { get() { reads++; return 403; } });
    await expect(provider.getOne({ resource: 'posts', id: 1 })).rejects.toMatchObject({ statusCode: 502 });
    expect(reads).toBe(0);
  });

  test('ignores status coercion hooks and hostile reflection', async () => {
    const { provider, setFailure } = fixture();
    let coerced = 0;
    setFailure({ statusCode: { [Symbol.toPrimitive]() { coerced++; return 401; } } });
    await expect(provider.getOne({ resource: 'posts', id: 1 })).rejects.toMatchObject({ statusCode: 502 });
    expect(coerced).toBe(0);
    setFailure(new Proxy({}, { getOwnPropertyDescriptor() { throw new Error('private-reflection'); } }));
    const error = await rejected(provider.getOne({ resource: 'posts', id: 1 }));
    expect(error.statusCode).toBe(502);
    expect(JSON.stringify(error)).not.toContain('private-reflection');
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    setFailure(revoked.proxy);
    await expect(provider.getOne({ resource: 'posts', id: 1 })).rejects.toMatchObject({
      statusCode: 502, code: 'RESOURCE_PROVIDER_FAILED',
    });
  });

  test('does not preserve raw partial-delete claims', async () => {
    const { provider, setFailure } = fixture();
    setFailure(new DeleteManyPartialError([1], [2], [new Error('private-delete-cause')]));
    const error = await rejected(invoke(provider, 'deleteMany', { resource: 'posts', ids: [1, 2] }));
    expect(error).toMatchObject({ code: 'RESOURCE_PROVIDER_FAILED', details: { writeMayHaveSucceeded: true } });
    expect(Object.hasOwn(error, 'succeededIds')).toBe(false);
    expect(JSON.stringify(error)).not.toContain('private-delete-cause');
  });

  test('does not reuse provider error objects or trust replayed local errors', async () => {
    const { provider, setFailure } = fixture();
    const local = await rejected(provider.create({ resource: 'posts', variables: { title: false } }));
    expect(local).toMatchObject({ code: 'INVALID_RESOURCE_INPUT', details: { writeMayHaveSucceeded: false } });
    setFailure(local);
    const first = await rejected(provider.create({ resource: 'posts', variables: { title: 'Hello' } }));
    expect(first).not.toBe(local);
    expect(first).toMatchObject({ code: 'RESOURCE_PROVIDER_FAILED', details: { writeMayHaveSucceeded: true } });
    first.code = 'rewritten';
    first.details = { writeMayHaveSucceeded: false };
    const second = await rejected(provider.create({ resource: 'posts', variables: { title: 'Hello' } }));
    expect(second).not.toBe(first);
    expect(second).toMatchObject({ code: 'RESOURCE_PROVIDER_FAILED', details: { writeMayHaveSucceeded: true } });
  });

  test.each([...operations])('captures %s failure context before the provider changes the request', async operation => {
    const { raw } = fixture();
    Reflect.set(raw, operation, (request: { resource: string }) => {
      request.resource = 'private-other-resource';
      throw { statusCode: 409, details: { resource: request.resource }, message: 'private-message' };
    });
    const provider = withResourceSchemas(raw, schemas);
    const request = requestFor(operation);
    const before = structuredClone(request);
    const error = await rejected(invoke(provider, operation, request));
    expect(error.details).toEqual({
      resource: 'posts', operation, phase: 'transport', writeMayHaveSucceeded: !operation.startsWith('get'),
    });
    expect(request).toEqual(before);
    expect(JSON.stringify(error)).not.toContain('private-');
  });

  test('nested resource wrappers do not launder raw input-error claims', async () => {
    const { provider, setFailure, calls } = fixture();
    const nested = withResourceSchemas(provider, schemas);
    setFailure({ statusCode: 422, code: 'INVALID_RESOURCE_INPUT', details: { phase: 'input', writeMayHaveSucceeded: false } });
    await expect(nested.create({ resource: 'posts', variables: { title: 'Hello' } })).rejects.toMatchObject({
      statusCode: 422, code: 'RESOURCE_PROVIDER_FAILED', details: { phase: 'transport', writeMayHaveSucceeded: true },
    });
    expect(calls).toHaveLength(1);
  });

  test('validates internal request-operation discriminators without coercing JavaScript values', () => {
    const prepare = createResourceRequestValidator(schemas);
    let coerced = 0;
    const invalid = { toString() { coerced++; return 'create'; } };
    for (const operation of ['unknown', '__proto__', 'constructor', 'getApiUrl', 'custom', undefined, null, invalid]) {
      expect(() => Reflect.apply(prepare, undefined, [operation, { resource: 'posts' }])).toThrowError(
        expect.objectContaining({ code: 'INVALID_RESOURCE_INPUT', details: { phase: 'input', writeMayHaveSucceeded: false } }),
      );
    }
    expect(coerced).toBe(0);
  });

  test('diagnostics expose paths and messages, not rejected record contents', async () => {
    const { provider, setResponse } = fixture();
    setResponse({ data: { id: 'sensitive-record-value', title: 'private-title' } });
    try {
      await provider.getOne({ resource: 'posts', id: 1 });
      throw new Error('Expected validation failure');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      if (!(error instanceof HttpError)) throw error;
      const details = JSON.stringify(error.details);
      expect(details).toContain('/data/id');
      expect(details).not.toContain('sensitive-record-value');
      expect(details).not.toContain('private-title');
      expect(error.body).toBeUndefined();
    }
  });

  test('publishes input errors through the existing form field-error contract', async () => {
    const { provider, calls } = fixture();
    await expect(provider.create({ resource: 'posts', variables: { title: 42 } })).rejects.toMatchObject({
      errors: { title: expect.any(String) },
      details: { issues: [{ path: '/title', message: expect.any(String) }] },
    });
    expect(calls).toHaveLength(0);
  });

  test('decodes escaped JSON Pointer segments in form error keys', async () => {
    const { raw } = fixture();
    const provider = withResourceSchemas(raw, {
      posts: {
        record: RecordSchema,
        create: Type.Object({ 'a/b~c': Type.String() }),
      },
    });
    await expect(provider.create({ resource: 'posts', variables: { 'a/b~c': 42 } }))
      .rejects.toMatchObject({ errors: { 'a/b~c': expect.any(String) } });
  });

  test('supports referenced schemas', async () => {
    const { raw } = fixture();
    const reference = Type.Object({ id: Type.Number(), title: Type.String() }, { $id: 'Post' });
    const provider = withResourceSchemas(raw, {
      posts: { record: Type.Ref(reference), references: [reference] },
    });
    expect(await provider.getOne({ resource: 'posts', id: 1 })).toEqual({ data: row });
  });

  test('keeps schema evaluation failures structured before and after writes', async () => {
    const { raw, calls } = fixture();
    const unresolved = Type.Ref(Type.Object({}, { $id: 'Missing' }));
    const invalidInput = withResourceSchemas(raw, {
      posts: { record: RecordSchema, create: unresolved },
    });
    await expect(invalidInput.create({ resource: 'posts', variables: {} })).rejects.toMatchObject({
      code: 'RESOURCE_SCHEMA_INVALID', details: { phase: 'input', writeMayHaveSucceeded: false },
    });
    expect(calls).toHaveLength(0);
    const invalidOutput = withResourceSchemas(raw, {
      posts: { record: unresolved, create: CreateSchema },
    });
    await expect(invalidOutput.create({ resource: 'posts', variables: { title: 'Hello' } })).rejects.toMatchObject({
      code: 'RESOURCE_SCHEMA_INVALID', details: { phase: 'response', writeMayHaveSucceeded: true },
    });
    expect(calls).toHaveLength(1);
  });

  test.each([{ data: null }, { data: 42 }, { data: [] }, { data: 'record' }])(
    'requires object records even with a broad record schema: %j', async ({ data }) => {
      const { raw, setResponse } = fixture();
      setResponse({ data });
      const provider = withResourceSchemas(raw, { posts: { record: Type.Unknown() } });
      await expect(provider.getOne({ resource: 'posts', id: 1 })).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE',
      });
    },
  );
});

describe('resource transport configuration snapshots', () => {
  test.each([...operations])('captures the original %s method before source replacement', async operation => {
    const { raw, provider, calls, setResponse } = fixture();
    setResponse(responseFor(operation));
    let replacements = 0;
    Reflect.set(raw, operation, () => { replacements++; throw new Error('Replacement must not run'); });
    await expect(invoke(provider, operation, requestFor(operation))).resolves.toEqual(responseFor(operation));
    expect(calls).toHaveLength(1);
    expect(replacements).toBe(0);
  });

  test('captures URL capabilities and rejects malformed URL results without exposing values', () => {
    const { raw, provider } = fixture();
    raw.getApiUrl = () => '/replacement';
    expect(provider.getApiUrl()).toBe('/api');
    expect(withResourceSchemas(raw, schemas).getApiUrl()).toBe('/replacement');
    Reflect.set(raw, 'getApiUrl', () => ({ token: 'private-token' }));
    const malformed = withResourceSchemas(raw, schemas);
    expect(() => malformed.getApiUrl()).toThrowError(expect.objectContaining({
      code: 'INVALID_DATA_PROVIDER', message: 'Invalid resource provider URL',
    }));
    raw.getApiUrl = () => { throw new Error('private-token'); };
    const failed = withResourceSchemas(raw, schemas);
    expect(() => failed.getApiUrl()).toThrow('Invalid resource provider URL');
  });

  test.each([...operations, 'custom', 'getApiUrl'] as const)('rejects accessor-backed %s capabilities without calling getters', name => {
    const { raw, calls } = fixture();
    let reads = 0;
    Object.defineProperty(raw, name, { enumerable: true, get() { reads++; throw new Error('private-token'); } });
    expect(() => withResourceSchemas(raw, schemas)).toThrowError(expect.objectContaining({
      code: 'INVALID_DATA_PROVIDER', details: { phase: 'configuration', writeMayHaveSucceeded: false },
    }));
    expect(reads).toBe(0);
    expect(calls).toHaveLength(0);
  });

  test.each(['getOne', 'getMany', 'custom'] as const)('rejects present but noncallable %s methods', name => {
    const { raw } = fixture();
    for (const value of [undefined, null, true, {}, 'method']) {
      Reflect.set(raw, name, value);
      expect(() => withResourceSchemas(raw, schemas)).toThrowError(expect.objectContaining({ code: 'INVALID_DATA_PROVIDER' }));
    }
  });

  test('rejects absent required methods and does not acquire optional methods added later', () => {
    const { raw } = fixture();
    delete raw.createMany;
    const provider = withResourceSchemas(raw, schemas);
    raw.createMany = async () => ({ data: [row] });
    expect(provider.createMany).toBeUndefined();
    expect(withResourceSchemas(raw, schemas).createMany).toBeTypeOf('function');
    Reflect.deleteProperty(raw, 'getOne');
    expect(() => withResourceSchemas(raw, schemas)).toThrowError(expect.objectContaining({ code: 'INVALID_DATA_PROVIDER' }));
  });

  test('does not spread or evaluate undeclared provider properties', async () => {
    const { raw, calls } = fixture();
    let reads = 0;
    Object.defineProperty(raw, 'privateService', {
      enumerable: true, get() { reads++; throw new Error('private-token'); },
    });
    const provider = withResourceSchemas(raw, schemas);
    expect(Object.hasOwn(provider, 'privateService')).toBe(false);
    await expect(provider.getOne({ resource: 'posts', id: 1 })).resolves.toEqual({ data: row });
    expect(reads).toBe(0);
    expect(calls).toHaveLength(1);
  });

  test('supports inherited class methods with private receiver state', async () => {
    const raw = new ClassTransport();
    const provider = withResourceSchemas(raw, schemas);
    const one = provider.getOne;
    await expect(one({ resource: 'posts', id: 1 })).resolves.toEqual({ data: { id: 1, title: 'Class record' } });
    expect(provider.getApiUrl()).toBe('/class-api');
    expect(provider.getMany).toBeUndefined();
  });

  test('does not read contradictory proxy property values for provider capabilities', async () => {
    const { raw } = fixture();
    let reads = 0;
    // Use a capability that does not require raw-provider receiver identity for this proxy fixture.
    raw.getOne = async () => ({ data: row });
    const proxy = new Proxy(raw, { get() { reads++; throw new Error('Must not get properties'); } });
    const provider = withResourceSchemas(proxy, schemas);
    await expect(provider.getOne({ resource: 'posts', id: 1 })).resolves.toEqual({ data: row });
    expect(reads).toBe(0);
  });

  test('freezes only the public wrapper without mutating the original provider', () => {
    const { raw, provider } = fixture();
    expect(Object.isFrozen(provider)).toBe(true);
    expect(Object.isFrozen(raw)).toBe(false);
    expect(Reflect.set(provider, 'getOne', async () => ({ data: {} }))).toBe(false);
    expect(Reflect.defineProperty(provider, 'custom', { value: async () => ({ data: {} }) })).toBe(false);
    expect(Reflect.deleteProperty(provider, 'create')).toBe(false);
    expect(Reflect.set(provider, 'unchecked', () => ({}))).toBe(false);
  });

  test('captures nested schemas before first use and requires a new wrapper to adopt changes', async () => {
    const { raw, calls, setResponse } = fixture();
    const record = Type.Object({ id: Type.Number(), title: Type.String() }, { additionalProperties: false });
    const create = Type.Object({ title: Type.String({ minLength: 3 }) }, { additionalProperties: false });
    const config = { posts: { record, create } };
    const original = withResourceSchemas(raw, config);
    create.properties.title.minLength = 0;
    Reflect.set(record.properties, 'title', Type.Number());
    await expect(original.create({ resource: 'posts', variables: { title: 'x' } }))
      .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(calls).toHaveLength(0);
    setResponse({ data: { id: 1, title: 3 } });
    await expect(original.getOne({ resource: 'posts', id: 1 })).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    const replacement = withResourceSchemas(raw, config);
    await expect(replacement.create({ resource: 'posts', variables: { title: 'x' } }))
      .resolves.toEqual({ data: { id: 1, title: 3 } });
    setResponse({ data: row });
    await expect(original.create({ resource: 'posts', variables: { title: 'Original' } })).resolves.toEqual({ data: row });
  });

  test('does not adopt replaced or newly registered resources after construction', async () => {
    const { raw, calls } = fixture();
    const definitions = { posts: { record: RecordSchema, create: CreateSchema } };
    const provider = withResourceSchemas(raw, definitions);
    Reflect.set(definitions, 'posts', { record: Type.Unknown() });
    Reflect.set(definitions, 'users', { record: RecordSchema });
    await expect(provider.create({ resource: 'posts', variables: { title: 'Hello' } })).resolves.toEqual({ data: row });
    await expect(provider.getOne({ resource: 'users', id: 1 })).rejects.toMatchObject({ code: 'RESOURCE_SCHEMA_REQUIRED' });
    expect(calls).toHaveLength(1);
  });

  test('keeps later batch validators on captured schemas after a single operation has completed', async () => {
    const { raw, calls, setResponse } = fixture();
    const create = Type.Object({ title: Type.String({ minLength: 3 }) }, { additionalProperties: false });
    const provider = withResourceSchemas(raw, { posts: { record: RecordSchema, create } });
    await expect(provider.create({ resource: 'posts', variables: { title: 'Hello' } })).resolves.toEqual({ data: row });
    create.properties.title.minLength = 0;
    setResponse({ data: [row] });
    if (!provider.createMany) throw new Error('Expected batch capability');
    await expect(provider.createMany({ resource: 'posts', variables: [{ title: 'x' }] }))
      .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(calls).toHaveLength(1);
    await expect(provider.createMany({ resource: 'posts', variables: [{ title: 'Hello' }] }))
      .resolves.toEqual({ data: [row] });
  });

  test('captures all referenced definitions before validation starts', async () => {
    const { raw, setResponse } = fixture();
    const reference = Type.Object({ id: Type.Number(), title: Type.String() }, { $id: 'Row' });
    const references = [reference];
    const provider = withResourceSchemas(raw, { posts: { record: Type.Ref(reference), references } });
    Reflect.set(reference.properties, 'title', Type.Number());
    references.length = 0;
    setResponse({ data: { id: 1, title: 3 } });
    await expect(provider.getOne({ resource: 'posts', id: 1 })).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    setResponse({ data: row });
    await expect(provider.getOne({ resource: 'posts', id: 1 })).resolves.toEqual({ data: row });
  });

  test('copies recursive schema references and optional/readonly TypeBox markers', async () => {
    const { raw, setResponse } = fixture();
    const recursive = Type.Recursive(Self => Type.Object({
      id: Type.Number(), title: Type.Readonly(Type.String()), children: Type.Optional(Type.Array(Self)),
    }));
    const provider = withResourceSchemas(raw, { posts: { record: recursive } });
    const data = { ...row, children: [{ id: 2, title: 'Child' }] };
    setResponse({ data });
    await expect(provider.getOne({ resource: 'posts', id: 1 })).resolves.toEqual({ data });
    setResponse({ data: { ...row, children: undefined } });
    await expect(provider.getOne({ resource: 'posts', id: 1 })).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
  });

  test.each(['registry', 'definition', 'schema', 'references'] as const)('rejects %s getters without executing them', layer => {
    const { raw, calls } = fixture();
    let reads = 0;
    const record = Type.Object({ id: Type.Number(), title: Type.String() });
    const config = { posts: { record, references: [] } };
    switch (layer) {
      case 'registry': Object.defineProperty(config, 'posts', { enumerable: true, get() { reads++; return {}; } }); break;
      case 'definition': Object.defineProperty(config.posts, 'record', { enumerable: true, get() { reads++; return record; } }); break;
      case 'schema': Object.defineProperty(record.properties.title, 'type', { enumerable: true, get() { reads++; return 'string'; } }); break;
      case 'references': Object.defineProperty(config.posts, 'references', { enumerable: true, get() { reads++; return []; } }); break;
    }
    expect(() => withResourceSchemas(raw, config)).toThrowError(expect.objectContaining({
      code: 'RESOURCE_SCHEMA_INVALID', message: 'Invalid resource schema configuration',
    }));
    expect(reads).toBe(0);
    expect(calls).toHaveLength(0);
  });

  test.each([
    null, undefined, [], { posts: {} }, { posts: { record: {} } },
    { posts: { record: RecordSchema, create: undefined } }, { posts: { record: RecordSchema, references: undefined } },
    { posts: { record: RecordSchema, references: [null] } }, { posts: { record: RecordSchema, ignored: true } },
    { ' ': { record: RecordSchema } },
  ].map(value => ({ value })))('rejects malformed schema registry %j', ({ value }) => {
    const { raw } = fixture();
    expect(() => Reflect.apply(withResourceSchemas, undefined, [raw, value])).toThrowError(expect.objectContaining({
      code: 'RESOURCE_SCHEMA_INVALID', details: { phase: 'configuration', writeMayHaveSucceeded: false },
    }));
  });

  test('rejects schema cycles and executable transforms before transport calls', () => {
    const { raw, calls } = fixture();
    const cycle = Type.Object({ id: Type.Number() });
    Reflect.set(cycle.properties, 'self', cycle);
    expect(() => withResourceSchemas(raw, { posts: { record: cycle } })).toThrow('Invalid resource schema configuration');
    let executed = 0;
    const transformed = Type.Transform(Type.String()).Decode(value => { executed++; return value; })
      .Encode(value => { executed++; return value; });
    expect(() => withResourceSchemas(raw, { posts: { record: RecordSchema, create: transformed } }))
      .toThrow('Invalid resource schema configuration');
    expect(calls).toHaveLength(0);
    expect(executed).toBe(0);
  });

  test('rejects schema symbol accessors and foreign symbol metadata without invoking accessors', () => {
    const { raw } = fixture();
    const record = Type.Object({ id: Type.Number() });
    let reads = 0;
    Object.defineProperty(record, Kind, { enumerable: true, get() { reads++; return 'Object'; } });
    expect(() => withResourceSchemas(raw, { posts: { record } })).toThrow('Invalid resource schema configuration');
    const foreign = Type.Object({ id: Type.Number() });
    Reflect.set(foreign, Symbol('foreign'), true);
    expect(() => withResourceSchemas(raw, { posts: { record: foreign } })).toThrow('Invalid resource schema configuration');
    expect(reads).toBe(0);
  });

  test('retains required-property arrays and references without proxy length reads', async () => {
    const { raw } = fixture();
    let reads = 0;
    const record = Type.Object({ id: Type.Number(), title: Type.String() }, { $id: 'ProxyRow' });
    record.required = new Proxy(['id', 'title'], { get(target, key, receiver) {
      if (key === 'length') { reads++; return 0; }
      return Reflect.get(target, key, receiver);
    } });
    const references = new Proxy([record], { get(target, key, receiver) {
      if (key === 'length') { reads++; return 0; }
      return Reflect.get(target, key, receiver);
    } });
    const provider = withResourceSchemas(raw, { posts: { record: Type.Ref(record), references } });
    await expect(provider.getOne({ resource: 'posts', id: 1 })).resolves.toEqual({ data: row });
    expect(reads).toBe(0);
  });

  test('contains hostile schema/provider reflection failures', () => {
    const { raw } = fixture();
    const config = new Proxy({}, { ownKeys() { throw new Error('private-token'); } });
    expect(() => withResourceSchemas(raw, config)).toThrow('Invalid resource schema configuration');
    const broken = new Proxy(raw, { getOwnPropertyDescriptor() { throw new Error('private-token'); } });
    expect(() => withResourceSchemas(broken, schemas)).toThrow('Invalid resource provider');
    const cyclic: object = new Proxy({}, { getPrototypeOf: () => cyclic });
    expect(() => Reflect.apply(withResourceSchemas, undefined, [cyclic, schemas])).toThrow('Invalid resource provider');
  });
});

describe('detached resource transport data', () => {
  test.each([...operations])('captures %s inputs without executing resource or metadata getters', async operation => {
    const { provider, calls } = fixture();
    let reads = 0;
    const request = Object.defineProperty(requestFor(operation), 'resource', {
      enumerable: true, get() { reads++; return 'posts'; },
    });
    await expect(invoke(provider, operation, request)).rejects.toMatchObject({
      code: 'INVALID_RESOURCE_INPUT', details: { operation, phase: 'input', writeMayHaveSucceeded: false },
    });
    const withMeta = {
      ...requestFor(operation), meta: { get tenantId() { reads++; return 'first'; } },
    };
    await expect(invoke(provider, operation, withMeta)).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(reads).toBe(0);
    expect(calls).toHaveLength(0);
  });

  test.each([...operations])('detaches %s parameters before provider or caller mutation', async operation => {
    const { raw } = fixture();
    const pending = deferred<unknown>();
    let received: unknown;
    Reflect.set(raw, operation, (params: unknown) => { received = params; return pending.promise; });
    const provider = withResourceSchemas(raw, schemas);
    const request = requestFor(operation);
    const call = invoke(provider, operation, request);
    expect(received).toEqual(request);
    expect(received).not.toBe(request);
    if (typeof received !== 'object' || received === null) throw new Error('Expected provider request');
    const sourceMeta = request['meta'];
    const providerMeta: unknown = Reflect.get(received, 'meta');
    expect(providerMeta).not.toBe(sourceMeta);
    if (typeof providerMeta !== 'object' || providerMeta === null) throw new Error('Expected provider metadata');
    Reflect.set(providerMeta, 'tenantId', 'provider mutation');
    expect(sourceMeta).toEqual({ tenantId: 'first' });
    Reflect.set(request, 'resource', 'caller mutation');
    expect(Reflect.get(received, 'resource')).toBe('posts');
    pending.resolve(responseFor(operation));
    await expect(call).resolves.toEqual(responseFor(operation));
  });

  test.each([...operations])('returns independent %s responses', async operation => {
    const { provider, setResponse } = fixture();
    const response = responseFor(operation);
    setResponse(response);
    const result = await invoke(provider, operation, requestFor(operation));
    expect(result).toEqual(response);
    expect(result).not.toBe(response);
    if (typeof result !== 'object' || result === null) throw new Error('Expected response');
    const data: unknown = Reflect.get(result, 'data');
    expect(data).not.toBe(response.data);
    const item: unknown = Array.isArray(data) ? data[0] : data;
    if (typeof item !== 'object' || item === null) throw new Error('Expected record');
    Reflect.set(item, 'title', 'caller edit');
    expect(response).toEqual(responseFor(operation));
  });

  test.each([...operations])('rejects accessor-backed %s receipts with correct write outcome', async operation => {
    const { provider, setResponse, calls } = fixture();
    let reads = 0;
    setResponse(Object.defineProperty({}, 'data', { enumerable: true, get() { reads++; return row; } }));
    await expect(invoke(provider, operation, requestFor(operation))).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', statusCode: 502,
      details: { phase: 'response', operation, writeMayHaveSucceeded: !operation.startsWith('get') },
    });
    expect(calls).toHaveLength(1);
    expect(reads).toBe(0);
  });

  test.each([
    { operation: 'getOne', request: { resource: 'posts', id: false } },
    { operation: 'getOne', request: { resource: 'posts' } },
    { operation: 'getMany', request: { resource: 'posts', ids: [1, false] } },
    { operation: 'getList', request: { resource: 'posts', filters: [{ field: 'id', operator: 'unrecognized', value: 1 }] } },
    { operation: 'getList', request: { resource: 'posts', sorters: [{ field: 'id', order: 'up' }] } },
    { operation: 'getList', request: { resource: 'posts', pagination: { pageSize: 0 } } },
    { operation: 'getList', request: { resource: 'posts', pagination: { current: Number.MAX_SAFE_INTEGER + 1 } } },
    { operation: 'create', request: { resource: 'posts', variables: { title: 'Hello' }, id: 1 } },
    { operation: 'create', request: { resource: 'posts' } },
    { operation: 'update', request: { resource: 'posts', id: 1 } },
    { operation: 'deleteMany', request: { resource: 'posts', ids: [Infinity] } },
    { operation: 'updateMany', request: { resource: 'posts', ids: 'all', variables: {} } },
  ] satisfies { operation: Operation; request: unknown }[])('rejects malformed request %j before dispatch', async ({ operation, request }) => {
    const { provider, calls } = fixture();
    await expect(invoke(provider, operation, request)).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(calls).toHaveLength(0);
  });

  test('supports explicit undefined delete bodies without dropping other invalid fields', async () => {
    const { provider, calls, setResponse } = fixture();
    await provider.deleteOne({ resource: 'posts', id: 1, variables: undefined });
    expect(calls[0]?.params).toEqual({ resource: 'posts', id: 1 });
    setResponse({ data: [row] });
    if (!provider.deleteMany) throw new Error('Expected batch delete');
    await provider.deleteMany({ resource: 'posts', ids: [1], variables: undefined });
    expect(calls[1]?.params).toEqual({ resource: 'posts', ids: [1] });
    await expect(invoke(provider, 'deleteOne', {
      resource: 'posts', id: 1, variables: undefined, [Symbol('hidden')]: true,
    })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    let reads = 0;
    await expect(invoke(provider, 'deleteOne', {
      resource: 'posts', id: 1, get variables() { reads++; return undefined; },
    })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(reads).toBe(0);
    expect(calls).toHaveLength(2);
  });

  test('retains captured batch entries despite contradictory proxy length reads', async () => {
    const { provider, calls, setResponse } = fixture();
    let reads = 0;
    const variables = new Proxy([{ title: 'Hello' }, { title: 'Second' }], {
      get(target, key, receiver) {
        if (key === 'length') { reads++; return reads === 1 ? 2 : 0; }
        return Reflect.get(target, key, receiver);
      },
    });
    setResponse({ data: [row, { id: 2, title: 'Second' }] });
    if (!provider.createMany) throw new Error('Expected createMany');
    await provider.createMany({ resource: 'posts', variables });
    expect(calls[0]?.params).toEqual({ resource: 'posts', variables: [{ title: 'Hello' }, { title: 'Second' }] });
    expect(reads).toBe(0);
  });

  test('validates every contradictory proxy response row instead of dropping the tail', async () => {
    const { provider, setResponse } = fixture();
    let reads = 0;
    const data = new Proxy([row, { id: 2, title: false }], {
      get(target, key, receiver) {
        if (key === 'length') { reads++; return reads === 1 ? 2 : 0; }
        return Reflect.get(target, key, receiver);
      },
    });
    setResponse({ data, total: 2 });
    await expect(provider.getList({ resource: 'posts' })).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    expect(reads).toBe(0);
  });

  test('pins write diagnostics to the captured resource even if provider code mutates its request', async () => {
    const { raw } = fixture();
    raw.create = async params => { params.resource = 'private-token'; return { data: {} }; };
    const provider = withResourceSchemas(raw, schemas);
    await expect(provider.create({ resource: 'posts', variables: { title: 'Hello' } })).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { resource: 'posts', writeMayHaveSucceeded: true },
    });
  });

  test('works through contract-bound list preflight and batch write fallbacks', async () => {
    const { raw, calls, setResponse } = fixture();
    delete raw.createMany;
    let created = 0;
    raw.create = async function (params) {
      expect(this).toBe(raw);
      calls.push({ operation: 'create', params });
      return { data: { ...row, id: ++created } };
    };
    const resource = defineResource('posts', { record: RecordSchema, create: CreateSchema, update: UpdateSchema });
    const provider = contractProvider(raw, resource);
    setResponse({ data: [row], total: 1 });
    await expect(provider.getList({
      resource: 'posts', filters: [{ field: 'id', operator: 'in', value: [1, 2] }],
      pagination: { current: 1, pageSize: 20 }, sorters: [{ field: 'title', order: 'asc' }],
    })).resolves.toEqual({ data: [row], total: 1 });
    setResponse({ data: row });
    if (!provider.createMany) throw new Error('Expected contract batch fallback');
    await expect(provider.createMany({
      resource: 'posts', variables: [{ title: 'Hello' }, { title: 'Second' }],
    })).resolves.toEqual({ data: [row, { ...row, id: 2 }] });
    expect(calls.map(call => call.operation)).toEqual(['getList', 'create', 'create']);
    await expect(provider.createMany({
      resource: 'posts', variables: [{ title: 'Hello' }, { title: false }],
    })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(calls).toHaveLength(3);
  });
});

describe('contract provider failure composition', () => {
  test.each([...operations])('preserves normalized native %s failures through the contract', async operation => {
    const { provider, calls, setFailure } = contractFixture();
    setFailure({ statusCode: 403, code: 'INVALID_RESOURCE_INPUT', details: { writeMayHaveSucceeded: false }, message: 'private-value' });
    const error = await rejected(invoke(provider, operation, requestFor(operation)));
    expect(error).toMatchObject({
      code: 'RESOURCE_PROVIDER_FAILED', statusCode: 403,
      details: { resource: 'posts', operation, phase: 'transport', writeMayHaveSucceeded: !operation.startsWith('get') },
    });
    expect(calls).toHaveLength(1);
    expect(JSON.stringify(error)).not.toContain('private-value');
  });

  test.each([
    { operation: 'getList', request: { resource: 'posts', sorters: [{ field: 'missing', order: 'asc' }] } },
    { operation: 'getOne', request: { resource: 'posts', id: '1' } },
    { operation: 'getMany', request: { resource: 'posts', ids: [1, 1] } },
    { operation: 'create', request: { resource: 'posts', variables: { title: false } } },
    { operation: 'createMany', request: { resource: 'posts', variables: [{ title: 'Hello' }, { title: false }] } },
    { operation: 'update', request: { resource: 'posts', id: '1', variables: {} } },
    { operation: 'updateMany', request: { resource: 'posts', ids: [1, '2'], variables: {} } },
    { operation: 'deleteOne', request: { resource: 'posts', id: '1' } },
    { operation: 'deleteMany', request: { resource: 'posts', ids: [1, '2'] } },
  ] satisfies { operation: Operation; request: unknown }[])(
    'does not label local contract validation as a transport failure: %j', async ({ operation, request }) => {
      const { provider, calls, setFailure } = contractFixture();
      setFailure({ statusCode: 500, message: 'Transport must not run' });
      const error = await rejected(invoke(provider, operation, request));
      expect(error).toMatchObject({
        code: 'INVALID_RESOURCE_INPUT', statusCode: 422, details: { phase: 'input', writeMayHaveSucceeded: false },
      });
      expect(calls).toHaveLength(0);
    },
  );

  test('retains local field errors and missing-schema diagnostics', async () => {
    const { raw, provider, calls } = contractFixture();
    await expect(provider.create({ resource: 'posts', variables: {} })).rejects.toMatchObject({
      code: 'INVALID_RESOURCE_INPUT', errors: { title: expect.any(String) },
      details: { phase: 'input', writeMayHaveSucceeded: false },
    });
    await expect(provider.getOne({ resource: 'missing', id: 1 })).rejects.toMatchObject({
      code: 'RESOURCE_SCHEMA_REQUIRED', details: { phase: 'input', writeMayHaveSucceeded: false },
    });
    const noWrites = contractProvider(raw, defineResource('posts', { record: RecordSchema }));
    await expect(noWrites.createMany?.({ resource: 'posts', variables: [] })).rejects.toMatchObject({
      code: 'RESOURCE_SCHEMA_REQUIRED', details: { phase: 'input', writeMayHaveSucceeded: false },
    });
    expect(calls).toHaveLength(0);
  });

  test.each([...operations])('retains native %s response-validation diagnostics', async operation => {
    const { provider, setResponse, calls } = contractFixture();
    setResponse({ data: { id: 'invalid', title: 'private-title' } });
    const error = await rejected(invoke(provider, operation, requestFor(operation)));
    expect(error).toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', statusCode: 502,
      details: { resource: 'posts', operation, phase: 'response', writeMayHaveSucceeded: !operation.startsWith('get') },
    });
    expect(calls).toHaveLength(1);
    expect(JSON.stringify(error)).not.toContain('private-title');
  });

  test('retains checked identity errors instead of relabeling them as raw failures', async () => {
    const { provider, setResponse } = contractFixture();
    setResponse({ data: { ...row, id: 2 } });
    await expect(provider.update({ resource: 'posts', id: 1, variables: {} })).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { operation: 'update', phase: 'response', writeMayHaveSucceeded: true },
    });
    setResponse({ data: [row] });
    await expect(provider.getMany?.({ resource: 'posts', ids: [1, 2] })).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { operation: 'getMany', phase: 'response', writeMayHaveSucceeded: false },
    });
  });

  test('preserves locally built delete outcomes with normalized causes', async () => {
    const { raw } = fixture();
    Reflect.deleteProperty(raw, 'deleteMany');
    const original = { statusCode: 503, message: 'private-delete-message', body: { token: 'private-delete-body' } };
    raw.deleteOne = async params => {
      if (params.id === 2) throw original;
      return { data: row };
    };
    const provider = contractProvider(raw, defineResource('posts', { record: RecordSchema }));
    const cause = await invoke(provider, 'deleteMany', { resource: 'posts', ids: [1, 2] }).catch((cause: unknown) => cause);
    expect(cause).toBeInstanceOf(DeleteManyPartialError);
    if (!(cause instanceof DeleteManyPartialError)) throw new Error('Expected checked partial delete');
    expect(cause.succeededIds).toEqual([1]);
    expect(cause.failedIds).toEqual([2]);
    expect(cause.causes).toHaveLength(1);
    expect(cause.causes[0]).not.toBe(original);
    expect(cause.causes[0]).toMatchObject({
      code: 'RESOURCE_PROVIDER_FAILED', statusCode: 503,
      details: { resource: 'posts', operation: 'deleteOne', phase: 'transport', writeMayHaveSucceeded: true },
    });
    expect(JSON.stringify(cause)).not.toContain('private-delete');
  });

  test('does not trust a raw native provider claiming partial-delete success', async () => {
    const { provider, setFailure } = contractFixture();
    setFailure(new DeleteManyPartialError([1], [2], [{ message: 'private-cause' }]));
    const error = await rejected(invoke(provider, 'deleteMany', { resource: 'posts', ids: [1, 2] }));
    expect(error).toMatchObject({
      code: 'RESOURCE_PROVIDER_FAILED', details: { operation: 'deleteMany', writeMayHaveSucceeded: true },
    });
    expect(Object.hasOwn(error, 'succeededIds')).toBe(false);
  });

  test.each(['getMany', 'createMany', 'updateMany', 'deleteMany'] satisfies Operation[])(
    'waits for every started %s fallback before exposing normalized failure', async operation => {
      const { raw } = fixture();
      const method = operation === 'getMany' ? 'getOne' : operation === 'createMany' ? 'create'
        : operation === 'updateMany' ? 'update' : 'deleteOne';
      Reflect.deleteProperty(raw, operation);
      const gate = deferred<{ data: typeof row }>();
      let started = 0;
      Reflect.set(raw, method, async () => {
        if (++started === 1) throw { statusCode: 409, message: 'private-pending-error' };
        return gate.promise;
      });
      const resource = defineResource('posts', { record: RecordSchema, create: CreateSchema, update: UpdateSchema });
      const provider = contractProvider(raw, resource);
      let settled = false;
      const outcome = invoke(provider, operation, requestFor(operation)).then(
        () => { settled = true; return undefined; },
        (cause: unknown) => { settled = true; return cause; },
      );
      await new Promise<void>(resolve => setImmediate(resolve));
      const premature = settled;
      gate.resolve({ data: { ...row, id: 2 } });
      const error = await outcome;
      expect(started).toBe(2);
      expect(premature).toBe(false);
      if (operation === 'deleteMany') {
        expect(error).toMatchObject({
          succeededIds: [2], failedIds: [1],
          causes: [expect.objectContaining({ code: 'RESOURCE_PROVIDER_FAILED', statusCode: 409 })],
        });
      } else expect(error).toMatchObject({
        code: 'RESOURCE_PROVIDER_FAILED', statusCode: 409,
        details: { operation: method, phase: 'transport', writeMayHaveSucceeded: operation !== 'getMany' },
      });
      expect(JSON.stringify(error)).not.toContain('private-pending-error');
    },
  );

  test('captures contract request data and keeps the final wrapper frozen', async () => {
    const { provider, calls } = contractFixture();
    expect(Object.isFrozen(provider)).toBe(true);
    expect(Reflect.set(provider, 'create', async () => ({ data: row }))).toBe(false);
    let reads = 0;
    await expect(invoke(provider, 'create', { resource: 'posts', get variables() { reads++; return { title: 'Hello' }; } }))
      .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT', details: { writeMayHaveSucceeded: false } });
    expect(reads).toBe(0);
    expect(calls).toHaveLength(0);
    const request = { resource: 'posts', variables: { title: 'Hello' }, meta: { tenant: 'first' } };
    await provider.create(request);
    expect(calls[0]?.params).toEqual(request);
    expect(calls[0]?.params).not.toBe(request);
  });
});
