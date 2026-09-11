import { describe, expect, test } from 'bun:test';
import { snapshotPlainData } from './plain-data';
import { Type } from '@sinclair/typebox';
import ts from 'typescript';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keys, parseQueryKey, queryKeyMatches } from './query-keys';
import { defineCommand, prepareCommand, parseCommandResponse } from './command-contract';
import { defineResource, parseContractCreateInput, parseContractUpdateInput, parseContractDeleteInput,
  parseContractRecord, snapshotContractFormDraft } from './resource-contract';
import { snapshotInvalidationParams } from './invalidation-contract';
import type { DataProvider, CustomParams } from './types';

const recordSchema = Type.Object({ id: Type.Number(), labels: Type.Array(Type.String()) });
const writeSchema = Type.Object({ labels: Type.Array(Type.String()) });
const resource = defineResource('posts', {
  record: recordSchema, create: writeSchema, update: writeSchema, delete: writeSchema,
});
const command = defineCommand('labels', {
  url: '/labels', method: 'post', input: writeSchema, output: Type.Array(recordSchema),
});

function contradictoryArray<T>(values: T[]) {
  let reads = 0;
  return {
    array: new Proxy(values, {
      get(target, key, receiver) {
        if (key === 'length') { reads++; return reads === 1 ? values.length : 0; }
        return Reflect.get(target, key, receiver);
      },
    }),
    reads: () => reads,
  };
}

function commandProvider(receipt: unknown) {
  const calls: CustomParams[] = [];
  const provider: DataProvider = {
    getApiUrl: () => '/api',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 1 } }),
    create: async () => ({ data: { id: 1 } }),
    update: async () => ({ data: { id: 1 } }),
    deleteOne: async () => ({ data: { id: 1 } }),
    async custom(params) { calls.push(params); return { data: receipt }; },
  };
  return { provider, calls };
}

describe('plain-data snapshots', () => {
  test('copies repeated references independently without treating them as cycles', () => {
    const nested = { count: 1 };
    const input = { left: nested, right: nested };
    const result = snapshotPlainData(input);
    nested.count = 2;
    expect(result).toEqual({ left: { count: 1 }, right: { count: 1 } });
    if (typeof result !== 'object' || result === null || !('left' in result) || !('right' in result)) {
      throw new Error('Expected copied fields');
    }
    expect(result['left']).not.toBe(result['right']);
  });

  test('rejects getters and serialization hooks without calling them', () => {
    let called = 0;
    for (const input of [
      { get value() { called++; return 1; } },
      { toJSON() { called++; return {}; } },
    ]) expect(() => snapshotPlainData(input)).toThrow('Invalid plain data');
    expect(called).toBe(0);
  });

  test('rejects non-JSON values, hidden fields, sparse arrays and cycles', () => {
    const cycle: Record<string, unknown> = {};
    cycle['self'] = cycle;
    for (const input of [
      undefined, NaN, Infinity, 1n, () => {}, new Date(), new Map(), new Array(1), cycle,
      Object.defineProperty({}, 'hidden', { value: 1 }), { [Symbol()]: 1 },
    ]) expect(() => snapshotPlainData(input)).toThrow('Invalid plain data');
  });

  test('retains prototype-named keys without changing the copied object prototype', () => {
    const input = Object.fromEntries([['__proto__', { admin: true }], ['constructor', 'data']]);
    const result = snapshotPlainData(input);
    expect(result).toEqual(input);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    if (typeof result !== 'object' || result === null) throw new Error('Expected object');
    expect(Object.hasOwn(result, '__proto__')).toBe(true);
    expect('admin' in result).toBe(false);
  });

  test('normalizes reflection errors without retaining their secrets', () => {
    const input = new Proxy({}, { getPrototypeOf() { throw new Error('secret'); } });
    expect(() => snapshotPlainData(input)).toThrow('Invalid plain data');
    try { snapshotPlainData(input); }
    catch (error) {
      expect(error).toEqual(new TypeError('Invalid plain data'));
      expect(error instanceof Error && error.cause).toBeUndefined();
    }
  });
});

describe('plain-data direct consumers', () => {
  test('strictly compiles direct consumers and rejects unsafe result assumptions', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const virtualPath = resolve(directory, 'plain-data.test.virtual.ts');
    const accepted = [
      "import { Type } from '@sinclair/typebox';",
      "import { snapshotPlainData, type JsonValue } from './plain-data';",
      "import { defineResource, parseContractRecord, parseContractCreateInput } from './resource-contract';",
      "import { defineCommand, prepareCommand } from './command-contract';",
      "import { keys, parseQueryKey } from './query-keys';",
      "import type { DataProvider } from './types';",
      'declare const raw: unknown;',
      'declare const provider: DataProvider;',
      'const snapshot: JsonValue = snapshotPlainData(raw);',
      'const schema = Type.Object({ labels: Type.Array(Type.String()) });',
      'const resource = defineResource("posts", { record: Type.Object({ id: Type.Number(), labels: Type.Array(Type.String()) }), create: schema });',
      'const labels: string[] = parseContractRecord(resource, raw).labels;',
      'const input: { labels: string[] } = parseContractCreateInput(resource, raw);',
      'const command = defineCommand("labels", { url: "/labels", method: "post", input: schema, output: schema });',
      'const prepared = prepareCommand(provider, command, { labels: ["edit"] });',
      'const result: Promise<{ data: { labels: string[] } }> = prepared.execute();',
      'const key = keys().data.list("posts", { labels: ["edit"] });',
      'const descriptor = parseQueryKey(key);',
    ];
    const rejected = [
      'const assumed: string[] = snapshotPlainData(raw);',
      'snapshotPlainData(raw); const narrowed: { labels: string[] } = raw;',
      'const wrong: number[] = parseContractRecord(resource, raw).labels;',
      'const wrongInput: { labels: number[] } = parseContractCreateInput(resource, raw);',
      'prepareCommand(provider, command, { labels: [1] });',
      'prepareCommand(provider, command, {});',
      'const wrongResult: Promise<{ data: { labels: number[] } }> = prepared.execute();',
      'prepared.input = { labels: [] };',
      'key[0].resource = "other";',
      'if (descriptor) { const guessed: string[] = descriptor.params.labels; }',
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
    const roots = ['plain-data.ts', 'plain-data.test.ts', 'query-keys.ts', 'resource-contract.ts',
      'command-contract.ts', 'invalidation-contract.ts'].map(path => resolve(directory, path));
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

  test('retains nested filters, sorter order and exact IDs in captured query keys', () => {
    const values = contradictoryArray([1, 2]);
    const filters = contradictoryArray([{ field: 'id', operator: 'in', value: values.array }]);
    const sorters = contradictoryArray([{ field: 'id', order: 'desc' }]);
    const key = keys({ provider: 'cms', tenant: 'first' }).data.list('posts', {
      filters: filters.array, sorters: sorters.array,
    });
    expect(key[0].params).toEqual({
      filters: [{ field: 'id', operator: 'in', value: [1, 2] }],
      sorters: [{ field: 'id', order: 'desc' }],
    });
    expect(values.reads() + filters.reads() + sorters.reads()).toBe(0);
    expect(queryKeyMatches(key, { resource: 'posts', tenant: 'first', provider: 'cms' })).toBe(true);
    expect(queryKeyMatches(key, { tenant: 'second' })).toBe(false);
    expect(queryKeyMatches(keys().data.one('posts', 1), { id: '1' })).toBe(false);
    expect(Object.isFrozen(key[0].params)).toBe(true);
  });

  test('parses descriptor tuple proxies without reading their length properties', () => {
    const source = keys().data.list('posts', { ids: [1, 2] });
    const tuple = contradictoryArray([source[0]]);
    expect(parseQueryKey(tuple.array)).toEqual(source[0]);
    expect(tuple.reads()).toBe(0);
  });

  test.each(['create', 'update', 'delete', 'record', 'draft'] as const)(
    'retains every nested entry in resource %s parsing', kind => {
      const labels = contradictoryArray(['first', 'second']);
      const input = { labels: labels.array };
      const result = (() => {
        switch (kind) {
          case 'create': return parseContractCreateInput(resource, input);
          case 'update': return parseContractUpdateInput(resource, input);
          case 'delete': return parseContractDeleteInput(resource, input);
          case 'record': return parseContractRecord(resource, { id: 1, ...input });
          case 'draft': return snapshotContractFormDraft(resource, 'create', input);
        }
      })();
      expect(result).toMatchObject({ labels: ['first', 'second'] });
      expect(labels.reads()).toBe(0);
    },
  );

  test('retains refresh scope arrays without broadening or dropping targets', () => {
    const scopes = contradictoryArray(['list', 'detail']);
    expect(snapshotInvalidationParams({ id: 1, invalidates: scopes.array }))
      .toEqual({ id: 1, invalidates: ['list', 'detail'] });
    expect(scopes.reads()).toBe(0);
  });

  test('dispatches captured command arrays and detaches provider rows', async () => {
    const input = contradictoryArray(['first', 'second']);
    const labels = contradictoryArray(['receipt']);
    const rows = contradictoryArray([{ id: 1, labels: labels.array }]);
    const transport = commandProvider(rows.array);
    const prepared = prepareCommand(transport.provider, command, { labels: input.array });
    input.array[0] = 'caller mutation';
    prepared.input.labels.push('public mutation');
    const result = await prepared.execute();
    expect(transport.calls[0]?.payload).toEqual({ labels: ['first', 'second'] });
    expect(result).toEqual({ data: [{ id: 1, labels: ['receipt'] }] });
    const payload = transport.calls[0]?.payload;
    if (typeof payload !== 'object' || payload === null) throw new Error('Expected payload');
    Reflect.set(payload, 'labels', []);
    result.data[0]?.labels.push('consumer mutation');
    await expect(prepared.execute()).resolves.toEqual({ data: [{ id: 1, labels: ['receipt'] }] });
    expect(transport.calls[1]?.payload).toEqual({ labels: ['first', 'second'] });
    expect(input.reads() + labels.reads() + rows.reads()).toBe(0);
  });

  test('validates all command rows instead of dropping malformed tail records', () => {
    const rows = contradictoryArray([{ id: 1, labels: ['ok'] }, { id: 'invalid', labels: [] }]);
    expect(() => parseCommandResponse(command, { data: rows.array })).toThrow('Invalid command response');
    expect(rows.reads()).toBe(0);
  });

  test.each(['sparse', 'accessor'] as const)('rejects %s arrays across direct input consumers', kind => {
    let reads = 0;
    const values: string[] = [];
    values.length = 1;
    if (kind === 'accessor') Object.defineProperty(values, '0', {
      enumerable: true, get() { reads++; return 'edit'; },
    });
    const transport = commandProvider([]);
    expect(() => keys().data.list('posts', { filters: values })).toThrow('Invalid query key');
    expect(() => prepareCommand(transport.provider, command, { labels: values })).toThrow('Invalid command input');
    expect(() => parseContractCreateInput(resource, { labels: values })).toThrow();
    expect(() => parseContractUpdateInput(resource, { labels: values })).toThrow();
    expect(() => parseContractDeleteInput(resource, { labels: values })).toThrow();
    expect(() => parseContractRecord(resource, { id: 1, labels: values })).toThrow();
    expect(() => snapshotContractFormDraft(resource, 'create', { labels: values })).toThrow();
    expect(() => snapshotInvalidationParams({ invalidates: values })).toThrow('Invalid refresh input');
    expect(reads).toBe(0);
    expect(transport.calls).toHaveLength(0);
  });

  test('rejects hidden, custom and symbol properties on nested arrays', () => {
    for (const values of [
      Object.defineProperty(['edit'], 'hidden', { value: 'private' }),
      Object.assign(['edit'], { extra: true }),
      Object.assign(['edit'], { [Symbol('private')]: true }),
    ]) {
      expect(() => snapshotPlainData(values)).toThrow('Invalid plain data');
      expect(() => parseContractCreateInput(resource, { labels: values })).toThrow();
      expect(() => keys().data.list('posts', { labels: values })).toThrow('Invalid query key');
    }
  });
});
