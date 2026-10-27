import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { Type } from 'typebox';
import { QueryClient } from '@tanstack/svelte-query';
import { defineResource, resetContext, useStepsForm, captureAuthSession, HttpError, type DataProvider, type GetOneResult,
  type ResourceDefinition, type RouterProvider, type AuthProvider } from '@svadmin/core';
import * as unsafe from '../../../core/src/unsafe';
import { resetToast } from '@svadmin/core/toast';
import { definedOptions } from '@svadmin/core/options';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StepState, StepSettings, StepDefinition, StepAuthActions } from './steps-contract.test.types';
import Host from './steps-contract.test-host.svelte';

const record = Type.Object({ id: Type.Number(), title: Type.String(), quantity: Type.Number(), serverOnly: Type.String() });
const create = Type.Object({ title: Type.String({ minLength: 1 }), quantity: Type.Number({ minimum: 0 }) });
const update = Type.Partial(create);
const posts = defineResource('posts', { record, create, update });
const other = defineResource('other', { record, create, update });
const fields: ResourceDefinition['fields'] = [
  { key: 'title', type: 'text', label: 'Title' },
  { key: 'quantity', type: 'number', label: 'Quantity' },
  { key: 'serverOnly', type: 'text', label: 'Server field' },
];
const definition: ResourceDefinition = { name: 'posts', label: 'Posts', fields, contract: posts };
const resources: ResourceDefinition[] = [definition, { ...definition, name: 'other', contract: other }];
const steps: StepDefinition[] = [
  { title: 'Details', fields: ['title'] }, { title: 'Quantity', fields: ['quantity'] }, { title: 'Review', fields: [] },
];
const row = { id: 1, title: 'First', quantity: 1, serverOnly: 'Server' };
const clients: QueryClient[] = [];
function provider(): DataProvider {
  return {
    getApiUrl: () => '/api',
    getList: vi.fn(async () => ({ data: [row], total: 1 })),
    getOne: vi.fn(async ({ id }) => ({ data: { ...row, id } })),
    create: vi.fn(async ({ variables }) => ({ data: { ...row, id: 10,
      ...(typeof variables === 'object' && variables !== null ? variables : {}) } })),
    update: vi.fn(async ({ id, variables }) => ({ data: { ...row, id,
      ...(typeof variables === 'object' && variables !== null ? variables : {}) } })),
    deleteOne: async () => ({ data: {} }),
  };
}
function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Not initialized'); };
  let reject: (cause: unknown) => void = () => { throw new Error('Not initialized'); };
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function auth(): AuthProvider {
  return { login: vi.fn(async () => ({ success: true })), logout: vi.fn(async () => ({ success: true })),
    check: vi.fn(async () => ({ authenticated: true })), getIdentity: async () => ({ id: 'user' }) };
}
function mount(source: DataProvider | Record<string, DataProvider> = provider(), settings: StepSettings = {}, showForm = false, session?: AuthProvider) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: 3 } } });
  clients.push(client);
  let state: StepState | undefined;
  let actions: StepAuthActions | undefined;
  const router: RouterProvider = { go: vi.fn(), back: () => {}, parse: () => ({ pathname: '/posts/create', params: {} }) };
  const view = render(Host, { provider: source, resources, queryClient: client, router, steps, settings, showForm,
    ...definedOptions({ auth: session,
      onAuthReady: session === undefined ? undefined : (value: StepAuthActions) => { actions = value; } }),
    onReady: value => { state = value; } });
  return { client, router, view, actions() {
    if (!actions) throw new Error('Expected mounted auth controls');
    return actions;
  }, read() {
    if (!state) throw new Error('Expected a step form');
    return state;
  } };
}
async function ready(app: ReturnType<typeof mount>) {
  await waitFor(() => expect(app.read().form.ready && app.read().list.isSuccess).toBe(true));
}
async function mountSession(source = provider(), session = auth(), settings: StepSettings = {}, showForm = false) {
  const app = mount(source, settings, showForm, session);
  await waitFor(() => expect(app.actions().check.isLoading).toBe(false));
  await ready(app);
  return { ...app, source, session };
}
function fill(app: ReturnType<typeof mount>) { app.read().form.setValues({ title: 'Edited', quantity: 2 }); }
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
  vi.restoreAllMocks();
});

describe('contract-bound step forms', () => {
  it('strictly compiles the changed hooks, UI and positive/negative fixtures', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = ['../../../core/src/useStepsForm.svelte.ts', '../../../core/src/contract-form.svelte.ts',
      '../../../core/src/resource-contract.ts', 'steps-contract.test.svelte.ts', 'steps-contract.test.types.ts',
      '../../../core/src/auth-hooks.svelte.ts', '../../../core/src/reactive-projection.ts',
      'steps-contract.test.type-fixture.ts', 'form-contract.test.type-fixture.ts',
    ].map(file => resolve(directory, file));
    const virtual = new Map(['StepsForm.svelte', 'AutoForm.svelte', 'steps-contract.test-probe.svelte',
      'steps-contract.test-host.svelte'].map(name => {
      const filename = resolve(directory, name);
      return [`${filename}.tsx`, svelte2tsx(readFileSync(filename, 'utf8'), { filename, isTsFile: true, mode: 'ts' }).code];
    }));
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
    const diagnostics = targets.flatMap(file => {
      const source = program.getSourceFile(file);
      if (!source) throw new Error(`Missing input ${file}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    });
    expect(diagnostics.map(diagnostic => {
      const line = diagnostic.file && diagnostic.start !== undefined
        ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1 : 0;
      return `${diagnostic.file?.fileName ?? ''}:${line}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
    })).toEqual([]);
  }, 90_000);

  it('publishes only the checked hook and removes its legacy implementation', () => {
    expect(useStepsForm).toBeTypeOf('function');
    expect('useStepsForm' in unsafe).toBe(false);
    const directory = dirname(fileURLToPath(import.meta.url));
    expect(readFileSync(resolve(directory, 'StepsForm.svelte'), 'utf8')).not.toContain('@svadmin/core/unsafe');
    expect(readFileSync(resolve(directory, '../../../core/src/useStepsForm.svelte.ts'), 'utf8')).not.toContain('./form-hooks.svelte');
    const inventory: unknown = JSON.parse(readFileSync(resolve(directory, '../../../../scripts/unsafe-boundaries.json'), 'utf8'));
    expect(inventory).not.toHaveProperty('packages/ui/src/components/StepsForm.svelte');
  });

  it('keeps drafts partial and validates only traversed steps before advancing', async () => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    expect(app.read().form.values).toEqual({});
    expect(app.read().form.steps.nextStep()).toBe(false);
    expect(app.read().form.errors).toHaveProperty('title');
    expect(app.read().form.errors).not.toHaveProperty('quantity');
    app.read().form.setFieldValue('title', 'Valid');
    expect(app.read().form.steps.nextStep()).toBe(true);
    expect(app.read().form.steps.currentStep).toBe(1);
    expect(app.read().form.steps.nextStep()).toBe(false);
    app.read().form.setFieldValue('quantity', -1);
    expect(app.read().form.steps.nextStep()).toBe(false);
    expect(app.read().form.errors).toHaveProperty('quantity');
    expect(source.create).not.toHaveBeenCalled();
  });

  it('prevents direct step jumps from bypassing earlier schema failures', async () => {
    const app = mount();
    await ready(app);
    app.read().form.setFieldValue('title', 'Valid');
    expect(app.read().form.steps.gotoStep(2)).toBe(false);
    expect(app.read().form.steps.currentStep).toBe(1);
    app.read().form.setFieldValue('quantity', 0);
    expect(app.read().form.steps.gotoStep(2)).toBe(true);
    expect(app.read().form.steps.canGoNext).toBe(false);
    app.read().form.steps.prevStep();
    app.read().form.setFieldValue('title', '');
    expect(app.read().form.steps.gotoStep(2)).toBe(false);
    expect(app.read().form.steps.currentStep).toBe(0);
  });

  it.each([false, true])('validates backwards only when configured (%s)', async isBackValidate => {
    const app = mount(provider(), { isBackValidate });
    await ready(app);
    fill(app);
    app.read().form.steps.gotoStep(1);
    app.read().form.setFieldValue('quantity', -1);
    expect(app.read().form.steps.prevStep()).toBe(!isBackValidate);
    expect(app.read().form.steps.currentStep).toBe(isBackValidate ? 1 : 0);
    expect(app.read().form.values['quantity']).toBe(-1);
  });

  it.each([-1, 3, 0.5, NaN, Infinity])('rejects invalid navigation indexes (%s)', async step => {
    const app = mount();
    await ready(app);
    expect(() => app.read().form.steps.gotoStep(step)).toThrow('Invalid form steps');
    expect(app.read().form.steps.currentStep).toBe(0);
  });

  it.each([-1, 3, 0.5, NaN])('disables invalid initial steps (%s)', async defaultStep => {
    const source = provider();
    const app = mount(source, { defaultStep });
    await waitFor(() => expect(app.read().form.error?.code).toBe('INVALID_RESOURCE_INPUT'));
    expect(app.read().form.ready).toBe(false);
    await expect(app.read().form.submit()).rejects.toBeDefined();
    expect(source.create).not.toHaveBeenCalled();
  });

  it.each([[], [{ title: 'Bad', fields: ['invented'] }], [{ title: 'Bad', fields: ['serverOnly'] }],
    [{ title: 'Bad', fields: ['title', 'title'] }]].map(steps => ({ steps })))('rejects invalid workflow fields (%j)', async ({ steps }) => {
    const app = mount();
    await app.view.rerender({ steps });
    expect(app.read().form.ready).toBe(false);
    expect(app.read().form.error?.code).toBe('INVALID_RESOURCE_INPUT');
    expect(app.read().form.steps.totalSteps).toBe(0);
  });

  it('initializes the requested step and resets navigation when the workflow changes', async () => {
    const app = mount(provider(), { defaultStep: 1, defaultValues: { title: 'Default', quantity: 1 } });
    await ready(app);
    expect(app.read().form.steps.currentStep).toBe(1);
    fill(app);
    app.read().form.steps.gotoStep(2);
    await app.view.rerender({ steps: steps.slice(0, 2) });
    await ready(app);
    expect(app.read().form.steps.totalSteps).toBe(2);
    expect(app.read().form.steps.currentStep).toBe(1);
    expect(app.read().form.values['title']).toBe('Default');
    expect(app.read().form.isDirty).toBe(false);
  });

  it('checks the full form on submit and moves to its first invalid step', async () => {
    const source = provider();
    const app = mount(source, { defaultStep: 2 });
    await ready(app);
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(app.read().form.steps.currentStep).toBe(0);
    fill(app);
    const result = await app.read().form.submit();
    expect(result.data).toMatchObject({ id: 10, title: 'Edited', quantity: 2 });
    expect(app.read().form.isDirty).toBe(false);
    expect(source.create).toHaveBeenCalledTimes(1);
  });

  it('clears a required numeric draft without retaining a previous valid value', async () => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    fill(app);
    app.read().form.steps.gotoStep(2);
    app.read().form.setFieldValue('quantity', undefined);
    expect(app.read().form.values).not.toHaveProperty('quantity');
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(app.read().form.steps.currentStep).toBe(1);
    expect(source.create).not.toHaveBeenCalled();
  });

  it('coalesces repeated saves and disables navigation until settlement', async () => {
    const source = provider();
    const gate = deferred<GetOneResult>();
    source.create = vi.fn(() => gate.promise);
    const app = mount(source);
    await ready(app);
    fill(app);
    const operation = app.read().form.submit();
    const joined = app.read().form.submit();
    expect(joined).not.toBe(operation);
    expect(app.read().form.steps.nextStep()).toBe(false);
    expect(app.read().form.steps.canGoNext).toBe(false);
    gate.resolve({ data: row });
    const [first, second] = await Promise.all([operation, joined]);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    Reflect.set(first.data, 'title', 'Outside');
    expect(second.data).toHaveProperty('title', 'First');
    expect(source.create).toHaveBeenCalledTimes(1);
    expect(app.read().form.submitting).toBe(false);
  });

  it('rejects bad edit receipts without losing the draft or retrying the write', async () => {
    const source = provider();
    source.update = vi.fn(async () => ({ data: { ...row, id: 2 } }));
    const success = vi.fn();
    const app = mount(source, { onMutationSuccess: success });
    await app.view.rerender({ action: 'edit', id: 1 });
    await ready(app);
    expect(app.read().form.values).toEqual({ title: 'First', quantity: 1 });
    fill(app);
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    expect(source.update).toHaveBeenCalledTimes(1);
    expect(app.read().form.values['title']).toBe('Edited');
    expect(success).not.toHaveBeenCalled();
  });

  it('routes sanitized server errors back to the appropriate step', async () => {
    const source = provider();
    source.create = vi.fn(async () => { throw { errors: { title: ['PRIVATE_PROVIDER_MESSAGE'] } }; });
    const app = mount(source);
    await ready(app);
    fill(app);
    app.read().form.steps.gotoStep(2);
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'FORM_FAILED' });
    expect(app.read().form.steps.currentStep).toBe(0);
    expect(app.read().form.errors).toHaveProperty('title');
    expect(JSON.stringify(app.read().form.errors)).not.toContain('PRIVATE');
  });

  it('rejects stale reads when the step layout changes while loading', async () => {
    const source = provider();
    const gate = deferred<GetOneResult>();
    source.getOne = vi.fn<DataProvider['getOne']>(async () => ({ data: { ...row, title: 'Current' } }))
      .mockImplementationOnce(() => gate.promise);
    const app = mount(source);
    await app.view.rerender({ action: 'edit', id: 1 });
    await waitFor(() => expect(source.getOne).toHaveBeenCalledTimes(1));
    await app.view.rerender({ steps: [{ title: 'Combined', fields: ['title', 'quantity'] }] });
    await ready(app);
    expect(source.getOne).toHaveBeenCalledTimes(2);
    gate.resolve({ data: { ...row, title: 'Obsolete' } });
    await waitFor(() => expect(app.client.isFetching()).toBe(0));
    expect(app.read().form.values['title']).toBe('Current');
    expect(app.read().form.steps.totalSteps).toBe(1);
  });

  it('keeps a new workflow submission pending when an old submission settles', async () => {
    const source = provider();
    const oldGate = deferred<GetOneResult>();
    const newGate = deferred<GetOneResult>();
    source.create = vi.fn(() => newGate.promise).mockImplementationOnce(() => oldGate.promise);
    const success = vi.fn();
    const app = mount(source, { onMutationSuccess: success });
    await ready(app);
    fill(app);
    const previous = app.read().form.submit().catch((cause: unknown) => cause);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    await app.view.rerender({ steps: steps.slice(0, 2) });
    await ready(app);
    fill(app);
    app.read().form.steps.gotoStep(1);
    const current = app.read().form.submit();
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(2));
    oldGate.reject({ errors: { title: 'PRIVATE_OLD_ERROR' } });
    expect(await previous).toMatchObject({ code: 'FORM_CANCELLED' });
    expect(app.read().form.submitting).toBe(true);
    expect(app.read().form.steps.currentStep).toBe(1);
    expect(app.read().form.errors).toEqual({});
    expect(success).not.toHaveBeenCalled();
    newGate.resolve({ data: row });
    await current;
    expect(success).toHaveBeenCalledTimes(1);
    expect(app.read().form.submitting).toBe(false);
  });

  it('preserves newer edits after a save while keeping the same workflow active', async () => {
    const source = provider();
    const gate = deferred<GetOneResult>();
    source.create = vi.fn(() => gate.promise);
    const app = mount(source, { redirect: 'list' });
    await ready(app);
    fill(app);
    const operation = app.read().form.submit();
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    app.read().form.setFieldValue('title', 'New draft');
    gate.resolve({ data: { ...row, quantity: 3 } });
    await operation;
    expect(app.read().form.values).toEqual({ title: 'New draft', quantity: 3 });
    expect(app.read().form.isDirty).toBe(true);
    expect(app.router.go).not.toHaveBeenCalled();
  });

  it('isolates named providers and callback failures', async () => {
    const first = provider();
    const cms = provider();
    const success = vi.fn(() => { throw new Error('Observer failed'); });
    const app = mount({ default: first, cms }, { onMutationSuccess: success });
    await app.view.rerender({ resources: [{ ...definition, provider: { dataProviderName: 'cms' } }] });
    await ready(app);
    fill(app);
    await expect(app.read().form.submit()).resolves.toMatchObject({ data: { title: 'Edited' } });
    expect(cms.create).toHaveBeenCalledTimes(1);
    expect(first.create).not.toHaveBeenCalled();
    expect(success).toHaveBeenCalledTimes(1);
    expect(app.read().form.error).toBeNull();
  });

  it('validates custom error objects without invoking their getters', async () => {
    const getter = vi.fn(() => 'PRIVATE');
    const app = mount(provider(), {
      validate: () => Object.defineProperty({}, 'title', { enumerable: true, get: getter }),
    });
    await ready(app);
    fill(app);
    expect(app.read().form.steps.nextStep()).toBe(false);
    expect(app.read().form.steps.currentStep).toBe(0);
    expect(getter).not.toHaveBeenCalled();
    expect(app.read().form.error).not.toBeNull();
  });

  it.each(['steps', 'resource', 'provider', 'tenant', 'auth', 'disabled', 'unmount'])(
    'isolates save completion after %s changes', async change => {
      const source = provider();
      const gate = deferred<GetOneResult>();
      source.create = vi.fn(() => gate.promise);
      const success = vi.fn();
      const app = mount(source, { onMutationSuccess: success, redirect: 'list' });
      await ready(app);
      fill(app);
      app.read().form.steps.gotoStep(2);
      const operation = app.read().form.submit().catch((cause: unknown) => cause);
      await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
      if (change === 'steps') await app.view.rerender({ steps: steps.slice(0, 2) });
      if (change === 'resource') await app.view.rerender({ resource: 'other' });
      if (change === 'provider') await app.view.rerender({ provider: provider() });
      if (change === 'tenant') await app.view.rerender({ tenant: 'next' });
      if (change === 'auth') await app.view.rerender({ auth: auth() });
      if (change === 'disabled') await app.view.rerender({ settings: { enabled: false } });
      if (change === 'unmount') app.view.unmount();
      gate.resolve({ data: row });
      expect(await operation).toMatchObject({ code: 'FORM_CANCELLED', details: { writeMayHaveSucceeded: true } });
      expect(success).not.toHaveBeenCalled();
      expect(app.router.go).not.toHaveBeenCalled();
      if (change !== 'unmount') expect(app.read().form.steps.currentStep).toBe(0);
    },
  );
});

describe('step workflow ownership', () => {
  it('resets drafts and navigation to the configured baseline together', async () => {
    const app = mount(provider(), { defaultStep: 1, defaultValues: { title: 'Default', quantity: 1 } });
    await ready(app);
    fill(app);
    expect(app.read().form.steps.gotoStep(2)).toBe(true);
    app.read().form.setFieldError('title', 'Old error');
    app.read().form.reset();
    expect(app.read().form.steps.currentStep).toBe(1);
    expect(app.read().form.values).toEqual({ title: 'Default', quantity: 1 });
    expect(app.read().form.errors).toEqual({});
    expect(app.read().form.isDirty).toBe(false);
  });

  it('keeps invalid workflow errors detached from reflective caller mutation', async () => {
    const app = mount(provider(), { defaultStep: -1 });
    await waitFor(() => expect(app.read().form.error?.code).toBe('INVALID_RESOURCE_INPUT'));
    const first = app.read().form.error;
    Reflect.set(first ?? {}, 'code', 'CORRUPTED');
    Reflect.set(first ?? {}, 'message', 'Changed');
    expect(app.read().form.error).not.toBe(first);
    expect(app.read().form.error).toMatchObject({ code: 'INVALID_RESOURCE_INPUT', message: 'Invalid form steps' });
    const descriptor = Object.getOwnPropertyDescriptor(app.read().form, 'error');
    expect(descriptor?.get?.call(app.read().form)).toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
  });

  it('immediately hides old step state during login and restores the configured default', async () => {
    const app = await mountSession(provider(), auth(), { defaultStep: 1, defaultValues: { title: 'Default', quantity: 1 } });
    fill(app);
    app.read().form.steps.gotoStep(2);
    app.read().form.setFieldError('title', 'Private error');
    const loginGate = deferred<{ success: boolean }>();
    vi.mocked(app.session.login).mockReturnValueOnce(loginGate.promise);
    const login = app.actions().login.mutate({});
    const form = app.read().form;
    expect(form.steps.currentStep).toBe(0);
    expect(form.steps.canGoPrev).toBe(false);
    expect(form.steps.canGoNext).toBe(false);
    expect(form.steps.gotoStep(2)).toBe(false);
    expect(form.values).toEqual({});
    expect(form.errors).toEqual({});
    expect(form.ready).toBe(false);
    expect(Object.getOwnPropertyDescriptor(form.steps, 'currentStep')?.get?.call(form.steps)).toBe(0);
    loginGate.resolve({ success: true });
    await login;
    await ready(app);
    expect(form.steps.currentStep).toBe(1);
    expect(form.values).toEqual({ title: 'Default', quantity: 1 });
    expect(form.isDirty).toBe(false);
  });

  it('waits for the new session edit record before restoring its default step', async () => {
    const app = await mountSession(provider(), auth(), { defaultStep: 1 });
    await app.view.rerender({ action: 'edit', id: 1 });
    await ready(app);
    fill(app);
    app.read().form.steps.gotoStep(2);
    const oldRefetch = app.read().form.query.refetch;
    const read = deferred<GetOneResult>();
    app.source.getOne = vi.fn(() => read.promise);
    await app.actions().login.mutate({});
    await waitFor(() => expect(app.source.getOne).toHaveBeenCalled());
    expect(app.read().form.ready).toBe(false);
    expect(app.read().form.steps.currentStep).toBe(0);
    expect(app.read().form.steps.canGoNext).toBe(false);
    expect(app.read().form.values).toEqual({});
    await expect(oldRefetch()).rejects.toMatchObject({ code: 'FORM_CANCELLED' });
    read.resolve({ data: { ...row, title: 'Current session', quantity: 5 } });
    await ready(app);
    expect(app.read().form.steps.currentStep).toBe(1);
    expect(app.read().form.values).toEqual({ title: 'Current session', quantity: 5 });
  });

  it.each(['reset', 'login', 'navigate'] as const)('does not overwrite a workflow changed by its validator (%s)', async change => {
    const app = await mountSession();
    let login: Promise<unknown> | undefined;
    await app.view.rerender({ settings: { validate: () => {
      if (change === 'reset') app.read().form.reset();
      if (change === 'login') login = app.actions().login.mutate({});
      if (change === 'navigate') app.read().form.steps.gotoStep(0);
      return null;
    } } });
    fill(app);
    expect(app.read().form.steps.gotoStep(2)).toBe(false);
    expect(app.read().form.steps.currentStep).toBe(0);
    if (login) await login;
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it('does not let a rejected submit move the workflow after an explicit reset', async () => {
    const app = mount(provider(), { defaultStep: 2 });
    await ready(app);
    const operation = app.read().form.submit().catch((cause: unknown) => cause);
    app.read().form.reset();
    expect(await operation).toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(app.read().form.steps.currentStep).toBe(2);
    expect(app.read().form.errors).toEqual({});
  });

  it('keeps a newer explicit step selection when an earlier rejection is observed', async () => {
    const app = mount(provider(), { defaultStep: 2 });
    await ready(app);
    const operation = app.read().form.submit().catch((cause: unknown) => cause);
    expect(app.read().form.steps.gotoStep(1)).toBe(true);
    expect(await operation).toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(app.read().form.steps.currentStep).toBe(1);
  });

  it.each(['login', 'logout', 'reset'] as const)('cancels queued step submissions on %s without dispatch', async action => {
    const app = await mountSession();
    fill(app);
    app.read().form.steps.gotoStep(2);
    const first = app.read().form.submit().catch((cause: unknown) => cause);
    const second = app.read().form.submit().catch((cause: unknown) => cause);
    if (action === 'reset') app.read().form.reset();
    if (action === 'login') await app.actions().login.mutate({});
    if (action === 'logout') await app.actions().logout.mutate();
    for (const error of await Promise.all([first, second])) {
      expect(error).toMatchObject({ code: 'FORM_CANCELLED', details: { writeMayHaveSucceeded: false } });
    }
    expect(app.source.create).not.toHaveBeenCalled();
    expect(app.read().form.steps.currentStep).toBe(0);
  });

  it.each(['create', 'edit'] as const)('retires dispatched %s saves and does not refocus old server errors', async action => {
    const source = provider();
    const gate = deferred<GetOneResult>();
    source.create = vi.fn(() => gate.promise);
    source.update = vi.fn(() => gate.promise);
    const app = await mountSession(source);
    await app.view.rerender({ action, ...definedOptions({ id: action === 'edit' ? 1 : undefined }) });
    await ready(app);
    fill(app);
    app.read().form.steps.gotoStep(2);
    const first = app.read().form.submit().catch((cause: unknown) => cause);
    const second = app.read().form.submit().catch((cause: unknown) => cause);
    await waitFor(() => expect(action === 'edit' ? source.update : source.create).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    await ready(app);
    fill(app);
    app.read().form.steps.gotoStep(1);
    gate.reject({ statusCode: 401, errors: { title: 'Private error' } });
    for (const error of await Promise.all([first, second])) {
      expect(error).toMatchObject({ code: 'FORM_CANCELLED', details: { writeMayHaveSucceeded: true } });
      expect(error).not.toHaveProperty('data');
    }
    expect(app.read().form.steps.currentStep).toBe(1);
    expect(app.read().form.errors).toEqual({});
    expect(app.read().form.error).toBeNull();
  });

  it('keeps the base form final check when a completion observer queues a new login', async () => {
    const app = await mountSession();
    let login: Promise<unknown> | undefined;
    await app.view.rerender({ settings: { onMutationSuccess: () => {
      queueMicrotask(() => { login = app.actions().login.mutate({}); });
    } } });
    fill(app);
    await expect(app.read().form.submit()).rejects.toMatchObject({ code: 'FORM_CANCELLED', details: { writeMayHaveSucceeded: true } });
    expect(login).toBeDefined();
    await login;
    expect(app.read().form.steps.currentStep).toBe(0);
  });

  it('lets a current delegated logout finish without resetting its base submission token', async () => {
    const source = provider();
    source.create = vi.fn(async () => { throw new HttpError('Private failure', 401); });
    const session = auth();
    const logout = deferred<{ success: boolean }>();
    session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/expired' }));
    vi.mocked(session.logout).mockReturnValue(logout.promise);
    const app = await mountSession(source, session);
    fill(app);
    app.read().form.steps.gotoStep(2);
    await app.read().form.submit().catch(() => {});
    await waitFor(() => expect(session.logout).toHaveBeenCalledTimes(1));
    expect(app.read().form.steps.currentStep).toBe(0);
    expect(app.read().form.values).toEqual({});
    logout.resolve({ success: true });
    await waitFor(() => expect(app.router.go).toHaveBeenCalledWith(expect.objectContaining({ to: '/expired' })));
    expect(captureAuthSession(session).available).toBe(false);
  });

  it.each(['reset', 'login'] as const)('suppresses old auth instructions when the workflow receives %s', async action => {
    const source = provider();
    source.create = vi.fn(async () => { throw new HttpError('Private failure', 401); });
    const session = auth();
    const instruction = deferred<{ logout: boolean; redirectTo: string }>();
    session.onError = vi.fn(() => instruction.promise);
    const app = await mountSession(source, session);
    fill(app);
    await app.read().form.submit().catch(() => {});
    expect(session.onError).toHaveBeenCalledTimes(1);
    if (action === 'reset') app.read().form.reset();
    else await app.actions().login.mutate({});
    instruction.resolve({ logout: true, redirectTo: '/obsolete' });
    await instruction.promise;
    expect(session.logout).not.toHaveBeenCalled();
    expect(app.router.go).not.toHaveBeenCalledWith(expect.objectContaining({ to: '/obsolete' }));
  });
});

describe('StepsForm consumer', () => {
  async function mountArrayForm(requireRow = false) {
    const draft = Type.Object({ rows: Type.Array(Type.Object({ name: Type.String() })) });
    const contract = defineResource('items', {
      record: Type.Object({ id: Type.Number(), rows: draft.properties.rows }), create: draft, update: Type.Partial(draft),
    });
    const source = provider();
    source.create = vi.fn(async ({ variables }) => ({ data: { id: 10, ...variables } }));
    const app = mount(source);
    await app.view.rerender({
      resource: 'items', showForm: true,
      resources: [{ name: 'items', label: 'Items', contract, fields: [
        { key: 'rows', label: 'Rows', type: 'array', defaultValue: [],
          ...(requireRow ? { validate: (value: unknown) => Array.isArray(value) && value.length > 0 ? null : 'Add a row' } : {}),
          subFields: [{ key: 'name', label: 'Item name', type: 'text' }] },
      ] }],
      steps: [{ title: 'Items', fields: ['rows'] }, { title: 'Review', fields: [] }],
    });
    await app.view.findByRole('button', { name: /^add$/i });
    return { ...app, source };
  }

  it('focuses the first actionable compound field when a step cannot advance', async () => {
    const app = await mountArrayForm(true);
    const add = app.view.getByRole('button', { name: /^add$/i });
    await fireEvent.click(app.view.getByRole('button', { name: /^next$/i }));
    await waitFor(() => expect(document.activeElement).toBe(add));
    expect(app.source.create).not.toHaveBeenCalled();
  });

  async function mountFocusForm(focusFields: ResourceDefinition['fields'], order = focusFields.map(field => field.key)) {
    const shape = {
      first: Type.Optional(Type.Union([
        Type.String(), Type.Array(Type.String()), Type.Array(Type.Object({ name: Type.String() })),
      ])),
      second: Type.Optional(Type.String()),
      rows: Type.Optional(Type.Array(Type.Object({ second: Type.String() }))),
    };
    const draft = Type.Object(shape);
    const app = mount();
    await app.view.rerender({
      showForm: true, resource: 'focus',
      resources: [{
        name: 'focus', label: 'Focus', fields: focusFields,
        contract: defineResource('focus', {
          record: Type.Object({ id: Type.Number(), ...shape }), create: draft, update: Type.Partial(draft),
        }),
      }],
      steps: [{ title: 'Fields', fields: order }, { title: 'Review', fields: [] }],
    });
    await app.view.findByRole('button', { name: /^next$/i });
    return app;
  }

  function invalidFocusField(type: ResourceDefinition['fields'][number]['type'], key = 'first'): ResourceDefinition['fields'][number] {
    return {
      key, label: key, type, defaultValue: ['array', 'transfer', 'multiselect', 'images', 'tags', 'cascader'].includes(type) ? [] : 'invalid',
      validate: () => 'Choose a value',
      options: [{ label: 'Leaf', value: 'leaf' }],
      treeOptions: [{ label: 'Leaf', value: 'leaf' }],
      cascaderOptions: [{ label: 'Leaf', value: 'leaf' }],
      transferData: [{ key: 'leaf', title: 'Leaf' }],
      subFields: [{ key: 'name', label: 'Nested name', type: 'text' }],
    };
  }

  it.each(['array', 'transfer', 'tree-select', 'treeselect', 'cascader', 'multiselect', 'images', 'tags'] as const)(
    'focuses an actionable %s control before a later scalar error', async type => {
      const app = await mountFocusForm([invalidFocusField(type), invalidFocusField('text', 'second')]);
      await fireEvent.click(app.view.getByRole('button', { name: /^next$/i }));
      const first = app.view.container.querySelector('[data-svadmin-field-key="first"]');
      await waitFor(() => expect(first?.contains(document.activeElement)).toBe(true));
      expect(document.activeElement).not.toBe(first);
    },
  );

  it('uses the displayed step order instead of resource field order for first-error focus', async () => {
    const app = await mountFocusForm(
      [invalidFocusField('text', 'second'), invalidFocusField('array')], ['first', 'second'],
    );
    await fireEvent.click(app.view.getByRole('button', { name: /^next$/i }));
    await waitFor(() => expect(document.activeElement).toBe(app.view.getByRole('button', { name: /^add$/i })));
  });

  it('does not treat a valid nested child as the top-level field with the same key', async () => {
    const app = await mountFocusForm([
      { key: 'rows', label: 'Rows', type: 'array', defaultValue: [{ second: 'Nested' }],
        subFields: [{ key: 'second', label: 'Nested second', type: 'text' }] },
      invalidFocusField('text', 'second'),
    ]);
    await fireEvent.click(app.view.getByRole('button', { name: /^next$/i }));
    await waitFor(() => expect(document.activeElement).toBe(app.view.getByRole('textbox', { name: 'second' })));
  });

  it('skips unavailable compound controls and focuses the next invalid field', async () => {
    const app = await mountFocusForm([invalidFocusField('array'), invalidFocusField('text', 'second')]);
    const first = app.view.container.querySelector('[data-svadmin-field-key="first"]');
    first?.setAttribute('aria-disabled', 'true');
    await fireEvent.click(app.view.getByRole('button', { name: /^next$/i }));
    await waitFor(() => expect(document.activeElement).toBe(app.view.getByRole('textbox', { name: 'second' })));
  });

  it.each(['body', 'first-legend', 'second-legend', 'nested-first-legend'] as const)(
    'honors disabled fieldset boundaries for a compound control in %s', async placement => {
    const app = await mountFocusForm([invalidFocusField('transfer'), invalidFocusField('text', 'second')]);
    const first = app.view.container.querySelector('[data-svadmin-field-key="first"]');
    if (!(first instanceof HTMLElement)) throw new Error('Missing first field');
    const rowControl = first.querySelector<HTMLElement>('[role="button"][tabindex]');
    if (!rowControl) throw new Error('Missing transfer row');
    expect(rowControl.matches(':disabled')).toBe(false);
    const fieldset = document.createElement('fieldset');
    fieldset.disabled = true;
    fieldset.append(...first.childNodes);
    const legend = document.createElement('legend');
    fieldset.prepend(legend);
    if (placement === 'first-legend' || placement === 'nested-first-legend') legend.append(rowControl);
    if (placement === 'second-legend') {
      const secondLegend = document.createElement('legend');
      secondLegend.append(rowControl);
      fieldset.append(secondLegend);
    }
    if (placement === 'nested-first-legend') {
      const outer = document.createElement('fieldset');
      outer.disabled = true;
      outer.append(fieldset);
      first.append(outer);
    } else {
      first.append(fieldset);
    }
    await fireEvent.click(app.view.getByRole('button', { name: /^next$/i }));
    const expected = placement === 'first-legend' ? rowControl : app.view.getByRole('textbox', { name: 'second' });
    await waitFor(() => expect(document.activeElement).toBe(expected));
  });

  it('isolates error IDs, described-by references and focus for two forms on the same resource', async () => {
    const apps = [mount(provider(), {}, true), mount(provider(), {}, true)];
    const ids: string[] = [];
    for (const app of apps) {
      const view = within(app.view.container);
      const title = await view.findByRole('textbox', { name: /^Title/ });
      await fireEvent.click(view.getByRole('button', { name: /^next$/i }));
      await waitFor(() => expect(document.activeElement).toBe(title));
      const errorId = title.getAttribute('aria-describedby');
      if (!errorId) throw new Error('Missing field error reference');
      ids.push(errorId);
      expect(app.view.container.contains(document.getElementById(errorId))).toBe(true);
      expect(document.getElementById(errorId)?.getAttribute('role')).toBe('alert');
    }
    expect(new Set(ids).size).toBe(2);
  });

  it('returns to an array field rejected by the server and focuses its add action', async () => {
    const app = await mountArrayForm();
    vi.mocked(app.source.create).mockRejectedValueOnce({ errors: { rows: 'PRIVATE_ROWS_ERROR' } });
    await fireEvent.click(app.view.getByRole('button', { name: /^next$/i }));
    await fireEvent.click(await app.view.findByRole('button', { name: /^save$/i }));
    const add = await app.view.findByRole('button', { name: /^add$/i });
    await waitFor(() => expect(document.activeElement).toBe(add));
    expect(app.view.container.textContent).not.toContain('PRIVATE_ROWS_ERROR');
    expect(app.source.create).toHaveBeenCalledTimes(1);
  });

  it('keeps array input identity through typing and submits rows after returning from review', async () => {
    const app = await mountArrayForm();
    await fireEvent.click(app.view.getByRole('button', { name: /^add$/i }));
    const input = await app.view.findByRole('textbox', { name: 'Item name' });
    input.focus();
    for (const value of ['A', 'AB', 'ABC']) {
      await fireEvent.input(input, { target: { value } });
      expect(app.view.getByRole('textbox', { name: 'Item name' })).toBe(input);
      expect(document.activeElement).toBe(input);
      expect(input).toHaveProperty('value', value);
    }
    await fireEvent.click(app.view.getByRole('button', { name: /^next$/i }));
    await fireEvent.click(await app.view.findByRole('button', { name: /^back$/i }));
    expect(await app.view.findByRole('textbox', { name: 'Item name' })).toHaveProperty('value', 'ABC');
    await fireEvent.click(app.view.getByRole('button', { name: /^next$/i }));
    await fireEvent.click(await app.view.findByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(app.source.create).toHaveBeenCalledTimes(1));
    expect(app.source.create).toHaveBeenCalledWith(expect.objectContaining({ variables: { rows: [{ name: 'ABC' }] } }));
  });

  it.each(['tenant', 'provider'] as const)('discards accepted array identity after changing %s', async change => {
    const app = await mountArrayForm();
    await fireEvent.click(app.view.getByRole('button', { name: /^add$/i }));
    const oldInput = await app.view.findByRole('textbox', { name: 'Item name' });
    await fireEvent.input(oldInput, { target: { value: 'Private draft' } });
    const replacement = provider();
    replacement.create = vi.fn(async ({ variables }) => ({ data: { id: 10, ...variables } }));
    await app.view.rerender(change === 'tenant' ? { tenant: 'second' } : { provider: replacement });
    await waitFor(() => expect(app.view.queryByRole('textbox', { name: 'Item name' })).toBeNull());
    expect(oldInput.isConnected).toBe(false);
    await fireEvent.click(app.view.getByRole('button', { name: /^add$/i }));
    await fireEvent.input(await app.view.findByRole('textbox', { name: 'Item name' }), { target: { value: 'Current' } });
    await fireEvent.click(app.view.getByRole('button', { name: /^next$/i }));
    await fireEvent.click(await app.view.findByRole('button', { name: /^save$/i }));
    const active = change === 'tenant' ? app.source : replacement;
    await waitFor(() => expect(active.create).toHaveBeenCalledTimes(1));
    expect(active.create).toHaveBeenCalledWith(expect.objectContaining({ variables: { rows: [{ name: 'Current' }] } }));
    if (change === 'provider') expect(app.source.create).not.toHaveBeenCalled();
  });

  it('lets the UI own error delegate complete logout after the workflow is hidden', async () => {
    const source = provider();
    source.create = vi.fn(async () => { throw new HttpError('Private failure', 401); });
    const session = auth();
    const logout = deferred<{ success: boolean }>();
    session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/expired' }));
    vi.mocked(session.logout).mockReturnValue(logout.promise);
    const app = await mountSession(source, session, {}, true);
    await fireEvent.input(await app.view.findByRole('textbox', { name: /^Title/ }), { target: { value: 'Submitted' } });
    await fireEvent.click(app.view.getByRole('button', { name: /Review/ }));
    await fireEvent.click(await app.view.findByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(session.logout).toHaveBeenCalledTimes(1));
    expect(app.view.queryByRole('button', { name: /^save$/i })).toBeNull();
    expect(app.view.queryByRole('textbox', { name: /^Title/ })).toBeNull();
    logout.resolve({ success: true });
    await waitFor(() => expect(app.router.go).toHaveBeenCalledWith(expect.objectContaining({ to: '/expired' })));
    expect(source.create).toHaveBeenCalledTimes(1);
  });

  it('retires the unsaved dialog across same-provider login and accepts fresh workflow edits', async () => {
    const app = await mountSession(provider(), auth(), {}, true);
    await fireEvent.input(await app.view.findByRole('textbox', { name: /^Title/ }), { target: { value: 'Private' } });
    await fireEvent.click(app.view.getByRole('button', { name: /^cancel$/i }));
    const dialog = await app.view.findByRole('alertdialog');
    await app.actions().login.mutate({});
    await ready(app);
    await waitFor(() => expect(app.view.queryByRole('alertdialog')).toBeNull());
    expect(dialog.isConnected).toBe(false);
    expect(app.view.getByRole('textbox', { name: /^Title/ })).toHaveProperty('value', '');
    expect(app.router.go).not.toHaveBeenCalledWith(expect.objectContaining({ to: '/posts' }));
    await fireEvent.input(app.view.getByRole('textbox', { name: /^Title/ }), { target: { value: 'Current' } });
    await fireEvent.click(app.view.getByRole('button', { name: /Review/ }));
    await fireEvent.click(await app.view.findByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(app.source.create).toHaveBeenCalledTimes(1));
    expect(app.source.create).toHaveBeenCalledWith(expect.objectContaining({ variables: expect.objectContaining({ title: 'Current' }) }));
  });

  it('does not surface an old save failure or move focus in a restored workflow', async () => {
    const source = provider();
    const gate = deferred<GetOneResult>();
    source.create = vi.fn(() => gate.promise);
    const success = vi.fn();
    const app = await mountSession(source, auth(), {}, true);
    await app.view.rerender({ onSuccess: success });
    await fireEvent.input(await app.view.findByRole('textbox', { name: /^Title/ }), { target: { value: 'Submitted' } });
    await fireEvent.click(app.view.getByRole('button', { name: /Review/ }));
    await fireEvent.click(await app.view.findByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    await ready(app);
    const currentTitle = await app.view.findByRole('textbox', { name: /^Title/ });
    await fireEvent.input(currentTitle, { target: { value: 'New workflow' } });
    currentTitle.focus();
    gate.reject({ errors: { quantity: 'Private error' } });
    await gate.promise.catch(() => {});
    await Promise.resolve();
    expect(app.view.queryByRole('alert')).toBeNull();
    expect(document.activeElement).toBe(currentTitle);
    expect(currentTitle).toHaveProperty('value', 'New workflow');
    expect(success).not.toHaveBeenCalled();
  });

  it('can confirm a current unsaved cancellation without being cancelled by its own dialog state', async () => {
    const app = await mountSession(provider(), auth(), {}, true);
    await fireEvent.input(await app.view.findByRole('textbox', { name: /^Title/ }), { target: { value: 'Draft' } });
    await fireEvent.click(app.view.getByRole('button', { name: /^cancel$/i }));
    await app.view.findByRole('alertdialog');
    await fireEvent.click(app.view.getByRole('button', { name: /^confirm$/i }));
    await waitFor(() => expect(app.router.go).toHaveBeenCalledWith(expect.objectContaining({ to: '/posts' })));
  });

  it('shows schema errors and focuses the first invalid field instead of skipping ahead', async () => {
    const source = provider();
    const app = mount(source, {}, true);
    const title = await app.view.findByRole('textbox', { name: /^Title/ });
    await fireEvent.click(app.view.getByRole('button', { name: /Review/ }));
    await waitFor(() => expect(title.getAttribute('aria-invalid')).toBe('true'));
    const errorId = title.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();
    expect(errorId && app.view.container.contains(document.getElementById(errorId))).toBe(true);
    await waitFor(() => expect(document.activeElement).toBe(title));
    expect(source.create).not.toHaveBeenCalled();
    await fireEvent.input(title, { target: { value: 'Ready' } });
    await fireEvent.click(app.view.getByRole('button', { name: /^next$/i }));
    expect(await app.view.findByRole('spinbutton', { name: /^Quantity/ })).toBeDefined();
  });

  it('saves the full checked payload and calls success before navigation', async () => {
    const source = provider();
    const app = mount(source, {}, true);
    const events: string[] = [];
    await app.view.rerender({ onSuccess: () => { events.push('success'); },
      router: { ...app.router, go: () => { events.push('navigate'); } } });
    await fireEvent.input(await app.view.findByRole('textbox', { name: /^Title/ }), { target: { value: 'Created' } });
    await fireEvent.click(app.view.getByRole('button', { name: /Review/ }));
    await fireEvent.click(await app.view.findByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(events).toEqual(['success', 'navigate']));
    expect(source.create).toHaveBeenCalledWith(expect.objectContaining({ variables: { title: 'Created', quantity: 0 } }));
  });

  it('displays a failed save and permits only explicit retry', async () => {
    const source = provider();
    source.create = vi.fn(async () => ({ data: row })).mockRejectedValueOnce(new Error('PRIVATE'));
    const app = mount(source, {}, true);
    const success = vi.fn();
    await app.view.rerender({ onSuccess: success });
    await fireEvent.input(await app.view.findByRole('textbox', { name: /^Title/ }), { target: { value: 'Kept' } });
    await fireEvent.click(app.view.getByRole('button', { name: /Review/ }));
    await fireEvent.click(await app.view.findByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(app.view.queryByText('Operation failed')).not.toBeNull());
    expect(source.create).toHaveBeenCalledTimes(1);
    expect(app.view.container.textContent).not.toContain('PRIVATE');
    expect(success).not.toHaveBeenCalled();
    await waitFor(() => expect(app.view.getByRole('button', { name: /^save$/i }).hasAttribute('disabled')).toBe(false));
    await fireEvent.click(app.view.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
  });

  it('requires permission and rejects fields hidden or absent from the writable schema', async () => {
    const app = mount(provider(), {}, true);
    await app.view.rerender({ permission: { can: async () => ({ can: false }) } });
    await waitFor(() => expect(app.view.queryByRole('textbox', { name: /^Title/ })).toBeNull());
    await app.view.rerender({ permission: { can: async () => ({ can: true }) } });
    expect(await app.view.findByRole('textbox', { name: /^Title/ })).toBeDefined();
    await app.view.rerender({ steps: [{ title: 'Server', fields: ['serverOnly'] }] });
    expect(app.view.queryByRole('textbox', { name: /Server field/ })).toBeNull();
    expect(app.view.queryByRole('button', { name: /^save$/i })).toBeNull();
  });

  it('retries a failed record read without rendering unchecked values', async () => {
    const source = provider();
    source.getOne = vi.fn<DataProvider['getOne']>(async () => ({ data: row })).mockRejectedValueOnce(new Error('PRIVATE'));
    const app = mount(source, {}, true);
    await app.view.rerender({ action: 'edit', id: 1 });
    const retry = await app.view.findByRole('button', { name: /^retry$/i });
    expect(app.view.queryByRole('textbox', { name: /^Title/ })).toBeNull();
    await fireEvent.click(retry);
    const title = await app.view.findByRole('textbox', { name: /^Title/ });
    expect(title instanceof HTMLInputElement && title.value).toBe('First');
    expect(source.getOne).toHaveBeenCalledTimes(2);
  });

  it('confirms unsaved cancellation and clears the dialog after changing resource', async () => {
    const app = mount(provider(), {}, true);
    await fireEvent.input(await app.view.findByRole('textbox', { name: /^Title/ }), { target: { value: 'Draft' } });
    await fireEvent.click(app.view.getByRole('button', { name: /^cancel$/i }));
    expect(await app.view.findByRole('alertdialog')).toBeDefined();
    expect(app.router.go).not.toHaveBeenCalled();
    await app.view.rerender({ resource: 'other' });
    await waitFor(() => expect(app.view.queryByRole('alertdialog')).toBeNull());
    expect(app.router.go).not.toHaveBeenCalled();
  });

  it('suppresses UI save success when permission is revoked before settlement', async () => {
    const source = provider();
    const gate = deferred<GetOneResult>();
    source.create = vi.fn(() => gate.promise);
    const app = mount(source, {}, true);
    const success = vi.fn();
    await app.view.rerender({ onSuccess: success });
    await fireEvent.input(await app.view.findByRole('textbox', { name: /^Title/ }), { target: { value: 'Submitted' } });
    await fireEvent.click(app.view.getByRole('button', { name: /Review/ }));
    await fireEvent.click(await app.view.findByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    await app.view.rerender({ permission: { can: async () => ({ can: false }) } });
    await waitFor(() => expect(app.view.queryByRole('button', { name: /^save$/i })).toBeNull());
    const refresh = vi.spyOn(app.client, 'invalidateQueries');
    gate.resolve({ data: row });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    await Promise.all(refresh.mock.results.map(result => result.value));
    expect(success).not.toHaveBeenCalled();
    expect(app.router.go).not.toHaveBeenCalled();
  });

  it('returns to and focuses a server-rejected field from the final review step', async () => {
    const source = provider();
    source.create = vi.fn(async () => { throw { errors: { title: 'PRIVATE_VALIDATION_MESSAGE' } }; });
    const app = mount(source, {}, true);
    await fireEvent.input(await app.view.findByRole('textbox', { name: /^Title/ }), { target: { value: 'Submitted' } });
    await fireEvent.click(app.view.getByRole('button', { name: /Review/ }));
    await fireEvent.click(await app.view.findByRole('button', { name: /^save$/i }));
    const title = await app.view.findByRole('textbox', { name: /^Title/ });
    await waitFor(() => expect(document.activeElement).toBe(title));
    expect(title.getAttribute('aria-invalid')).toBe('true');
    expect(app.view.container.textContent).not.toContain('PRIVATE');
  });
});
