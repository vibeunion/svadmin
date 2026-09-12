import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { QueryClient, QueryObserver } from '@tanstack/svelte-query';
import { defineResource, keys, parseQueryKey, resetContext, setAdminOptions, setAuditHandler, type DataProvider,
  captureAuthSession, type GetListResult, type GetOneResult, type ResourceDefinition, type AuthProvider,
  type AuthActionResult, type AuditLogProvider, type LiveProvider, type NotificationProvider } from '@svadmin/core';
import { resetToast } from '@svadmin/core/toast';
import { definedOptions } from '@svadmin/core/options';
import { contractKey } from '../../../core/src/resource-contract';
import { snapshotUpdateParams } from '../../../core/src/update-contract';
import { resetLogoutVersion } from '../../../core/src/auth-hooks.svelte';
import { flushSync } from 'svelte';
import * as legacy from '../../../core/src/hooks.svelte';
import { inlineDisplayValue, parseInlineValue } from '../inline-value';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UpdateState, UpdateAuthActions } from './update-contract.test.types';
import Host from './update-contract.test-host.svelte';

const record = Type.Object({ id: Type.Number(), title: Type.String(), amount: Type.Union([Type.Number(), Type.Null()]) });
const update = Type.Object({ title: Type.Optional(Type.String()), amount: Type.Optional(Type.Union([Type.Number(), Type.Null()])) });
const posts = defineResource('posts', { record, update });
const other = defineResource('other', { record, update });
const postDefinition: ResourceDefinition = { name: 'posts', label: 'Posts', fields: [], contract: posts };
const resources: ResourceDefinition[] = [postDefinition, { name: 'other', label: 'Other', fields: [], contract: other }];
const row = { id: 1, title: 'First', amount: 10 };
const clients: QueryClient[] = [];

function provider(): DataProvider {
  return {
    getApiUrl: () => '/api',
    getList: vi.fn(async () => ({ data: [row], total: 1 })),
    getOne: vi.fn(async ({ id }) => ({ data: { ...row, id } })),
    update: vi.fn(async ({ id, variables }) => ({
      data: { ...row, id, ...(typeof variables === 'object' && variables !== null ? variables : {}) },
    })),
    create: async () => ({ data: {} }), deleteOne: async () => ({ data: {} }),
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
  session?: AuthProvider; client?: QueryClient; showEditor?: boolean;
} = {}) {
  const client = options.client ?? new QueryClient({ defaultOptions: {
    queries: { retry: false, staleTime: Infinity }, mutations: { retry: false },
  } });
  clients.push(client);
  let state: UpdateState | undefined;
  let actions: UpdateAuthActions | undefined;
  const view = render(Host, { provider: source, resources, queryClient: client, onReady: value => { state = value; },
    ...definedOptions({
      auth: options.session, showEditor: options.showEditor,
      onAuthReady: options.session === undefined ? undefined : (value: UpdateAuthActions) => { actions = value; },
    }),
  });
  return { client, view, actions() {
    if (!actions) throw new Error('Expected mounted auth controls');
    return actions;
  }, read() {
    if (!state) throw new Error('Expected an update hook');
    return state;
  } };
}
async function ready(app: ReturnType<typeof mount>) {
  await waitFor(() => expect(app.read().list.isSuccess && app.read().one.isSuccess).toBe(true));
}
async function edit(app: ReturnType<typeof mount>, value = 'Edited', label = 'Title') {
  const scope = within(app.view.container);
  await fireEvent.click(await scope.findByRole('button', { name: `Edit ${label}` }));
  const input = scope.getByRole('textbox', { name: label });
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected an inline input');
  await fireEvent.input(input, { target: { value } });
  return input;
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
  if (typeof session !== 'string') throw new Error('Expected session ownership');
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

describe('contract-bound update', () => {
  it('keeps InlineEdit off the unchecked API inventory', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const inventory: unknown = JSON.parse(readFileSync(resolve(directory, '../../../../scripts/unsafe-boundaries.json'), 'utf8'));
    expect(Object.prototype.hasOwnProperty.call(inventory, 'packages/ui/src/components/InlineEdit.svelte')).toBe(false);
    expect(readFileSync(resolve(directory, 'InlineEdit.svelte'), 'utf8')).not.toContain('@svadmin/core/unsafe');
  });

  it('strictly compiles the changed boundary, editor and API rejection fixtures', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = [
      '../../../core/src/update-hooks.svelte.ts', '../../../core/src/update-contract.ts',
      '../../../core/src/resource-contract.ts', '../../../core/src/captured-mutation.svelte.ts',
      '../../../core/src/strict-hooks.svelte.ts',
      '../../../core/src/index.ts', '../../../core/src/auth-hooks.svelte.ts',
      '../../../core/src/query-invalidation.ts', '../../../core/src/query-session.svelte.ts',
      '../../../../scripts/fixtures/core-resource-types/unregistered.ts',
      '../inline-value.ts', 'update-contract.test.types.ts', 'update-contract.test.type-fixture.ts',
      'update-contract.test.svelte.ts',
    ].map(path => resolve(directory, path));
    const virtual = new Map(['InlineEdit.svelte', 'update-contract.test-probe.svelte', 'update-contract.test-host.svelte'].map(name => {
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

  it.each([{}, { variables: undefined }, { variables: null }, { variables: { title: false } }, { variables: { extra: true } }])(
    'rejects malformed or missing update input %j before dispatch', async input => {
      const source = provider();
      const app = mount(source);
      // The erased metadata boundary still requires a variables envelope at runtime.
      await expect(Promise.resolve().then(() => snapshotUpdateParams(input)).then(params =>
        app.read().update.mutation.mutateAsync({ variables: params.variables }),
      )).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
      expect(source.update).not.toHaveBeenCalled();
    },
  );

  it('requires an explicit update schema and snapshots its definition', async () => {
    const source = provider();
    const app = mount(source);
    await app.view.rerender({ resources: [{ ...postDefinition, contract: defineResource('posts', { record }) }] });
    await expect(app.read().update.mutation.mutateAsync({ variables: {} })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    const title = Type.String();
    const contract = defineResource('posts', { record, update: Type.Object({ title }) });
    Reflect.set(title, 'type', 'boolean');
    await app.view.rerender({ resources: [{ ...postDefinition, contract }] });
    await expect(app.read().update.mutation.mutateAsync({ variables: {} })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    await app.read().update.mutation.mutateAsync({ variables: { title: 'Edited' } });
    expect(source.update).toHaveBeenCalledTimes(1);
  });

  it('uses the current binding and rejects an invalid ID', async () => {
    const source = provider();
    const app = mount(source);
    await app.view.rerender({ resource: 'other', id: 2 });
    await app.read().update.mutation.mutateAsync({ variables: { title: 'Edited' } });
    expect(source.update).toHaveBeenCalledWith(expect.objectContaining({ resource: 'other', id: 2 }));
    await app.view.rerender({ id: '2' });
    await expect(app.read().update.mutation.mutateAsync({ variables: { title: 'Edited' } }))
      .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(source.update).toHaveBeenCalledTimes(1);
  });

  it('refuses ID changes even when the update schema allows an ID', async () => {
    const source = provider();
    const app = mount(source);
    await app.view.rerender({ resources: [{ ...postDefinition, contract: defineResource('posts', {
      record, update: Type.Object({ id: Type.Union([Type.String(), Type.Number()]) }),
    }) }] });
    for (const id of [2, '1']) {
      await expect(app.read().update.mutation.mutateAsync({ variables: { id } }))
        .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    }
    await app.read().update.mutation.mutateAsync({ variables: { id: 1 } });
    expect(source.update).toHaveBeenCalledTimes(1);
  });

  it('rejects envelope overrides and accessors without executing them', async () => {
    const source = provider();
    const app = mount(source);
    for (const key of ['resource', 'id', 'invalidates', 'extra']) {
      const input = { variables: { title: 'Edited' } };
      Reflect.set(input, key, 'unexpected');
      await expect(app.read().update.mutation.mutateAsync(input)).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    }
    const getter = vi.fn(() => 'private data');
    const input = Object.defineProperty({ variables: {} }, 'variables', { enumerable: true, get: getter });
    const nested = Object.defineProperty({}, 'title', { enumerable: true, get: getter });
    for (const params of [input, { variables: nested }, { variables: {}, meta: nested }]) {
      await expect(app.read().update.mutation.mutateAsync(params)).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    }
    expect(getter).not.toHaveBeenCalled();
    expect(source.update).not.toHaveBeenCalled();
  });

  it('captures input, metadata, provider and receiver synchronously', async () => {
    const source = provider();
    const held = deferred<GetOneResult>();
    source.update = vi.fn(async function(this: DataProvider, params) {
      expect(this).toBe(source);
      expect(params.id).toBe(1);
      return held.promise;
    });
    const app = mount(source);
    await app.view.rerender({ resources: [{ ...postDefinition, provider: { meta: { region: 'original' } } }] });
    const params = { variables: { title: 'Original' }, meta: { extra: { marker: 'original' } } };
    const pending = app.read().update.mutation.mutateAsync(params).catch((error: unknown) => error);
    params.variables.title = 'Changed';
    params.meta.extra.marker = 'changed';
    await waitFor(() => expect(source.update).toHaveBeenCalledTimes(1));
    const replacement = provider();
    await app.view.rerender({ provider: replacement, resource: 'other', id: 2, tenant: 'next', resources });
    held.resolve({ data: row });
    expect(await pending).toMatchObject({ code: 'UPDATE_CANCELLED', details: { writeMayHaveSucceeded: true, updated: row } });
    expect(source.update).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'posts', id: 1, variables: { title: 'Original' },
      meta: expect.objectContaining({ region: 'original', extra: { marker: 'original' } }),
    }));
    expect(replacement.update).not.toHaveBeenCalled();
  });

  it('uses the named resource provider and refuses a missing explicit provider', async () => {
    const first = provider();
    const cms = provider();
    const app = mount({ default: first, cms });
    await app.view.rerender({ resources: [{ ...postDefinition, provider: { dataProviderName: 'cms' } }] });
    await app.read().update.mutation.mutateAsync({ variables: { title: 'Edited' } });
    expect(cms.update).toHaveBeenCalledTimes(1);
    await expect(app.read().update.mutation.mutateAsync({ variables: {}, dataProviderName: 'absent' }))
      .rejects.toMatchObject({ code: 'DATA_PROVIDER_REQUIRED' });
    expect(first.update).not.toHaveBeenCalled();
  });

  it('isolates independent provider instances on a shared client', async () => {
    const first = provider();
    const second = provider();
    const app = mount(first);
    await ready(app);
    let next: UpdateState | undefined;
    render(Host, { provider: second, resources, queryClient: app.client, onReady: state => { next = state; } });
    await waitFor(() => expect(next?.list.isSuccess && next?.one.isSuccess).toBe(true));
    await app.read().update.mutation.mutateAsync({ variables: { title: 'Edited' } });
    expect(first.getList).toHaveBeenCalledTimes(2);
    expect(first.getOne).toHaveBeenCalledTimes(2);
    expect(second.getList).toHaveBeenCalledTimes(1);
    expect(second.getOne).toHaveBeenCalledTimes(1);
  });

  it('refreshes only owned families and the strictly matching detail ID', async () => {
    const app = mount();
    await ready(app);
    const { builder, scope, source, owner } = scopedKeys(app);
    const selected = [builder.data.list('posts', { ...owner, extra: true }),
      builder.data.infiniteList('posts', owner), builder.data.many('posts', { ids: [1], ...owner }),
      builder.data.select('posts', owner), builder.data.selectDefaults('posts', owner),
      builder.data.one('posts', 1, { ...owner, extra: true })];
    const excluded = [builder.data.list('posts'), builder.data.one('posts', 1),
      builder.data.one('posts', '1', owner), builder.data.one('posts', 2, owner),
      builder.data.list('posts', { source }), builder.data.list('posts', { ...owner, authSession: 'foreign' }),
      builder.data.list('posts', { ...owner, source: 'other' }), builder.data.list('other', owner),
      keys({ ...scope, contract: contractKey(other) }).data.list('posts', owner),
      keys({ ...scope, provider: 'other' }).data.list('posts', owner),
      keys({ ...scope, tenant: 'other' }).data.list('posts', owner), builder.access.can('posts')];
    for (const key of [...selected, ...excluded]) app.client.setQueryData(key, { fixture: true });
    await app.read().update.mutation.mutateAsync({ variables: { title: 'Edited' } });
    for (const key of selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(true);
    for (const key of excluded) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
  });

  it.each([{ ...row, title: false }, { ...row, id: 2 }, { ...row, id: '1' }])(
    'rejects malformed or mismatched receipts %j without retrying', async data => {
      const source = provider();
      source.update = vi.fn(async () => ({ data }));
      const app = mount(source);
      app.client.setDefaultOptions({ mutations: { retry: 3, retryDelay: 0 }, queries: { retry: false } });
      await expect(app.read().update.mutation.mutateAsync({ variables: { title: 'Edited' } }))
        .rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true } });
      expect(source.update).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects response getters without executing them', async () => {
    const getter = vi.fn(() => 'secret');
    const source = provider();
    const app = mount(source);
    for (const result of [
      Object.defineProperty({ data: row }, 'data', { enumerable: true, get: getter }),
      { data: Object.defineProperty({ ...row }, 'title', { enumerable: true, get: getter }) },
    ]) {
      source.update = vi.fn(async () => result);
      await expect(app.read().update.mutation.mutateAsync({ variables: { title: 'Edited' } }))
        .rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    }
    expect(getter).not.toHaveBeenCalled();
  });

  it('waits for all owned refreshes even when one fails early', async () => {
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
      const operation = app.read().update.mutation.mutateAsync({ variables: { title: 'Edited' } }).finally(() => { settled = true; });
      await waitFor(() => expect(first.getCurrentResult().isFetching).toBe(true));
      failed.reject(new Error('refresh failed'));
      await waitFor(() => expect(first.getCurrentResult().isError).toBe(true));
      expect(settled).toBe(false);
      slow.resolve({ data: [], total: 0 });
      await operation;
      expect(settled).toBe(true);
    } finally { offFirst(); offSecond(); }
  });
  it('removes unchecked update hooks and factories', () => {
    expect('useUpdate' in legacy).toBe(false);
    expect('createUpdateMutation' in legacy).toBe(false);
  });
  it('captures the selected update method before queued dispatch', async () => {
    const source = provider();
    const original = source.update;
    const app = mount(source);
    await ready(app);
    const operation = app.read().update.mutation.mutateAsync({ variables: { title: 'Edited' } });
    source.update = vi.fn(async () => ({ data: { ...row, title: 'Replacement' } }));
    expect(await operation).toMatchObject({ data: { title: 'Edited' } });
    expect(original).toHaveBeenCalledTimes(1);
    expect(source.update).not.toHaveBeenCalled();
  });
  it.each(['optimistic', 'undoable'] as const)('does not publish speculative cache data under global %s mode', async mutationMode => {
    setAdminOptions({ mutationMode });
    const source = provider();
    const held = deferred<GetOneResult>();
    source.update = vi.fn(() => held.promise);
    const app = mount(source);
    await ready(app);
    const { builder, owner } = scopedKeys(app);
    const list = builder.data.list('posts', { ...owner, fixture: true });
    const detail = builder.data.one('posts', 1, { ...owner, fixture: true });
    const untouched = builder.data.one('posts', 2, owner);
    const before = { data: { ...row } };
    app.client.setQueryData(list, { data: [row], total: 1 });
    app.client.setQueryData(detail, before);
    app.client.setQueryData(untouched, { data: { ...row, id: 2 } });
    const operation = app.read().update.mutation.mutateAsync({ variables: { title: 'Edited' } }).catch((error: unknown) => error);
    await waitFor(() => expect(source.update).toHaveBeenCalledTimes(1));
    expect(app.client.getQueryData(detail)).toEqual(before);
    expect(app.client.getQueryData(list)).toEqual({ data: [row], total: 1 });
    const newer = { data: { ...row, title: 'Newer write' } };
    app.client.setQueryData(detail, newer);
    held.reject(new Error('private failure'));
    expect(await operation).toMatchObject({ code: 'UPDATE_FAILED' });
    expect(app.client.getQueryData(detail)).toEqual(newer);
    expect(app.client.getQueryState(untouched)?.isInvalidated).toBe(false);
  });
  it.each(['resource', 'id', 'tenant', 'provider', 'contract', 'disabled', 'reset', 'unmount', 'auth', 'router'])(
    'ignores stale state and observers after %s changes', async change => {
      const source = provider();
      const held = deferred<GetOneResult>();
      source.update = vi.fn(() => held.promise);
      const app = mount(source);
      await ready(app);
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const operation = app.read().update.mutation.mutateAsync({ variables: { title: 'Edited' } }, { onSuccess, onError })
        .catch((error: unknown) => error);
      await waitFor(() => expect(source.update).toHaveBeenCalledTimes(1));
      if (change === 'resource') await app.view.rerender({ resource: 'other' });
      else if (change === 'id') await app.view.rerender({ id: 2 });
      else if (change === 'tenant') await app.view.rerender({ tenant: 'next' });
      else if (change === 'provider') await app.view.rerender({ provider: provider() });
      else if (change === 'contract') await app.view.rerender({ resources: [
        { ...postDefinition, contract: defineResource('posts', { record, update }) },
      ] });
      else if (change === 'disabled') await app.view.rerender({ enabled: false });
      else if (change === 'reset') app.read().update.mutation.reset();
      else if (change === 'auth') await app.view.rerender({ auth: testAuth() });
      else if (change === 'router') await app.view.rerender({ router: { go: vi.fn(), back: vi.fn(), parse: () => ({ pathname: '/', params: {} }) } });
      else app.view.unmount();
      held.resolve({ data: row });
      const error: unknown = await operation;
      expect(error).toMatchObject({
        code: 'UPDATE_CANCELLED', details: { writeMayHaveSucceeded: true, id: 1, ...(change === 'auth' ? {} : { updated: row }) },
      });
      if (change === 'auth') expect(error).not.toHaveProperty('details.updated');
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      if (change !== 'unmount') await waitFor(() => expect(app.read().update.mutation.isIdle).toBe(true));
    },
  );
  it('prevents dispatch and refresh when reset before execution', async () => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    const invalidate = vi.spyOn(app.client, 'invalidateQueries');
    const operation = app.read().update.mutation.mutateAsync({ variables: { title: 'Edited' } });
    app.read().update.mutation.reset();
    await expect(operation).rejects.toMatchObject({ code: 'UPDATE_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(source.update).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });
  it('keeps a new completed mutation when a prior ID finishes later', async () => {
    const source = provider();
    const held = deferred<GetOneResult>();
    source.update = vi.fn(({ id }) => id === 1 ? held.promise : Promise.resolve({ data: { ...row, id, title: 'Latest' } }));
    const app = mount(source);
    await ready(app);
    const input = { variables: { title: 'Edited' } };
    const old = app.read().update.mutation.mutateAsync(input).catch((error: unknown) => error);
    await waitFor(() => expect(source.update).toHaveBeenCalledTimes(1));
    await app.view.rerender({ id: 2 });
    await app.read().update.mutation.mutateAsync(input);
    held.resolve({ data: row });
    expect(await old).toMatchObject({ code: 'UPDATE_CANCELLED' });
    await waitFor(() => expect(app.read().update.mutation.isSuccess).toBe(true));
    expect(app.read().update.mutation.data).toEqual({ data: { ...row, id: 2, title: 'Latest' } });
  });
  it('coalesces identical calls with independent receipt, state and callback values', async () => {
    const source = provider();
    const held = deferred<GetOneResult>();
    source.update = vi.fn(() => held.promise);
    const app = mount(source);
    await ready(app);
    const variables = { title: 'Edited' };
    const onSuccess = vi.fn((result: { data: Record<string, unknown> }, input: { variables: unknown }) => {
      result.data['title'] = 'callback';
      input.variables = { title: 'changed' };
    });
    const onSettled = vi.fn();
    const first = app.read().update.mutation.mutateAsync({ variables }, { onSuccess, onSettled });
    const second = app.read().update.mutation.mutateAsync({ variables }, { onSuccess, onSettled });
    await expect(app.read().update.mutation.mutateAsync({ variables: { title: 'Conflict' } })).rejects.toMatchObject({ code: 'UPDATE_BUSY' });
    await waitFor(() => expect(source.update).toHaveBeenCalledTimes(1));
    const response = { data: { ...row } };
    held.resolve(response);
    const [left, right] = await Promise.all([first, second]);
    await waitFor(() => expect(app.read().update.mutation.isSuccess).toBe(true));
    response.data.title = 'provider';
    left.data['title'] = 'caller';
    const data = app.read().update.mutation.data;
    if (data) data.data['title'] = 'state';
    const params = app.read().update.mutation.variables;
    if (params) params.variables = { title: 'state' };
    expect(right).toEqual({ data: row });
    expect(app.read().update.mutation.data).toEqual({ data: row });
    expect(app.read().update.mutation.variables).toEqual({ variables });
    expect(onSuccess).toHaveBeenCalledTimes(2);
    expect(onSettled).toHaveBeenNthCalledWith(1, { data: row }, null, { variables });
    expect(onSettled).toHaveBeenNthCalledWith(2, { data: row }, null, { variables });
  });
  it('detaches sanitized failure objects and checked parameters for joined callers', async () => {
    const source = provider();
    const held = deferred<GetOneResult>();
    source.update = vi.fn(() => held.promise);
    const app = mount(source);
    await ready(app);
    const onError = vi.fn((error: Error, _params: unknown) => { error.message = 'observer'; });
    const variables = { title: 'Edited' };
    const first = app.read().update.mutation.mutateAsync({ variables }, { onError }).catch((error: unknown) => error);
    const second = app.read().update.mutation.mutateAsync({ variables }, { onError }).catch((error: unknown) => error);
    await waitFor(() => expect(source.update).toHaveBeenCalledTimes(1));
    held.reject(new Error('private detail'));
    const [left, right] = await Promise.all([first, second]);
    if (left instanceof Error) left.message = 'caller';
    await waitFor(() => expect(app.read().update.mutation.isError).toBe(true));
    expect(right).toMatchObject({ message: 'Update failed', details: { writeMayHaveSucceeded: true } });
    expect(app.read().update.mutation.error?.message).toBe('Update failed');
    expect(app.read().update.mutation.failureReason?.message).toBe('Update failed');
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError.mock.calls[0]?.[1]).toEqual({ variables });
  });
  it('does not expose unvalidated parameters through preflight callbacks', async () => {
    const app = mount();
    await ready(app);
    const onError = vi.fn();
    const onSettled = vi.fn();
    const error: unknown = await app.read().update.mutation.mutateAsync({ variables: { title: false } }, { onError, onSettled })
      .catch((error: unknown) => error);
    if (error instanceof Error) error.message = 'caller';
    await waitFor(() => expect(app.read().update.mutation.isError).toBe(true));
    expect(app.read().update.mutation.error?.message).toBe('Invalid update input');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_RESOURCE_INPUT' }), undefined);
    expect(onSettled).toHaveBeenCalledWith(undefined, expect.objectContaining({ code: 'INVALID_RESOURCE_INPUT' }), undefined);
  });
  it('does not inherit mutation callbacks or retry, even when completion observers fail', async () => {
    const source = provider();
    source.update = vi.fn(async () => { throw new Error('private detail'); });
    const app = mount(source);
    await ready(app);
    const inherited = vi.fn();
    app.client.setDefaultOptions({ mutations: { retry: 3, retryDelay: 0, onMutate: inherited, onError: inherited, onSettled: inherited } });
    await expect(app.read().update.mutation.mutateAsync({ variables: { title: 'Edited' } }, {
      onError() { throw new Error('observer'); }, onSettled() { throw new Error('observer'); },
    })).rejects.toMatchObject({ code: 'UPDATE_FAILED' });
    expect(source.update).toHaveBeenCalledTimes(1);
    expect(inherited).not.toHaveBeenCalled();
  });
  it('preserves numeric identity in audit records', async () => {
    const app = mount();
    await ready(app);
    const audit = vi.fn();
    setAuditHandler(audit);
    await app.read().update.mutation.mutateAsync({ variables: { title: 'Edited' } });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'update', recordId: 1 }));
  });
  it.each(['unchanged', 'resource', 'reset', 'invalid-call'])('guards delayed auth decisions after %s', async change => {
    const source = provider();
    source.update = vi.fn(async () => { throw { statusCode: 401, message: 'private' }; });
    const app = mount(source);
    const held = deferred<{ logout: boolean; redirectTo: string }>();
    const onError = vi.fn<NonNullable<AuthProvider['onError']>>(async error => {
      expect(error).toMatchObject({ message: 'Update failed', statusCode: 401 });
      if (typeof error === 'object' && error !== null) Object.assign(error, { message: 'changed' });
      return held.promise;
    });
    const go = vi.fn();
    await app.view.rerender({ auth: { ...testAuth(), onError }, router: { go, back: vi.fn(), parse: () => ({ params: {}, pathname: '/' }) } });
    await ready(app);
    await expect(app.read().update.mutation.mutateAsync({ variables: { title: 'Edited' } })).rejects.toMatchObject({ message: 'Update failed' });
    expect(onError).toHaveBeenCalledTimes(1);
    if (change === 'resource') await app.view.rerender({ resource: 'other' });
    else if (change === 'reset') app.read().update.mutation.reset();
    else if (change === 'invalid-call') await expect(app.read().update.mutation.mutateAsync({ variables: { title: false } })).rejects.toBeDefined();
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
  const app = mount(source, { session, showEditor: false, ...definedOptions({ client }) });
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
const updateInput = { variables: { title: 'Edited' } };
const updatedRow = { ...row, title: 'Edited' };

describe('single-update authentication ownership', () => {
  it('exposes only a frozen session capability through the public API', async () => {
    const app = await mountSession();
    const captured = captureAuthSession(app.session);
    expect(Object.isFrozen(captured)).toBe(true);
    expect(Reflect.set(captured, 'available', false)).toBe(false);
    expect(captured.isCurrent()).toBe(true);
    await app.actions().login.mutate({});
    expect(captured.isCurrent()).toBe(false);
    expect(captureAuthSession(app.session).available).toBe(true);
    expect(captureAuthSession(app.session).cacheKey).not.toBe(captured.cacheKey);
  });

  it.each(['login', 'logout'] as const)('stops a queued update as soon as %s changes its session', async action => {
    const app = await mountSession();
    const callback = vi.fn();
    const operation = app.read().update.mutation.mutateAsync(updateInput, {
      onSuccess: callback, onError: callback, onSettled: callback,
    }).catch((error: unknown) => error);
    if (action === 'login') await app.actions().login.mutate({});
    else await app.actions().logout.mutate();
    expect(await operation).toMatchObject({ code: 'UPDATE_CANCELLED', details: { writeMayHaveSucceeded: false, id: 1 } });
    expect(app.source.update).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
  });

  it('does not dispatch after a native queue delay crosses a session transition', async () => {
    const app = await mountSession();
    const gate = deferred<void>();
    const observer = vi.fn(() => gate.promise);
    app.client.getMutationCache().config.onMutate = observer;
    const operation = app.read().update.mutation.mutateAsync(updateInput).catch((error: unknown) => error);
    await waitFor(() => expect(observer).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    gate.resolve();
    expect(await operation).toMatchObject({ code: 'UPDATE_CANCELLED', details: { writeMayHaveSucceeded: false, id: 1 } });
    expect(app.source.update).not.toHaveBeenCalled();
  });

  it('retires pending updates when a checked auth read confirms a new revision', async () => {
    const app = await mountSession();
    const gate = deferred<GetOneResult>();
    vi.mocked(app.source.update).mockReturnValueOnce(gate.promise);
    const operation = app.read().update.mutation.mutateAsync(updateInput).catch((error: unknown) => error);
    await waitFor(() => expect(app.source.update).toHaveBeenCalledTimes(1));
    await app.actions().check.refetch();
    gate.resolve({ data: updatedRow });
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'UPDATE_CANCELLED', details: { writeMayHaveSucceeded: true, id: 1 } });
    expect(error).not.toHaveProperty('details.updated');
  });

  it('blocks unavailable sessions but permits a later valid invocation of the saved method', async () => {
    const app = await mountSession();
    const saved = app.read().update.mutation.mutateAsync;
    await app.actions().logout.mutate();
    await expect(saved(updateInput)).rejects.toMatchObject({ code: 'UPDATE_CANCELLED', details: { writeMayHaveSucceeded: false } });
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    const login = app.actions().login.mutate({});
    await expect(saved(updateInput)).rejects.toMatchObject({ code: 'UPDATE_CANCELLED' });
    expect(app.source.update).not.toHaveBeenCalled();
    gate.resolve({ success: true });
    await login;
    await expect(saved(updateInput)).resolves.toEqual({ data: updatedRow });
    expect(app.source.update).toHaveBeenCalledTimes(1);
  });

  it.each(['success', 'failure'] as const)('quarantines late %s instead of publishing it into a new session', async outcome => {
    const app = await mountSession();
    const effects = await observeEffects(app);
    const handler = vi.fn(async () => ({ logout: true }));
    app.session.onError = handler;
    const gate = deferred<GetOneResult>();
    vi.mocked(app.source.update).mockReturnValueOnce(gate.promise);
    const { builder, owner } = scopedKeys(app, captureAuthSession(app.session).cacheKey);
    const oldKey = builder.data.one('posts', 1, { ...owner, fixture: true });
    app.client.setQueryData(oldKey, {});
    const callback = vi.fn();
    const operation = app.read().update.mutation.mutateAsync(updateInput, {
      onSuccess: callback, onError: callback, onSettled: callback,
    }).catch((error: unknown) => error);
    await waitFor(() => expect(app.source.update).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    await ready(app);
    const freshKey = builder.data.one('posts', 1, { ...owner, authSession: captureAuthSession(app.session).cacheKey, fixture: true });
    app.client.setQueryData(freshKey, {});
    const refresh = vi.spyOn(app.client, 'invalidateQueries');
    if (outcome === 'success') gate.resolve({ data: updatedRow });
    else gate.reject({ statusCode: 401, message: 'PRIVATE' });
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'UPDATE_CANCELLED', details: { writeMayHaveSucceeded: true, id: 1 } });
    expect(error).not.toHaveProperty('details.updated');
    expect(handler).not.toHaveBeenCalled();
    expect(app.session.logout).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
    expect(effects.auditHandler).not.toHaveBeenCalled();
    expect(effects.audit.create).not.toHaveBeenCalled();
    expect(effects.live.publish).not.toHaveBeenCalled();
    expect(effects.notification.open).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(app.client.getQueryState(oldKey)?.isInvalidated).toBe(false);
    expect(app.client.getQueryState(freshKey)?.isInvalidated).toBe(false);
    expect(app.read().update.mutation.isIdle).toBe(true);
  });

  it.each(['success', 'failure', 'preflight', 'pending'] as const)('immediately hides old %s state and reflective reads', async outcome => {
    const app = await mountSession();
    const gate = deferred<GetOneResult>();
    if (outcome === 'failure') vi.mocked(app.source.update).mockRejectedValueOnce(new Error('PRIVATE'));
    if (outcome === 'pending') vi.mocked(app.source.update).mockReturnValueOnce(gate.promise);
    const operation = app.read().update.mutation.mutateAsync(outcome === 'preflight' ? { variables: { title: false } } : updateInput)
      .catch((error: unknown) => error);
    if (outcome !== 'pending') await operation;
    await waitFor(() => expect(app.read().update.mutation.status).toBe(
      outcome === 'pending' ? 'pending' : outcome === 'success' ? 'success' : 'error',
    ));
    const state = app.read().update.mutation;
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
    gate.resolve({ data: updatedRow });
    await operation;
    loginGate.resolve({ success: true });
    await login;
    flushSync();
    expect(state.isIdle).toBe(true);
  });

  it('suppresses queued invalid-input observers after the originating session changes', async () => {
    const app = await mountSession();
    const callback = vi.fn();
    const operation = app.read().update.mutation.mutateAsync({ variables: { title: false } }, {
      onError: callback, onSettled: callback,
    }).catch((error: unknown) => error);
    await app.actions().login.mutate({});
    expect(await operation).toMatchObject({ code: 'UPDATE_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(callback).not.toHaveBeenCalled();
    expect(app.source.update).not.toHaveBeenCalled();
  });

  it('does not coalesce a new-session update with the unresolved old update to the same ID', async () => {
    const app = await mountSession();
    const gate = deferred<GetOneResult>();
    vi.mocked(app.source.update).mockReturnValueOnce(gate.promise).mockResolvedValueOnce({ data: { ...row, title: 'Latest' } });
    const saved = app.read().update.mutation.mutateAsync;
    const old = saved(updateInput).catch((error: unknown) => error);
    await waitFor(() => expect(app.source.update).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    await expect(saved(updateInput)).resolves.toEqual({ data: { ...row, title: 'Latest' } });
    gate.resolve({ data: updatedRow });
    expect(await old).toMatchObject({ code: 'UPDATE_CANCELLED' });
    expect(app.source.update).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(app.read().update.mutation.isSuccess).toBe(true));
    expect(app.read().update.mutation.data).toEqual({ data: { ...row, title: 'Latest' } });
  });

  it.each(['audit', 'live', 'refresh', 'notification', 'onSuccess', 'onSettled'] as const)(
    'stops later effects if %s begins a new login', async stage => {
      const app = await mountSession();
      const effects = await observeEffects(app);
      const { builder, owner } = scopedKeys(app, captureAuthSession(app.session).cacheKey);
      const selected = [builder.data.select('posts', owner), builder.data.one('posts', 1, { ...owner, fixture: true })];
      for (const key of selected) app.client.setQueryData(key, {});
      const gate = deferred<AuthActionResult>();
      vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
      let login: Promise<AuthActionResult> | undefined;
      const start = () => { login ??= app.actions().login.mutate({}); };
      if (stage === 'audit') effects.auditHandler.mockImplementation(start);
      if (stage === 'live') effects.live.publish.mockImplementation(start);
      if (stage === 'notification') vi.mocked(effects.notification.open).mockImplementation(start);
      const release = app.client.getQueryCache().subscribe(event => {
        if (stage === 'refresh' && event.type === 'updated' && event.action.type === 'invalidate') start();
      });
      const onSuccess = vi.fn(() => { if (stage === 'onSuccess') start(); });
      const onSettled = vi.fn(() => { if (stage === 'onSettled') start(); });
      const invalidate = vi.spyOn(app.client, 'invalidateQueries');
      const error: unknown = await app.read().update.mutation.mutateAsync(updateInput, { onSuccess, onSettled })
        .catch((error: unknown) => error);
      expect(login).toBeDefined();
      expect(error).toMatchObject({ code: 'UPDATE_CANCELLED', details: { writeMayHaveSucceeded: true, id: 1 } });
      expect(error).not.toHaveProperty('details.updated');
      if (stage === 'audit') {
        expect(effects.audit.create).not.toHaveBeenCalled();
        expect(effects.live.publish).not.toHaveBeenCalled();
      }
      if (stage === 'audit' || stage === 'live') expect(invalidate).not.toHaveBeenCalled();
      if (stage === 'refresh') {
        expect(invalidate).toHaveBeenCalledTimes(1);
        for (const key of selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
      }
      if (stage !== 'onSuccess' && stage !== 'onSettled') expect(onSuccess).not.toHaveBeenCalled();
      if (stage !== 'onSettled') expect(onSettled).not.toHaveBeenCalled();
      release();
      gate.resolve({ success: true });
      await login;
    });

  it.each(['success', 'error', 'preflight', 'joined-error'] as const)('checks each observer during reentrant %s delivery', async kind => {
    const app = await mountSession();
    const receipt = deferred<GetOneResult>();
    vi.mocked(app.source.update).mockReturnValueOnce(receipt.promise);
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    let login: Promise<AuthActionResult> | undefined;
    const observer = vi.fn(() => { login = app.actions().login.mutate({}); });
    const onSettled = vi.fn();
    const input = kind === 'preflight' ? { variables: { title: false } } : updateInput;
    const joined = kind === 'success' || kind === 'joined-error';
    const first = app.read().update.mutation.mutateAsync(input, joined ? {} : { onError: observer, onSettled })
      .catch((error: unknown) => error);
    const second = joined ? app.read().update.mutation.mutateAsync(input,
      kind === 'success' ? { onSuccess: observer, onSettled } : { onError: observer, onSettled },
    ).catch((error: unknown) => error) : first;
    if (kind !== 'preflight') {
      await waitFor(() => expect(app.source.update).toHaveBeenCalledTimes(1));
      if (kind === 'success') receipt.resolve({ data: updatedRow });
      else receipt.reject(new Error('PRIVATE'));
    }
    await first;
    const result: unknown = await second;
    if (kind === 'success') {
      expect(result).toMatchObject({ code: 'UPDATE_CANCELLED' });
      expect(result).not.toHaveProperty('details.updated');
    }
    expect(observer).toHaveBeenCalledTimes(1);
    expect(onSettled).not.toHaveBeenCalled();
    expect(app.read().update.mutation.isIdle).toBe(true);
    gate.resolve({ success: true });
    await login;
  });

  it.each(['success', 'cancelled'] as const)('withholds %s records when auth changes during native completion callbacks', async outcome => {
    const app = await mountSession();
    const receipt = deferred<GetOneResult>();
    vi.mocked(app.source.update).mockReturnValueOnce(receipt.promise);
    const gate = deferred<void>();
    const observer = vi.fn(() => gate.promise);
    if (outcome === 'success') app.client.getMutationCache().config.onSuccess = observer;
    else app.client.getMutationCache().config.onError = observer;
    const operation = app.read().update.mutation.mutateAsync(updateInput).catch((error: unknown) => error);
    await waitFor(() => expect(app.source.update).toHaveBeenCalledTimes(1));
    if (outcome === 'cancelled') await app.view.rerender({ id: 2 });
    receipt.resolve({ data: updatedRow });
    await waitFor(() => expect(observer).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    gate.resolve();
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'UPDATE_CANCELLED', details: { writeMayHaveSucceeded: true, id: 1 } });
    expect(error).not.toHaveProperty('details.updated');
    expect(app.read().update.mutation.isIdle).toBe(true);
  });

  it('settles every started refresh even after failure and session replacement', async () => {
    const app = await mountSession();
    const gate = deferred<void>();
    const refresh = vi.spyOn(app.client, 'invalidateQueries').mockRejectedValueOnce(new Error('PRIVATE')).mockReturnValue(gate.promise);
    let settled = false;
    const operation = app.read().update.mutation.mutateAsync(updateInput).catch((error: unknown) => error)
      .finally(() => { settled = true; });
    await waitFor(() => expect(refresh.mock.calls.length).toBeGreaterThan(1));
    await app.actions().login.mutate({});
    expect(settled).toBe(false);
    gate.resolve();
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'UPDATE_CANCELLED', details: { id: 1 } });
    expect(error).not.toHaveProperty('details.updated');
  });

  it.each(['same', 'independent'] as const)('handles another mounted %s auth tree logging out during an update', async ownership => {
    const source = provider();
    const first = await mountSession(source);
    const second = await mountSession(source, ownership === 'same' ? first.session : testAuth(), first.client);
    const gate = deferred<GetOneResult>();
    vi.mocked(source.update).mockReturnValueOnce(gate.promise);
    const operation = first.read().update.mutation.mutateAsync(updateInput).catch((error: unknown) => error);
    await waitFor(() => expect(source.update).toHaveBeenCalledTimes(1));
    await second.actions().logout.mutate();
    gate.resolve({ data: updatedRow });
    if (ownership === 'same') {
      const error: unknown = await operation;
      expect(error).toMatchObject({ code: 'UPDATE_CANCELLED' });
      expect(error).not.toHaveProperty('details.updated');
      expect(first.read().update.mutation.isIdle).toBe(true);
    } else {
      expect(await operation).toEqual({ data: updatedRow });
      await waitFor(() => expect(first.read().update.mutation.isSuccess).toBe(true));
      expect(first.read().update.mutation.data).toEqual({ data: updatedRow });
    }
  });

  it('excludes another auth tree from refresh despite sharing raw provider and query client', async () => {
    const source = provider();
    const first = await mountSession(source);
    const second = await mountSession(source, testAuth(), first.client);
    const left = scopedKeys(first, captureAuthSession(first.session).cacheKey);
    const right = scopedKeys(second, captureAuthSession(second.session).cacheKey);
    expect(left.source).toBe(right.source);
    const firstKey = left.builder.data.one('posts', 1, { ...left.owner, fixture: true });
    const secondKey = right.builder.data.one('posts', 1, { ...right.owner, fixture: true });
    first.client.setQueryData(firstKey, {});
    first.client.setQueryData(secondKey, {});
    await first.read().update.mutation.mutateAsync(updateInput);
    expect(first.client.getQueryState(firstKey)?.isInvalidated).toBe(true);
    expect(first.client.getQueryState(secondKey)?.isInvalidated).toBe(false);
  });

  it.each(['resolved', 'rejected'] as const)('allows its current auth delegate to finish a %s logout', async outcome => {
    const app = await mountSession();
    app.session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/login' }));
    vi.mocked(app.session.logout).mockResolvedValueOnce({ success: outcome === 'resolved' });
    vi.mocked(app.source.update).mockRejectedValueOnce({ statusCode: 401, message: 'PRIVATE' });
    await expect(app.read().update.mutation.mutateAsync(updateInput)).rejects.toMatchObject({
      code: 'UPDATE_CANCELLED', details: { writeMayHaveSucceeded: true },
    });
    await waitFor(() => expect(app.session.logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(captureAuthSession(app.session).available).toBe(false));
    if (outcome === 'resolved') await waitFor(() => expect(app.go).toHaveBeenCalledWith({ to: '/login', type: 'push' }));
    else expect(app.go).not.toHaveBeenCalled();
    await expect(app.read().update.mutation.mutateAsync(updateInput)).rejects.toMatchObject({ code: 'UPDATE_CANCELLED' });
    expect(app.source.update).toHaveBeenCalledTimes(1);
  });

  it('discards a delayed auth instruction after another login on the same provider', async () => {
    const app = await mountSession();
    const gate = deferred<{ logout: boolean; redirectTo: string }>();
    const handler = vi.fn(() => gate.promise);
    app.session.onError = handler;
    vi.mocked(app.source.update).mockRejectedValueOnce({ statusCode: 401 });
    await expect(app.read().update.mutation.mutateAsync(updateInput)).rejects.toMatchObject({ code: 'UPDATE_FAILED' });
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

describe('InlineEdit contract consumer', () => {
  it.each(['draft', 'failed'] as const)('clears a %s editor during login and does not revive old DOM events', async state => {
    const app = await mountSession();
    await app.view.rerender({ showEditor: true });
    const input = await edit(app, 'Old private draft');
    if (state === 'failed') {
      vi.mocked(app.source.update).mockRejectedValueOnce(new Error('PRIVATE'));
      await fireEvent.keyDown(input, { key: 'Enter' });
      await waitFor(() => expect(app.view.queryByRole('alert')).not.toBeNull());
    }
    const count = vi.mocked(app.source.update).mock.calls.length;
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    const login = app.actions().login.mutate({});
    flushSync();
    expect(app.view.queryByRole('textbox')).toBeNull();
    expect(app.view.queryByRole('alert')).toBeNull();
    expect(app.view.queryByRole('button', { name: 'Edit Title' })).toBeNull();
    await fireEvent.keyDown(input, { key: 'Enter' });
    await fireEvent.blur(input);
    expect(app.source.update).toHaveBeenCalledTimes(count);
    gate.resolve({ success: true });
    await login;
    const scope = within(app.view.container);
    await fireEvent.click(await scope.findByRole('button', { name: 'Edit Title' }));
    const fresh = scope.getByRole('textbox', { name: 'Title' });
    if (!(fresh instanceof HTMLInputElement)) throw new Error('Expected a new input');
    expect(fresh.value).toBe('First');
    expect(app.view.queryByRole('alert')).toBeNull();
    expect(app.source.update).toHaveBeenCalledTimes(count);
  });

  it.each(['success', 'failure'] as const)('drops a pending inline %s after another component logs out of the shared session', async outcome => {
    const app = await mountSession();
    const otherTree = await mountSession(app.source, app.session, app.client);
    const onSave = vi.fn();
    await app.view.rerender({ showEditor: true, onSave });
    const gate = deferred<GetOneResult>();
    vi.mocked(app.source.update).mockReturnValueOnce(gate.promise);
    await fireEvent.keyDown(await edit(app, 'Old private draft'), { key: 'Enter' });
    await waitFor(() => expect(app.source.update).toHaveBeenCalledTimes(1));
    const writes = app.client.getMutationCache().getAll().filter(mutation => mutation.state.status === 'pending');
    expect(writes).toHaveLength(1);
    await otherTree.actions().logout.mutate();
    expect(app.view.queryByRole('textbox')).toBeNull();
    expect(app.view.queryByRole('alert')).toBeNull();
    if (outcome === 'success') gate.resolve({ data: { ...row, title: 'Old private receipt' } });
    else gate.reject(new Error('PRIVATE'));
    await waitFor(() => expect(writes.every(mutation => mutation.state.status !== 'pending')).toBe(true));
    flushSync();
    expect(onSave).not.toHaveBeenCalled();
    expect(app.view.queryByRole('textbox')).toBeNull();
    expect(app.view.queryByRole('alert')).toBeNull();
    expect(app.view.container.textContent).not.toContain('Old private');
  });

  it('uses checked server values and prevents duplicate Enter/blur submissions', async () => {
    const pending = deferred<GetOneResult>();
    const source = provider();
    source.update = vi.fn(() => pending.promise);
    const app = mount(source);
    const onSave = vi.fn();
    await app.view.rerender({ onSave });
    const input = await edit(app);
    await fireEvent.keyDown(input, { key: 'Enter' });
    await fireEvent.blur(input);
    await fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(source.update).toHaveBeenCalledTimes(1));
    expect(onSave).not.toHaveBeenCalled();
    pending.resolve({ data: { ...row, title: 'Normalized' } });
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Normalized'));
    expect(app.view.queryByRole('textbox')).toBeNull();
  });

  it.each<[string, number | null]>([['12.5', 12.5], ['  ', null], ['-2e2', -200]])(
    'preserves string numeric drafts and submits %j as %j', async (text, expected) => {
      const source = provider();
      const app = mount(source);
      const onSave = vi.fn();
      await app.view.rerender({ field: { key: 'amount', type: 'number', label: 'Amount' }, value: 10, onSave });
      const input = await edit(app, String(text), 'Amount');
      await fireEvent.keyDown(input, { key: 'Enter' });
      await waitFor(() => expect(onSave).toHaveBeenCalledWith(expected));
      expect(source.update).toHaveBeenCalledWith(expect.objectContaining({ variables: { amount: expected } }));
    },
  );

  it.each(['NaN', 'Infinity', '1e999', '12px', '0x10'])('retains invalid numeric draft %s without dispatch', async text => {
    const source = provider();
    const app = mount(source);
    await app.view.rerender({ field: { key: 'amount', type: 'number', label: 'Amount' }, value: 10 });
    const input = await edit(app, text, 'Amount');
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(app.view.getByRole('alert')).toBeDefined();
    expect(input.value).toBe(text);
    expect(source.update).not.toHaveBeenCalled();
  });

  it('cancels from the button or Escape without a blur save', async () => {
    const source = provider();
    const app = mount(source);
    const input = await edit(app);
    const cancel = app.view.getByRole('button', { name: /^cancel$/i });
    await fireEvent.blur(input, { relatedTarget: cancel });
    await fireEvent.click(cancel);
    expect(app.view.queryByRole('textbox')).toBeNull();
    const next = await edit(app);
    await fireEvent.keyDown(next, { key: 'Escape' });
    expect(app.view.queryByRole('textbox')).toBeNull();
    expect(source.update).not.toHaveBeenCalled();
  });

  it('does not write unchanged values and saves external blur once', async () => {
    const source = provider();
    const app = mount(source);
    const unchanged = await edit(app, 'First');
    await fireEvent.blur(unchanged);
    expect(source.update).not.toHaveBeenCalled();
    const input = await edit(app, '  Edited  ');
    await fireEvent.blur(input);
    await waitFor(() => expect(source.update).toHaveBeenCalledTimes(1));
    expect(source.update).toHaveBeenCalledWith(expect.objectContaining({ variables: { title: '  Edited  ' } }));
  });

  it('keeps a failed draft for explicit retry and sanitizes the error', async () => {
    const source = provider();
    source.update = vi.fn(async () => { throw new Error('PRIVATE_SERVER_DETAIL'); });
    const app = mount(source);
    const onSave = vi.fn();
    await app.view.rerender({ onSave });
    const input = await edit(app);
    await fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(app.view.getByRole('alert')).toBeDefined());
    expect(input.value).toBe('Edited');
    expect(app.view.container.textContent).not.toContain('PRIVATE_SERVER_DETAIL');
    expect(onSave).not.toHaveBeenCalled();
    source.update = vi.fn(async () => ({ data: { ...row, title: 'Retried' } }));
    await fireEvent.click(app.view.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Retried'));
  });

  it('rejects schema-invalid fields before dispatch and wrong receipts before callback', async () => {
    const source = provider();
    const app = mount(source);
    const onSave = vi.fn();
    await app.view.rerender({ onSave, field: { key: 'missing', type: 'text', label: 'Missing' } });
    await fireEvent.keyDown(await edit(app, 'Edited', 'Missing'), { key: 'Enter' });
    await waitFor(() => expect(app.view.getByRole('alert')).toBeDefined());
    expect(source.update).not.toHaveBeenCalled();
    await app.view.rerender({ field: { key: 'title', type: 'text', label: 'Title' } });
    source.update = vi.fn(async () => ({ data: { ...row, id: 2 } }));
    await fireEvent.keyDown(await edit(app), { key: 'Enter' });
    await waitFor(() => expect(app.view.getByRole('alert')).toBeDefined());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('waits for permission, hides revoked editing and respects field/resource restrictions', async () => {
    const allowed = deferred<{ can: boolean }>();
    const app = mount();
    await app.view.rerender({ permission: { can: () => allowed.promise } });
    expect(app.view.queryByRole('button', { name: 'Edit Title' })).toBeNull();
    allowed.resolve({ can: true });
    await edit(app);
    await app.view.rerender({ permission: { can: async () => ({ can: false }) } });
    await waitFor(() => expect(app.view.queryByRole('textbox')).toBeNull());
    expect(app.view.queryByRole('button', { name: 'Edit Title' })).toBeNull();
    await app.view.rerender({ permission: { can: async () => ({ can: true }) }, resources: [{ ...postDefinition, canEdit: false }] });
    expect(app.view.queryByRole('button', { name: 'Edit Title' })).toBeNull();
    await app.view.rerender({ resources, field: { key: 'title', type: 'text', label: 'Title', showInEdit: false } });
    expect(app.view.queryByRole('button', { name: /^edit/i })).toBeNull();
    await app.view.rerender({ field: { key: 'id', type: 'number', label: 'ID' }, value: 1 });
    expect(app.view.queryByRole('button', { name: /^edit/i })).toBeNull();
  });

  it('keeps the editor pending until its cache refreshes settle', async () => {
    const source = provider();
    const app = mount(source);
    const onSave = vi.fn();
    await app.view.rerender({ onSave });
    await ready(app);
    const refresh = deferred<GetListResult>();
    source.getList = vi.fn(() => refresh.promise);
    await fireEvent.keyDown(await edit(app), { key: 'Enter' });
    await waitFor(() => expect(source.getList).toHaveBeenCalledTimes(1));
    expect(app.view.getByRole('button', { name: /^save$/i }).hasAttribute('disabled')).toBe(true);
    expect(app.view.getByRole('button', { name: /^save$/i }).contains(app.view.getByRole('status'))).toBe(true);
    expect(onSave).not.toHaveBeenCalled();
    refresh.resolve({ data: [{ ...row, title: 'Edited' }], total: 1 });
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Edited'));
  });

  it.each(['record', 'provider', 'tenant', 'field', 'permission', 'unmount'])(
    'suppresses old callbacks after a %s change', async change => {
      const pending = deferred<GetOneResult>();
      const source = provider();
      source.update = vi.fn(() => pending.promise);
      const app = mount(source);
      const onSave = vi.fn();
      await app.view.rerender({ onSave });
      await fireEvent.keyDown(await edit(app), { key: 'Enter' });
      await waitFor(() => expect(source.update).toHaveBeenCalledTimes(1));
      if (change === 'record') await app.view.rerender({ resource: 'other', id: 2 });
      if (change === 'provider') await app.view.rerender({ provider: provider() });
      if (change === 'tenant') await app.view.rerender({ tenant: 'next' });
      if (change === 'field') await app.view.rerender({ field: { key: 'amount', type: 'number', label: 'Amount' }, value: 10 });
      if (change === 'permission') await app.view.rerender({ permission: { can: async () => ({ can: false }) } });
      if (change === 'unmount') await app.view.rerender({ showEditor: false });
      pending.resolve({ data: { ...row, title: 'Old' } });
      await waitFor(() => expect(app.client.isMutating()).toBe(0));
      expect(onSave).not.toHaveBeenCalled();
      expect(app.view.queryByRole('textbox')).toBeNull();
    },
  );

  it('does not coerce unsupported display values or numeric syntax', () => {
    const stringify = vi.fn(() => 'private');
    expect(inlineDisplayValue('text', { toString: stringify })).toBeUndefined();
    expect(inlineDisplayValue('number', '12')).toBeUndefined();
    expect(inlineDisplayValue('boolean', true)).toBeUndefined();
    expect(inlineDisplayValue('number', Infinity)).toBeUndefined();
    expect(inlineDisplayValue('text', null)).toEqual({ text: '', value: null });
    expect(parseInlineValue('email', ' a@example.test ')).toBe(' a@example.test ');
    expect(() => parseInlineValue('boolean', 'true')).toThrow();
    expect(stringify).not.toHaveBeenCalled();
  });
});
