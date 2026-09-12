import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import { QueryClient, MutationCache } from '@tanstack/svelte-query';
import { defineCommand, HttpError, resetContext, captureAuthSession, useCustom, useCustomMutation,
  type DataProvider, type CustomParams, type CustomResult, type AuthProvider, type RouterProvider } from '@svadmin/core';
import * as unsafe from '../../../core/src/unsafe';
import { parseQueryKey } from '../../../core/src/query-keys';
import { prepareCommand, executeCommand } from '../../../core/src/command-contract';
import { definedOptions } from '@svadmin/core/options';
import { resetToast } from '@svadmin/core/toast';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandInput, commandOutput, readCommand, writeCommand,
  type CommandState, type CommandAuthActions, type CommandSettings } from './command-hooks.test.types';
import Host from './command-hooks.test-host.svelte';

const clients: QueryClient[] = [];
function input() { return { filter: { year: 2026 }, labels: ['current'] }; }
function receipt(count = 1) { return { data: { rows: [{ count }] } }; }
function provider(count = 1) {
  const source = {
    getApiUrl: () => '/api',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
    custom: vi.fn(async function (this: DataProvider, _params: CustomParams): Promise<CustomResult> {
      expect(this).toBe(source);
      return receipt(count);
    }),
  } satisfies DataProvider;
  return source;
}
function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Uninitialized deferred'); };
  let reject: (cause: unknown) => void = () => { throw new Error('Uninitialized deferred'); };
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function auth(): AuthProvider {
  return { login: vi.fn(async () => ({ success: true })), logout: vi.fn(async () => ({ success: true })),
    check: vi.fn(async () => ({ authenticated: true })), getIdentity: async () => ({ id: 'user' }) };
}
function mount(source: DataProvider | Record<string, DataProvider> = provider(), settings: CommandSettings = {},
  extras: { auth?: AuthProvider; client?: QueryClient; router?: RouterProvider } = {}) {
  const client = extras.client ?? new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  if (!clients.includes(client)) clients.push(client);
  let state: CommandState | undefined;
  let actions: CommandAuthActions | undefined;
  let currentSettings = settings;
  const router: RouterProvider = extras.router ?? { go: vi.fn(), back: () => {}, parse: () => ({ pathname: '/', params: {} }) };
  const view = render(Host, { provider: source, queryClient: client, settings, router,
    ...definedOptions({ auth: extras.auth,
      onAuthReady: extras.auth ? (value: CommandAuthActions) => { actions = value; } : undefined }),
    onReady: value => { state = value; } });
  return { client, router, view,
    async change(patch: Partial<CommandSettings>) {
      currentSettings = { ...currentSettings, ...patch };
      await view.rerender({ settings: currentSettings });
    },
    read() { if (!state) throw new Error('Missing command state'); return state; },
    actions() { if (!actions) throw new Error('Missing auth actions'); return actions; },
  };
}
async function mountSession(source = provider(), session = auth(), settings: CommandSettings = { enabled: false }) {
  const app = mount(source, settings, { auth: session });
  await waitFor(() => expect(app.actions().check.isLoading).toBe(false));
  await waitFor(() => expect(captureAuthSession(session).isCurrent()).toBe(true));
  return { ...app, source, session };
}
function firstKey(client: QueryClient) {
  const query = client.getQueryCache().getAll().find(query => parseQueryKey(query.queryKey)?.kind === 'custom');
  if (!query) throw new Error('Missing command cache');
  return query.queryKey;
}
async function rejected(promise: Promise<unknown>): Promise<HttpError> {
  try { await promise; } catch (cause) {
    if (cause instanceof HttpError) return cause;
    throw new Error('Expected a checked error', { cause });
  }
  throw new Error('Expected command rejection');
}
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  resetToast();
  vi.restoreAllMocks();
});

describe('contract-owned custom commands', () => {
  it('strictly compiles changed boundaries, mounted fixtures and negative API cases', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = ['../../../core/src/strict-command-hooks.svelte.ts', '../../../core/src/command-contract.ts',
      '../../../core/src/query-session.svelte.ts', '../../../core/src/hooks.svelte.ts',
      'command-hooks.test.svelte.ts', 'command-hooks.test.types.ts'].map(name => resolve(directory, name));
    const virtual = new Map(['command-hooks.test-host.svelte', 'command-hooks.test-probe.svelte'].map(name => {
      const filename = resolve(directory, name);
      return [`${filename}.tsx`, svelte2tsx(readFileSync(filename, 'utf8'), { filename, isTsFile: true, mode: 'ts' }).code];
    }));
    const fixturePath = resolve(directory, '../../../../scripts/fixtures/core-resource-types/strict.ts');
    const fixture = ts.createSourceFile(fixturePath, readFileSync(fixturePath, 'utf8'), ts.ScriptTarget.ESNext, true);
    const selected = fixture.statements.filter(node =>
      ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration =>
        ts.isIdentifier(declaration.name) && ['command', 'writeCommand'].includes(declaration.name.text)) ||
      ts.isTypeAliasDeclaration(node) && node.name.text === 'Equal' ||
      ts.isFunctionDeclaration(node) && node.name !== undefined && ['expectType', 'strictCommands'].includes(node.name.text));
    expect(selected).toHaveLength(5);
    virtual.set(resolve(directory, 'command-hooks.test.registry.ts'), [
      "import { Type } from '@sinclair/typebox';",
      "import { defineCommand, useCustom, useCustomMutation } from '@svadmin/core';",
      ...selected.map(node => node.getText(fixture)),
    ].join('\n'));
    const target = resolve(directory, 'command-hooks.test.virtual.ts');
    const accepted = [
      "import { useCustom, useCustomMutation } from '@svadmin/core';",
      "import * as unsafe from '../../../core/src/unsafe';",
      "import { readCommand, writeCommand } from './command-hooks.test.types';",
      'const input = { filter: { year: 2026 }, labels: ["current"] };',
      'const query = useCustom({ command: readCommand, input }).query;',
      'const mutation = useCustomMutation({ command: writeCommand }).mutation;',
      'if (query.isSuccess) { const count: number | undefined = query.data.data.rows[0]?.count; }',
      'if (mutation.isSuccess) { const count: number | undefined = mutation.data.data.rows[0]?.count; }',
      'const result: Promise<{ data: { rows: { count: number }[] } }> = mutation.mutateAsync(input);',
      'mutation.mutate(input, { onSuccess: (data, variables) => { const n: number = variables.filter.year; const rows: { count: number }[] = data.data.rows; } });',
      'mutation.mutateAsync(input, { onError: (error, variables) => { const status: number = error.statusCode; const year: number | undefined = variables?.filter.year; } });',
      'mutation.reset();',
    ];
    const invalid = [
      'useCustom({ url: "/raw", method: "get" });',
      'useCustomMutation();',
      'useCustomMutation("default");',
      'useCustom({ command: readCommand, input: { filter: { year: "bad" }, labels: [] } });',
      'mutation.mutate({ filter: { year: "bad" }, labels: [] });',
      'mutation.mutate({ filter: { year: 2026 }, labels: [], extra: true });',
      'mutation.mutate({ filter: { year: 2026 } });',
      'mutation.mutate(input, { onSuccess: (data: { data: string }) => {} });',
      'mutation.mutate(input, { onError: (error: string) => {} });',
      'mutation.mutate(input, { onSuccess: () => 1 });',
      'const wrong: Promise<{ data: string }> = mutation.mutateAsync(input);',
      'const unguarded: { data: { rows: { count: number }[] } } = mutation.data;',
      'mutation.status = "success";',
      'mutation.data = { data: { rows: [] } };',
      'unsafe.useCustom({ url: "/raw", method: "get" });',
      'unsafe.useCustomMutation();',
      'useCustom({ command: readCommand, input, queryOptions: { enabled: "yes" } });',
      'useCustom({ command: readCommand, input, dataProviderName: undefined });',
    ];
    virtual.set(target, [...accepted, ...invalid].join('\n'));
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, noImplicitOverride: true, skipLibCheck: false, types: ['svelte', 'node'],
      target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.Preserve, allowImportingTsExtensions: true,
    };
    const host = ts.createCompilerHost(options);
    const read = host.readFile;
    const exists = host.fileExists;
    host.readFile = file => virtual.get(file) ?? read(file);
    host.fileExists = file => virtual.has(file) || exists(file);
    host.resolveModuleNames = (names, containingFile) => names.map(name => {
      const candidate = resolve(dirname(containingFile), `${name}.tsx`);
      if (virtual.has(candidate)) return { resolvedFileName: candidate, extension: ts.Extension.Tsx };
      return ts.resolveModuleName(name, containingFile, options, host).resolvedModule;
    });
    const targets = [...sources, ...virtual.keys()];
    const program = ts.createProgram({ rootNames: [...targets,
      resolve(directory, '../../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
      resolve(directory, '../../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts'),
    ], options, host });
    const diagnostics = (file: string) => {
      const source = program.getSourceFile(file);
      if (!source) throw new Error(`Missing source ${file}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    };
    expect(targets.filter(file => file !== target).flatMap(diagnostics).map(item =>
      `${item.file?.fileName}:${item.start}: ${ts.flattenDiagnosticMessageText(item.messageText, '\n')}`)).toEqual([]);
    expect(diagnostics(target).map(item => item.file && item.start !== undefined
      ? item.file.getLineAndCharacterOfPosition(item.start).line : -1))
      .toEqual(invalid.map((_, index) => accepted.length + index));
  }, 30_000);

  it('exports only the contract-bound hooks and removes dynamic command definitions', () => {
    expect(useCustom).toBeTypeOf('function');
    expect(useCustomMutation).toBeTypeOf('function');
    expect('useCustom' in unsafe).toBe(false);
    expect('useCustomMutation' in unsafe).toBe(false);
    const directory = dirname(fileURLToPath(import.meta.url));
    const legacy = readFileSync(resolve(directory, '../../../core/src/hooks.svelte.ts'), 'utf8');
    expect(legacy).not.toContain('UseCustomOptions');
    expect(legacy).not.toContain('invalidateByScopes');
  });

  it('prepares detached repeatable executions with one captured capability and receiver', async () => {
    const source = provider();
    const original = input();
    const prepared = prepareCommand(source, writeCommand, original);
    original.filter.year = 2000;
    prepared.input.labels.push('caller');
    const previous = source.custom;
    source.custom = vi.fn(async () => receipt(9));
    await expect(prepared.execute()).resolves.toEqual(receipt());
    await expect(prepared.execute()).resolves.toEqual(receipt());
    expect(previous).toHaveBeenCalledTimes(2);
    expect(previous.mock.calls[0]?.[0].payload).toEqual(input());
    expect(source.custom).not.toHaveBeenCalled();
    await expect(executeCommand(source, writeCommand, input())).resolves.toEqual(receipt(9));
  });

  it('does not invoke capability-owned call or bind helpers', async () => {
    const source = provider();
    const helper = vi.fn(() => { throw new Error('secret'); });
    Object.defineProperty(source.custom, 'bind', { get: helper });
    Object.defineProperty(source.custom, 'call', { get: helper });
    await expect(executeCommand(source, writeCommand, input())).resolves.toEqual(receipt());
    expect(helper).not.toHaveBeenCalled();
  });

  it('tags command caches and detaches every public query result', async () => {
    const source = provider();
    const app = mount(source);
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const descriptor = parseQueryKey(firstKey(app.client));
    expect(descriptor).toMatchObject({ kind: 'custom', provider: 'default', tenant: 'first', contract: expect.any(String),
      params: { source: expect.any(String), authSession: 'anonymous', input: input() } });
    const value = app.read().query.data;
    if (!value) throw new Error('Missing command data');
    value.data.rows.push({ count: 9 });
    expect(app.read().query.data).toEqual(receipt());
    expect(app.client.getQueryData(firstKey(app.client))).toEqual(receipt());
  });

  it('revalidates externally changed command cache data', async () => {
    const app = mount();
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    app.client.setQueryData(firstKey(app.client), { data: { rows: [{ count: 'secret' }] } });
    await waitFor(() => expect(app.read().query.error).toMatchObject({ code: 'INVALID_COMMAND_RESPONSE' }));
    expect(app.read().query.data).toBeUndefined();
  });

  it('separates equal command inputs from distinct provider instances sharing one client', async () => {
    const one = provider(1);
    const two = provider(2);
    const left = mount(one);
    const right = mount(two, {}, { client: left.client });
    await waitFor(() => expect(left.read().query.data).toEqual(receipt(1)));
    await waitFor(() => expect(right.read().query.data).toEqual(receipt(2)));
    expect(one.custom).toHaveBeenCalledTimes(1);
    expect(two.custom).toHaveBeenCalledTimes(1);
  });

  it('separates two schemas with the same public command name', async () => {
    const source = provider();
    const other = defineCommand('report', { url: '/other', method: 'get', input: commandInput, output: commandOutput });
    const app = mount(source);
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    await app.change({ readCommand: other });
    await waitFor(() => expect(source.custom).toHaveBeenCalledTimes(2));
    expect(source.custom.mock.calls[1]?.[0].url).toBe('/other');
  });

  it('does not dispatch an old refetch after provider replacement', async () => {
    const first = provider(1);
    const second = provider(2);
    const app = mount(first);
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const refetch = app.read().query.refetch;
    await app.view.rerender({ provider: second });
    await waitFor(() => expect(app.read().query.data).toEqual(receipt(2)));
    expect((await refetch()).data).toBeUndefined();
    expect(first.custom).toHaveBeenCalledTimes(1);
    expect(second.custom).toHaveBeenCalledTimes(1);
  });

  it('captures query input in the cache key and rejects obsolete input refetches', async () => {
    const source = provider();
    const app = mount(source);
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const refetch = app.read().query.refetch;
    await app.change({ input: { filter: { year: 2027 }, labels: ['next'] } });
    await waitFor(() => expect(source.custom).toHaveBeenCalledTimes(2));
    expect(source.custom.mock.calls[1]?.[0].query).toEqual({ filter: { year: 2027 }, labels: ['next'] });
    expect((await refetch()).data).toBeUndefined();
    expect(source.custom).toHaveBeenCalledTimes(2);
  });

  it('rejects unknown provider routes rather than falling back to default', () => {
    const source = provider();
    expect(() => mount(source, { dataProviderName: 'missing' })).toThrow(HttpError);
    expect(source.custom).not.toHaveBeenCalled();
  });

  it.each(['read', 'write'] as const)('rejects commands of the wrong method in %s hooks', kind => {
    const source = provider();
    expect(() => mount(source, kind === 'read' ? { readCommand: writeCommand } : { writeCommand: readCommand }))
      .toThrow(HttpError);
    expect(source.custom).not.toHaveBeenCalled();
  });

  it('rejects malformed query input before scheduling a provider call', () => {
    const source = provider();
    const bad = input();
    Reflect.set(bad.filter, 'year', 'secret');
    expect(() => mount(source, { input: bad })).toThrow(HttpError);
    expect(source.custom).not.toHaveBeenCalled();
  });

  it('keeps late old reads out of a new provider scope', async () => {
    const first = provider(1);
    const second = provider(2);
    const pending = deferred<CustomResult>();
    first.custom.mockImplementation(() => pending.promise);
    const app = mount(first);
    await waitFor(() => expect(first.custom).toHaveBeenCalledOnce());
    await app.view.rerender({ provider: second });
    await waitFor(() => expect(app.read().query.data).toEqual(receipt(2)));
    pending.resolve(receipt(1));
    await tick();
    expect(app.read().query.data).toEqual(receipt(2));
  });

  it('captures mutation input and capability before the first queued dispatch', async () => {
    const source = provider();
    const app = mount(source, { enabled: false });
    const previous = source.custom;
    const original = input();
    const result = app.read().mutation.mutateAsync(original);
    original.labels.push('caller');
    source.custom = vi.fn(async () => receipt(9));
    await expect(result).resolves.toEqual(receipt());
    expect(previous.mock.calls[0]?.[0].payload).toEqual(input());
    expect(source.custom).not.toHaveBeenCalled();
  });

  it('keeps mutation state and methods read-only through reflection', async () => {
    const app = mount(provider(), { enabled: false });
    const mutation = app.read().mutation;
    expect(Reflect.set(mutation, 'status', 'success')).toBe(false);
    expect(Reflect.defineProperty(mutation, 'data', { value: receipt(9) })).toBe(false);
    expect(Reflect.deleteProperty(mutation, 'mutateAsync')).toBe(false);
    await expect(mutation.mutateAsync(input())).resolves.toEqual(receipt());
    expect(Object.getOwnPropertyDescriptor(mutation, 'data')?.get?.()).toEqual(receipt());
  });

  it('joins identical writes with detached promises, variables, callbacks and state', async () => {
    const source = provider();
    const pending = deferred<CustomResult>();
    source.custom.mockImplementation(() => pending.promise);
    const app = mount(source, { enabled: false });
    const success = vi.fn();
    const first = app.read().mutation.mutateAsync(input(), {
      onSuccess(data, variables) { data.data.rows.push({ count: 9 }); variables.labels.push('observer'); },
    });
    const second = app.read().mutation.mutateAsync(input(), { onSuccess: success });
    expect(first).not.toBe(second);
    app.read().mutation.variables?.labels.push('view');
    await waitFor(() => expect(source.custom).toHaveBeenCalledOnce());
    expect(source.custom.mock.calls[0]?.[0].payload).toEqual(input());
    pending.resolve(receipt());
    const [left, right] = await Promise.all([first, second]);
    left.data.rows.push({ count: 7 });
    expect(right).toEqual(receipt());
    expect(app.read().mutation.data).toEqual(receipt());
    expect(success).toHaveBeenCalledWith(receipt(), input());
  });

  it('rejects a different concurrent write without replacing the active owner', async () => {
    const source = provider();
    const pending = deferred<CustomResult>();
    source.custom.mockImplementation(() => pending.promise);
    const app = mount(source, { enabled: false });
    const first = app.read().mutation.mutateAsync(input());
    await expect(app.read().mutation.mutateAsync({ ...input(), labels: ['other'] })).rejects.toMatchObject({ code: 'COMMAND_BUSY' });
    expect(app.read().mutation.isPending).toBe(true);
    pending.resolve(receipt());
    await expect(first).resolves.toEqual(receipt());
    expect(source.custom).toHaveBeenCalledOnce();
  });

  it('cancels a reset queued write before dispatch', async () => {
    const source = provider();
    const app = mount(source, { enabled: false });
    const pending = app.read().mutation.mutateAsync(input());
    app.read().mutation.reset();
    await expect(pending).rejects.toMatchObject({ code: 'COMMAND_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(source.custom).not.toHaveBeenCalled();
    expect(app.read().mutation.isIdle).toBe(true);
  });

  it.each(['reset', 'unmount', 'provider', 'tenant', 'command', 'router'] as const)(
    'retires in-flight mutation state and observers after %s', async kind => {
      const source = provider();
      const pending = deferred<CustomResult>();
      source.custom.mockImplementation(() => pending.promise);
      const app = mount(source, { enabled: false });
      const success = vi.fn();
      const settled = vi.fn();
      const result = app.read().mutation.mutateAsync(input(), { onSuccess: success, onSettled: settled });
      const outcome = rejected(result);
      await waitFor(() => expect(source.custom).toHaveBeenCalledOnce());
      if (kind === 'reset') app.read().mutation.reset();
      else if (kind === 'unmount') app.view.unmount();
      else if (kind === 'provider') await app.view.rerender({ provider: provider(2) });
      else if (kind === 'tenant') await app.view.rerender({ tenant: 'other' });
      else if (kind === 'command') await app.change({ writeCommand: defineCommand('other',
        { url: '/other', method: 'post', input: commandInput, output: commandOutput }) });
      else await app.view.rerender({ router: { go: () => {}, back: () => {}, parse: () => ({ pathname: '/other', params: {} }) } });
      expect(app.read().mutation.isIdle).toBe(true);
      pending.resolve(receipt());
      expect(await outcome).toMatchObject({ code: 'COMMAND_CANCELLED', details: { writeMayHaveSucceeded: true } });
      expect(app.read().mutation.data).toBeUndefined();
      expect(success).not.toHaveBeenCalled();
      expect(settled).not.toHaveBeenCalled();
    },
  );

  it('rechecks final delivery after a success callback resets the owner', async () => {
    const app = mount(provider(), { enabled: false });
    const settled = vi.fn();
    await expect(app.read().mutation.mutateAsync(input(), {
      onSuccess: () => app.read().mutation.reset(), onSettled: settled,
    })).rejects.toMatchObject({ code: 'COMMAND_CANCELLED', details: { writeMayHaveSucceeded: true } });
    expect(settled).not.toHaveBeenCalled();
    expect(app.read().mutation.isIdle).toBe(true);
  });

  it('rechecks the rejection handoff after an error callback resets the owner', async () => {
    const source = provider();
    source.custom.mockRejectedValue(new Error('secret'));
    const app = mount(source, { enabled: false });
    const settled = vi.fn();
    await expect(app.read().mutation.mutateAsync(input(), {
      onError: () => app.read().mutation.reset(), onSettled: settled,
    })).rejects.toMatchObject({ code: 'COMMAND_CANCELLED' });
    expect(settled).not.toHaveBeenCalled();
  });

  it('isolates caller callback exceptions and rejection from completed writes', async () => {
    const app = mount(provider(), { enabled: false });
    await expect(app.read().mutation.mutateAsync(input(), {
      onSuccess() { throw new Error('observer'); },
      onSettled: async () => { throw new Error('observer'); },
    })).resolves.toEqual(receipt());
    expect(app.read().mutation.isSuccess).toBe(true);
  });

  it('never invokes native retry, mutation defaults or global mutation callbacks', async () => {
    const native = vi.fn();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: {
        retry: 3, onMutate: native, onSuccess: native, onError: native, onSettled: native,
      } },
      mutationCache: new MutationCache({ onMutate: native, onSuccess: native, onError: native, onSettled: native }),
    });
    const source = provider();
    source.custom.mockRejectedValue(new Error('secret'));
    const app = mount(source, { enabled: false }, { client });
    await expect(app.read().mutation.mutateAsync(input())).rejects.toMatchObject({ code: 'COMMAND_FAILED' });
    expect(source.custom).toHaveBeenCalledOnce();
    expect(native).not.toHaveBeenCalled();
    expect(client.getMutationCache().getAll()).toEqual([]);
  });

  it('does not share provider errors with state, callbacks or caller errors', async () => {
    const source = provider();
    const raw = new HttpError('secret', 422, { secret: 'secret' }, { body: 'secret', cause: 'secret' });
    source.custom.mockRejectedValue(raw);
    const app = mount(source, { enabled: false });
    const settled = vi.fn();
    const error = await rejected(app.read().mutation.mutateAsync(input(), {
      onError(value) { value.statusCode = 499; value.message = 'observer'; }, onSettled: settled,
    }));
    expect(error).toMatchObject({ statusCode: 422, code: 'COMMAND_FAILED', details: { writeMayHaveSucceeded: true } });
    expect(error).not.toBe(raw);
    expect(error.cause).toBeUndefined();
    expect(error.body).toBeUndefined();
    expect(error.errors).toBeUndefined();
    expect(app.read().mutation.error).not.toBe(error);
    expect(app.read().mutation.error?.statusCode).toBe(422);
    expect(settled.mock.calls[0]?.[1]).toMatchObject({ statusCode: 422 });
  });

  it('rejects unvalidated inputs and callbacks before dispatch', async () => {
    const source = provider();
    const app = mount(source, { enabled: false });
    let reads = 0;
    const badInputs: unknown[] = [{ filter: { year: 'secret' }, labels: [] }, { ...input(), extra: true },
      { filter: { get year() { reads++; return 2026; } }, labels: [] }];
    for (const value of badInputs) {
      const result: unknown = Reflect.apply(app.read().mutation.mutateAsync, undefined, [value]);
      await expect(result).rejects.toMatchObject({ code: 'INVALID_COMMAND_INPUT' });
    }
    const result: unknown = Reflect.apply(app.read().mutation.mutateAsync, undefined, [
      input(), { get onSuccess() { reads++; return () => {}; } },
    ]);
    await expect(result).rejects.toMatchObject({ code: 'INVALID_COMMAND_INPUT' });
    expect(reads).toBe(0);
    expect(source.custom).not.toHaveBeenCalled();
  });

  it('copies validation errors and rechecks error observers before final delivery', async () => {
    const source = provider();
    const app = mount(source, { enabled: false });
    const bad = input();
    Reflect.set(bad.filter, 'year', 'secret');
    const settled = vi.fn();
    await expect(app.read().mutation.mutateAsync(bad, {
      onError(error, variables) {
        expect(error.code).toBe('INVALID_COMMAND_INPUT');
        expect(variables).toBeUndefined();
        app.read().mutation.reset();
      },
      onSettled: settled,
    })).rejects.toMatchObject({ code: 'COMMAND_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(app.read().mutation.isIdle).toBe(true);
    expect(settled).not.toHaveBeenCalled();
    expect(source.custom).not.toHaveBeenCalled();
  });

  it('retires validation state and its queued rejection on authentication changes', async () => {
    const app = await mountSession();
    const bad = input();
    Reflect.set(bad.filter, 'year', 'secret');
    const onError = vi.fn();
    const outcome = rejected(app.read().mutation.mutateAsync(bad, { onError }));
    const login = app.actions().login.mutate({ username: 'next' });
    expect(app.read().mutation.isIdle).toBe(true);
    expect(await outcome).toMatchObject({ code: 'COMMAND_CANCELLED', details: { writeMayHaveSucceeded: false } });
    await login;
    expect(app.read().mutation.isIdle).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });

  it('does not replace an active valid write with an invalid invocation', async () => {
    const source = provider();
    const pending = deferred<CustomResult>();
    source.custom.mockImplementation(() => pending.promise);
    const app = mount(source, { enabled: false });
    const result = app.read().mutation.mutateAsync(input());
    const bad = input();
    Reflect.set(bad, 'secret', true);
    const onError = vi.fn();
    await expect(app.read().mutation.mutateAsync(bad, { onError })).rejects.toMatchObject({ code: 'INVALID_COMMAND_INPUT' });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_COMMAND_INPUT' }), undefined);
    expect(app.read().mutation.isPending).toBe(true);
    pending.resolve(receipt());
    await expect(result).resolves.toEqual(receipt());
    expect(source.custom).toHaveBeenCalledOnce();
  });

  it('keeps the original auth owner when callback reflection starts login', async () => {
    const app = await mountSession();
    let login: Promise<unknown> | undefined;
    const observers = new Proxy({}, { getOwnPropertyDescriptor() {
      login ??= app.actions().login.mutate({ username: 'next' });
      return undefined;
    } });
    await expect(app.read().mutation.mutateAsync(input(), observers)).rejects.toMatchObject({
      code: 'COMMAND_CANCELLED', details: { writeMayHaveSucceeded: false },
    });
    await login;
    expect(app.source.custom).not.toHaveBeenCalled();
    expect(app.read().mutation.isIdle).toBe(true);
  });

  it('keeps the original auth owner when input reflection starts login', async () => {
    const app = await mountSession();
    let login: Promise<unknown> | undefined;
    const value = new Proxy(input(), { ownKeys(target) {
      login ??= app.actions().login.mutate({ username: 'next' });
      return Reflect.ownKeys(target);
    } });
    await expect(app.read().mutation.mutateAsync(value)).rejects.toMatchObject({
      code: 'COMMAND_CANCELLED', details: { writeMayHaveSucceeded: false },
    });
    await login;
    expect(app.source.custom).not.toHaveBeenCalled();
  });

  it('cancels capture when input reflection explicitly resets the hook', async () => {
    const source = provider();
    const app = mount(source, { enabled: false });
    const value = new Proxy(input(), { ownKeys(target) {
      app.read().mutation.reset();
      return Reflect.ownKeys(target);
    } });
    await expect(app.read().mutation.mutateAsync(value)).rejects.toMatchObject({
      code: 'COMMAND_CANCELLED', details: { writeMayHaveSucceeded: false },
    });
    expect(source.custom).not.toHaveBeenCalled();
    expect(app.read().mutation.isIdle).toBe(true);
  });

  it('does not supersede a nested invocation started while capturing input', async () => {
    const source = provider();
    const app = mount(source, { enabled: false });
    let nested: Promise<unknown> | undefined;
    const value = new Proxy(input(), { ownKeys(target) {
      nested ??= app.read().mutation.mutateAsync({ ...input(), labels: ['nested'] });
      return Reflect.ownKeys(target);
    } });
    await expect(app.read().mutation.mutateAsync(value)).rejects.toMatchObject({
      code: 'COMMAND_CANCELLED', details: { writeMayHaveSucceeded: false },
    });
    await expect(nested).resolves.toEqual(receipt());
    expect(source.custom).toHaveBeenCalledOnce();
    expect(source.custom.mock.calls[0]?.[0].payload).toEqual({ ...input(), labels: ['nested'] });
  });
  it('does not revive an old mutation when a new write starts after reset', async () => {
    const source = provider();
    const pending = deferred<CustomResult>();
    source.custom.mockImplementationOnce(() => pending.promise);
    const app = mount(source, { enabled: false });
    const old = rejected(app.read().mutation.mutateAsync(input()));
    await waitFor(() => expect(source.custom).toHaveBeenCalledOnce());
    app.read().mutation.reset();
    await expect(app.read().mutation.mutateAsync(input())).resolves.toEqual(receipt());
    pending.resolve(receipt(9));
    expect(await old).toMatchObject({ code: 'COMMAND_CANCELLED' });
    expect(app.read().mutation.data).toEqual(receipt());
  });

  it('ignores provider errors that arrive after the command target changes', async () => {
    const app = await mountSession();
    app.session.onError = vi.fn(async () => ({ logout: true }));
    const pending = deferred<CustomResult>();
    app.source.custom.mockImplementation(() => pending.promise);
    const onError = vi.fn();
    const outcome = rejected(app.read().mutation.mutateAsync(input(), { onError }));
    await waitFor(() => expect(app.source.custom).toHaveBeenCalledOnce());
    await app.view.rerender({ tenant: 'other' });
    pending.reject(new HttpError('secret', 401));
    expect(await outcome).toMatchObject({ code: 'COMMAND_CANCELLED' });
    expect(onError).not.toHaveBeenCalled();
    expect(app.session.onError).not.toHaveBeenCalled();
    expect(app.session.logout).not.toHaveBeenCalled();
  });

  it('separates simultaneous auth owners on a shared query client', async () => {
    const source = provider();
    const leftAuth = auth();
    const rightAuth = auth();
    const left = mount(source, {}, { auth: leftAuth });
    const right = mount(source, {}, { auth: rightAuth, client: left.client });
    await waitFor(() => expect(left.read().query.isSuccess && right.read().query.isSuccess).toBe(true));
    const tags = left.client.getQueryCache().getAll().map(query => parseQueryKey(query.queryKey))
      .filter(descriptor => descriptor?.kind === 'custom').map(descriptor => descriptor.params);
    expect(tags.some(params => typeof params === 'object' && params !== null &&
      Reflect.get(params, 'authSession') === captureAuthSession(leftAuth).cacheKey)).toBe(true);
    expect(tags.some(params => typeof params === 'object' && params !== null &&
      Reflect.get(params, 'authSession') === captureAuthSession(rightAuth).cacheKey)).toBe(true);
    await left.actions().logout.mutate();
    expect(left.read().query.data).toBeUndefined();
    expect(right.read().query.data).toEqual(receipt());
  });

  it('retires query data and old refetch callbacks at same-provider login', async () => {
    const app = await mountSession(provider(), auth(), {});
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const refetch = app.read().query.refetch;
    const pending = deferred<{ success: boolean }>();
    app.session.login = () => pending.promise;
    const login = app.actions().login.mutate({ username: 'next' });
    expect(app.read().query.data).toBeUndefined();
    const before = app.source.custom.mock.calls.length;
    expect((await refetch()).data).toBeUndefined();
    expect(app.source.custom).toHaveBeenCalledTimes(before);
    pending.resolve({ success: true });
    await login;
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
  });

  it('suppresses auth delegation from an old query response', async () => {
    const app = await mountSession(provider(), auth(), {});
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    app.session.onError = vi.fn(async () => ({ logout: true }));
    const pending = deferred<CustomResult>();
    app.source.custom.mockImplementationOnce(() => pending.promise);
    const refetch = app.read().query.refetch();
    await waitFor(() => expect(app.read().query.isFetching).toBe(true));
    await app.actions().login.mutate({ username: 'next' });
    pending.reject(new HttpError('secret', 401));
    expect((await refetch).data).toBeUndefined();
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    expect(app.session.onError).not.toHaveBeenCalled();
    expect(app.session.logout).not.toHaveBeenCalled();
  });

  it('cancels a queued write immediately when login starts', async () => {
    const app = await mountSession();
    const write = app.read().mutation.mutateAsync(input());
    const outcome = rejected(write);
    const login = app.actions().login.mutate({ username: 'next' });
    expect(await outcome).toMatchObject({ code: 'COMMAND_CANCELLED', details: { writeMayHaveSucceeded: false } });
    await login;
    expect(app.source.custom).not.toHaveBeenCalled();
  });

  it('cancels joined in-flight writes on auth retirement without exposing receipts', async () => {
    const app = await mountSession();
    const pending = deferred<CustomResult>();
    app.source.custom.mockImplementation(() => pending.promise);
    const success = vi.fn();
    const first = rejected(app.read().mutation.mutateAsync(input(), { onSuccess: success }));
    const second = rejected(app.read().mutation.mutateAsync(input(), { onSuccess: success }));
    await waitFor(() => expect(app.source.custom).toHaveBeenCalledOnce());
    await app.actions().login.mutate({ username: 'next' });
    pending.resolve(receipt());
    const [left, right] = await Promise.all([first, second]);
    expect(left).not.toBe(right);
    expect(left).toMatchObject({ code: 'COMMAND_CANCELLED', details: { writeMayHaveSucceeded: true } });
    expect(right).toMatchObject({ code: 'COMMAND_CANCELLED' });
    expect(app.read().mutation.isIdle).toBe(true);
    expect(success).not.toHaveBeenCalled();
  });

  it('lets a current checked auth handler finish its own delayed logout', async () => {
    const source = provider();
    source.custom.mockRejectedValue(new HttpError('secret', 401));
    const session = auth();
    const pending = deferred<{ success: boolean }>();
    session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/signed-out' }));
    session.logout = vi.fn(() => pending.promise);
    const app = await mountSession(source, session);
    const outcome = rejected(app.read().mutation.mutateAsync(input()));
    await waitFor(() => expect(session.logout).toHaveBeenCalledOnce());
    expect(app.read().mutation.isIdle).toBe(true);
    pending.resolve({ success: true });
    await outcome;
    await waitFor(() => expect(app.router.go).toHaveBeenCalledWith(expect.objectContaining({ to: '/signed-out' })));
    expect(captureAuthSession(session).isCurrent()).toBe(false);
  });

  it('does not let an old auth handler log out a new session', async () => {
    const source = provider();
    source.custom.mockRejectedValue(new HttpError('secret', 401));
    const session = auth();
    const pending = deferred<{ logout: boolean }>();
    session.onError = vi.fn(() => pending.promise);
    const app = await mountSession(source, session);
    await rejected(app.read().mutation.mutateAsync(input()));
    await waitFor(() => expect(session.onError).toHaveBeenCalledOnce());
    await app.actions().login.mutate({ username: 'next' });
    pending.resolve({ logout: true });
    await tick();
    expect(session.logout).not.toHaveBeenCalled();
    expect(app.router.go).not.toHaveBeenCalledWith(expect.objectContaining({ to: '/login' }));
  });

  it('retires an auth error delegate when the caller explicitly resets', async () => {
    const source = provider();
    source.custom.mockRejectedValue(new HttpError('secret', 401));
    const session = auth();
    const pending = deferred<{ logout: boolean }>();
    session.onError = vi.fn(() => pending.promise);
    const app = await mountSession(source, session);
    await rejected(app.read().mutation.mutateAsync(input()));
    app.read().mutation.reset();
    pending.resolve({ logout: true });
    await tick();
    expect(session.logout).not.toHaveBeenCalled();
    expect(app.router.go).not.toHaveBeenCalled();
  });
});
