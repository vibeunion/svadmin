import { describe, expect, test } from 'bun:test';
import { Type } from '@sinclair/typebox';
import ts from 'typescript';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandDefinition, defineCommand, executeCommand } from './command-contract';
import { HttpError, type CustomParams, type DataProvider } from './types';

const inputSchema = Type.Object({
  filter: Type.Object({ year: Type.Number() }),
  labels: Type.Array(Type.String()),
  limit: Type.Optional(Type.Number()),
});
const outputSchema = Type.Object({ rows: Type.Array(Type.Object({ count: Type.Number() })) });
function contract(method: CustomParams['method'] = 'get') {
  return defineCommand('report', { url: '/report', method, input: inputSchema, output: outputSchema });
}
function input() { return { filter: { year: 2026 }, labels: ['current'] }; }
function response() { return { data: { rows: [{ count: 2 }] } }; }
function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Uninitialized deferred'); };
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function fixture() {
  const calls: CustomParams[] = [];
  let value: { data: unknown } = response();
  const provider: DataProvider = {
    getApiUrl: () => '/api',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
    async custom(params) {
      expect(this).toBe(provider);
      calls.push(params);
      return value;
    },
  };
  return { provider, calls, setResponse(next: { data: unknown }) { value = next; } };
}
async function invoke(provider: DataProvider, command: unknown, value: unknown): Promise<unknown> {
  const pending: unknown = Reflect.apply(executeCommand, undefined, [provider, command, value]);
  return pending;
}
async function failure(pending: Promise<unknown>): Promise<HttpError> {
  try { await pending; } catch (error) {
    if (error instanceof HttpError) return error;
    throw new Error('Expected a checked HttpError', { cause: error });
  }
  throw new Error('Expected a rejected command');
}
function register(name: unknown, definition: unknown): unknown {
  return Reflect.apply(defineCommand, undefined, [name, definition]);
}

describe('command execution boundary', () => {
  test('strictly checks the implementation, test and accepted/rejected command calls', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const virtualPath = resolve(directory, 'command-contract.test.virtual.ts');
    const accepted = [
      "import { Type } from '@sinclair/typebox';",
      "import { defineCommand, executeCommand, type CommandContract, type CommandInput, type CommandOutput } from './command-contract';",
      "import type { DataProvider } from './types';",
      'declare const provider: DataProvider;',
      'const input = Type.Object({ year: Type.Number(), label: Type.Optional(Type.String()) });',
      'const output = Type.Object({ count: Type.Number() });',
      "const command = defineCommand('report', { url: '/report', method: 'get', input, output });",
      'const result: Promise<{ data: { count: number } }> = executeCommand(provider, command, { year: 2026 });',
      'const value: CommandInput<typeof input> = { year: 2026 };',
      'const data: CommandOutput<typeof output> = { count: 2 };',
      'declare const erased: CommandContract;',
      'const erasedResult: Promise<{ data: unknown }> = executeCommand(provider, erased, {});',
    ];
    const rejected = [
      'executeCommand(provider, command, { year: "2026" });',
      'executeCommand(provider, command, {});',
      'executeCommand(provider, command, { year: 2026, extra: true });',
      'executeCommand(provider, command, { year: 2026, label: undefined });',
      'executeCommand(provider, { name: "forged" }, {});',
      'const wrongResult: Promise<{ data: { count: string } }> = executeCommand(provider, command, { year: 2026 });',
      'const wrongInput: CommandInput<typeof input> = { year: "2026" };',
      'const wrongData: CommandOutput<typeof output> = { count: "2" };',
      'const guessed: Promise<{ data: { count: number } }> = executeCommand(provider, erased, {});',
      "defineCommand('unsafe', { url: '/report', method: 'get', input, output: Type.Any() });",
      "defineCommand('unsafe', { url: '/report', method: 'get', input: Type.Object({ value: Type.Unknown() }), output });",
      "defineCommand('unsafe', { url: '/report', method: 'get', input: Type.Number(), output });",
      "defineCommand('unsafe', { url: '/report', method: 'trace', input, output });",
    ];
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, noImplicitOverride: true, skipLibCheck: false,
      types: ['bun', 'svelte', 'node'], target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler, allowImportingTsExtensions: true,
    };
    const host = ts.createCompilerHost(options);
    const read = host.readFile;
    const exists = host.fileExists;
    host.readFile = path => path === virtualPath ? [...accepted, ...rejected].join('\n') : read(path);
    host.fileExists = path => path === virtualPath || exists(path);
    const targets = ['command-contract.ts', 'command-contract.test.ts'].map(path => resolve(directory, path));
    const program = ts.createProgram([...targets, virtualPath], options, host);
    const diagnostics = (path: string) => {
      const source = program.getSourceFile(path);
      if (!source) throw new Error(`Missing source: ${path}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    };
    expect(targets.flatMap(diagnostics).map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n'))).toEqual([]);
    const negative = diagnostics(virtualPath);
    expect(negative.map(item => item.file && item.start !== undefined
      ? item.file.getLineAndCharacterOfPosition(item.start).line : -1))
      .toEqual(rejected.map((_, index) => accepted.length + index));
  }, 30_000);

  test.each(['get', 'post', 'put', 'patch', 'delete'] satisfies CustomParams['method'][])(
    'detaches nested input and preserves the provider receiver for %s', async method => {
      const { provider, calls } = fixture();
      const original = input();
      const pending = executeCommand(provider, contract(method), original);
      original.filter.year = 2000;
      original.labels.push('caller');
      await pending;
      expect(calls).toEqual([{
        url: '/report', method, ...(method === 'get' ? { query: input() } : { payload: input() }),
      }]);
      const dispatched = calls[0];
      if (!dispatched) throw new Error('Expected a command');
      const owned = method === 'get' ? dispatched.query : dispatched.payload;
      expect(owned).not.toBe(original);
    },
  );

  test('provider mutation of its request does not mutate caller input', async () => {
    const { provider } = fixture();
    const original = input();
    provider.custom = async params => {
      const filter: unknown = params.query?.['filter'];
      if (typeof filter !== 'object' || filter === null) throw new Error('Missing filter');
      Reflect.set(filter, 'year', 'provider');
      return response();
    };
    await executeCommand(provider, contract(), original);
    expect(original).toEqual(input());
  });

  test('captures provider capability once after snapshotting input', async () => {
    const { provider } = fixture();
    const original = input();
    let reads = 0;
    let sent: CustomParams | undefined;
    Object.defineProperty(provider, 'custom', { get() {
      reads++;
      original.filter.year = 2000;
      return async (params: CustomParams) => { sent = params; return response(); };
    } });
    await executeCommand(provider, contract(), original);
    expect(reads).toBe(1);
    expect(sent?.query).toEqual(input());
  });

  test('detaches nested responses in both directions and between callers', async () => {
    const { provider, setResponse } = fixture();
    const raw = response();
    setResponse(raw);
    const first = await executeCommand(provider, contract(), input());
    const second = await executeCommand(provider, contract(), input());
    first.data.rows.push({ count: 10 });
    expect(raw).toEqual(response());
    raw.data.rows.push({ count: 99 });
    expect(second).toEqual(response());
    expect(first.data.rows).toEqual([{ count: 2 }, { count: 10 }]);
  });

  test('snapshots an asynchronous provider result before handing it to the caller', async () => {
    const { provider } = fixture();
    const pending = deferred<{ data: unknown }>();
    provider.custom = () => pending.promise;
    const result = executeCommand(provider, contract(), input());
    const raw = response();
    pending.resolve(raw);
    const checked = await result;
    raw.data.rows.splice(0);
    expect(checked).toEqual(response());
  });

  const invalidInputs: unknown[] = [
    null, undefined, [], 'secret', { ...input(), extra: 'secret' },
    { filter: { year: 'secret' }, labels: [] }, { ...input(), limit: undefined },
    { filter: { year: NaN }, labels: [] }, { filter: { year: Infinity }, labels: [] },
    { ...input(), labels: [undefined] }, { ...input(), labels: new Array(2) },
    Object.assign(input(), { [Symbol('secret')]: 'secret' }), new Date(),
  ];
  test.each(invalidInputs)('rejects non-contract input before dispatch: %#', async value => {
    const { provider, calls } = fixture();
    const error = await failure(invoke(provider, contract('post'), value));
    expect(error).toMatchObject({ statusCode: 422, code: 'INVALID_COMMAND_INPUT' });
    expect(error.body).toBeUndefined();
    expect(error.cause).toBeUndefined();
    expect(calls).toEqual([]);
  });

  test('rejects getters, hidden properties, cycles and hostile input reflection', async () => {
    const { provider, calls } = fixture();
    let reads = 0;
    const accessor = { filter: { get year() { reads++; return 2026; } }, labels: [] };
    const hidden = Object.defineProperty(input(), 'secret', { value: 'secret' });
    const cyclic = input();
    Reflect.set(cyclic, 'cycle', cyclic);
    const hostile = new Proxy(input(), { ownKeys() { throw new Error('secret'); } });
    for (const value of [accessor, hidden, cyclic, hostile]) {
      expect(await failure(invoke(provider, contract(), value))).toMatchObject({ code: 'INVALID_COMMAND_INPUT' });
    }
    expect(reads).toBe(0);
    expect(calls).toEqual([]);
  });

  test.each(['get', 'post'] satisfies CustomParams['method'][])('rejects malformed responses for %s', async method => {
    const { provider, setResponse } = fixture();
    const extra = { ...response(), secret: 'secret' };
    const invalid: { data: unknown }[] = [
      { data: { rows: [{ count: 'secret' }] } }, { data: null }, { data: undefined },
      { data: { rows: [{ count: 2, extra: 'secret' }] } },
      extra, { data: { rows: [{ count: Infinity }] } },
    ];
    for (const raw of invalid) {
      setResponse(raw);
      const error = await failure(executeCommand(provider, contract(method), input()));
      expect(error).toMatchObject({
        statusCode: 502, code: 'INVALID_COMMAND_RESPONSE', details: { writeMayHaveSucceeded: method !== 'get' },
      });
      expect(error.body).toBeUndefined();
      expect(error.cause).toBeUndefined();
      expect(JSON.stringify(error)).not.toContain('secret');
    }
  });

  test.each([null, undefined, [], {}, 'secret', { total: 1 }])('rejects missing response envelopes: %#', async value => {
    const { provider } = fixture();
    Reflect.set(provider, 'custom', async () => value);
    expect(await failure(executeCommand(provider, contract('post'), input())))
      .toMatchObject({ code: 'INVALID_COMMAND_RESPONSE', details: { writeMayHaveSucceeded: true } });
  });

  test('rejects cyclic, hidden, symbolic and non-plain response values', async () => {
    const { provider, setResponse } = fixture();
    const cyclic = response();
    Reflect.set(cyclic.data, 'self', cyclic);
    for (const raw of [
      cyclic, Object.defineProperty(response(), 'secret', { value: 'secret' }),
      Object.assign(response(), { [Symbol('secret')]: 'secret' }), { data: new Date() },
      { data: { rows: new Array(2) } },
    ]) {
      setResponse(raw);
      expect(await failure(executeCommand(provider, contract(), input())))
        .toMatchObject({ code: 'INVALID_COMMAND_RESPONSE' });
    }
  });

  test('rejects getters and serialization hooks without invoking them', async () => {
    const { provider, setResponse } = fixture();
    let reads = 0;
    for (const raw of [
      { get data() { reads++; return response().data; } },
      { data: { rows: [{ get count() { reads++; return 2; } }] } },
      { ...response(), toJSON() { reads++; return response(); } },
      new Proxy(response(), { ownKeys() { throw new Error('secret'); } }),
    ]) {
      setResponse(raw);
      expect(await failure(executeCommand(provider, contract(), input())))
        .toMatchObject({ code: 'INVALID_COMMAND_RESPONSE' });
    }
    expect(reads).toBe(0);
  });

  test.each([400, 401, 403, 422, 500, 599])('retains only checked provider status %s', async statusCode => {
    const { provider } = fixture();
    const raw = new HttpError('secret', statusCode, { secret: 'secret' }, {
      code: 'INVALID_COMMAND_INPUT', body: 'secret', cause: 'secret', details: { secret: true },
    });
    provider.custom = async () => { throw raw; };
    const first = await failure(executeCommand(provider, contract('post'), input()));
    const second = await failure(executeCommand(provider, contract('post'), input()));
    expect(first).toMatchObject({ code: 'COMMAND_FAILED', statusCode, details: { writeMayHaveSucceeded: true } });
    expect(first).not.toBe(raw);
    expect(first).not.toBe(second);
    expect(first.details).not.toBe(second.details);
    expect(JSON.stringify(first)).not.toContain('secret');
    expect(first.cause).toBeUndefined();
    expect(first.body).toBeUndefined();
    expect(first.errors).toBeUndefined();
  });

  test.each([200, 399, 600, 401.5, '401', NaN, Infinity, undefined])(
    'does not trust malformed provider status: %#', async statusCode => {
      const { provider } = fixture();
      provider.custom = async () => { throw { statusCode }; };
      expect(await failure(executeCommand(provider, contract(), input())))
        .toMatchObject({ statusCode: 502, code: 'COMMAND_FAILED', details: { writeMayHaveSucceeded: false } });
    },
  );

  test('does not read provider error accessors or inherit authentication status', async () => {
    const { provider } = fixture();
    let reads = 0;
    const inherited: unknown = Object.create({ statusCode: 401 });
    for (const cause of [
      { get statusCode() { reads++; return 401; } }, inherited,
      new Proxy({}, { getOwnPropertyDescriptor() { throw new Error('secret'); } }),
    ]) {
      provider.custom = () => { throw cause; };
      expect(await failure(executeCommand(provider, contract('post'), input())))
        .toMatchObject({ statusCode: 502, code: 'COMMAND_FAILED', details: { writeMayHaveSucceeded: true } });
    }
    expect(reads).toBe(0);
  });

  test('marks failures before capability dispatch as non-writing', async () => {
    const { provider } = fixture();
    Object.defineProperty(provider, 'custom', { get() { throw new Error('secret'); } });
    expect(await failure(executeCommand(provider, contract('post'), input())))
      .toMatchObject({ code: 'COMMAND_FAILED', details: { writeMayHaveSucceeded: false } });
  });

  test.each([undefined, null, false, {}, 'secret'])('rejects unavailable capabilities: %#', async custom => {
    const { provider } = fixture();
    Reflect.set(provider, 'custom', custom);
    expect(await failure(executeCommand(provider, contract('post'), input())))
      .toMatchObject({ statusCode: 400, code: 'COMMAND_NOT_SUPPORTED' });
  });

  test.each([undefined, null, false, {}, { name: 'report' }])('rejects forged contracts: %#', async command => {
    const { provider, calls } = fixture();
    expect(await failure(invoke(provider, command, input())))
      .toMatchObject({ code: 'INVALID_COMMAND_CONTRACT' });
    expect(calls).toEqual([]);
  });

  test('registration snapshots endpoint, method, schemas and public descriptors', async () => {
    const { provider, calls } = fixture();
    const schema = Type.Object({ year: Type.Number() });
    const output = Type.Object({ rows: Type.Array(Type.Object({ count: Type.Number() })) });
    const definition: { url: string; method: CustomParams['method']; input: typeof schema; output: typeof output } = {
      url: '/original', method: 'get', input: schema, output,
    };
    const command = defineCommand('report', definition);
    const original = commandDefinition(command);
    definition.url = '/modified';
    definition.method = 'delete';
    schema.properties.year.minimum = 3000;
    output.properties.rows.minItems = 10;
    expect(Reflect.set(command, 'name', 'modified')).toBe(false);
    expect(Reflect.set(original, 'url', '/modified')).toBe(false);
    await expect(executeCommand(provider, command, { year: 2026 })).resolves.toEqual(response());
    expect(calls).toEqual([{ url: '/original', method: 'get', query: { year: 2026 } }]);
    expect(commandDefinition(command)).toEqual(original);
    expect(commandDefinition(command)).not.toBe(original);
  });

  test('rejects malformed registration and unsafe schemas with a local error', () => {
    const definition = { url: '/report', method: 'get', input: inputSchema, output: outputSchema };
    const invalid: [unknown, unknown][] = [
      ['', definition], [null, definition], ['report', null], ['report', {}],
      ['report', { ...definition, url: 1 }], ['report', { ...definition, method: 'trace' }],
      ['report', { ...definition, input: Type.Number() }],
      ['report', { ...definition, input: Type.Object({ value: Type.Any() }) }],
      ['report', { ...definition, output: Type.Unknown() }],
      ['report', { ...definition, output: Type.Object({}, { additionalProperties: true }) }],
      ['report', { ...definition, output: Type.Transform(Type.String()).Decode(value => value).Encode(value => value) }],
    ];
    for (const [name, value] of invalid) {
      try { register(name, value); throw new Error('Expected a rejected definition'); }
      catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect(error).toMatchObject({ code: 'INVALID_COMMAND_CONTRACT', statusCode: 400 });
      }
    }
  });

  test('registration does not read accessors or proxy property values', () => {
    let reads = 0;
    const definition = { url: '/report', method: 'get', input: inputSchema, output: outputSchema };
    expect(() => register('report', { ...definition, get url() { reads++; return '/secret'; } })).toThrow(HttpError);
    const proxy = new Proxy(definition, { get() { reads++; throw new Error('secret'); } });
    const command = register('report', proxy);
    expect(command).toMatchObject({ name: 'report' });
    expect(reads).toBe(0);
  });
});
