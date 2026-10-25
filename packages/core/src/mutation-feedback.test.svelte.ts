import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { Type } from 'typebox';
import { defineResource } from './resource-contract';
import { resetContext } from './context.svelte';
import { getToastQueue, resetToast } from './toast.svelte';
import { HttpError, type AuditLogProvider, type AuthProvider, type DataProvider, type LiveProvider, type NotificationProvider, type ResourceDefinition } from './index';
import Host from './mutation-feedback.test-host.svelte';
import type { FeedbackOperation, FeedbackState } from './mutation-feedback.test-types';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const contract = defineResource('posts', {
  record: Type.Object({ id: Type.Number(), title: Type.String() }),
  create: Type.Object({ title: Type.String() }),
  update: Type.Object({ title: Type.String() }),
});
const resources: ResourceDefinition[] = [{ name: 'posts', label: 'Posts', fields: [], contract }];
const row = { id: 1, title: 'Saved' };
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  resetToast();
  vi.restoreAllMocks();
});

it('typechecks the changed hooks, notification fixtures and false-only options', () => {
  const directory = dirname(fileURLToPath(import.meta.url));
  const targets = ['create-hooks.svelte.ts', 'update-many-hooks.svelte.ts', 'delete-many-hooks.svelte.ts',
    'mutation-feedback.test.svelte.ts'].map(name => resolve(directory, name));
  const virtual = new Map(['mutation-feedback.test-host.svelte', 'mutation-feedback.test-probe.svelte'].map(name => {
    const filename = resolve(directory, name);
    return [`${filename}.tsx`, svelte2tsx(readFileSync(filename, 'utf8'), { filename, isTsFile: true, mode: 'ts' }).code];
  }));
  const negative = resolve(directory, 'mutation-feedback.test.virtual.ts');
  const valid = [
    "import { useCreate, useUpdateMany, useDeleteMany } from './strict-hooks.svelte';",
    "import { defineResource } from './resource-contract';",
    "import { Type } from 'typebox';",
    "const resource = defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.String() }), create: Type.Object({ title: Type.String() }), update: Type.Object({ title: Type.String() }) });",
    ...['useCreate', 'useUpdateMany', 'useDeleteMany'].flatMap(hook => [
      `${hook}({ resource });`,
      `${hook}({ resource, successNotification: false, errorNotification: false });`,
    ]),
  ];
  const invalid = ['useCreate', 'useUpdateMany', 'useDeleteMany'].flatMap(hook => [
    `${hook}({ resource, errorNotification: true });`,
    `${hook}({ resource, successNotification: "custom" });`,
  ]);
  virtual.set(negative, [...valid, ...invalid].join('\n'));
  const options: ts.CompilerOptions = {
    noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
    noPropertyAccessFromIndexSignature: true, skipLibCheck: false, types: ['svelte', 'node'],
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.Preserve, allowImportingTsExtensions: true,
  };
  const host = ts.createCompilerHost(options);
  const read = host.readFile;
  const exists = host.fileExists;
  host.readFile = path => virtual.get(path) ?? read(path);
  host.fileExists = path => virtual.has(path) || exists(path);
  host.resolveModuleNames = (names, containingFile) => names.map(name => {
    const path = resolve(dirname(containingFile), `${name}.tsx`);
    if (virtual.has(path)) return { resolvedFileName: path, extension: ts.Extension.Tsx };
    return ts.resolveModuleName(name, containingFile, options, host).resolvedModule;
  });
  const program = ts.createProgram({ rootNames: [...targets, ...virtual.keys(),
    resolve(directory, '../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
    resolve(directory, '../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts'),
  ], options, host });
  const diagnostics = (path: string) => {
    const source = program.getSourceFile(path);
    if (!source) throw new Error(`Missing source ${path}`);
    return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
  };
  expect([...targets, ...virtual.keys()].filter(path => path !== negative).flatMap(diagnostics)
    .map(item => `${item.file?.fileName}:${item.start}: ${ts.flattenDiagnosticMessageText(item.messageText, '\n')}`)).toEqual([]);
  expect(diagnostics(negative).map(item => item.file && item.start !== undefined
    ? item.file.getLineAndCharacterOfPosition(item.start).line : -1)).toEqual(invalid.map((_, index) => valid.length + index));
}, 30_000);

describe.each(['create', 'update', 'delete'] satisfies FeedbackOperation[])('%s notification ownership', operation => {
  it.each([
    { transport: 'provider', silentSuccess: false, silentError: false },
    { transport: 'provider', silentSuccess: false, silentError: true },
    { transport: 'provider', silentSuccess: true, silentError: false },
    { transport: 'provider', silentSuccess: true, silentError: true },
    { transport: 'toast', silentSuccess: false, silentError: false },
    { transport: 'toast', silentSuccess: false, silentError: true },
    { transport: 'toast', silentSuccess: true, silentError: false },
    { transport: 'toast', silentSuccess: true, silentError: true },
  ])('$transport silentSuccess=$silentSuccess silentError=$silentError preserves write outcomes and effects', async policy => {
    let rejectWrite = true;
    const write = vi.fn(() => {
      if (rejectWrite) throw new HttpError('Private storage error', 401);
    });
    const source: DataProvider = {
      getApiUrl: () => '/api',
      getList: vi.fn(async () => ({ data: [row], total: 1 })),
      getOne: async () => ({ data: row }),
      create: async () => { write(); return { data: row }; },
      update: async () => { write(); return { data: row }; },
      updateMany: async () => { write(); return { data: [row] }; },
      deleteOne: async () => { write(); return { data: row }; },
      deleteMany: async () => { write(); return { data: [row] }; },
    };
    const notification: NotificationProvider = { open: vi.fn(), close: vi.fn() };
    const audit: AuditLogProvider = { create: vi.fn(async input => ({ ...input, id: 'audit' })), get: async () => [] };
    const live: LiveProvider = { subscribe: () => () => {}, publish: vi.fn() };
    const auth: AuthProvider = {
      login: async () => ({ success: true }), logout: async () => ({ success: true }),
      check: async () => ({ authenticated: true }), getIdentity: async () => ({ id: 'test-user' }),
      onError: vi.fn(async () => ({ logout: false })),
    };
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onSettled = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    clients.push(client);
    let state: FeedbackState | undefined;
    render(Host, {
      provider: source, resources, queryClient: client, operation,
      notification: policy.transport === 'provider' ? notification : null,
      audit, live, auth, silentSuccess: policy.silentSuccess, silentError: policy.silentError,
      onReady: (value: FeedbackState) => { state = value; }, onSuccess, onError, onSettled,
    });
    function read(): FeedbackState {
      if (!state) throw new Error('Expected mounted mutation hooks');
      return state;
    }
    await waitFor(() => expect(read().ready()).toBe(true));
    expect(source.getList).toHaveBeenCalledOnce();
    await expect(read().run()).rejects.toMatchObject({ statusCode: 401 });
    await waitFor(() => expect(auth.onError).toHaveBeenCalledOnce());
    expect(write).toHaveBeenCalledOnce();
    expect(source.getList).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledOnce();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalledOnce();
    expect(audit.create).not.toHaveBeenCalled();
    expect(live.publish).not.toHaveBeenCalled();
    const errorCount = policy.silentError ? 0 : 1;
    expect(notification.open).toHaveBeenCalledTimes(policy.transport === 'provider' ? errorCount : 0);
    expect(getToastQueue()).toHaveLength(policy.transport === 'toast' ? errorCount : 0);
    if (!policy.silentError) {
      if (policy.transport === 'provider') {
        expect(notification.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
      } else expect(getToastQueue()[0]?.type).toBe('error');
    }
    expect(JSON.stringify([vi.mocked(notification.open).mock.calls, getToastQueue()])).not.toContain('Private storage error');

    vi.mocked(notification.open).mockClear();
    resetToast();
    rejectWrite = false;
    await expect(read().run()).resolves.toEqual({ data: operation === 'create' ? row : [row] });
    expect(write).toHaveBeenCalledTimes(2);
    expect(source.getList).toHaveBeenCalledTimes(3);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledOnce();
    expect(onSettled).toHaveBeenCalledTimes(2);
    expect(audit.create).toHaveBeenCalledOnce();
    expect(live.publish).toHaveBeenCalledOnce();
    const successCount = policy.silentSuccess ? 0 : 1;
    expect(notification.open).toHaveBeenCalledTimes(policy.transport === 'provider' ? successCount : 0);
    expect(getToastQueue()).toHaveLength(policy.transport === 'toast' ? successCount : 0);
    if (!policy.silentSuccess) {
      if (policy.transport === 'provider') {
        expect(notification.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
      } else expect(getToastQueue()[0]?.type).toBe('success');
    }
  });
});

describe.each(['update', 'delete'] as const)('%s partial failure', operation => {
  it.each([false, true])('preserves checked progress with silentError=%s', async silentError => {
    const single = vi.fn(async ({ id }: { id: string | number }) => {
      if (id === 2) throw new Error('Private partial failure');
      return { data: row };
    });
    const source: DataProvider = {
      getApiUrl: () => '/api', getList: vi.fn(async () => ({ data: [row, { ...row, id: 2 }], total: 2 })),
      getOne: async () => ({ data: row }), create: async () => ({ data: row }),
      update: single, deleteOne: single,
    };
    const notification: NotificationProvider = { open: vi.fn(), close: vi.fn() };
    const audit: AuditLogProvider = { create: vi.fn(async input => ({ ...input, id: 'audit' })), get: async () => [] };
    const live: LiveProvider = { subscribe: () => () => {}, publish: vi.fn() };
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onSettled = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    clients.push(client);
    let state: FeedbackState | undefined;
    render(Host, {
      provider: source, resources, queryClient: client, operation, ids: [1, 2], notification, audit, live,
      silentError, onReady: (value: FeedbackState) => { state = value; }, onSuccess, onError, onSettled,
    });
    function read(): FeedbackState {
      if (!state) throw new Error('Expected mounted mutation hooks');
      return state;
    }
    await waitFor(() => expect(read().ready()).toBe(true));
    await expect(read().run()).rejects.toMatchObject({ succeededIds: [1], failedIds: [2] });
    expect(single).toHaveBeenCalledTimes(2);
    expect(source.getList).toHaveBeenCalledTimes(2);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
    expect(onSettled).toHaveBeenCalledOnce();
    expect(audit.create).toHaveBeenCalledOnce();
    expect(live.publish).toHaveBeenCalledOnce();
    expect(notification.open).toHaveBeenCalledTimes(silentError ? 0 : 1);
    expect(getToastQueue()).toHaveLength(0);
  });
});
