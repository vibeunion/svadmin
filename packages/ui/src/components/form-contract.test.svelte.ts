import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { QueryClient, QueryObserver } from '@tanstack/svelte-query';
import { defineResource, keys, parseQueryKey, resetContext, captureAuthSession, setAuditHandler, HttpError, type DataProvider, type GetOneResult,
  type GetListResult, type ResourceDefinition, type RouterProvider, type AuthProvider, type AuditLogProvider, type LiveProvider } from '@svadmin/core';
import { resetAuditLogProvider } from '../../../core/src/audit';
import { resetToast } from '@svadmin/core/toast';
import { definedOptions } from '@svadmin/core/options';
import { contractKey, formatContractRouteId } from '../../../core/src/resource-contract';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FormState, FormSettings, FormAuthActions } from './form-contract.test.types';
import Host from './form-contract.test-host.svelte';

const record = Type.Object({ id: Type.Number(), title: Type.String(), quantity: Type.Number(), serverOnly: Type.String() });
const create = Type.Object({ title: Type.String({ minLength: 1 }), quantity: Type.Number({ minimum: 0 }) });
const update = Type.Partial(create);
const posts = defineResource('posts', { record, create, update });
const other = defineResource('other', { record, create, update });
const fields: ResourceDefinition['fields'] = [
  { key: 'id', type: 'number', label: 'ID' },
  { key: 'title', type: 'text', label: 'Title', required: true },
  { key: 'quantity', type: 'number', label: 'Quantity' },
  { key: 'serverOnly', type: 'text', label: 'Server field' },
];
const postDefinition: ResourceDefinition = { name: 'posts', label: 'Posts', fields, contract: posts };
const resources: ResourceDefinition[] = [postDefinition, { name: 'other', label: 'Other', fields, contract: other }];
const row = { id: 1, title: 'First', quantity: 1, serverOnly: 'Server' };
const clients: QueryClient[] = [];

function provider(): DataProvider {
  let nextId = 10;
  return {
    getApiUrl: () => '/api',
    getList: vi.fn(async () => ({ data: [row], total: 1 })),
    getOne: vi.fn(async ({ id }) => ({ data: { ...row, id } })),
    create: vi.fn(async ({ variables }) => ({
      data: { ...row, id: nextId++, ...(typeof variables === 'object' && variables !== null ? variables : {}) },
    })),
    update: vi.fn(async ({ id, variables }) => ({
      data: { ...row, id, ...(typeof variables === 'object' && variables !== null ? variables : {}) },
    })),
    deleteOne: async () => ({ data: {} }),
  };
}
function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Request not initialized'); };
  let reject: (cause: unknown) => void = () => { throw new Error('Request not initialized'); };
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function authProvider(): AuthProvider {
  return {
    login: async () => ({ success: true }), logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }), getIdentity: async () => ({ id: 'user' }),
  };
}
function mount(source: DataProvider | Record<string, DataProvider> = provider(), settings: FormSettings = {}, options: {
  session?: AuthProvider; client?: QueryClient; showForm?: boolean;
} = {}) {
  const client = options.client ?? new QueryClient({ defaultOptions: {
    queries: { retry: false, staleTime: Infinity }, mutations: { retry: 3, retryDelay: 0 },
  } });
  clients.push(client);
  let state: FormState | undefined;
  let actions: FormAuthActions | undefined;
  const router: RouterProvider = { go: vi.fn(), back: vi.fn(), parse: () => ({ pathname: '/posts/create', params: {} }) };
  const view = render(Host, { provider: source, resources, queryClient: client, router, settings, onReady: value => { state = value; },
    ...definedOptions({ auth: options.session, showForm: options.showForm,
      onAuthReady: options.session === undefined ? undefined : (value: FormAuthActions) => { actions = value; } }),
  });
  return { client, view, router, actions() {
    if (!actions) throw new Error('Expected mounted auth controls');
    return actions;
  }, read() {
    if (!state) throw new Error('Expected a form hook');
    return state;
  } };
}
async function ready(app: ReturnType<typeof mount>) {
  await waitFor(() => expect(app.read().form.ready && app.read().list.isSuccess).toBe(true));
}
async function mountSession(source = provider(), session = authProvider(), settings: FormSettings = {}) {
  const app = mount(source, settings, { session, showForm: false });
  await waitFor(() => expect(app.actions().check.isLoading).toBe(false));
  await ready(app);
  return { ...app, source, session };
}
async function observeEffects(app: ReturnType<typeof mount>) {
  const auditHandler = vi.fn();
  setAuditHandler(auditHandler);
  const audit: AuditLogProvider = { create: vi.fn(async input => ({ ...input, id: 'audit' })), get: async () => [] };
  const live = { subscribe: () => () => {}, publish: vi.fn<NonNullable<LiveProvider['publish']>>() } satisfies LiveProvider;
  const notification = { open: vi.fn(), close: vi.fn() };
  await app.view.rerender({ audit, live, notification });
  return { auditHandler, audit, live, notification };
}
function fill(app: ReturnType<typeof mount>, title = 'Edited') {
  app.read().form.setValues({ title, quantity: 2 });
}
function scopedKeys(app: ReturnType<typeof mount>, contract = contractKey(posts)) {
  const descriptor = app.client.getQueryCache().getAll().map(q => parseQueryKey(q.queryKey))
    .find(q => q?.kind === 'data' && q.action === 'list' && q.resource === 'posts' && q.contract === contract);
  if (!descriptor) throw new Error('Expected a checked list key');
  const params = descriptor.params;
  const source: unknown = typeof params === 'object' && params !== null
    ? Object.getOwnPropertyDescriptor(params, 'source')?.value : undefined;
  if (typeof source !== 'string') throw new Error('Expected a source tag');
  const authSession: unknown = typeof params === 'object' && params !== null
    ? Object.getOwnPropertyDescriptor(params, 'authSession')?.value : undefined;
  if (typeof authSession !== 'string') throw new Error('Expected an auth session tag');
  const scope = definedOptions({ provider: descriptor.provider, tenant: descriptor.tenant, contract: descriptor.contract });
  return { builder: keys(scope), scope, source, authSession };
}
beforeEach(() => {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true, value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  resetToast();
  resetAuditLogProvider();
  vi.restoreAllMocks();
});

describe('contract-bound form', () => {
  it('does not expose an unchecked AutoForm implementation or retain its unsafe allowance', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const component = readFileSync(resolve(directory, 'AutoForm.svelte'), 'utf8');
    const inventory: unknown = JSON.parse(readFileSync(resolve(directory, '../../../../scripts/unsafe-boundaries.json'), 'utf8'));
    expect(component).not.toMatch(/@svadmin\/core\/unsafe|\bunsafeUseForm\b/);
    expect(inventory).not.toHaveProperty('packages/ui/src/components/AutoForm.svelte');
    expect(existsSync(resolve(directory, '../../../core/src/form-hooks.svelte.ts'))).toBe(false);
    expect(readFileSync(resolve(directory, '../../../core/src/hooks.svelte.ts'), 'utf8')).not.toContain('./form-hooks.svelte');
    expect(readFileSync(resolve(directory, '../../../core/src/utility-hooks.svelte.ts'), 'utf8')).not.toMatch(/\buseModalForm\b|\buseDrawerForm\b/);
  });

  it('strictly compiles the changed form, editor and positive/negative fixtures', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = [
      '../../../core/src/contract-form.svelte.ts', '../../../core/src/resource-contract.ts',
      '../../../core/src/strict-hooks.svelte.ts', '../../../core/src/query-invalidation.ts',
      '../../../core/src/auth-hooks.svelte.ts', 'form-contract.test.svelte.ts',
      'form-contract.test.types.ts', 'form-contract.test.type-fixture.ts',
    ].map(path => resolve(directory, path));
    const virtual = new Map(['AutoForm.svelte', 'form-contract.test-probe.svelte', 'form-contract.test-host.svelte',
      '../../test/fixtures/AutoFormAccessibilityHarness.svelte'].map(name => {
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

  it('permits partial drafts but rejects invalid submission before writing', async () => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    expect(app.read().form.values).toEqual({});
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(app.read().form.errors).toHaveProperty('title');
    app.read().form.setValues({ title: '', quantity: -1 });
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(app.read().form.errors).toHaveProperty('quantity');
    expect(source.create).not.toHaveBeenCalled();
    fill(app);
    const result = await app.read().form.submit();
    expect(result.data).toMatchObject({ id: 10, title: 'Edited' });
    expect(app.read().form.isDirty).toBe(false);
  });

  it('rejects unknown fields, accessors and non-plain draft inputs without executing them', async () => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    const getter = vi.fn(() => 'PRIVATE');
    expect(() => app.read().form.setValues(Object.defineProperty({}, 'title', { enumerable: true, get: getter }))).toThrow();
    expect(() => app.read().form.setValues({ serverOnly: 'invented' })).toThrow();
    expect(() => app.read().form.setFieldValue('quantity', Infinity)).toThrow();
    expect(() => app.read().form.setFieldValue('title', new Date())).toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(source.create).not.toHaveBeenCalled();
  });

  it('detaches setter input and draft reads, clears fields and resets to the baseline', async () => {
    const app = mount(provider(), { defaultValues: { title: 'Initial', quantity: 1 } });
    await ready(app);
    const input = { title: 'Edited', quantity: 2 };
    app.read().form.setValues(input);
    input.title = 'outside mutation';
    expect(app.read().form.values['title']).toBe('Edited');
    Reflect.set(app.read().form.values, 'title', 'outside read mutation');
    expect(app.read().form.values['title']).toBe('Edited');
    app.read().form.setFieldValue('quantity', undefined);
    expect(app.read().form.values).not.toHaveProperty('quantity');
    app.read().form.reset();
    expect(app.read().form.values).toEqual({ title: 'Initial', quantity: 1 });
    expect(app.read().form.isDirty).toBe(false);
  });

  it('validates edit options without invoking getters or partially replacing the draft', async () => {
    const app = mount(provider(), { defaultValues: { title: 'Initial', quantity: 1 } });
    await ready(app);
    const getter = vi.fn(() => false);
    const invalid: unknown[] = [null, { taint: 'false' }, { invented: true },
      Object.defineProperty({}, 'taint', { enumerable: true, get: getter })];
    for (const options of invalid) {
      expect(() => Reflect.apply(app.read().form.setValues, undefined, [{ title: 'Obsolete' }, options])).toThrow();
      expect(app.read().form.values['title']).toBe('Initial');
      expect(app.read().form.isDirty).toBe(false);
    }
    expect(getter).not.toHaveBeenCalled();
    app.read().form.setValues({ title: 'Untainted' }, { taint: false });
    expect(app.read().form.values['title']).toBe('Untainted');
    expect(app.read().form.isDirty).toBe(false);
  });

  it('loads only the bound edit target and projects writable fields', async () => {
    const source = provider();
    const app = mount(source);
    await app.view.rerender({ action: 'edit', id: 1 });
    await ready(app);
    expect(app.read().form.values).toEqual({ title: 'First', quantity: 1 });
    expect(source.getOne).toHaveBeenCalledWith(expect.objectContaining({ resource: 'posts', id: 1 }));
    await app.view.rerender({ resource: 'other', id: 2 });
    await ready(app);
    fill(app);
    await app.read().form.submit();
    expect(source.update).toHaveBeenCalledWith(expect.objectContaining({ resource: 'other', id: 2, variables: { title: 'Edited', quantity: 2 } }));
    expect(source.create).not.toHaveBeenCalled();
  });

  it.each(['create', 'edit'] as const)('detaches nested %s baselines from inputs, reads and reset', async action => {
    const nested = Type.Object({ tags: Type.Array(Type.String()) });
    const contract = defineResource('posts', {
      record: Type.Object({ id: Type.Number(), title: Type.String(), nested }),
      create: Type.Object({ title: Type.String(), nested }),
      update: Type.Object({ title: Type.String(), nested }),
    });
    const initial = { title: 'Initial', nested: { tags: ['initial'] } };
    const loaded = { id: 1, title: 'Loaded', nested: { tags: ['loaded'] } };
    const source = provider();
    source.getOne = vi.fn(async () => ({ data: loaded }));
    source.getList = vi.fn(async () => ({ data: [loaded], total: 1 }));
    const app = mount(source);
    await app.view.rerender({ action, ...definedOptions({ id: action === 'edit' ? 1 : undefined }),
      resources: [{ ...postDefinition, contract }], settings: { defaultValues: initial }, showForm: false });
    await ready(app);
    initial.nested.tags.push('outside');
    loaded.nested.tags.push('outside');
    const baseline = action === 'edit'
      ? { title: 'Loaded', nested: { tags: ['loaded'] } }
      : { title: 'Initial', nested: { tags: ['initial'] } };
    expect(app.read().form.values).toEqual(baseline);
    const patch = { nested: { tags: ['edited'] } };
    app.read().form.setValues(patch);
    patch.nested.tags.push('outside');
    expect(app.read().form.values['nested']).toEqual({ tags: ['edited'] });
    const exposed = app.read().form.values['nested'];
    if (typeof exposed !== 'object' || exposed === null) throw new Error('Expected nested draft');
    Reflect.set(exposed, 'tags', ['outside']);
    app.read().form.reset();
    expect(app.read().form.values).toEqual(baseline);
    expect(app.read().form.isDirty).toBe(false);
  });

  it('does not dispatch when validation resets the current submission', async () => {
    const source = provider();
    const app = mount(source);
    await app.view.rerender({ settings: { validate: () => { app.read().form.reset(); return null; } } });
    await ready(app);
    fill(app);
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'FORM_CANCELLED' });
    expect(source.create).not.toHaveBeenCalled();
    expect(app.read().form.submitting).toBe(false);
    expect(app.read().form.values).toEqual({});
    expect(app.read().form.errors).toEqual({});
    expect(app.read().form.error).toBeNull();
  });

  it.each([{ ...row, id: '1' }, { ...row, id: 2 }, { ...row, title: false }])(
    'rejects invalid read receipts %j', async data => {
      const source = provider();
      source.getOne = vi.fn(async () => ({ data }));
      const app = mount(source);
      await app.view.rerender({ action: 'edit', id: 1 });
      await waitFor(() => expect(app.read().form.error?.code).toBe('INVALID_PROVIDER_RESPONSE'));
      expect(app.read().form.ready).toBe(false);
      expect(app.read().form.values).toEqual({});
      await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
      expect(source.update).not.toHaveBeenCalled();
    },
  );

  it('does not read an absent ID from the router or write a show form', async () => {
    const source = provider();
    const app = mount(source);
    await app.view.rerender({ action: 'show' });
    expect(app.read().form.ready).toBe(false);
    expect(source.getOne).not.toHaveBeenCalled();
    await app.view.rerender({ id: 1 });
    await ready(app);
    expect(app.read().form.values['serverOnly']).toBe('Server');
    app.read().form.setFieldValue('title', 'Should not change');
    expect(app.read().form.values['title']).toBe('First');
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(source.create).not.toHaveBeenCalled();
    expect(source.update).not.toHaveBeenCalled();
  });

  it('clones through the create schema without copying source identity or server-only fields', async () => {
    const source = provider();
    const app = mount(source);
    await app.view.rerender({ action: 'clone', id: 1 });
    await ready(app);
    const result = await app.read().form.submit();
    expect(source.create).toHaveBeenCalledWith(expect.objectContaining({ variables: { title: 'First', quantity: 1 } }));
    expect(result.data.id).toBe(10);
    expect(source.update).not.toHaveBeenCalled();
  });

  it('coalesces duplicate submissions before dispatch', async () => {
    const gate = deferred<GetOneResult>();
    const source = provider();
    source.create = vi.fn(() => gate.promise);
    const app = mount(source);
    await ready(app);
    fill(app);
    const first = app.read().form.submit();
    const second = app.read().form.submit();
    expect(second).not.toBe(first);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    gate.resolve({ data: row });
    const [left, right] = await Promise.all([first, second]);
    Reflect.set(left.data, 'title', 'Mutated');
    expect(right.data['title']).toBe('First');
    expect(app.read().form.values['title']).toBe('First');
    expect(source.create).toHaveBeenCalledTimes(1);
  });

  it.each(['queued', 'dispatched'])('reset cancels %s submission effects and preserves the baseline', async phase => {
    const gate = deferred<GetOneResult>();
    const source = provider();
    source.create = vi.fn(() => gate.promise);
    const success = vi.fn();
    const failed = vi.fn();
    const app = mount(source, { defaultValues: { title: 'Initial', quantity: 1 }, redirect: 'list',
      onMutationSuccess: success, onMutationError: failed });
    await ready(app);
    const { builder, source: tag, authSession } = scopedKeys(app);
    const detail = builder.data.one('posts', 9, { source: tag, authSession });
    app.client.setQueryData(detail, { data: { ...row, id: 9 } });
    fill(app);
    const operation = app.read().form.submit().catch((cause: unknown) => cause);
    if (phase === 'dispatched') await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    app.read().form.reset();
    gate.resolve({ data: { ...row, id: 9, title: 'Obsolete' } });
    expect(await operation).toMatchObject({ code: 'FORM_CANCELLED', details: { writeMayHaveSucceeded: phase === 'dispatched' } });
    expect(app.read().form.values).toEqual({ title: 'Initial', quantity: 1 });
    expect(app.read().form.submitting).toBe(false);
    expect(app.client.getQueryState(detail)?.isInvalidated).toBe(phase === 'dispatched');
    expect(source.create).toHaveBeenCalledTimes(phase === 'dispatched' ? 1 : 0);
    expect(success).not.toHaveBeenCalled();
    expect(failed).not.toHaveBeenCalled();
    expect(app.router.go).not.toHaveBeenCalled();
  });

  it('checks duplicate submit overrides before joining a pending write', async () => {
    const source = provider();
    const gate = deferred<GetOneResult>();
    source.create = vi.fn(() => gate.promise);
    const app = mount(source);
    await ready(app);
    fill(app);
    const first = app.read().form.submit();
    await expect(Reflect.apply(app.read().form.submit, undefined, [{ redirect: 'invented' }]))
      .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    gate.resolve({ data: row });
    await first;
    expect(source.create).toHaveBeenCalledTimes(1);
  });

  it('does not let a reset submission clear the next active submission', async () => {
    const old = deferred<GetOneResult>();
    const next = deferred<GetOneResult>();
    const source = provider();
    source.create = vi.fn<DataProvider['create']>(() => next.promise).mockImplementationOnce(() => old.promise);
    const app = mount(source);
    await ready(app);
    fill(app);
    const first = app.read().form.submit().catch((cause: unknown) => cause);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    app.read().form.reset();
    fill(app, 'Next');
    const second = app.read().form.submit();
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(2));
    old.resolve({ data: row });
    expect(await first).toMatchObject({ code: 'FORM_CANCELLED' });
    expect(app.read().form.submitting).toBe(true);
    expect(app.read().form.values['title']).toBe('Next');
    next.resolve({ data: { ...row, title: 'Next' } });
    await second;
    expect(app.read().form.submitting).toBe(false);
  });

  it.each(['input', 'provider'])('isolates %s errors between callbacks, state and joined consumers', async phase => {
    const source = provider();
    source.create = vi.fn(async () => { throw { statusCode: 403, message: 'PRIVATE', errors: { quantity: 'PRIVATE' } }; });
    const failed = vi.fn((error: HttpError) => {
      Reflect.set(error, 'message', 'Callback mutation');
      Reflect.set(error.details ?? {}, 'writeMayHaveSucceeded', 'wrong');
      throw new Error('Observer failed');
    });
    const app = mount(source, { onMutationError: failed });
    await ready(app);
    if (phase === 'provider') fill(app);
    const first = app.read().form.submit().catch((cause: unknown) => cause);
    const second = app.read().form.submit().catch((cause: unknown) => cause);
    const [left, right] = await Promise.all([first, second]);
    expect(left).toBeInstanceOf(HttpError);
    expect(left).not.toBe(right);
    if (!(left instanceof HttpError) || !(right instanceof HttpError)) throw new Error('Expected sanitized failures');
    Reflect.set(left, 'message', 'Consumer mutation');
    Reflect.set(app.read().form.error ?? {}, 'message', 'State mutation');
    Reflect.set(app.read().form.errors, 'quantity', 10);
    Reflect.set(app.read().form.tainted, 'quantity', 'wrong');
    expect(right.message).toBe(phase === 'input' ? 'Invalid form input' : 'Form operation failed');
    expect(app.read().form.error?.message).toBe(right.message);
    expect(right.details).toEqual({ writeMayHaveSucceeded: phase === 'provider' });
    expect(app.read().form.error?.statusCode).toBe(phase === 'input' ? 422 : 403);
    expect(app.read().form.errors['quantity']).not.toBe(10);
    expect(app.read().form.tainted['quantity']).not.toBe('wrong');
    expect(source.create).toHaveBeenCalledTimes(phase === 'input' ? 0 : 1);
  });

  it('validates field error setters and does not expose raw query data', async () => {
    const app = mount();
    await app.view.rerender({ action: 'edit', id: 1 });
    await ready(app);
    const form = app.read().form;
    form.setFieldError('title', 'Required');
    expect(form.errors['title']).toBe('Required');
    expect(() => form.setFieldError('serverOnly', 'Invalid')).toThrow();
    expect(() => Reflect.apply(form.setFieldError, undefined, ['title', {}])).toThrow();
    Reflect.set(form.query.data?.data ?? {}, 'title', false);
    const fetched = await form.query.refetch();
    Reflect.set(fetched.data?.data ?? {}, 'quantity', 'wrong');
    expect(form.query.data?.data).toMatchObject({ title: 'First', quantity: 1 });
    expect(form.values).toEqual({ title: 'First', quantity: 1 });
    form.reset();
    expect(form.values).toEqual({ title: 'First', quantity: 1 });
  });

  it('rejects create IDs that satisfy the input but not the record identity before dispatch', async () => {
    const source = provider();
    const app = mount(source);
    const contract = defineResource('posts', { record, create: Type.Object({ id: Type.String(), title: Type.String() }) });
    await app.view.rerender({ resources: [{ ...postDefinition, contract }], showForm: false });
    await ready(app);
    app.read().form.setValues({ id: '1', title: 'Input' });
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT', details: { writeMayHaveSucceeded: false } });
    expect(source.create).not.toHaveBeenCalled();
  });

  it.each(['success', 'mismatch', 'failure'])('refreshes only trusted create detail IDs after %s', async outcome => {
    const source = provider();
    source.create = vi.fn(async () => {
      if (outcome === 'failure') throw new Error('Uncertain write');
      return { data: { ...row, id: outcome === 'success' ? 5 : 6 } };
    });
    const app = mount(source);
    const contract = defineResource('posts', { record, create: Type.Object({ id: Type.Number(), title: Type.String() }) });
    await app.view.rerender({ resources: [{ ...postDefinition, contract }], showForm: false });
    await ready(app);
    const { builder, source: tag, authSession } = scopedKeys(app, contractKey(contract));
    const included = builder.data.one('posts', 5, { source: tag, authSession });
    const excluded = [builder.data.one('posts', 6, { source: tag, authSession }), builder.data.one('posts', '5', { source: tag, authSession })];
    for (const key of [included, ...excluded]) app.client.setQueryData(key, { data: row });
    app.read().form.setValues({ id: 5, title: 'Input' });
    const result = await app.read().form.submit().catch((cause: unknown) => cause);
    expect(result).toMatchObject(outcome === 'success' ? { data: { id: 5 } } :
      { code: outcome === 'mismatch' ? 'INVALID_PROVIDER_RESPONSE' : 'FORM_FAILED' });
    expect(app.client.getQueryState(included)?.isInvalidated).toBe(true);
    for (const key of excluded) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
  });

  it.each(['reset', 'new', 'invalid'])('sanitizes auth errors and suppresses late auth after %s', async change => {
    const authGate = deferred<{ logout: boolean; redirectTo: string }>();
    const auth = authProvider();
    auth.onError = vi.fn(error => {
      expect(error).toMatchObject({ statusCode: 401, message: 'Form operation failed' });
      expect(error).not.toHaveProperty('private');
      if (typeof error === 'object' && error !== null) Reflect.set(error, 'message', 'Auth mutation');
      return authGate.promise;
    });
    auth.logout = vi.fn(auth.logout);
    const source = provider();
    source.create = vi.fn<DataProvider['create']>(async () => ({ data: row }))
      .mockRejectedValueOnce({ statusCode: 401, message: 'PRIVATE', private: 'SECRET' });
    const app = mount(source);
    await app.view.rerender({ auth });
    await ready(app);
    fill(app);
    await expect(app.read().form.submit()).rejects.toMatchObject({ statusCode: 401, message: 'Form operation failed' });
    await waitFor(() => expect(auth.onError).toHaveBeenCalledTimes(1));
    if (change === 'reset') app.read().form.reset();
    else if (change === 'new') await app.read().form.submit();
    else {
      app.read().form.setFieldValue('title', '');
      await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    }
    authGate.resolve({ logout: true, redirectTo: '/expired' });
    await authGate.promise;
    await Promise.resolve();
    await Promise.resolve();
    expect(auth.logout).not.toHaveBeenCalled();
    expect(app.router.go).not.toHaveBeenCalled();
  });

  it('preserves the ID type when redirecting a successful form', async () => {
    const app = mount(provider(), { redirect: 'show' });
    await ready(app);
    fill(app);
    await app.read().form.submit();
    expect(app.router.go).toHaveBeenCalledWith(expect.objectContaining({
      to: `/posts/show/${encodeURIComponent(formatContractRouteId(posts, 10))}`,
    }));
  });

  it.each(['id', 'auth'])('rejects late reads after the %s changes', async change => {
    const source = provider();
    const gate = deferred<GetOneResult>();
    source.getOne = vi.fn<DataProvider['getOne']>(async ({ id }) => ({ data: { ...row, id, title: 'Current' } }))
      .mockImplementationOnce(() => gate.promise);
    const app = mount(source);
    await app.view.rerender({ action: 'edit', id: 1, auth: authProvider(), showForm: false });
    await waitFor(() => expect(source.getOne).toHaveBeenCalledTimes(1));
    if (change === 'id') await app.view.rerender({ id: 2 });
    else await app.view.rerender({ auth: authProvider() });
    await ready(app);
    expect(source.getOne).toHaveBeenCalledTimes(2);
    gate.resolve({ data: { ...row, title: 'Obsolete' } });
    await waitFor(() => expect(app.client.isFetching()).toBe(0));
    expect(app.read().form.values['title']).toBe('Current');
  });

  it('preserves a new submission when the old scope settles first', async () => {
    const source = provider();
    const oldGate = deferred<GetOneResult>();
    const newGate = deferred<GetOneResult>();
    source.create = vi.fn(() => newGate.promise).mockImplementationOnce(() => oldGate.promise);
    const success = vi.fn();
    const app = mount(source, { onMutationSuccess: success });
    await ready(app);
    fill(app, 'Old');
    const previous = app.read().form.submit().catch((cause: unknown) => cause);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    await app.view.rerender({ resource: 'other' });
    await ready(app);
    fill(app, 'New');
    const current = app.read().form.submit();
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(2));
    oldGate.resolve({ data: { ...row, title: 'Old' } });
    expect(await previous).toMatchObject({ code: 'FORM_CANCELLED' });
    expect(app.read().form.submitting).toBe(true);
    expect(app.read().form.values['title']).toBe('New');
    expect(success).not.toHaveBeenCalled();
    newGate.resolve({ data: { ...row, title: 'New' } });
    expect(await current).toMatchObject({ data: { title: 'New' } });
    expect(success).toHaveBeenCalledTimes(1);
    expect(app.read().form.submitting).toBe(false);
  });

  it('uses captured defaults when a write settles after defaults change', async () => {
    const source = provider();
    const gate = deferred<GetOneResult>();
    const optional = Type.Object({ id: Type.Number(), title: Type.String(), quantity: Type.Optional(Type.Number()), serverOnly: Type.String() });
    source.create = vi.fn(() => gate.promise);
    const app = mount(source, { defaultValues: { quantity: 1 } });
    await app.view.rerender({ resources: [{ ...postDefinition, contract: defineResource('posts', { record: optional, create }) }] });
    await ready(app);
    app.read().form.setFieldValue('title', 'Saved');
    const operation = app.read().form.submit();
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    await app.view.rerender({ settings: { defaultValues: { quantity: 99 } } });
    gate.resolve({ data: { id: 10, title: 'Saved', serverOnly: 'Server' } });
    await operation;
    expect(app.read().form.values).toEqual({ title: 'Saved', quantity: 1 });
  });

  it('does not dispatch a queued submission after unmounting', async () => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    fill(app);
    const operation = app.read().form.submit();
    app.view.unmount();
    await expect(operation).rejects.toMatchObject({ code: 'FORM_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(source.create).not.toHaveBeenCalled();
  });

  it.each(['success', 'failure'])('isolates throwing notifications after %s', async outcome => {
    const source = provider();
    if (outcome === 'failure') source.create = vi.fn(async () => { throw new Error('PRIVATE'); });
    const success = vi.fn();
    const error = vi.fn();
    const app = mount(source, { onMutationSuccess: success, onMutationError: error });
    const open = vi.fn(() => { throw new Error('Notification failed'); });
    await app.view.rerender({ notification: { open, close: () => {} } });
    await ready(app);
    fill(app);
    if (outcome === 'success') {
      await expect(app.read().form.submit()).resolves.toMatchObject({ data: { title: 'Edited' } });
      expect(success).toHaveBeenCalledTimes(1);
      expect(error).not.toHaveBeenCalled();
    } else {
      await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'FORM_FAILED', message: 'Form operation failed' });
      expect(error).toHaveBeenCalledTimes(1);
      expect(success).not.toHaveBeenCalled();
    }
    expect(open).toHaveBeenCalledTimes(1);
    expect(app.read().form.submitting).toBe(false);
  });

  it('does not reject a checked successful write when navigation fails', async () => {
    const app = mount(provider(), { redirect: 'list' });
    await app.view.rerender({ router: { ...app.router, go: () => { throw new Error('Navigation failed'); } } });
    await ready(app);
    fill(app);
    await expect(app.read().form.submit()).resolves.toMatchObject({ data: { title: 'Edited' } });
    expect(app.read().form.error).toBeNull();
  });

  it('maps only checked server error fields and never exposes private messages or stale field errors', async () => {
    const source = provider();
    const gate = deferred<GetOneResult>();
    source.create = vi.fn(() => gate.promise);
    const app = mount(source);
    await ready(app);
    fill(app);
    const operation = app.read().form.submit().catch((cause: unknown) => cause);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    app.read().form.setFieldValue('title', 'New draft');
    gate.reject({ errors: { title: 'PRIVATE', quantity: ['PRIVATE'], serverOnly: 'PRIVATE' } });
    expect(await operation).toMatchObject({ code: 'FORM_FAILED' });
    expect(Object.keys(app.read().form.errors)).toEqual(['quantity']);
    expect(JSON.stringify(app.read().form.errors)).not.toContain('PRIVATE');
  });

  it('handles malicious error objects without invoking getters or leaking provider text', async () => {
    const getter = vi.fn(() => { throw new Error('PRIVATE'); });
    const cause = Object.defineProperties({}, {
      code: { get: getter }, errors: { get: getter }, statusCode: { get: getter }, message: { get: getter },
    });
    const source = provider();
    source.create = vi.fn(async () => { throw cause; });
    const app = mount(source);
    await ready(app);
    fill(app);
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'FORM_FAILED', message: 'Form operation failed' });
    expect(getter).not.toHaveBeenCalled();
    expect(app.read().form.errors).toEqual({});
  });

  it('rejects failed writes without retries, callbacks, or navigation', async () => {
    const source = provider();
    source.create = vi.fn(async () => { throw new Error('PRIVATE_PROVIDER_DETAIL'); });
    const app = mount(source);
    const success = vi.fn();
    const error = vi.fn();
    await app.view.rerender({ settings: { redirect: 'list', onMutationSuccess: success, onMutationError: error } });
    await ready(app);
    fill(app);
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'FORM_FAILED', details: { writeMayHaveSucceeded: true } });
    expect(source.create).toHaveBeenCalledTimes(1);
    expect(app.read().form.isDirty).toBe(true);
    expect(app.read().form.error?.message).not.toContain('PRIVATE');
    expect(error).toHaveBeenCalledTimes(1);
    expect(success).not.toHaveBeenCalled();
    expect(app.router.go).not.toHaveBeenCalled();
  });

  it('rejects bad update receipts but refreshes the requested detail, never the wrong receipt ID', async () => {
    const source = provider();
    source.update = vi.fn(async () => ({ data: { ...row, id: 2 } }));
    const app = mount(source);
    await app.view.rerender({ action: 'edit', id: 1 });
    await ready(app);
    const { builder, source: tag, authSession } = scopedKeys(app);
    const target = builder.data.one('posts', 1, { source: tag, authSession, extra: true });
    const excluded = builder.data.one('posts', 2, { source: tag, authSession });
    app.client.setQueryData(target, { data: row });
    app.client.setQueryData(excluded, { data: { ...row, id: 2 } });
    fill(app);
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    expect(app.client.getQueryState(target)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(excluded)?.isInvalidated).toBe(false);
    expect(app.read().form.isDirty).toBe(true);
  });

  it('rejects accessor-backed receipts and ID-changing updates before claiming success', async () => {
    const source = provider();
    const getter = vi.fn(() => row);
    source.create = vi.fn(async () => Object.defineProperty({ data: row }, 'data', { get: getter }));
    const app = mount(source);
    await ready(app);
    fill(app);
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    expect(getter).not.toHaveBeenCalled();
    await app.view.rerender({ action: 'edit', id: 1, resources: [{ ...postDefinition,
      contract: defineResource('posts', { record, update: Type.Object({ id: Type.Number() }) }),
    }] });
    await ready(app);
    app.read().form.setFieldValue('id', 2);
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(source.update).not.toHaveBeenCalled();
  });

  it('validates custom validator results without giving it mutable internal drafts', async () => {
    const source = provider();
    const app = mount(source);
    const getter = vi.fn(() => 'PRIVATE');
    await app.view.rerender({ settings: { validate: values => {
      Reflect.set(values, 'title', 'outside mutation');
      return Object.defineProperty({}, 'title', { enumerable: true, get: getter });
    } } });
    await ready(app);
    fill(app);
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'FORM_FAILED' });
    expect(app.read().form.values['title']).toBe('Edited');
    expect(source.create).not.toHaveBeenCalled();
    expect(getter).not.toHaveBeenCalled();
  });

  it('captures metadata and provider methods before asynchronous mutation work', async () => {
    const source = provider();
    source.create = vi.fn(async function(this: DataProvider) {
      expect(this).toBe(source);
      return { data: row };
    });
    const app = mount(source);
    await app.view.rerender({ settings: { meta: { region: 'original' } } });
    await ready(app);
    fill(app);
    const operation = app.read().form.submit();
    app.read().form.setFieldValue('title', 'New draft');
    await operation;
    expect(source.create).toHaveBeenCalledWith(expect.objectContaining({
      variables: { title: 'Edited', quantity: 2 }, meta: expect.objectContaining({ region: 'original' }),
    }));
    expect(app.read().form.values['title']).toBe('New draft');
    expect(app.read().form.isDirty).toBe(true);
  });

  it('normalizes unchanged fields while preserving newer edits and avoiding premature redirects', async () => {
    const source = provider();
    const gate = deferred<GetOneResult>();
    source.update = vi.fn(() => gate.promise);
    const app = mount(source);
    await app.view.rerender({ action: 'edit', id: 1, settings: { redirect: 'list' } });
    await ready(app);
    fill(app);
    const operation = app.read().form.submit();
    await waitFor(() => expect(source.update).toHaveBeenCalledTimes(1));
    app.read().form.setFieldValue('title', 'Newer');
    gate.resolve({ data: { ...row, title: 'Normalized', quantity: 3 } });
    await operation;
    expect(app.read().form.values).toEqual({ title: 'Newer', quantity: 3 });
    expect(app.read().form.tainted).toEqual({ title: true });
    expect(app.router.go).not.toHaveBeenCalled();
    app.read().form.reset();
    expect(app.read().form.values).toEqual({ title: 'Normalized', quantity: 3 });
  });

  it('isolates callback mutations and failures from persisted values and return records', async () => {
    const app = mount();
    const success = vi.fn((result: { data: Record<string, unknown> }) => {
      Reflect.set(result.data, 'title', false);
      throw new Error('Observer failure');
    });
    await app.view.rerender({ settings: { onMutationSuccess: success } });
    await ready(app);
    fill(app);
    const result = await app.read().form.submit();
    expect(result.data['title']).toBe('Edited');
    expect(app.read().form.values['title']).toBe('Edited');
    expect(success).toHaveBeenCalledTimes(1);
    expect(app.read().form.error).toBeNull();
  });

  it('isolates named routes and separate provider instances sharing one client', async () => {
    const first = provider();
    const cms = provider();
    const app = mount({ default: first, cms });
    await app.view.rerender({ resources: [{ ...postDefinition, provider: { dataProviderName: 'cms' } }] });
    await ready(app);
    let next: FormState | undefined;
    render(Host, { provider: first, resources, queryClient: app.client, router: app.router, onReady: value => { next = value; } });
    await waitFor(() => expect(next?.list.isSuccess).toBe(true));
    const reads = vi.mocked(first.getList).mock.calls.length;
    fill(app);
    await app.read().form.submit();
    expect(cms.create).toHaveBeenCalledTimes(1);
    expect(first.create).not.toHaveBeenCalled();
    expect(first.getList).toHaveBeenCalledTimes(reads);
    await app.view.rerender({ settings: { dataProviderName: 'absent' } });
    expect(app.read().form.ready).toBe(false);
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'FORM_FAILED' });
  });

  it('refreshes only the captured source and contract families', async () => {
    const app = mount();
    await ready(app);
    const { builder, scope, source, authSession } = scopedKeys(app);
    const selected = [builder.data.list('posts', { source, authSession, extra: true }), builder.data.infiniteList('posts', { source, authSession }),
      builder.data.select('posts', { source, authSession }), builder.data.many('posts', { source, authSession, ids: [1] })];
    const excluded = [builder.data.list('posts'), builder.data.list('posts', { source: 'foreign' }),
      builder.data.list('posts', { source }), builder.data.list('posts', { source, authSession: 'foreign' }),
      builder.data.one('posts', 1, { source, authSession }), builder.data.list('other', { source, authSession }),
      keys({ ...scope, contract: contractKey(other) }).data.list('posts', { source, authSession }),
      keys({ ...scope, tenant: 'foreign' }).data.list('posts', { source, authSession })];
    for (const key of [...selected, ...excluded]) app.client.setQueryData(key, { fixture: true });
    fill(app);
    await app.read().form.submit();
    for (const key of selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(true);
    for (const key of excluded) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
  });

  it('waits for all refreshes before success, including when one fails early', async () => {
    const app = mount();
    await ready(app);
    const { builder, source, authSession } = scopedKeys(app);
    const failed = deferred<GetListResult>();
    const slow = deferred<GetListResult>();
    const first = new QueryObserver(app.client, { queryKey: builder.data.list('posts', { source, authSession, filter: 'failed' }),
      initialData: { data: [row], total: 1 }, queryFn: () => failed.promise, staleTime: Infinity });
    const second = new QueryObserver(app.client, { queryKey: builder.data.list('posts', { source, authSession, filter: 'slow' }),
      initialData: { data: [row], total: 1 }, queryFn: () => slow.promise, staleTime: Infinity });
    const offFirst = first.subscribe(() => {});
    const offSecond = second.subscribe(() => {});
    const success = vi.fn();
    await app.view.rerender({ settings: { onMutationSuccess: success } });
    try {
      fill(app);
      const operation = app.read().form.submit();
      await waitFor(() => expect(first.getCurrentResult().isFetching).toBe(true));
      failed.reject(new Error('refresh failed'));
      await waitFor(() => expect(first.getCurrentResult().isError).toBe(true));
      expect(app.read().form.submitting).toBe(true);
      expect(success).not.toHaveBeenCalled();
      slow.resolve({ data: [], total: 0 });
      await operation;
      expect(success).toHaveBeenCalledTimes(1);
    } finally { offFirst(); offSecond(); }
  });

  it.each(['resource', 'provider', 'tenant', 'auth', 'disabled', 'unmount'])('suppresses stale save effects after %s changes', async change => {
    const source = provider();
    const gate = deferred<GetOneResult>();
    source.create = vi.fn(() => gate.promise);
    const app = mount(source);
    const success = vi.fn();
    await app.view.rerender({ settings: { redirect: 'list', onMutationSuccess: success } });
    await ready(app);
    fill(app);
    const operation = app.read().form.submit().catch((cause: unknown) => cause);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    if (change === 'resource') await app.view.rerender({ resource: 'other' });
    if (change === 'provider') await app.view.rerender({ provider: provider() });
    if (change === 'tenant') await app.view.rerender({ tenant: 'next' });
    if (change === 'auth') await app.view.rerender({ auth: authProvider() });
    if (change === 'disabled') await app.view.rerender({ settings: { enabled: false, onMutationSuccess: success } });
    if (change === 'unmount') app.view.unmount();
    gate.resolve({ data: row });
    expect(await operation).toMatchObject({ code: 'FORM_CANCELLED', details: { writeMayHaveSucceeded: true } });
    expect(success).not.toHaveBeenCalled();
    expect(app.router.go).not.toHaveBeenCalled();
  });
});

describe('form authentication ownership', () => {
  it.each(['input', 'override'] as const)('rechecks final preflight failure when the %s observer starts login', async phase => {
    const app = await mountSession();
    let login: Promise<unknown> | undefined;
    const failed = vi.fn(() => { login = app.actions().login.mutate({}); });
    await app.view.rerender({ settings: { onMutationError: failed } });
    const operation = phase === 'input' ? app.read().form.submit()
      : Reflect.apply(app.read().form.submit, undefined, [{ redirect: 'invalid' }]);
    await expect(operation).rejects.toMatchObject({ code: 'FORM_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(failed).toHaveBeenCalledTimes(1);
    await login;
    expect(app.source.create).not.toHaveBeenCalled();
    expect(app.read().form.error).toBeNull();
  });

  it('suppresses a retired write failure before error observers or auth delegation', async () => {
    const source = provider();
    const write = deferred<GetOneResult>();
    source.create = vi.fn(() => write.promise);
    const session = authProvider();
    session.onError = vi.fn(async () => ({ logout: true }));
    const failed = vi.fn();
    const app = await mountSession(source, session, { onMutationError: failed });
    const effects = await observeEffects(app);
    fill(app);
    const operation = app.read().form.submit().catch((cause: unknown) => cause);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    write.reject(new HttpError('Private provider detail', 401));
    expect(await operation).toMatchObject({ code: 'FORM_CANCELLED', details: { writeMayHaveSucceeded: true } });
    expect(session.onError).not.toHaveBeenCalled();
    expect(failed).not.toHaveBeenCalled();
    expect(effects.notification.open).not.toHaveBeenCalled();
  });

  it('does not return records through a joined microtask after the originating session retires', async () => {
    const app = await mountSession();
    let login: Promise<unknown> | undefined;
    await app.view.rerender({ settings: { onMutationSuccess: () => {
      queueMicrotask(() => { login = app.actions().login.mutate({}); });
    } } });
    fill(app);
    const first = app.read().form.submit().catch((cause: unknown) => cause);
    const second = app.read().form.submit().catch((cause: unknown) => cause);
    for (const error of await Promise.all([first, second])) {
      expect(error).toMatchObject({ code: 'FORM_CANCELLED', details: { writeMayHaveSucceeded: true } });
      expect(error).not.toHaveProperty('data');
    }
    await login;
  });

  it('blocks both saved and fresh refetch calls while logged out', async () => {
    const app = await mountSession();
    await app.view.rerender({ action: 'edit', id: 1 });
    await ready(app);
    const refetch = app.read().form.query.refetch;
    await app.actions().logout.mutate();
    const reads = vi.mocked(app.source.getOne).mock.calls.length;
    await expect(refetch()).rejects.toMatchObject({ code: 'FORM_CANCELLED' });
    await expect(app.read().form.query.refetch()).rejects.toMatchObject({ code: 'FORM_CANCELLED' });
    expect(app.source.getOne).toHaveBeenCalledTimes(reads);
    expect(app.read().form.query.data).toBeUndefined();
    expect(app.read().form.query.error).toBeNull();
    expect(app.read().form.query.isPending).toBe(true);
    expect(app.read().form.query.isError).toBe(false);
    expect(app.read().form.query.isSuccess).toBe(false);
  });

  it('refreshes only current session data when independent auth trees share the same client and provider', async () => {
    const first = await mountSession();
    const second = mount(first.source, {}, { session: authProvider(), client: first.client, showForm: false });
    await waitFor(() => expect(second.actions().check.isLoading).toBe(false));
    await ready(second);
    const firstOwner = captureAuthSession(first.session).cacheKey;
    const foreignQueries = first.client.getQueryCache().getAll().filter(q => {
      const parsed = parseQueryKey(q.queryKey);
      return parsed?.kind === 'data' && typeof parsed.params === 'object' && parsed.params !== null &&
        Object.getOwnPropertyDescriptor(parsed.params, 'authSession')?.value !== firstOwner;
    }).map(q => ({ key: q.queryKey, invalidated: q.state.isInvalidated, updated: q.state.dataUpdateCount }));
    const invalidate = vi.spyOn(first.client, 'invalidateQueries');
    fill(first);
    await first.read().form.submit();
    expect(invalidate).toHaveBeenCalled();
    expect(foreignQueries.length).toBeGreaterThan(0);
    for (const query of foreignQueries) {
      expect(first.client.getQueryState(query.key)?.isInvalidated).toBe(query.invalidated);
      expect(first.client.getQueryState(query.key)?.dataUpdateCount).toBe(query.updated);
    }
    expect(second.read().form.values).toEqual({});
  });

  it('waits for all started refreshes even when another refresh changes authentication and fails', async () => {
    const app = await mountSession();
    const { builder, source } = scopedKeys(app);
    const authSession = captureAuthSession(app.session).cacheKey;
    const slow = deferred<GetListResult>();
    const failed = deferred<GetListResult>();
    const first = new QueryObserver(app.client, { queryKey: builder.data.list('posts', { source, authSession, fixture: 'first' }),
      queryFn: () => slow.promise, initialData: { data: [row], total: 1 }, staleTime: Infinity });
    const second = new QueryObserver(app.client, { queryKey: builder.data.list('posts', { source, authSession, fixture: 'second' }),
      queryFn: () => failed.promise, initialData: { data: [row], total: 1 }, staleTime: Infinity });
    const offFirst = first.subscribe(() => {});
    const offSecond = second.subscribe(() => {});
    try {
      fill(app);
      let settled = false;
      const operation = app.read().form.submit().catch((cause: unknown) => cause).finally(() => { settled = true; });
      await waitFor(() => expect(first.getCurrentResult().isFetching && second.getCurrentResult().isFetching).toBe(true));
      await app.actions().login.mutate({});
      failed.reject(new Error('Private refresh failure'));
      await waitFor(() => expect(second.getCurrentResult().isError).toBe(true));
      expect(settled).toBe(false);
      slow.resolve({ data: [], total: 0 });
      expect(await operation).toMatchObject({ code: 'FORM_CANCELLED', details: { writeMayHaveSucceeded: true } });
    } finally { offFirst(); offSecond(); }
  });

  it.each(['login', 'logout'] as const)('cancels queued submissions on %s without claiming a dispatch', async action => {
    const callback = vi.fn();
    const app = await mountSession(provider(), authProvider(), { onMutationSuccess: callback, onMutationError: callback });
    fill(app);
    const operation = app.read().form.submit().catch((cause: unknown) => cause);
    if (action === 'login') await app.actions().login.mutate({});
    else await app.actions().logout.mutate();
    expect(await operation).toMatchObject({ code: 'FORM_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(app.source.create).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
  });

  it('immediately hides retired drafts, errors and unload guards while login is pending', async () => {
    const app = await mountSession(provider(), authProvider(), { defaultValues: { title: 'Default', quantity: 0 }, warnWhenUnsavedChanges: true });
    fill(app, 'Private');
    app.read().form.setFieldError('title', 'Private error');
    await waitFor(() => expect(app.read().form.isDirty).toBe(true));
    const gate = deferred<{ success: boolean }>();
    app.session.login = vi.fn(() => gate.promise);
    const login = app.actions().login.mutate({});
    const form = app.read().form;
    expect(form.values).toEqual({});
    expect(form.errors).toEqual({});
    expect(form.tainted).toEqual({});
    expect(form.isDirty).toBe(false);
    expect(form.submitting).toBe(false);
    expect(form.ready).toBe(false);
    expect(form.error).toBeNull();
    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(false);
    form.setValues({ title: 'Obsolete' });
    form.setFieldError('title', 'Obsolete');
    expect(form.validateFields()).toBe(false);
    await expect(form.submit()).rejects.toMatchObject({ code: 'FORM_CANCELLED' });
    await expect(Reflect.apply(form.submit, undefined, [{ redirect: 'invalid' }])).rejects.toMatchObject({ code: 'FORM_CANCELLED' });
    gate.resolve({ success: true });
    await login;
    await ready(app);
    expect(form.values).toEqual({ title: 'Default', quantity: 0 });
    expect(form.errors).toEqual({});
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it.each(['create', 'edit', 'clone'] as const)('retires dispatched %s and joined results without old-session effects', async action => {
    const app = await mountSession();
    await app.view.rerender({ action, ...definedOptions({ id: action === 'create' ? undefined : 1 }) });
    await ready(app);
    const effects = await observeEffects(app);
    const success = vi.fn();
    const failed = vi.fn();
    await app.view.rerender({ settings: { redirect: 'list', onMutationSuccess: success, onMutationError: failed } });
    const gate = deferred<GetOneResult>();
    app.source.create = vi.fn(() => gate.promise);
    app.source.update = vi.fn(() => gate.promise);
    // Capture methods after replacing the transport without changing source identity.
    await app.view.rerender({ settings: { meta: { revision: 1 }, redirect: 'list', onMutationSuccess: success, onMutationError: failed } });
    await ready(app);
    fill(app);
    const first = app.read().form.submit().catch((cause: unknown) => cause);
    const joined = app.read().form.submit().catch((cause: unknown) => cause);
    await waitFor(() => expect(action === 'edit' ? app.source.update : app.source.create).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    await ready(app);
    vi.mocked(app.router.go).mockClear();
    const invalidation = vi.spyOn(app.client, 'invalidateQueries');
    gate.resolve({ data: { ...row, title: 'Private receipt' } });
    const errors: unknown[] = await Promise.all([first, joined]);
    for (const error of errors) {
      expect(error).toMatchObject({ code: 'FORM_CANCELLED', details: { writeMayHaveSucceeded: true } });
      expect(error).not.toHaveProperty('data');
      expect(JSON.stringify(error)).not.toContain('Private');
    }
    expect(errors[0]).not.toBe(errors[1]);
    expect(effects.auditHandler).not.toHaveBeenCalled();
    expect(effects.audit.create).not.toHaveBeenCalled();
    expect(effects.live.publish).not.toHaveBeenCalled();
    expect(effects.notification.open).not.toHaveBeenCalled();
    expect(invalidation).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
    expect(failed).not.toHaveBeenCalled();
    expect(app.router.go).not.toHaveBeenCalled();
    expect(app.read().form.submitting).toBe(false);
  });

  it('keeps same-provider detail caches separated across login and retires saved refetch functions', async () => {
    const app = await mountSession();
    await app.view.rerender({ action: 'edit', id: 1 });
    await ready(app);
    const form = app.read().form;
    const refetch = form.query.refetch;
    const oldSession = captureAuthSession(app.session).cacheKey;
    const gate = deferred<GetOneResult>();
    const owners: string[] = [];
    app.source.getOne = vi.fn(() => {
      owners.push(captureAuthSession(app.session).cacheKey);
      return gate.promise;
    });
    await app.actions().login.mutate({});
    await waitFor(() => expect(owners).toContain(captureAuthSession(app.session).cacheKey));
    const reads = owners.length;
    // Mounted auth checks may publish another revision, but a revision has one read.
    expect(new Set(owners).size).toBe(reads);
    expect(form.values).toEqual({});
    expect(form.query.data).toBeUndefined();
    expect(form.query.isSuccess).toBe(false);
    expect(form.ready).toBe(false);
    await expect(refetch()).rejects.toMatchObject({ code: 'FORM_CANCELLED' });
    expect(app.source.getOne).toHaveBeenCalledTimes(reads);
    gate.resolve({ data: { ...row, title: 'New principal' } });
    await ready(app);
    expect(form.values['title']).toBe('New principal');
    expect(captureAuthSession(app.session).cacheKey).not.toBe(oldSession);
    const details = app.client.getQueryCache().getAll().map(q => parseQueryKey(q.queryKey))
      .filter(q => q?.kind === 'data' && q.action === 'one');
    expect(details.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects late detail receipts and never hydrates them into a restored session', async () => {
    const app = await mountSession();
    const oldRead = deferred<GetOneResult>();
    const newRead = deferred<GetOneResult>();
    let restored = false;
    const owners: string[] = [];
    app.source.getOne = vi.fn(() => {
      owners.push(captureAuthSession(app.session).cacheKey);
      return restored ? newRead.promise : oldRead.promise;
    });
    await app.view.rerender({ action: 'edit', id: 1 });
    await waitFor(() => expect(owners).toContain(captureAuthSession(app.session).cacheKey));
    restored = true;
    await app.actions().login.mutate({});
    await waitFor(() => expect(owners).toContain(captureAuthSession(app.session).cacheKey));
    expect(new Set(owners).size).toBe(owners.length);
    oldRead.resolve({ data: { ...row, title: 'Private' } });
    await oldRead.promise;
    expect(app.read().form.values).toEqual({});
    expect(app.read().form.query.data).toBeUndefined();
    newRead.resolve({ data: { ...row, title: 'Current' } });
    await ready(app);
    expect(app.read().form.values['title']).toBe('Current');
  });

  it.each(['reset', 'login', 'edit'] as const)('rechecks ownership after field validation calls %s', async change => {
    const app = await mountSession();
    let login: Promise<unknown> | undefined;
    await app.view.rerender({ settings: { validate: () => {
      if (change === 'reset') app.read().form.reset();
      else if (change === 'login') login = app.actions().login.mutate({});
      else app.read().form.setValues({ title: 'New draft' });
      return { title: 'Obsolete validator' };
    } } });
    fill(app);
    expect(app.read().form.validateFields()).toBe(false);
    expect(app.read().form.errors).toEqual({});
    expect(app.read().form.error).toBeNull();
    if (login) await login;
    await ready(app);
    expect(app.read().form.errors).toEqual({});
  });

  it('does not dispatch or publish validation errors for a draft edited by its validator', async () => {
    const app = await mountSession();
    await app.view.rerender({ settings: { validate: () => {
      app.read().form.setValues({ title: 'New draft' });
      return { title: 'Obsolete validation' };
    } } });
    fill(app);
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'FORM_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(app.read().form.values['title']).toBe('New draft');
    expect(app.read().form.errors).toEqual({});
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it.each(['auditHandler', 'auditProvider', 'live', 'notification', 'success', 'navigation'] as const)(
    'stops later completion sinks when %s starts login', async sink => {
      const app = await mountSession();
      const effects = await observeEffects(app);
      const success = vi.fn();
      let login: Promise<unknown> | undefined;
      const start = () => { login ??= app.actions().login.mutate({}); };
      if (sink === 'auditHandler') setAuditHandler(start);
      if (sink === 'auditProvider') vi.mocked(effects.audit.create).mockImplementation(async input => { start(); return { ...input, id: 'audit' }; });
      if (sink === 'live') vi.mocked(effects.live.publish).mockImplementation(start);
      if (sink === 'notification') effects.notification.open.mockImplementation(start);
      if (sink === 'success') success.mockImplementation(start);
      if (sink === 'navigation') vi.mocked(app.router.go).mockImplementation(start);
      await app.view.rerender({ settings: { redirect: 'list', onMutationSuccess: success } });
      fill(app);
      const error: unknown = await app.read().form.submit().catch((cause: unknown) => cause);
      expect(error).toMatchObject({ code: 'FORM_CANCELLED', details: { writeMayHaveSucceeded: true } });
      expect(error).not.toHaveProperty('data');
      expect(login).toBeDefined();
      await login;
      if (sink === 'auditHandler') expect(effects.audit.create).not.toHaveBeenCalled();
      if (['auditHandler', 'auditProvider'].includes(sink)) expect(effects.live.publish).not.toHaveBeenCalled();
      if (['auditHandler', 'auditProvider', 'live'].includes(sink)) expect(effects.notification.open).not.toHaveBeenCalled();
      if (['auditHandler', 'auditProvider', 'live', 'notification'].includes(sink)) expect(success).not.toHaveBeenCalled();
      if (sink !== 'navigation') expect(app.router.go).not.toHaveBeenCalledWith(expect.objectContaining({ to: '/posts' }));
    },
  );

  it('isolates a rejecting asynchronous live observer from a checked write', async () => {
    const app = await mountSession();
    const effects = await observeEffects(app);
    vi.mocked(effects.live.publish).mockRejectedValue(new Error('Private live failure'));
    fill(app);
    await expect(app.read().form.submit()).resolves.toMatchObject({ data: { title: 'Edited' } });
    expect(app.read().form.error).toBeNull();
  });

  it.each(['reset', 'login'] as const)('rechecks navigation after route parsing calls %s', async action => {
    const app = await mountSession();
    let armed = false;
    let login: Promise<unknown> | undefined;
    const parse = vi.fn(() => {
      if (armed) {
        armed = false;
        if (action === 'reset') app.read().form.reset();
        else login = app.actions().login.mutate({});
      }
      return { pathname: '/posts/create', params: {} };
    });
    await app.view.rerender({ router: { ...app.router, parse },
      settings: { redirect: 'list', onMutationSuccess: () => { armed = true; } },
    });
    await ready(app);
    fill(app);
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'FORM_CANCELLED', details: { writeMayHaveSucceeded: true } });
    await login;
    expect(armed).toBe(false);
    expect(app.router.go).not.toHaveBeenCalledWith(expect.objectContaining({ to: '/posts' }));
  });

  it('lets a current auth-error delegate finish its own logout and clear its caches', async () => {
    const source = provider();
    source.create = vi.fn(async () => { throw new HttpError('Private auth failure', 401); });
    const session = authProvider();
    const logout = deferred<{ success: boolean }>();
    session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/expired' }));
    session.logout = vi.fn(() => logout.promise);
    const app = await mountSession(source, session);
    const originKeys = app.client.getQueryCache().getAll().filter(q => parseQueryKey(q.queryKey)?.kind === 'data').map(q => q.queryKey);
    fill(app);
    await app.read().form.submit().catch(() => {});
    await waitFor(() => expect(session.logout).toHaveBeenCalledTimes(1));
    expect(app.read().form.values).toEqual({});
    expect(app.read().form.ready).toBe(false);
    logout.resolve({ success: true });
    await waitFor(() => expect(app.router.go).toHaveBeenCalledWith(expect.objectContaining({ to: '/expired' })));
    expect(app.read().form.error).toBeNull();
    for (const key of originKeys) expect(app.client.getQueryState(key)).toBeUndefined();
    expect(app.client.getQueryCache().getAll().filter(q => parseQueryKey(q.queryKey)?.kind === 'data').every(q => q.state.data === undefined)).toBe(true);
  });

  it('suppresses late auth instructions after a newer login on the same provider', async () => {
    const source = provider();
    source.create = vi.fn(async () => { throw new HttpError('Private auth failure', 401); });
    const session = authProvider();
    const instruction = deferred<{ logout: boolean; redirectTo: string }>();
    session.onError = vi.fn(() => instruction.promise);
    session.logout = vi.fn(session.logout);
    const app = await mountSession(source, session);
    fill(app);
    await app.read().form.submit().catch(() => {});
    await waitFor(() => expect(session.onError).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    instruction.resolve({ logout: true, redirectTo: '/obsolete' });
    await instruction.promise;
    await ready(app);
    expect(session.logout).not.toHaveBeenCalled();
    expect(app.router.go).not.toHaveBeenCalledWith(expect.objectContaining({ to: '/obsolete' }));
  });

  it.each(['reset', 'submit'] as const)('invalidates its own pending logout delegate after explicit %s', async action => {
    const source = provider();
    source.create = vi.fn(async () => { throw new HttpError('Private auth failure', 401); });
    const session = authProvider();
    const logout = deferred<{ success: boolean }>();
    session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/obsolete' }));
    session.logout = vi.fn(() => logout.promise);
    const app = await mountSession(source, session);
    fill(app);
    await app.read().form.submit().catch(() => {});
    await waitFor(() => expect(session.logout).toHaveBeenCalledTimes(1));
    if (action === 'reset') app.read().form.reset();
    else await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'FORM_CANCELLED' });
    logout.resolve({ success: true });
    await logout.promise;
    await waitFor(() => expect(captureAuthSession(session).available).toBe(false));
    expect(app.router.go).not.toHaveBeenCalledWith(expect.objectContaining({ to: '/obsolete' }));
    expect(source.create).toHaveBeenCalledTimes(1);
  });

  it('preserves a newer submission when an old-session request finishes last', async () => {
    const source = provider();
    const oldWrite = deferred<GetOneResult>();
    const newWrite = deferred<GetOneResult>();
    source.create = vi.fn().mockReturnValueOnce(oldWrite.promise).mockReturnValue(newWrite.promise);
    const app = await mountSession(source);
    fill(app);
    const oldOperation = app.read().form.submit().catch((cause: unknown) => cause);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    await ready(app);
    fill(app, 'New draft');
    const newOperation = app.read().form.submit();
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(2));
    oldWrite.resolve({ data: row });
    expect(await oldOperation).toMatchObject({ code: 'FORM_CANCELLED' });
    expect(app.read().form.submitting).toBe(true);
    expect(app.read().form.values['title']).toBe('New draft');
    newWrite.resolve({ data: { ...row, title: 'New draft' } });
    await newOperation;
    expect(app.read().form.submitting).toBe(false);
  });
});

describe('AutoForm contract consumer', () => {
  it.each(['flat', 'grouped'] as const)('retires saved %s edit and submit callbacks across login', async layout => {
    const app = await mountSession();
    const edits = new Map<string, (value: unknown) => void>();
    let submit: (() => void) | undefined;
    await app.view.rerender({ showForm: true,
      resources: [{ ...postDefinition, fields: fields.map(field => layout === 'grouped' ? { ...field, group: 'Details' } : field) }],
      onFieldReady: (field, change) => { edits.set(field, change); }, onSubmitReady: value => { submit = value; },
    });
    await waitFor(() => expect(submit).toBeDefined());
    const oldEdit = edits.get('title');
    const oldSubmit = submit;
    if (!oldEdit || !oldSubmit) throw new Error('Expected captured form controls');
    oldEdit('Private draft');
    await app.actions().login.mutate({});
    await ready(app);
    await waitFor(() => expect(edits.get('title')).not.toBe(oldEdit));
    edits.get('title')?.('Current draft');
    oldEdit('Obsolete edit');
    oldSubmit();
    await Promise.resolve();
    expect(app.source.create).not.toHaveBeenCalled();
    submit?.();
    await waitFor(() => expect(app.source.create).toHaveBeenCalledTimes(1));
    expect(app.source.create).toHaveBeenCalledWith(expect.objectContaining({ variables: expect.objectContaining({ title: 'Current draft' }) }));
  });

  it('retires a saved navigation guard and visible draft after same-provider login', async () => {
    const app = await mountSession();
    let guard: ((next: () => void) => void) | undefined;
    await app.view.rerender({ showForm: true, onNavigationGuardReady: value => { guard = value; } });
    const title = await app.view.findByRole('textbox', { name: /^Title/ });
    await fireEvent.input(title, { target: { value: 'Private draft' } });
    const savedGuard = guard;
    if (!savedGuard) throw new Error('Expected navigation guard');
    const obsolete = vi.fn();
    savedGuard(obsolete);
    await app.view.findByRole('alertdialog');
    await app.actions().login.mutate({});
    await waitFor(() => expect(app.view.queryByRole('alertdialog')).toBeNull());
    savedGuard(obsolete);
    expect(obsolete).not.toHaveBeenCalled();
    expect(app.view.getByRole('textbox', { name: /^Title/ })).toHaveProperty('value', '');
    const current = vi.fn();
    guard?.(current);
    expect(current).toHaveBeenCalledTimes(1);
  });
  it('keeps invalid drafts editable, marks errors and focuses the first invalid field', async () => {
    const source = provider();
    const app = mount(source);
    const success = vi.fn();
    await app.view.rerender({ onSuccess: success });
    const title = await app.view.findByRole('textbox', { name: /^Title/ });
    await fireEvent.click(app.view.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(title.getAttribute('aria-invalid')).toBe('true'));
    expect(title.getAttribute('aria-describedby')).toBe('posts-title-error');
    await waitFor(() => expect(document.activeElement).toBe(title));
    expect(source.create).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
  });

  it('only renders writable schema fields and calls success before navigation', async () => {
    const source = provider();
    const app = mount(source);
    const events: string[] = [];
    await app.view.rerender({ onSuccess: () => { events.push('success'); },
      router: { go: () => { events.push('navigate'); }, back: () => {}, parse: () => ({ pathname: '/posts/create', params: {} }) } });
    await fireEvent.input(await app.view.findByRole('textbox', { name: /^Title/ }), { target: { value: 'Created' } });
    expect(app.view.queryByRole('textbox', { name: /Server field/ })).toBeNull();
    await fireEvent.click(app.view.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(events).toEqual(['success', 'navigate']));
    expect(source.create).toHaveBeenCalledWith(expect.objectContaining({ variables: { title: 'Created', quantity: 0 } }));
  });

  it('never reports success for failed writes and retains the draft for explicit retry', async () => {
    const source = provider();
    source.create = vi.fn(async () => ({ data: { ...row, title: 'Kept draft' } }))
      .mockRejectedValueOnce(new Error('PRIVATE_PROVIDER_DETAIL'));
    const app = mount(source);
    const success = vi.fn();
    await app.view.rerender({ onSuccess: success });
    const input = await app.view.findByRole('textbox', { name: /^Title/ });
    await fireEvent.input(input, { target: { value: 'Kept draft' } });
    await fireEvent.click(app.view.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(app.view.queryByText('Operation failed')).not.toBeNull());
    expect(app.view.container.textContent).not.toContain('PRIVATE');
    expect(success).not.toHaveBeenCalled();
    expect(app.router.go).not.toHaveBeenCalled();
    expect(input instanceof HTMLInputElement && input.value).toBe('Kept draft');
    await fireEvent.click(app.view.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
  });

  it('blocks reads and writes until the current permission is granted', async () => {
    const source = provider();
    const gate = deferred<{ can: boolean }>();
    const app = mount(source);
    await app.view.rerender({ permission: { can: () => gate.promise } });
    expect(app.view.queryByRole('textbox', { name: /^Title/ })).toBeNull();
    gate.resolve({ can: false });
    await waitFor(() => expect(app.view.queryByRole('button', { name: /^save$/i })).toBeNull());
    expect(source.create).not.toHaveBeenCalled();
    await app.view.rerender({ permission: { can: async () => ({ can: true }) } });
    expect(await app.view.findByRole('textbox', { name: /^Title/ })).toBeDefined();
    await app.view.rerender({ resources: [{ ...postDefinition, canCreate: false }] });
    expect(app.view.queryByRole('button', { name: /^save$/i })).toBeNull();
  });

  it('offers an explicit retry after a failed read without rendering unchecked fields', async () => {
    const source = provider();
    source.getOne = vi.fn<DataProvider['getOne']>(async ({ id }) => ({ data: { ...row, id } }))
      .mockRejectedValueOnce(new Error('PRIVATE_READ_FAILURE'));
    const app = mount(source);
    await app.view.rerender({ action: 'edit', id: 1 });
    const retry = await app.view.findByRole('button', { name: /^retry$/i });
    expect(app.view.queryByRole('textbox', { name: /^Title/ })).toBeNull();
    expect(app.view.container.textContent).not.toContain('PRIVATE');
    expect(source.getOne).toHaveBeenCalledTimes(1);
    await fireEvent.click(retry);
    const title = await app.view.findByRole('textbox', { name: /^Title/ });
    expect(title instanceof HTMLInputElement && title.value).toBe('First');
    expect(source.getOne).toHaveBeenCalledTimes(2);
    expect(source.update).not.toHaveBeenCalled();
  });

  it('suppresses old UI save completion after permission is revoked', async () => {
    const source = provider();
    const gate = deferred<GetOneResult>();
    source.create = vi.fn(() => gate.promise);
    const app = mount(source);
    const success = vi.fn();
    await app.view.rerender({ onSuccess: success });
    await fireEvent.input(await app.view.findByRole('textbox', { name: /^Title/ }), { target: { value: 'Saved' } });
    await fireEvent.click(app.view.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    await app.view.rerender({ permission: { can: async () => ({ can: false }) } });
    await waitFor(() => expect(app.view.queryByRole('button', { name: /^save$/i })).toBeNull());
    const invalidate = vi.spyOn(app.client, 'invalidateQueries');
    gate.resolve({ data: row });
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    await Promise.all(invalidate.mock.results.map(result => result.value));
    expect(success).not.toHaveBeenCalled();
    expect(app.router.go).not.toHaveBeenCalled();
  });

  it('renders show mode without save controls and resets obsolete navigation guards', async () => {
    const app = mount();
    let guard: ((next: () => void) => void) | undefined;
    await app.view.rerender({ onNavigationGuardReady: value => { guard = value; } });
    await fireEvent.input(await app.view.findByRole('textbox', { name: /^Title/ }), { target: { value: 'Unsaved' } });
    const navigate = vi.fn();
    guard?.(navigate);
    await waitFor(() => expect(app.view.queryByRole('alertdialog')).not.toBeNull());
    expect(navigate).not.toHaveBeenCalled();
    await app.view.rerender({ action: 'show', id: 1 });
    await waitFor(() => expect(app.view.queryByRole('alertdialog')).toBeNull());
    expect(app.view.queryByRole('button', { name: /^save$/i })).toBeNull();
    const title = await app.view.findByRole('textbox', { name: /^Title/ });
    expect(title.hasAttribute('disabled')).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });
});
