import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { QueryClient, QueryObserver } from '@tanstack/svelte-query';
import { defineResource, keys, parseQueryKey, resetContext, setAdminOptions, setAuditHandler, UndoError, HttpError, captureAuthSession, type DataProvider,
  type GetListResult, type GetOneResult, type ResourceDefinition, type AuthProvider, type AuthActionResult,
  type LiveProvider, type NotificationProvider, type AuditLogProvider } from '@svadmin/core';
import { getToasts, removeToast, resetToast } from '@svadmin/core/toast';
import { contractKey } from '../../../core/src/resource-contract';
import { resetLogoutVersion } from '../../../core/src/auth-hooks.svelte';
import { flushSync } from 'svelte';
import { definedOptions } from '@svadmin/core/options';
import * as legacy from '../../../core/src/hooks.svelte';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DeleteState, DeleteAuthActions } from './delete-contract.test.types';
import Host from './delete-contract.test-host.svelte';

const record = Type.Object({ id: Type.Number(), title: Type.String() });
const posts = defineResource('posts', { record });
const other = defineResource('other', { record });
const postDefinition: ResourceDefinition = { name: 'posts', label: 'Posts', fields: [], contract: posts };
const resources: ResourceDefinition[] = [postDefinition, { name: 'other', label: 'Other', fields: [], contract: other }];
const row = { id: 1, title: 'First' };
const clients: QueryClient[] = [];

function provider(): DataProvider {
  return {
    getApiUrl: () => '/api',
    getList: vi.fn(async () => ({ data: [row], total: 1 })),
    getOne: vi.fn(async ({ id }) => ({ data: { id, title: 'First' } })),
    deleteOne: vi.fn(async ({ id }) => ({ data: { id, title: 'Deleted' } })),
    create: async () => ({ data: {} }), update: async () => ({ data: {} }),
  };
}
function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Request not initialized'); };
  let reject: (cause: unknown) => void = () => { throw new Error('Request not initialized'); };
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function testAuth(): AuthProvider {
  return { login: vi.fn(async () => ({ success: true })), logout: vi.fn(async () => ({ success: true })),
    check: vi.fn(async () => ({ authenticated: true })), getIdentity: async () => ({ id: 'user' }) };
}
function mount(source: DataProvider | Record<string, DataProvider> = provider(), options: {
  session?: AuthProvider; client?: QueryClient; showButton?: boolean;
} = {}) {
  const client = options.client ?? new QueryClient({ defaultOptions: {
    queries: { retry: false, staleTime: Infinity }, mutations: { retry: false },
  } });
  clients.push(client);
  let state: DeleteState | undefined;
  let actions: DeleteAuthActions | undefined;
  const view = render(Host, { provider: source, resources, queryClient: client, onReady: value => { state = value; },
    ...definedOptions({
      auth: options.session, showButton: options.showButton,
      onAuthReady: options.session === undefined ? undefined : (value: DeleteAuthActions) => { actions = value; },
    }),
  });
  return { client, view, actions() {
    if (!actions) throw new Error('Expected mounted auth controls');
    return actions;
  }, read() {
    if (!state) throw new Error('Expected a deletion hook');
    return state;
  } };
}
async function ready(app: ReturnType<typeof mount>) {
  await waitFor(() => expect(app.read().list.isSuccess && app.read().one.isSuccess).toBe(true));
}
async function changeScope(app: ReturnType<typeof mount>, change: string) {
  if (change === 'resource') await app.view.rerender({ resource: 'other' });
  else if (change === 'id') await app.view.rerender({ id: 2 });
  else if (change === 'tenant') await app.view.rerender({ tenant: 'next' });
  else if (change === 'provider') await app.view.rerender({ provider: provider() });
  else if (change === 'contract') await app.view.rerender({ resources: [
    { ...postDefinition, contract: defineResource('posts', { record }) },
  ] });
  else if (change === 'disabled') await app.view.rerender({ enabled: false });
  else if (change === 'reset') app.read().remove.mutation.reset();
  else if (change === 'auth') await app.view.rerender({ auth: testAuth() });
  else if (change === 'router') await app.view.rerender({ router: { go: vi.fn(), back: vi.fn(), parse: () => ({ params: {}, pathname: '/' }) } });
  else if (change === 'timeout') await app.view.rerender({ undoableTimeout: 60_001 });
  else app.view.unmount();
}
async function confirm(app: ReturnType<typeof mount>) {
  const scope = within(app.view.container);
  await fireEvent.click(scope.getByRole('button', { name: /^delete$/i }));
  await fireEvent.click(scope.getByRole('button', { name: /^confirm$/i }));
}
function scopedKeys(app: ReturnType<typeof mount>, authSession?: string) {
  const descriptor = app.client.getQueryCache().getAll().map(q => parseQueryKey(q.queryKey))
    .find(q => q?.kind === 'data' && q.action === 'list' && q.resource === 'posts' &&
      (authSession === undefined || (typeof q.params === 'object' && q.params !== null &&
        Object.getOwnPropertyDescriptor(q.params, 'authSession')?.value === authSession)));
  if (!descriptor) throw new Error('Expected a checked list key');
  const params = descriptor.params;
  const source: unknown = typeof params === 'object' && params !== null
    ? Object.getOwnPropertyDescriptor(params, 'source')?.value : undefined;
  if (typeof source !== 'string') throw new Error('Expected a source tag');
  const session: unknown = typeof params === 'object' && params !== null
    ? Object.getOwnPropertyDescriptor(params, 'authSession')?.value : undefined;
  if (typeof session !== 'string') throw new Error('Expected a session tag');
  const scope = definedOptions({ provider: descriptor.provider, tenant: descriptor.tenant, contract: descriptor.contract });
  return { builder: keys(scope), scope, source, owner: { source, authSession: session } };
}
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  resetLogoutVersion();
  resetToast();
  vi.restoreAllMocks();
});

describe('contract-bound deletion', () => {
  it('strictly compiles the changed boundary, button and API rejection fixtures', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = [
      '../../../core/src/delete-hooks.svelte.ts', '../../../core/src/delete-contract.ts',
      '../../../core/src/auth-hooks.svelte.ts', '../../../core/src/query-invalidation.ts', '../../../core/src/query-session.svelte.ts',
      '../../../core/src/resource-contract.ts', '../../../core/src/useCan.ts', '../../../core/src/access-control-contract.ts',
      '../../../core/src/captured-mutation.svelte.ts', '../../../core/src/reactive-projection.ts',
      '../../../core/src/strict-hooks.svelte.ts',
      '../../../../scripts/fixtures/core-resource-types/unregistered.ts',
      'delete-contract.test.svelte.ts',
      'delete-contract.test.types.ts', 'delete-contract.test.type-fixture.ts',
    ].map(path => resolve(directory, path));
    const virtual = new Map(['buttons/DeleteButton.svelte', 'delete-contract.test-probe.svelte', 'delete-contract.test-host.svelte'].map(name => {
      const filename = resolve(directory, name);
      return [`${filename}.tsx`, svelte2tsx(readFileSync(filename, 'utf8'), { filename, isTsFile: true, mode: 'ts' }).code];
    }));
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, noImplicitOverride: true, skipLibCheck: false, types: ['svelte', 'node'],
      target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.Preserve,
      allowImportingTsExtensions: true,
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
    const diagnostics = targets.flatMap(file => {
      const source = program.getSourceFile(file);
      if (!source) throw new Error(`Missing compiler input ${file}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    });
    expect(diagnostics.map(diagnostic => {
      const line = diagnostic.file && diagnostic.start !== undefined
        ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1 : 0;
      return `${diagnostic.file?.fileName ?? ''}:${line}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
    })).toEqual([]);
  }, 30_000);

  it('validates the current record ID and resource instead of freezing the first binding', async () => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    await app.view.rerender({ resource: 'other', id: 2 });
    await app.read().remove.mutation.mutateAsync({});
    expect(source.deleteOne).toHaveBeenCalledWith(expect.objectContaining({ resource: 'other', id: 2 }));
    await app.view.rerender({ id: 'invalid' });
    await expect(app.read().remove.mutation.mutateAsync({})).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(source.deleteOne).toHaveBeenCalledTimes(1);
  });

  it('requires a real contract and validates required deletion payloads', async () => {
    const source = provider();
    const app = mount(source);
    await app.view.rerender({ resources: [{ ...postDefinition,
      contract: defineResource('posts', { record, delete: Type.Object({ reason: Type.String() }) }),
    }] });
    await expect(app.read().remove.mutation.mutateAsync({})).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    await expect(app.read().remove.mutation.mutateAsync({ variables: { reason: false } }))
      .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(source.deleteOne).not.toHaveBeenCalled();
    await app.read().remove.mutation.mutateAsync({ variables: { reason: 'Duplicate' } });
    expect(source.deleteOne).toHaveBeenCalledTimes(1);
    expect(() => render(Host, { provider: source, resources: [{ name: 'posts', label: 'Posts', fields: [] }],
      queryClient: app.client })).toThrowError(expect.objectContaining({ code: 'RESOURCE_CONTRACT_REQUIRED' }));
  });

  it('rejects target, cache policy and unknown envelope overrides', async () => {
    const source = provider();
    const app = mount(source);
    for (const [key, value] of [['resource', 'other'], ['id', 2], ['invalidates', false], ['extra', true]]) {
      const params = {};
      Reflect.set(params, String(key), value);
      await expect(app.read().remove.mutation.mutateAsync(params)).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    }
    expect(source.deleteOne).not.toHaveBeenCalled();
  });

  it('rejects accessor-backed envelopes and nested payloads without executing them', async () => {
    const getter = vi.fn(() => 'private data');
    const source = provider();
    const app = mount(source);
    const envelope = Object.defineProperty({}, 'meta', { enumerable: true, get: getter });
    await expect(app.read().remove.mutation.mutateAsync(envelope)).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    const metadata = Object.defineProperty({}, 'value', { enumerable: true, get: getter });
    await expect(app.read().remove.mutation.mutateAsync({ meta: metadata })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(getter).not.toHaveBeenCalled();
    expect(source.deleteOne).not.toHaveBeenCalled();
  });

  it('captures payload, metadata, provider and receiver before an undo delay', async () => {
    const source = provider();
    const original = vi.fn<DataProvider['deleteOne']>(async function(this: DataProvider, params) {
      expect(this).toBe(source);
      return { data: { id: params.id, title: 'Deleted' } };
    });
    source.deleteOne = original;
    const app = mount(source);
    const required = defineResource('posts', { record, delete: Type.Object({ reason: Type.String() }) });
    await app.view.rerender({ undoable: true, resources: [{ ...postDefinition,
      contract: required, provider: { meta: { region: 'original' } },
    }] });
    const input = { variables: { reason: 'Original' }, meta: { extra: { marker: 'original' } } };
    const pending = app.read().remove.mutation.mutateAsync(input);
    await waitFor(() => expect(getToasts()).toHaveLength(1));
    input.variables.reason = 'Changed';
    input.meta.extra.marker = 'changed';
    const replacement = provider();
    source.deleteOne = replacement.deleteOne;
    const toast = getToasts()[0];
    if (!toast) throw new Error('Expected undo notification');
    toast.onTimeout?.();
    removeToast(toast.id);
    await pending;
    expect(original).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'posts', id: 1, variables: { reason: 'Original' },
      meta: expect.objectContaining({ region: 'original', extra: { marker: 'original' } }),
    }));
    expect(replacement.deleteOne).not.toHaveBeenCalled();
  });

  it('uses the resource provider route and refuses a missing explicit provider', async () => {
    const first = provider();
    const cms = provider();
    const app = mount({ default: first, cms });
    await app.view.rerender({ resources: [{ ...postDefinition, provider: { dataProviderName: 'cms' } }] });
    await app.read().remove.mutation.mutateAsync({});
    expect(cms.deleteOne).toHaveBeenCalledTimes(1);
    expect(first.deleteOne).not.toHaveBeenCalled();
    await expect(app.read().remove.mutation.mutateAsync({ dataProviderName: 'absent' }))
      .rejects.toMatchObject({ code: 'DATA_PROVIDER_REQUIRED' });
    expect(first.deleteOne).not.toHaveBeenCalled();
  });

  it('does not refresh or remove another provider instance sharing the same client and route', async () => {
    const first = provider();
    const second = provider();
    const app = mount(first);
    await ready(app);
    let next: DeleteState | undefined;
    render(Host, { provider: second, resources, queryClient: app.client, onReady: state => { next = state; } });
    await waitFor(() => expect(next?.list.isSuccess && next?.one.isSuccess).toBe(true));
    const secondKeys = app.client.getQueryCache().getAll()
      .filter(query => parseQueryKey(query.queryKey)?.kind === 'data').slice(2).map(query => query.queryKey);
    await app.read().remove.mutation.mutateAsync({});
    expect(first.getList).toHaveBeenCalledTimes(2);
    expect(second.getList).toHaveBeenCalledTimes(1);
    expect(second.getOne).toHaveBeenCalledTimes(1);
    for (const key of secondKeys) expect(app.client.getQueryState(key)).toBeDefined();
  });

  it('invalidates all owned data families but excludes untagged and foreign contract caches', async () => {
    const app = mount();
    await ready(app);
    const { builder, scope, source, owner } = scopedKeys(app);
    const selected = [builder.data.list('posts', { ...owner, extra: true }),
      builder.data.infiniteList('posts', owner), builder.data.many('posts', { ids: [1], ...owner }),
      builder.data.select('posts', owner), builder.data.selectDefaults('posts', owner)];
    const ownedDetail = builder.data.one('posts', 1, { ...owner, extra: true });
    const excluded = [
      builder.data.list('posts'), builder.data.one('posts', 1),
      builder.data.one('posts', '1', owner), builder.data.one('posts', 1, { source }),
      builder.data.one('posts', 1, { ...owner, authSession: 'foreign' }), builder.data.list('posts', { source }),
      builder.data.list('posts', { ...owner, authSession: 'foreign' }),
      builder.data.list('posts', { ...owner, source: 'other' }), builder.data.list('other', owner),
      keys({ ...scope, contract: contractKey(other) }).data.list('posts', owner),
      keys({ ...scope, provider: 'other' }).data.one('posts', 1, owner),
      keys({ ...scope, tenant: 'other' }).data.list('posts', owner),
      builder.access.can('posts'),
    ];
    for (const key of [...selected, ownedDetail, ...excluded]) app.client.setQueryData(key, { fixture: true });
    await app.read().remove.mutation.mutateAsync({});
    for (const key of selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(ownedDetail)).toBeUndefined();
    for (const key of excluded) expect(app.client.getQueryState(key)).toBeDefined();
    for (const key of excluded) {
      expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
    }
  });

  it.each([{ id: 1, title: false }, { id: 2, title: 'Wrong record' }, { id: '1', title: 'Wrong ID type' }])(
    'rejects malformed or mismatched deletion responses %j', async data => {
      const source = provider();
      source.deleteOne = vi.fn(async () => ({ data }));
      const app = mount(source);
      await expect(app.read().remove.mutation.mutateAsync({})).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true },
      });
      expect(source.deleteOne).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects accessor-backed responses before schema inspection', async () => {
    const getter = vi.fn(() => 'secret');
    const data = Object.defineProperty({ id: 1 }, 'title', { enumerable: true, get: getter });
    const source = provider();
    source.deleteOne = vi.fn(async () => ({ data }));
    const app = mount(source);
    await expect(app.read().remove.mutation.mutateAsync({})).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    expect(getter).not.toHaveBeenCalled();
  });

  it('waits for all owned refreshes after deletion, including when one fails early', async () => {
    const app = mount();
    await ready(app);
    const { builder, owner } = scopedKeys(app);
    const failed = deferred<GetListResult>();
    const slow = deferred<GetListResult>();
    const first = new QueryObserver(app.client, { queryKey: builder.data.list('posts', { ...owner, filter: 'failed' }),
      initialData: { data: [row], total: 1 }, queryFn: () => failed.promise, staleTime: Infinity });
    const second = new QueryObserver(app.client, { queryKey: builder.data.list('posts', { ...owner, filter: 'slow' }),
      initialData: { data: [row], total: 1 }, queryFn: () => slow.promise, staleTime: Infinity });
    const offFirst = first.subscribe(() => {});
    const offSecond = second.subscribe(() => {});
    try {
      let settled = false;
      const operation = app.read().remove.mutation.mutateAsync({}).finally(() => { settled = true; });
      await waitFor(() => expect(first.getCurrentResult().isFetching).toBe(true));
      failed.reject(new Error('refresh failed'));
      await waitFor(() => expect(first.getCurrentResult().isError).toBe(true));
      expect(settled).toBe(false);
      slow.resolve({ data: [], total: 0 });
      await operation;
      expect(settled).toBe(true);
    } finally { offFirst(); offSecond(); }
  });

  it('does not automatically retry a potentially committed deletion even with client retries enabled', async () => {
    const source = provider();
    source.deleteOne = vi.fn(async () => { throw { privateError: 'uncertain' }; });
    const app = mount(source);
    app.client.setDefaultOptions({ mutations: { retry: 3, retryDelay: 0 }, queries: { retry: false } });
    await expect(app.read().remove.mutation.mutateAsync({})).rejects.toMatchObject({
      code: 'DELETE_FAILED', message: 'Delete failed', details: { writeMayHaveSucceeded: true },
    });
    expect(source.deleteOne).toHaveBeenCalledTimes(1);
  });

  it('cancels undoable deletion without sending or changing cached records', async () => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    await app.view.rerender({ undoable: true });
    const operation = app.read().remove.mutation.mutateAsync({}).catch((error: unknown) => error);
    await waitFor(() => expect(getToasts()).toHaveLength(1));
    const toast = getToasts()[0];
    if (!toast) throw new Error('Expected undo notification');
    expect(app.read().list.data?.data).toEqual([row]);
    toast.onUndo?.();
    toast.onTimeout?.();
    removeToast(toast.id);
    const result = await operation;
    expect(result).toMatchObject({ name: 'UndoError' });
    expect(source.deleteOne).not.toHaveBeenCalled();
    expect(source.getList).toHaveBeenCalledTimes(1);
  });
  it('removes legacy single-delete hooks and factories', () => {
    expect('useDelete' in legacy).toBe(false);
    expect('createDeleteMutation' in legacy).toBe(false);
  });
  it.each(['resource', 'id', 'tenant', 'provider', 'contract', 'disabled', 'reset', 'unmount', 'auth', 'router', 'timeout'])(
    'cancels an undo window immediately after %s changes', async change => {
      const source = provider();
      const app = mount(source);
      await ready(app);
      await app.view.rerender({ undoable: true });
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const operation = app.read().remove.mutation.mutateAsync({}, { onSuccess, onError }).catch((error: unknown) => error);
      await waitFor(() => expect(getToasts()).toHaveLength(1));
      const oldToast = getToasts()[0];
      if (!oldToast) throw new Error('Expected undo toast');
      const invalidate = vi.spyOn(app.client, 'invalidateQueries');
      await changeScope(app, change);
      expect(await operation).toMatchObject({ code: 'DELETE_CANCELLED', details: { writeMayHaveSucceeded: false, id: 1 } });
      expect(getToasts()).toHaveLength(0);
      oldToast.onTimeout?.();
      oldToast.onUndo?.();
      expect(source.deleteOne).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    },
  );
  it.each(['resource', 'id', 'tenant', 'provider', 'disabled', 'reset', 'unmount'])(
    'isolates already-dispatched deletion after %s changes', async change => {
      const source = provider();
      const held = deferred<GetOneResult>();
      source.deleteOne = vi.fn(() => held.promise);
      const app = mount(source);
      await ready(app);
      const { builder, owner } = scopedKeys(app);
      const detail = builder.data.one('posts', 1, { ...owner, fixture: true });
      app.client.setQueryData(detail, { data: row });
      const onSuccess = vi.fn();
      const operation = app.read().remove.mutation.mutateAsync({}, { onSuccess }).catch((error: unknown) => error);
      await waitFor(() => expect(source.deleteOne).toHaveBeenCalledTimes(1));
      await changeScope(app, change);
      held.resolve({ data: row });
      expect(await operation).toMatchObject({
        code: 'DELETE_CANCELLED', details: { writeMayHaveSucceeded: true, id: 1, deleted: row },
      });
      expect(app.client.getQueryState(detail)).toBeUndefined();
      expect(onSuccess).not.toHaveBeenCalled();
      if (change !== 'unmount') await waitFor(() => expect(app.read().remove.mutation.isIdle).toBe(true));
    },
  );
  it.each([-1, 0.5, NaN, Infinity, 2_147_483_648])('rejects invalid undo timeout %s before creating a wait', async timeout => {
    const source = provider();
    const app = mount(source);
    await app.view.rerender({ undoable: true, undoableTimeout: timeout });
    await expect(app.read().remove.mutation.mutateAsync({})).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(getToasts()).toHaveLength(0);
    expect(source.deleteOne).not.toHaveBeenCalled();
  });
  it('prevents a queued deletion when reset before dispatch', async () => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    const operation = app.read().remove.mutation.mutateAsync({});
    app.read().remove.mutation.reset();
    await expect(operation).rejects.toMatchObject({ code: 'DELETE_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(source.deleteOne).not.toHaveBeenCalled();
    expect(getToasts()).toHaveLength(0);
  });
  it.each(['optimistic', 'undoable'] as const)('does not inherit global %s deletion policy or remove unconfirmed records', async mutationMode => {
    setAdminOptions({ mutationMode });
    const source = provider();
    const held = deferred<GetOneResult>();
    source.deleteOne = vi.fn(() => held.promise);
    const app = mount(source);
    await ready(app);
    const { builder, owner } = scopedKeys(app);
    const list = builder.data.list('posts', { ...owner, fixture: true });
    const detail = builder.data.one('posts', 1, { ...owner, fixture: true });
    const foreign = builder.data.one('posts', '1', owner);
    app.client.setQueryData(list, { data: [row], total: 1 });
    app.client.setQueryData(detail, { data: row });
    app.client.setQueryData(foreign, {});
    const operation = app.read().remove.mutation.mutateAsync({}).catch((error: unknown) => error);
    await waitFor(() => expect(source.deleteOne).toHaveBeenCalledTimes(1));
    expect(getToasts()).toHaveLength(0);
    expect(app.client.getQueryData(list)).toEqual({ data: [row], total: 1 });
    expect(app.client.getQueryData(detail)).toEqual({ data: row });
    held.resolve({ data: { id: 99, title: 'Foreign' } });
    expect(await operation).toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    expect(app.client.getQueryData(detail)).toEqual({ data: row });
    expect(app.client.getQueryState(detail)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(foreign)?.isInvalidated).toBe(false);
  });
  it('joins undo windows and detaches cancellation errors for every caller', async () => {
    const source = provider();
    const app = mount(source);
    await app.view.rerender({ undoable: true });
    const onError = vi.fn((error: Error) => { error.message = 'observer'; });
    const first = app.read().remove.mutation.mutateAsync({}, { onError }).catch((error: unknown) => error);
    const second = app.read().remove.mutation.mutateAsync({}, { onError }).catch((error: unknown) => error);
    await waitFor(() => expect(getToasts()).toHaveLength(1));
    getToasts()[0]?.onUndo?.();
    const [left, right] = await Promise.all([first, second]);
    expect(left).toBeInstanceOf(UndoError);
    expect(right).toBeInstanceOf(UndoError);
    if (left instanceof Error) left.message = 'caller';
    expect(right).toMatchObject({ message: 'Mutation undone' });
    expect(onError).toHaveBeenCalledTimes(2);
    expect(getToasts()).toHaveLength(0);
    expect(source.deleteOne).not.toHaveBeenCalled();
  });
  it('dismisses only its own undo window when another provider tree is pending', async () => {
    const source = provider();
    const otherSource = provider();
    const app = mount(source);
    await ready(app);
    await app.view.rerender({ undoable: true });
    let next: DeleteState | undefined;
    render(Host, { provider: otherSource, resources, queryClient: app.client, undoable: true, onReady: state => { next = state; } });
    await waitFor(() => expect(next?.list.isSuccess).toBe(true));
    if (!next) throw new Error('Expected another deletion hook');
    const first = app.read().remove.mutation.mutateAsync({}).catch((error: unknown) => error);
    const second = next.remove.mutation.mutateAsync({});
    await waitFor(() => expect(getToasts()).toHaveLength(2));
    app.read().remove.mutation.reset();
    expect(await first).toMatchObject({ code: 'DELETE_CANCELLED' });
    expect(getToasts()).toHaveLength(1);
    const retained = getToasts()[0];
    retained?.onTimeout?.();
    retained?.onTimeout?.();
    retained?.onUndo?.();
    await expect(second).resolves.toMatchObject({ data: { id: 1 } });
    expect(source.deleteOne).not.toHaveBeenCalled();
    expect(otherSource.deleteOne).toHaveBeenCalledTimes(1);
    expect(getToasts()).toHaveLength(0);
  });
  it('coalesces dispatch and detaches provider receipts, returned data and state', async () => {
    const source = provider();
    const held = deferred<GetOneResult>();
    source.deleteOne = vi.fn(() => held.promise);
    const app = mount(source);
    await ready(app);
    const onSuccess = vi.fn((result: { data: Record<string, unknown> }) => { result.data['title'] = 'observer'; });
    const onSettled = vi.fn();
    const first = app.read().remove.mutation.mutateAsync({}, { onSuccess, onSettled });
    const second = app.read().remove.mutation.mutateAsync({}, { onSuccess, onSettled });
    await expect(app.read().remove.mutation.mutateAsync({ meta: { different: true } })).rejects.toMatchObject({ code: 'DELETE_BUSY' });
    await waitFor(() => expect(source.deleteOne).toHaveBeenCalledTimes(1));
    const response = { data: { ...row } };
    held.resolve(response);
    const [left, right] = await Promise.all([first, second]);
    await waitFor(() => expect(app.read().remove.mutation.isSuccess).toBe(true));
    response.data.title = 'provider';
    left.data['title'] = 'caller';
    const state = app.read().remove.mutation.data;
    if (state) state.data['title'] = 'state';
    expect(right).toEqual({ data: row });
    expect(app.read().remove.mutation.data).toEqual({ data: row });
    expect(onSuccess).toHaveBeenCalledTimes(2);
    expect(onSettled).toHaveBeenNthCalledWith(1, { data: row }, null, {});
    expect(onSettled).toHaveBeenNthCalledWith(2, { data: row }, null, {});
  });
  it('detaches sanitized failures from joined callers and reactive state', async () => {
    const source = provider();
    const held = deferred<GetOneResult>();
    source.deleteOne = vi.fn(() => held.promise);
    const app = mount(source);
    await ready(app);
    const onError = vi.fn((error: Error) => { error.message = 'observer'; });
    const first = app.read().remove.mutation.mutateAsync({}, { onError }).catch((error: unknown) => error);
    const second = app.read().remove.mutation.mutateAsync({}, { onError }).catch((error: unknown) => error);
    await waitFor(() => expect(source.deleteOne).toHaveBeenCalledTimes(1));
    held.reject(new Error('secret'));
    const [left, right] = await Promise.all([first, second]);
    if (left instanceof Error) left.message = 'caller';
    await waitFor(() => expect(app.read().remove.mutation.isError).toBe(true));
    expect(right).toMatchObject({ message: 'Delete failed' });
    expect(app.read().remove.mutation.error?.message).toBe('Delete failed');
    expect(app.read().remove.mutation.failureReason?.message).toBe('Delete failed');
    expect(onError).toHaveBeenCalledTimes(2);
  });
  it('returns independent checked parameters to completion callbacks and no parameters for invalid input', async () => {
    const app = mount();
    await app.view.rerender({ resources: [{ ...postDefinition,
      contract: defineResource('posts', { record, delete: Type.Object({ reason: Type.String() }) }),
    }] });
    const onSuccess = vi.fn((_data: unknown, input: { variables?: unknown }) => { input.variables = { reason: 'changed' }; });
    const onSettled = vi.fn();
    const variables = { reason: 'Duplicate' };
    await app.read().remove.mutation.mutateAsync({ variables }, { onSuccess, onSettled });
    await waitFor(() => expect(app.read().remove.mutation.isSuccess).toBe(true));
    expect(onSettled).toHaveBeenCalledWith(expect.objectContaining({ data: { id: 1, title: 'Deleted' } }), null, { variables });
    expect(app.read().remove.mutation.variables).toEqual({ variables });
    const onError = vi.fn();
    const invalid: unknown = await app.read().remove.mutation.mutateAsync({}, { onError }).catch((error: unknown) => error);
    if (invalid instanceof Error) invalid.message = 'caller';
    await waitFor(() => expect(app.read().remove.mutation.isError).toBe(true));
    expect(app.read().remove.mutation.error?.message).toBe('Invalid deletion input');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_RESOURCE_INPUT' }), undefined);
  });
  it('ignores inherited lifecycle callbacks and failures from completion observers', async () => {
    const source = provider();
    source.deleteOne = vi.fn(async () => { throw new Error('secret'); });
    const app = mount(source);
    await ready(app);
    const inherited = vi.fn();
    app.client.setDefaultOptions({ mutations: { retry: 3, retryDelay: 0, onMutate: inherited, onError: inherited, onSettled: inherited } });
    await expect(app.read().remove.mutation.mutateAsync({}, {
      onError() { throw new Error('observer'); }, onSettled() { throw new Error('observer'); },
    })).rejects.toMatchObject({ code: 'DELETE_FAILED' });
    expect(inherited).not.toHaveBeenCalled();
    expect(source.deleteOne).toHaveBeenCalledTimes(1);
  });
  it('preserves numeric IDs in audit and does not remove string-identity cache entries', async () => {
    const app = mount();
    await ready(app);
    const audit = vi.fn();
    setAuditHandler(audit);
    const { builder, owner } = scopedKeys(app);
    const string = builder.data.one('posts', '1', owner);
    app.client.setQueryData(string, {});
    await app.read().remove.mutation.mutateAsync({});
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ recordId: 1, action: 'delete' }));
    expect(app.client.getQueryState(string)?.isInvalidated).toBe(false);
  });
  it.each(['unchanged', 'resource', 'reset', 'invalid-call'])('guards delayed auth responses after %s', async change => {
    const source = provider();
    source.deleteOne = vi.fn(async () => { throw { statusCode: 401, message: 'secret' }; });
    const app = mount(source);
    const held = deferred<{ logout: boolean; redirectTo: string }>();
    const onError = vi.fn<NonNullable<AuthProvider['onError']>>(async error => {
      expect(error).toMatchObject({ statusCode: 401, message: 'Delete failed' });
      if (error instanceof HttpError) error.message = 'changed';
      return held.promise;
    });
    const go = vi.fn();
    await app.view.rerender({ auth: { ...testAuth(), onError }, router: { go, back: vi.fn(), parse: () => ({ params: {}, pathname: '/' }) } });
    await ready(app);
    await expect(app.read().remove.mutation.mutateAsync({})).rejects.toMatchObject({ message: 'Delete failed' });
    expect(onError).toHaveBeenCalledTimes(1);
    if (change === 'resource') await app.view.rerender({ resource: 'other' });
    else if (change === 'reset') app.read().remove.mutation.reset();
    else if (change === 'invalid-call') await expect(app.read().remove.mutation.mutateAsync({ variables: { invalid: true } })).rejects.toBeDefined();
    held.resolve({ logout: false, redirectTo: '/login' });
    if (change === 'unchanged') await waitFor(() => expect(go).toHaveBeenCalledWith({ to: '/login', type: 'push' }));
    else {
      await held.promise;
      await Promise.resolve();
      expect(go).not.toHaveBeenCalled();
    }
  });
});

async function mountSession(source = provider(), session = testAuth(), client?: QueryClient) {
  const app = mount(source, { session, showButton: false, ...definedOptions({ client }) });
  const go = vi.fn();
  await app.view.rerender({ router: { go, back: vi.fn(), parse: () => ({ pathname: '/', params: {} }) } });
  await waitFor(() => expect(app.actions().check.isLoading).toBe(false));
  await ready(app);
  return { ...app, source, session, go };
}
async function observeEffects(app: ReturnType<typeof mount>) {
  const auditHandler = vi.fn();
  setAuditHandler(auditHandler);
  const audit: AuditLogProvider = { create: vi.fn(async input => ({ ...input, id: 'audit' })), get: async () => [] };
  const live = { subscribe: () => () => {}, publish: vi.fn<NonNullable<LiveProvider['publish']>>() } satisfies LiveProvider;
  const notification: NotificationProvider = { open: vi.fn(), close: vi.fn() };
  await app.view.rerender({ audit, live, notification });
  return { auditHandler, audit, live, notification };
}

describe('single-deletion authentication ownership', () => {
  it.each(['login', 'logout'] as const)('stops a queued deletion as soon as %s changes its session', async action => {
    const app = await mountSession();
    const callback = vi.fn();
    const operation = app.read().remove.mutation.mutateAsync({}, {
      onSuccess: callback, onError: callback, onSettled: callback,
    }).catch((error: unknown) => error);
    if (action === 'login') await app.actions().login.mutate({});
    else await app.actions().logout.mutate();
    expect(await operation).toMatchObject({ code: 'DELETE_CANCELLED', details: { writeMayHaveSucceeded: false, id: 1 } });
    expect(app.source.deleteOne).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
  });

  it('rechecks ownership after a native pre-dispatch callback delay', async () => {
    const app = await mountSession();
    const gate = deferred<void>();
    const observer = vi.fn(() => gate.promise);
    app.client.getMutationCache().config.onMutate = observer;
    const operation = app.read().remove.mutation.mutateAsync({}).catch((error: unknown) => error);
    await waitFor(() => expect(observer).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    gate.resolve();
    expect(await operation).toMatchObject({ code: 'DELETE_CANCELLED', details: { writeMayHaveSucceeded: false, id: 1 } });
    expect(app.source.deleteOne).not.toHaveBeenCalled();
  });

  it.each(['login', 'logout', 'check'] as const)('retires an undo window when %s changes the same authentication revision', async action => {
    const app = await mountSession();
    await app.view.rerender({ undoable: true });
    const callback = vi.fn();
    const operation = app.read().remove.mutation.mutateAsync({}, {
      onSuccess: callback, onError: callback, onSettled: callback,
    }).catch((error: unknown) => error);
    await waitFor(() => expect(getToasts()).toHaveLength(1));
    const saved = getToasts()[0];
    if (!saved) throw new Error('Expected an undo window');
    const refresh = vi.spyOn(app.client, 'invalidateQueries');
    if (action === 'login') await app.actions().login.mutate({});
    if (action === 'logout') await app.actions().logout.mutate();
    if (action === 'check') await app.actions().check.refetch();
    expect(await operation).toMatchObject({ code: 'DELETE_CANCELLED', details: { writeMayHaveSucceeded: false, id: 1 } });
    expect(getToasts()).toHaveLength(0);
    if (action === 'logout') await app.actions().login.mutate({});
    saved.onTimeout?.();
    saved.onUndo?.();
    await Promise.resolve();
    expect(app.source.deleteOne).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('does not let an old toast timeout dispatch before reactive cleanup has run', async () => {
    const app = await mountSession();
    await app.view.rerender({ undoable: true });
    const operation = app.read().remove.mutation.mutateAsync({}).catch((error: unknown) => error);
    await waitFor(() => expect(getToasts()).toHaveLength(1));
    const saved = getToasts()[0];
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    const login = app.actions().login.mutate({});
    saved?.onTimeout?.();
    saved?.onUndo?.();
    expect(await operation).toMatchObject({ code: 'DELETE_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(app.source.deleteOne).not.toHaveBeenCalled();
    gate.resolve({ success: true });
    await login;
  });

  it('blocks unavailable sessions while later valid calls may reuse the saved method', async () => {
    const app = await mountSession();
    const saved = app.read().remove.mutation.mutateAsync;
    await app.actions().logout.mutate();
    await expect(saved({})).rejects.toMatchObject({ code: 'DELETE_CANCELLED', details: { writeMayHaveSucceeded: false } });
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    const login = app.actions().login.mutate({});
    await expect(saved({})).rejects.toMatchObject({ code: 'DELETE_CANCELLED' });
    expect(app.source.deleteOne).not.toHaveBeenCalled();
    gate.resolve({ success: true });
    await login;
    await expect(saved({})).resolves.toMatchObject({ data: { id: 1 } });
    expect(app.source.deleteOne).toHaveBeenCalledTimes(1);
  });

  it.each(['success', 'failure'] as const)('quarantines a late %s without removing or refreshing newer-session caches', async outcome => {
    const app = await mountSession();
    const effects = await observeEffects(app);
    const handler = vi.fn(async () => ({ logout: true }));
    app.session.onError = handler;
    const gate = deferred<GetOneResult>();
    vi.mocked(app.source.deleteOne).mockReturnValueOnce(gate.promise);
    const { builder, owner } = scopedKeys(app, captureAuthSession(app.session).cacheKey);
    const oldKey = builder.data.one('posts', 1, { ...owner, fixture: true });
    app.client.setQueryData(oldKey, { data: row });
    const callback = vi.fn();
    const operation = app.read().remove.mutation.mutateAsync({}, {
      onSuccess: callback, onError: callback, onSettled: callback,
    }).catch((error: unknown) => error);
    await waitFor(() => expect(app.source.deleteOne).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    await ready(app);
    const freshKey = builder.data.one('posts', 1, { ...owner, authSession: captureAuthSession(app.session).cacheKey, fixture: true });
    app.client.setQueryData(freshKey, { data: row });
    const refresh = vi.spyOn(app.client, 'invalidateQueries');
    const remove = vi.spyOn(app.client, 'removeQueries');
    if (outcome === 'success') gate.resolve({ data: row });
    else gate.reject({ statusCode: 401, message: 'PRIVATE' });
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'DELETE_CANCELLED', details: { writeMayHaveSucceeded: true, id: 1 } });
    expect(error).not.toHaveProperty('details.deleted');
    expect(handler).not.toHaveBeenCalled();
    expect(app.session.logout).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
    expect(effects.auditHandler).not.toHaveBeenCalled();
    expect(effects.audit.create).not.toHaveBeenCalled();
    expect(effects.live.publish).not.toHaveBeenCalled();
    expect(effects.notification.open).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(app.client.getQueryState(oldKey)?.isInvalidated).toBe(false);
    expect(app.client.getQueryState(freshKey)?.isInvalidated).toBe(false);
    expect(app.client.getQueryData(freshKey)).toEqual({ data: row });
    expect(app.read().remove.mutation.isIdle).toBe(true);
  });

  it.each(['success', 'failure', 'preflight', 'pending', 'undo'] as const)('immediately hides %s state and reflective reads after auth changes', async outcome => {
    const app = await mountSession();
    const gate = deferred<GetOneResult>();
    if (outcome === 'failure') vi.mocked(app.source.deleteOne).mockRejectedValueOnce(new Error('PRIVATE'));
    if (outcome === 'pending') vi.mocked(app.source.deleteOne).mockReturnValueOnce(gate.promise);
    if (outcome === 'undo') await app.view.rerender({ undoable: true });
    const operation = app.read().remove.mutation.mutateAsync(outcome === 'preflight' ? { variables: { forbidden: true } } : {})
      .catch((error: unknown) => error);
    if (outcome !== 'pending' && outcome !== 'undo') await operation;
    await waitFor(() => expect(app.read().remove.mutation.status).toBe(
      outcome === 'pending' || outcome === 'undo' ? 'pending' : outcome === 'success' ? 'success' : 'error',
    ));
    const state = app.read().remove.mutation;
    const loginGate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(loginGate.promise);
    const login = app.actions().login.mutate({});
    expect(state.status).toBe('idle');
    expect(state.isIdle).toBe(true);
    expect(state.isPending).toBe(false);
    expect(state.isSuccess).toBe(false);
    expect(state.data).toBeUndefined();
    expect(state.variables).toBeUndefined();
    expect(state.error).toBeNull();
    expect(state.failureReason).toBeNull();
    expect({ ...state }).toMatchObject({ data: undefined, variables: undefined, status: 'idle', error: null });
    const reflected: unknown = Object.getOwnPropertyDescriptor(state, 'data')?.get?.();
    expect(reflected).toBeUndefined();
    expect(Reflect.set(state, 'data', { data: row })).toBe(false);
    gate.resolve({ data: row });
    await operation;
    loginGate.resolve({ success: true });
    await login;
    flushSync();
    expect(state.isIdle).toBe(true);
    expect(getToasts()).toHaveLength(0);
  });

  it('suppresses queued invalid-input observers after their session changes', async () => {
    const app = await mountSession();
    const callback = vi.fn();
    const operation = app.read().remove.mutation.mutateAsync({ variables: { invalid: true } }, {
      onError: callback, onSettled: callback,
    }).catch((error: unknown) => error);
    await app.actions().login.mutate({});
    expect(await operation).toMatchObject({ code: 'DELETE_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(callback).not.toHaveBeenCalled();
    expect(app.source.deleteOne).not.toHaveBeenCalled();
  });

  it('does not coalesce a new-session delete of the same ID with an unresolved old invocation', async () => {
    const app = await mountSession();
    const gate = deferred<GetOneResult>();
    vi.mocked(app.source.deleteOne).mockReturnValueOnce(gate.promise).mockResolvedValueOnce({ data: { ...row, title: 'Latest' } });
    const saved = app.read().remove.mutation.mutateAsync;
    const old = saved({}).catch((error: unknown) => error);
    await waitFor(() => expect(app.source.deleteOne).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    await expect(saved({})).resolves.toEqual({ data: { ...row, title: 'Latest' } });
    gate.resolve({ data: row });
    expect(await old).toMatchObject({ code: 'DELETE_CANCELLED' });
    expect(app.source.deleteOne).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(app.read().remove.mutation.isSuccess).toBe(true));
    expect(app.read().remove.mutation.data).toEqual({ data: { ...row, title: 'Latest' } });
  });

  it.each(['audit', 'live', 'remove', 'refresh', 'notification', 'onSuccess', 'onSettled'] as const)(
    'stops later effects when %s starts another login', async stage => {
      const app = await mountSession();
      const effects = await observeEffects(app);
      const { builder, owner } = scopedKeys(app, captureAuthSession(app.session).cacheKey);
      const details = [builder.data.one('posts', 1, { ...owner, fixture: 1 }), builder.data.one('posts', 1, { ...owner, fixture: 2 })];
      const collection = builder.data.select('posts', owner);
      for (const key of [...details, collection]) app.client.setQueryData(key, {});
      const gate = deferred<AuthActionResult>();
      vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
      let login: Promise<AuthActionResult> | undefined;
      const start = () => { login ??= app.actions().login.mutate({}); };
      if (stage === 'audit') effects.auditHandler.mockImplementation(start);
      if (stage === 'live') effects.live.publish.mockImplementation(start);
      if (stage === 'notification') vi.mocked(effects.notification.open).mockImplementation(start);
      const release = app.client.getQueryCache().subscribe(event => {
        if (stage === 'remove' && event.type === 'removed') start();
        if (stage === 'refresh' && event.type === 'updated' && event.action.type === 'invalidate') start();
      });
      const onSuccess = vi.fn(() => { if (stage === 'onSuccess') start(); });
      const onSettled = vi.fn(() => { if (stage === 'onSettled') start(); });
      const remove = vi.spyOn(app.client, 'removeQueries');
      const invalidate = vi.spyOn(app.client, 'invalidateQueries');
      const error: unknown = await app.read().remove.mutation.mutateAsync({}, { onSuccess, onSettled }).catch((error: unknown) => error);
      expect(login).toBeDefined();
      expect(error).toMatchObject({ code: 'DELETE_CANCELLED', details: { writeMayHaveSucceeded: true, id: 1 } });
      expect(error).not.toHaveProperty('details.deleted');
      if (stage === 'audit') {
        expect(effects.audit.create).not.toHaveBeenCalled();
        expect(effects.live.publish).not.toHaveBeenCalled();
      }
      if (stage === 'audit' || stage === 'live') expect(remove).not.toHaveBeenCalled();
      if (stage === 'audit' || stage === 'live' || stage === 'remove') expect(invalidate).not.toHaveBeenCalled();
      if (stage === 'remove') {
        expect(remove).toHaveBeenCalledTimes(1);
        for (const key of details) expect(app.client.getQueryData(key)).toEqual({});
      }
      if (stage === 'refresh') {
        expect(invalidate).toHaveBeenCalledTimes(1);
        expect(app.client.getQueryState(collection)?.isInvalidated).toBe(false);
      }
      if (stage !== 'onSuccess' && stage !== 'onSettled') expect(onSuccess).not.toHaveBeenCalled();
      if (stage !== 'onSettled') expect(onSettled).not.toHaveBeenCalled();
      release();
      gate.resolve({ success: true });
      await login;
    });

  it.each(['success', 'error', 'preflight', 'undo', 'joined-error'] as const)('guards each observer during reentrant %s delivery', async kind => {
    const app = await mountSession();
    const receipt = deferred<GetOneResult>();
    vi.mocked(app.source.deleteOne).mockReturnValueOnce(receipt.promise);
    if (kind === 'undo') await app.view.rerender({ undoable: true });
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    let login: Promise<AuthActionResult> | undefined;
    const observer = vi.fn(() => { login = app.actions().login.mutate({}); });
    const onSettled = vi.fn();
    const input = kind === 'preflight' ? { variables: { invalid: true } } : {};
    const joined = kind === 'success' || kind === 'joined-error';
    const first = app.read().remove.mutation.mutateAsync(input, joined ? {} : { onError: observer, onSettled })
      .catch((error: unknown) => error);
    const second = joined ? app.read().remove.mutation.mutateAsync(input,
      kind === 'success' ? { onSuccess: observer, onSettled } : { onError: observer, onSettled },
    ).catch((error: unknown) => error) : first;
    if (kind === 'undo') {
      await waitFor(() => expect(getToasts()).toHaveLength(1));
      getToasts()[0]?.onUndo?.();
    } else if (kind !== 'preflight') {
      await waitFor(() => expect(app.source.deleteOne).toHaveBeenCalledTimes(1));
      if (kind === 'success') receipt.resolve({ data: row });
      else receipt.reject(new Error('PRIVATE'));
    }
    await first;
    const result: unknown = await second;
    if (kind === 'success' || kind === 'undo') {
      expect(result).toMatchObject({ code: 'DELETE_CANCELLED', details: { writeMayHaveSucceeded: kind === 'success' } });
      expect(result).not.toHaveProperty('details.deleted');
    }
    expect(observer).toHaveBeenCalledTimes(1);
    expect(onSettled).not.toHaveBeenCalled();
    expect(app.read().remove.mutation.isIdle).toBe(true);
    gate.resolve({ success: true });
    await login;
  });

  it.each(['success', 'cancelled', 'undo'] as const)('withholds old %s data across delayed native completion', async outcome => {
    const app = await mountSession();
    const receipt = deferred<GetOneResult>();
    vi.mocked(app.source.deleteOne).mockReturnValueOnce(receipt.promise);
    if (outcome === 'undo') await app.view.rerender({ undoable: true });
    const gate = deferred<void>();
    const observer = vi.fn(() => gate.promise);
    if (outcome === 'success') app.client.getMutationCache().config.onSuccess = observer;
    else app.client.getMutationCache().config.onError = observer;
    const operation = app.read().remove.mutation.mutateAsync({}).catch((error: unknown) => error);
    if (outcome === 'undo') {
      await waitFor(() => expect(getToasts()).toHaveLength(1));
      getToasts()[0]?.onUndo?.();
    } else {
      await waitFor(() => expect(app.source.deleteOne).toHaveBeenCalledTimes(1));
      if (outcome === 'cancelled') await app.view.rerender({ id: 2 });
      receipt.resolve({ data: row });
    }
    await waitFor(() => expect(observer).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    gate.resolve();
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'DELETE_CANCELLED', details: { writeMayHaveSucceeded: outcome !== 'undo', id: 1 } });
    expect(error).not.toHaveProperty('details.deleted');
    expect(app.read().remove.mutation.isIdle).toBe(true);
  });

  it('waits for every started refresh after failure and session replacement', async () => {
    const app = await mountSession();
    const { builder, owner } = scopedKeys(app, captureAuthSession(app.session).cacheKey);
    app.client.setQueryData(builder.data.select('posts', owner), {});
    const gate = deferred<void>();
    const refresh = vi.spyOn(app.client, 'invalidateQueries').mockRejectedValueOnce(new Error('PRIVATE')).mockReturnValue(gate.promise);
    let settled = false;
    const operation = app.read().remove.mutation.mutateAsync({}).catch((error: unknown) => error).finally(() => { settled = true; });
    await waitFor(() => expect(refresh.mock.calls.length).toBeGreaterThan(1));
    await app.actions().login.mutate({});
    expect(settled).toBe(false);
    gate.resolve();
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'DELETE_CANCELLED', details: { id: 1 } });
    expect(error).not.toHaveProperty('details.deleted');
  });

  it.each(['same', 'independent'] as const)('isolates undo windows when another mounted %s auth tree logs out', async ownership => {
    const source = provider();
    const first = await mountSession(source);
    const second = await mountSession(source, ownership === 'same' ? first.session : testAuth(), first.client);
    await first.view.rerender({ undoable: true });
    await second.view.rerender({ undoable: true });
    const left = first.read().remove.mutation.mutateAsync({}).catch((error: unknown) => error);
    const right = second.read().remove.mutation.mutateAsync({}).catch((error: unknown) => error);
    await waitFor(() => expect(getToasts()).toHaveLength(2));
    await second.actions().logout.mutate();
    expect(await right).toMatchObject({ code: 'DELETE_CANCELLED' });
    if (ownership === 'same') {
      expect(await left).toMatchObject({ code: 'DELETE_CANCELLED' });
      expect(getToasts()).toHaveLength(0);
      expect(source.deleteOne).not.toHaveBeenCalled();
    } else {
      expect(getToasts()).toHaveLength(1);
      getToasts()[0]?.onTimeout?.();
      expect(await left).toMatchObject({ data: { id: 1 } });
      expect(source.deleteOne).toHaveBeenCalledTimes(1);
    }
  });

  it('does not remove another auth tree detail despite sharing raw provider and query client', async () => {
    const source = provider();
    const first = await mountSession(source);
    const second = await mountSession(source, testAuth(), first.client);
    const left = scopedKeys(first, captureAuthSession(first.session).cacheKey);
    const right = scopedKeys(second, captureAuthSession(second.session).cacheKey);
    expect(left.source).toBe(right.source);
    const owned = left.builder.data.one('posts', 1, { ...left.owner, fixture: true });
    const foreign = right.builder.data.one('posts', 1, { ...right.owner, fixture: true });
    first.client.setQueryData(owned, {});
    first.client.setQueryData(foreign, { data: row });
    await first.read().remove.mutation.mutateAsync({});
    expect(first.client.getQueryState(owned)).toBeUndefined();
    expect(first.client.getQueryData(foreign)).toEqual({ data: row });
    expect(first.client.getQueryState(foreign)?.isInvalidated).toBe(false);
  });

  it.each(['resolved', 'rejected'] as const)('allows the current auth delegate to finish its own %s logout', async outcome => {
    const app = await mountSession();
    app.session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/login' }));
    vi.mocked(app.session.logout).mockResolvedValueOnce({ success: outcome === 'resolved' });
    vi.mocked(app.source.deleteOne).mockRejectedValueOnce({ statusCode: 401, message: 'PRIVATE' });
    await expect(app.read().remove.mutation.mutateAsync({})).rejects.toMatchObject({
      code: 'DELETE_CANCELLED', details: { writeMayHaveSucceeded: true },
    });
    await waitFor(() => expect(app.session.logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(captureAuthSession(app.session).available).toBe(false));
    if (outcome === 'resolved') await waitFor(() => expect(app.go).toHaveBeenCalledWith({ to: '/login', type: 'push' }));
    else expect(app.go).not.toHaveBeenCalled();
    await expect(app.read().remove.mutation.mutateAsync({})).rejects.toMatchObject({ code: 'DELETE_CANCELLED' });
    expect(app.source.deleteOne).toHaveBeenCalledTimes(1);
  });

  it('drops a delayed auth instruction after a newer login on the same provider', async () => {
    const app = await mountSession();
    const gate = deferred<{ logout: boolean; redirectTo: string }>();
    const handler = vi.fn(() => gate.promise);
    app.session.onError = handler;
    vi.mocked(app.source.deleteOne).mockRejectedValueOnce({ statusCode: 401 });
    await expect(app.read().remove.mutation.mutateAsync({})).rejects.toMatchObject({ code: 'DELETE_FAILED' });
    await waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    app.go.mockClear();
    gate.resolve({ logout: true, redirectTo: '/login' });
    await gate.promise;
    await Promise.resolve();
    expect(app.session.logout).not.toHaveBeenCalled();
    expect(app.go).not.toHaveBeenCalled();
  });
});

describe('DeleteButton contract consumer', () => {
  it('requires a fresh confirmation after login and does not execute saved old button events', async () => {
    const app = await mountSession();
    await app.view.rerender({ showButton: true });
    const button = await app.view.findByRole('button', { name: /^delete$/i });
    await fireEvent.click(button);
    const oldConfirm = app.view.getByRole('button', { name: /^confirm$/i });
    await fireEvent.click(button);
    expect(app.source.deleteOne).not.toHaveBeenCalled();
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    const login = app.actions().login.mutate({});
    flushSync();
    expect(app.view.queryByRole('button', { name: /^confirm$/i })).toBeNull();
    await fireEvent.click(oldConfirm);
    expect(app.source.deleteOne).not.toHaveBeenCalled();
    gate.resolve({ success: true });
    await login;
    await fireEvent.click(await app.view.findByRole('button', { name: /^delete$/i }));
    await fireEvent.click(oldConfirm);
    expect(app.source.deleteOne).not.toHaveBeenCalled();
    await fireEvent.click(app.view.getByRole('button', { name: /^confirm$/i }));
    await waitFor(() => expect(app.source.deleteOne).toHaveBeenCalledTimes(1));
  });

  it('does not let permission bypass settings enable deletion while signed out', async () => {
    const app = await mountSession();
    await app.view.rerender({ showButton: true, accessControl: { enabled: false, hideIfUnauthorized: false } });
    await app.actions().logout.mutate();
    const button = app.view.getByRole('button', { name: /^delete$/i });
    expect(button.hasAttribute('disabled')).toBe(true);
    await fireEvent.click(button);
    expect(app.source.deleteOne).not.toHaveBeenCalled();
    expect(app.view.queryByRole('button', { name: /^confirm$/i })).toBeNull();
  });

  it.each(['undo', 'success', 'failure'] as const)('retires a button-owned %s after another component logs out', async outcome => {
    const app = await mountSession();
    const otherTree = await mountSession(app.source, app.session, app.client);
    const onSuccess = vi.fn();
    await app.view.rerender({ showButton: true, onSuccess, undoable: outcome === 'undo' });
    const gate = deferred<GetOneResult>();
    vi.mocked(app.source.deleteOne).mockReturnValueOnce(gate.promise);
    await confirm(app);
    if (outcome === 'undo') await waitFor(() => expect(getToasts()).toHaveLength(1));
    else await waitFor(() => expect(app.source.deleteOne).toHaveBeenCalledTimes(1));
    const writes = app.client.getMutationCache().getAll().filter(mutation => mutation.state.status === 'pending');
    expect(writes).toHaveLength(1);
    const saved = getToasts()[0];
    await otherTree.actions().logout.mutate();
    expect(app.view.queryByRole('button', { name: /^confirm$/i })).toBeNull();
    expect(app.view.queryByRole('alert')).toBeNull();
    if (outcome === 'undo') {
      expect(getToasts()).toHaveLength(0);
      saved?.onTimeout?.();
      saved?.onUndo?.();
    } else if (outcome === 'success') gate.resolve({ data: row });
    else gate.reject(new Error('PRIVATE'));
    await waitFor(() => expect(writes.every(mutation => mutation.state.status !== 'pending')).toBe(true));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(app.view.queryByRole('alert')).toBeNull();
    if (outcome === 'undo') expect(app.source.deleteOne).not.toHaveBeenCalled();
  });

  it('does not cancel its own checked auth-error logout when hiding the button', async () => {
    const app = await mountSession();
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.logout).mockReturnValueOnce(gate.promise);
    app.session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/login' }));
    vi.mocked(app.source.deleteOne).mockRejectedValueOnce({ statusCode: 401 });
    await app.view.rerender({ showButton: true });
    await confirm(app);
    await waitFor(() => expect(app.session.logout).toHaveBeenCalledTimes(1));
    expect(app.view.queryByRole('button', { name: /^delete$/i })).toBeNull();
    expect(app.view.queryByRole('alert')).toBeNull();
    gate.resolve({ success: true });
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ to: '/login', type: 'push' }));
  });

  it.each(['variables', 'permission', 'canDelete'])('cancels its undo window when %s changes', async change => {
    const source = provider();
    const app = mount(source);
    const contract = defineResource('posts', { record, delete: Type.Object({ reason: Type.String() }) });
    await app.view.rerender({
      resources: [{ ...postDefinition, contract }], undoable: true, variables: { reason: 'Original' },
      permission: { can: async () => ({ can: true }) },
    });
    await waitFor(() => expect(app.view.getByRole('button', { name: /^delete$/i }).hasAttribute('disabled')).toBe(false));
    await confirm(app);
    await waitFor(() => expect(getToasts()).toHaveLength(1));
    const old = getToasts()[0];
    if (change === 'variables') await app.view.rerender({ variables: { reason: 'Changed' } });
    else if (change === 'permission') await app.view.rerender({ permission: { can: async () => ({ can: false }) } });
    else await app.view.rerender({ resources: [{ ...postDefinition, contract, canDelete: false }] });
    await waitFor(() => expect(getToasts()).toHaveLength(0));
    old?.onTimeout?.();
    await waitFor(() => expect(app.client.getMutationCache().getAll().every(mutation => mutation.state.status !== 'pending')).toBe(true));
    expect(source.deleteOne).not.toHaveBeenCalled();
    expect(app.view.queryByRole('alert')).toBeNull();
  });
  it('requires confirmation, blocks duplicate submissions and calls success after completion', async () => {
    const pending = deferred<GetOneResult>();
    const source = provider();
    source.deleteOne = vi.fn(() => pending.promise);
    const onSuccess = vi.fn();
    const app = mount(source);
    await app.view.rerender({ onSuccess });
    await fireEvent.click(app.view.getByRole('button', { name: /^delete$/i }));
    expect(source.deleteOne).not.toHaveBeenCalled();
    const confirmButton = app.view.getByRole('button', { name: /^confirm$/i });
    await fireEvent.click(confirmButton);
    await fireEvent.click(confirmButton);
    await waitFor(() => expect(source.deleteOne).toHaveBeenCalledTimes(1));
    const button = app.view.getByRole('button', { name: /^delete$/i });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(onSuccess).not.toHaveBeenCalled();
    pending.resolve({ data: row });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('shows a sanitized error and allows an explicit retry', async () => {
    const source = provider();
    source.deleteOne = vi.fn<DataProvider['deleteOne']>()
      .mockRejectedValueOnce(new Error('private tenant credentials')).mockResolvedValue({ data: row });
    const onSuccess = vi.fn();
    const app = mount(source);
    await app.view.rerender({ onSuccess });
    await confirm(app);
    await waitFor(() => expect(app.view.getByRole('alert')).toBeTruthy());
    expect(app.view.container.textContent).not.toContain('private tenant');
    expect(onSuccess).not.toHaveBeenCalled();
    await confirm(app);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(app.view.queryByRole('alert')).toBeNull();
  });

  it('passes metadata-driven deletion payloads through runtime validation', async () => {
    const source = provider();
    const app = mount(source);
    await app.view.rerender({ resources: [{ ...postDefinition,
      contract: defineResource('posts', { record, delete: Type.Object({ reason: Type.String() }) }),
    }], variables: { reason: 'Duplicate' } });
    await confirm(app);
    await waitFor(() => expect(source.deleteOne).toHaveBeenCalledWith(expect.objectContaining({
      variables: { reason: 'Duplicate' },
    })));
  });

  it.each(['resource', 'id', 'tenant', 'provider', 'contract', 'metadata'] as const)(
    'does not send old completion callbacks into the new view after a %s change', async change => {
      const pending = deferred<GetOneResult>();
      const source = provider();
      source.deleteOne = vi.fn(() => pending.promise);
      const original = vi.fn();
      const next = vi.fn();
      const app = mount(source);
      await app.view.rerender({ onSuccess: original });
      await confirm(app);
      await waitFor(() => expect(source.deleteOne).toHaveBeenCalledOnce());
      switch (change) {
        case 'resource': await app.view.rerender({ resource: 'other' }); break;
        case 'id': await app.view.rerender({ id: 2 }); break;
        case 'tenant': await app.view.rerender({ tenant: 'second' }); break;
        case 'provider': await app.view.rerender({ provider: provider() }); break;
        case 'contract': await app.view.rerender({ resources: [{ ...postDefinition, contract: defineResource('posts', { record }) }] }); break;
        case 'metadata': await app.view.rerender({ resources: [{ ...postDefinition, provider: { meta: { region: 'next' } } }] }); break;
      }
      await app.view.rerender({ onSuccess: next });
      pending.resolve({ data: row });
      await waitFor(() => expect(app.client.getMutationCache().getAll().every(m => m.state.status !== 'pending')).toBe(true));
      expect(original).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(app.view.queryByRole('alert')).toBeNull();
    },
  );

  it('drops an old completion callback after unmount', async () => {
    const pending = deferred<GetOneResult>();
    const source = provider();
    source.deleteOne = vi.fn(() => pending.promise);
    const onSuccess = vi.fn();
    const app = mount(source);
    await app.view.rerender({ onSuccess });
    await confirm(app);
    await waitFor(() => expect(source.deleteOne).toHaveBeenCalledOnce());
    app.view.unmount();
    pending.resolve({ data: row });
    await waitFor(() => expect(app.client.getMutationCache().getAll().every(m => m.state.status !== 'pending')).toBe(true));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('resets confirmation when the record changes', async () => {
    const source = provider();
    const app = mount(source);
    await fireEvent.click(app.view.getByRole('button', { name: /^delete$/i }));
    await app.view.rerender({ id: 2 });
    expect(app.view.queryByRole('button', { name: /^confirm$/i })).toBeNull();
    await confirm(app);
    await waitFor(() => expect(source.deleteOne).toHaveBeenCalledWith(expect.objectContaining({ id: 2 })));
  });

  it('does not allow permission params to override the actual record ID', async () => {
    const permission = { can: vi.fn(async () => ({ can: false })) };
    const source = provider();
    const app = mount(source);
    await app.view.rerender({ permission, accessControl: { hideIfUnauthorized: false, params: { id: 99 } } });
    await waitFor(() => expect(permission.can).toHaveBeenCalled());
    expect(permission.can).toHaveBeenCalledWith(expect.objectContaining({ params: { id: 1 } }));
    expect(app.view.getByRole('button', { name: /^delete$/i }).hasAttribute('disabled')).toBe(true);
    await app.view.rerender({ accessControl: { enabled: false } });
    await confirm(app);
    await waitFor(() => expect(source.deleteOne).toHaveBeenCalledOnce());
  });

  it('isolates decisions from different permission providers sharing the same client', async () => {
    const source = provider();
    const app = mount(source);
    const allow = { can: vi.fn(async () => ({ can: true })) };
    const deny = { can: vi.fn(async () => ({ can: false })) };
    await app.view.rerender({ permission: allow });
    await waitFor(() => expect(allow.can).toHaveBeenCalledOnce());
    const second = render(Host, { provider: source, resources, queryClient: app.client, permission: deny,
      accessControl: { hideIfUnauthorized: false } });
    await waitFor(() => expect(deny.can).toHaveBeenCalledOnce());
    expect(within(second.container).getByRole('button', { name: /^delete$/i }).hasAttribute('disabled')).toBe(true);
    expect(within(app.view.container).getByRole('button', { name: /^delete$/i }).hasAttribute('disabled')).toBe(false);
  });

  it('fails closed on malformed permission decisions without invoking getters', async () => {
    const getter = vi.fn(() => true);
    const result = Object.defineProperty({ can: false }, 'can', { enumerable: true, get: getter });
    const app = mount();
    await app.view.rerender({ permission: { can: async () => result }, accessControl: { hideIfUnauthorized: false } });
    await waitFor(() => expect(app.client.getQueryCache().getAll().some(query =>
      parseQueryKey(query.queryKey)?.kind === 'access' && query.state.status === 'error',
    )).toBe(true));
    expect(app.view.getByRole('button', { name: /^delete$/i }).hasAttribute('disabled')).toBe(true);
    expect(getter).not.toHaveBeenCalled();
  });

  it('does not execute accessor-backed permission params while attaching the record ID', async () => {
    const getter = vi.fn(() => 'secret');
    const params = Object.defineProperty({}, 'privateValue', { enumerable: true, get: getter });
    const app = mount();
    expect(() => render(Host, {
      provider: provider(), resources, queryClient: app.client,
      permission: { can: async () => ({ can: true }) }, accessControl: { params },
    })).toThrowError(expect.objectContaining({ code: 'INVALID_ACCESS_CONTROL_INPUT' }));
    expect(getter).not.toHaveBeenCalled();
  });

  it('keeps a late permission response in its original tenant and provider', async () => {
    const old = deferred<{ can: boolean }>();
    const first = { can: vi.fn(() => old.promise) };
    const next = { can: vi.fn(async () => ({ can: false })) };
    const app = mount();
    await app.view.rerender({ permission: first, accessControl: { hideIfUnauthorized: false } });
    await waitFor(() => expect(first.can).toHaveBeenCalledOnce());
    await app.view.rerender({ tenant: 'next', permission: next });
    await waitFor(() => expect(next.can).toHaveBeenCalledOnce());
    old.resolve({ can: true });
    await old.promise;
    await waitFor(() => expect(app.view.getByRole('button', { name: /^delete$/i }).hasAttribute('disabled')).toBe(true));
  });

  it('hides resource-disabled deletion and treats undo as cancellation rather than failure', async () => {
    const source = provider();
    const app = mount(source);
    await app.view.rerender({ resources: [{ ...postDefinition, canDelete: false }] });
    expect(app.view.queryByRole('button', { name: /^delete$/i })).toBeNull();
    await app.view.rerender({ resources, undoable: true });
    await confirm(app);
    await waitFor(() => expect(getToasts()).toHaveLength(1));
    const toast = getToasts()[0];
    if (!toast) throw new Error('Expected undo notification');
    toast.onUndo?.();
    removeToast(toast.id);
    await waitFor(() => expect(app.view.getByRole('button', { name: /^delete$/i }).hasAttribute('disabled')).toBe(false));
    expect(source.deleteOne).not.toHaveBeenCalled();
    expect(app.view.queryByRole('alert')).toBeNull();
  });
});
