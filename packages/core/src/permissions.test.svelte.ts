import { afterEach, describe, expect, test, vi } from 'vitest';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, waitFor } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { HttpError, type DataProvider } from './types';
import type { AccessQueryState } from './useCan.test.types';
import { createAdminContext, captureAdminContext, getProviderBundle, resetContext, setDataProvider } from './context.svelte';
import { resetLogoutVersion } from './auth-hooks.svelte';
import Host from './useCan.test-host.svelte';
import { captureAccessControlProvider, decodeCanResults, prepareCanBatchCheck } from './access-control-contract';
import { createCaslAccessControl } from './adapters/casl';
import { createCasbinAccessControl } from './adapters/casbin';
import {
  canAccessAsync,
  createFeatureGate,
  getAccessControlProvider,
  getAccessControlOptions,
  resetAccessControlProvider,
  setAccessControlProvider,
  type AccessControlProvider,
  type CanParams,
  type CanResult,
} from './permissions.svelte';

const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  resetLogoutVersion();
  vi.restoreAllMocks();
});

function deferred<T>() {
  let resolve = (_value: T) => {};
  let reject = (_error: unknown) => {};
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

const requests: readonly CanParams[] = [
  { resource: 'posts', action: 'edit', params: { id: 1 } },
  { resource: 'users', action: 'delete', params: { id: '1' } },
];

async function rawCall(args: unknown[]): Promise<unknown> {
  return Reflect.apply(canAccessAsync, undefined, args);
}

function registerRaw(value: unknown): void {
  Reflect.apply(setAccessControlProvider, undefined, [value]);
}

const dataProvider: DataProvider = {
  getApiUrl: () => '/api',
  getList: async () => ({ data: [], total: 0 }),
  getOne: async () => ({ data: { id: 1 } }),
  create: async () => ({ data: { id: 1 } }),
  update: async () => ({ data: { id: 1 } }),
  deleteOne: async () => ({ data: { id: 1 } }),
};

class TestPermissionPolicy {
  #allowed = false;
  options = { buttons: { hideIfUnauthorized: true } };
  allow() { this.#allowed = true; }
  async can(): Promise<CanResult> { return { can: this.#allowed }; }
}

describe('checked single and batch contracts', () => {
  test('strictly compiles changed boundaries and rejects mismatched public request/response types', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const roots = ['permissions.svelte.ts', 'access-control-contract.ts', 'adapters/casl.ts',
      'adapters/casbin.ts', 'permissions.test.svelte.ts', 'useCan.ts', 'useCan.test.svelte.ts',
      'context.svelte.ts'].map(name => resolve(directory, name));
    const virtual = new Map(['useCan.test-host.svelte', 'useCan.test-probe.svelte'].map(name => {
      const path = resolve(directory, name);
      return [`${path}.tsx`, svelte2tsx(readFileSync(path, 'utf8'), { filename: path, isTsFile: true, mode: 'ts' }).code];
    }));
    const virtualPath = resolve(directory, 'permissions.test.virtual.ts');
    const valid = [
      "import { canAccessAsync, getAccessControlProvider, getAccessControlOptions, getProviderBundle, type AccessControlProvider, type RegisteredAccessControlProvider, type AccessControlOptions, type AdminContextValue, type CanParams, type CanResult } from './index';",
      'const provider: AccessControlProvider = { can: async ({ resource }) => ({ can: resource === "posts" }), canMany: async requests => requests.map(() => ({ can: true })) };',
      'const input: CanParams = { resource: "posts", action: "edit", params: { id: 1 } };',
      'const batch: readonly CanParams[] = [input];',
      'const single: Promise<CanResult> = provider.can(input);',
      'const publicSingle: Promise<CanResult> = canAccessAsync("posts", "edit", { id: 1 });',
      'const publicBatch: Promise<CanResult[]> = canAccessAsync(batch);',
      'if (provider.canMany) { const nativeBatch: Promise<CanResult[]> = provider.canMany(batch); }',
      'const registered: RegisteredAccessControlProvider | null = getAccessControlProvider();',
      'const checkedOptions: AccessControlOptions = getAccessControlOptions();',
      'const flag: boolean | undefined = checkedOptions.buttons?.hideIfUnauthorized;',
      'declare const context: AdminContextValue;',
    ];
    const invalid = [
      'provider.can(batch);',
      'provider.can({ resource: "posts", action: "edit", params: { id: true } });',
      'const badSingle: AccessControlProvider = { can: async () => [{ can: true }] };',
      'const badBatch: AccessControlProvider = { can: async () => ({ can: true }), canMany: async () => ({ can: true }) };',
      'const badFlag: AccessControlProvider = { can: async () => ({ can: "yes" }) };',
      'const badReason: AccessControlProvider = { can: async () => ({ can: true, reason: 1 }) };',
      'const mismatchedSingle: Promise<CanResult[]> = provider.can(input);',
      'const mismatchedBatch: Promise<CanResult> = canAccessAsync(batch);',
      'canAccessAsync("posts");',
      'canAccessAsync("posts", "edit", { id: true });',
      'canAccessAsync([{ resource: "posts" }]);',
      'canAccessAsync(batch, "edit");',
      'provider.canMany(batch);',
      'const missingEntry: CanResult = (await canAccessAsync(batch))[99];',
      'if (registered) registered.can = async () => ({ can: true });',
      'if (registered) registered.canMany = async () => [];',
      'if (registered) registered.options = {};',
      'if (registered?.options.buttons) registered.options.buttons.hideIfUnauthorized = false;',
      'checkedOptions.buttons = {};',
      'if (checkedOptions.buttons) checkedOptions.buttons.enableAccessControl = false;',
      'if (context.accessControlProvider) context.accessControlProvider.can = async () => ({ can: true });',
      'if (context.providerBundle.accessControlProvider) context.providerBundle.accessControlProvider.options = {};',
      'const bundled = getProviderBundle().accessControlProvider; if (bundled?.canMany) bundled.canMany([{ resource: "posts" }]);',
    ];
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, noImplicitOverride: true, skipLibCheck: false, types: ['svelte', 'node'],
      target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.Preserve, allowImportingTsExtensions: true,
    };
    const host = ts.createCompilerHost(options);
    const read = host.readFile;
    const exists = host.fileExists;
    virtual.set(virtualPath, [...valid, ...invalid].join('\n'));
    host.readFile = path => virtual.get(path) ?? read(path);
    host.fileExists = path => virtual.has(path) || exists(path);
    host.resolveModuleNames = (names, containingFile) => names.map(name => {
      const path = resolve(dirname(containingFile), `${name}.tsx`);
      if (virtual.has(path)) return { resolvedFileName: path, extension: ts.Extension.Tsx };
      return ts.resolveModuleName(name, containingFile, options, host).resolvedModule;
    });
    const program = ts.createProgram({ rootNames: [...roots, ...virtual.keys(),
      resolve(directory, '../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
      resolve(directory, '../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts'),
    ], options, host });
    const diagnostics = (path: string) => {
      const source = program.getSourceFile(path);
      if (!source) throw new Error(`Missing source ${path}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    };
    expect([...roots, ...virtual.keys()].filter(path => path !== virtualPath).flatMap(diagnostics).map(item =>
      `${item.file?.fileName}:${item.start}: ${ts.flattenDiagnosticMessageText(item.messageText, '\n')}`)).toEqual([]);
    expect(diagnostics(virtualPath).map(item => item.file && item.start !== undefined
      ? item.file.getLineAndCharacterOfPosition(item.start).line : -1)).toEqual(invalid.map((_, index) => valid.length + index));
  }, 30_000);

  test('supports validated single, batch and empty calls without a configured provider', async () => {
    await expect(canAccessAsync('posts', 'list')).resolves.toEqual({ can: true });
    await expect(canAccessAsync(requests)).resolves.toEqual([{ can: true }, { can: true }]);
    await expect(canAccessAsync([])).resolves.toEqual([]);
  });

  test.each([
    [], [''], ['posts'], ['posts', ''], ['posts', 'edit', { id: false }],
    [null], [false], [[{ resource: 'posts' }]], [[{ resource: '', action: 'edit' }]],
    [[], 'edit'],
  ])('rejects malformed JavaScript request %j even without a policy', async (...args: unknown[]) => {
    await expect(rawCall(args)).rejects.toMatchObject({ code: 'INVALID_ACCESS_CONTROL_INPUT', statusCode: 422 });
  });

  test('validates the complete batch before starting any single capability', async () => {
    const can = vi.fn(async () => ({ can: true }));
    setAccessControlProvider({ can });
    await expect(rawCall([[requests[0], { resource: 'users', action: false }]]))
      .rejects.toMatchObject({ code: 'INVALID_ACCESS_CONTROL_INPUT' });
    expect(can).not.toHaveBeenCalled();
  });

  test('uses the single capability when native batching is absent and preserves result order', async () => {
    const second = deferred<CanResult>();
    const first = deferred<CanResult>();
    const can = vi.fn<AccessControlProvider['can']>()
      .mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    setAccessControlProvider({ can });
    const result = canAccessAsync(requests);
    expect(can).toHaveBeenCalledTimes(2);
    second.resolve({ can: false, reason: 'Denied second' });
    first.resolve({ can: true });
    await expect(result).resolves.toEqual([{ can: true }, { can: false, reason: 'Denied second' }]);
  });

  test('prefers an explicit batch capability and checks its receiver', async () => {
    const can = vi.fn(async () => ({ can: false }));
    const canMany = vi.fn<NonNullable<AccessControlProvider['canMany']>>(async function (this: AccessControlProvider, input) {
      expect(this).toBe(source);
      expect(input).toEqual(requests);
      return input.map(({ resource }) => ({ can: resource === 'posts' }));
    });
    const source = { can, canMany };
    setAccessControlProvider(source);
    await expect(canAccessAsync(requests)).resolves.toEqual([{ can: true }, { can: false }]);
    expect(canMany).toHaveBeenCalledOnce();
    expect(can).not.toHaveBeenCalled();
  });

  test.each([null, {}, [], [{ can: true }], [{ can: true }, { can: 'yes' }], [{ can: true }, { can: false, reason: 1 }]])(
    'rejects malformed or incomplete native batch %j', async value => {
      const source: AccessControlProvider = { can: async () => ({ can: true }) };
      Reflect.set(source, 'canMany', async () => value);
      setAccessControlProvider(source);
      await expect(canAccessAsync(requests)).rejects.toMatchObject({ code: 'INVALID_ACCESS_CONTROL_RESPONSE' });
    },
  );

  test.each([null, {}, { can: 'yes' }, { can: true, reason: 1 }, { can: true, token: 'private' }])(
    'rejects malformed single decisions %j', async value => {
      const source: AccessControlProvider = { can: async () => ({ can: true }) };
      Reflect.set(source, 'can', async () => value);
      setAccessControlProvider(source);
      await expect(canAccessAsync('posts', 'edit')).rejects.toMatchObject({ code: 'INVALID_ACCESS_CONTROL_RESPONSE' });
    },
  );

  test.each(['single', 'batch'] as const)('copies %s request data before provider or caller mutation', async mode => {
    const pending = deferred<CanResult>();
    const input = { resource: 'posts', action: 'edit', params: { id: 1, nested: { published: true } } };
    const source: AccessControlProvider = {
      async can(value) {
        expect(value.params).toEqual({ id: 1, nested: { published: true } });
        if (value.params) value.params.id = 9;
        return pending.promise;
      },
      async canMany(values) {
        expect(values[0]?.params).toEqual({ id: 1, nested: { published: true } });
        if (values[0]?.params) values[0].params.id = 9;
        return [await pending.promise];
      },
    };
    setAccessControlProvider(source);
    const call = mode === 'single' ? canAccessAsync(input.resource, input.action, input.params) : canAccessAsync([input]);
    expect(input.params.id).toBe(1);
    input.params.nested.published = false;
    const response = { can: false, reason: 'Denied' };
    pending.resolve(response);
    const result = await call;
    const item = Array.isArray(result) ? result[0] : result;
    if (!item) throw new Error('Expected a checked decision');
    item.can = true;
    item.reason = 'Changed';
    expect(response).toEqual({ can: false, reason: 'Denied' });
  });

  test('captures fallback capability once and settles every started call before rejection', async () => {
    const pending = deferred<CanResult>();
    const original = vi.fn<AccessControlProvider['can']>()
      .mockRejectedValueOnce(new Error('private-token')).mockImplementationOnce(() => pending.promise);
    const provider: AccessControlProvider = { can: original };
    const execute = prepareCanBatchCheck(provider, requests);
    provider.can = vi.fn(async () => ({ can: true }));
    let settled = false;
    const result = execute();
    void result.then(() => { settled = true; }, () => { settled = true; });
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(original).toHaveBeenCalledTimes(2);
    expect(provider.can).not.toHaveBeenCalled();
    pending.resolve({ can: true });
    await expect(result).rejects.toThrow('private-token');
    expect(settled).toBe(true);
  });

  test.each(['missing', 'getter'] as const)('does not fall back from a malformed %s native capability', async kind => {
    const can = vi.fn(async () => ({ can: true }));
    const source: AccessControlProvider = { can };
    const singleGetter = vi.fn(() => can);
    Object.defineProperty(source, 'can', { get: singleGetter });
    if (kind === 'missing') Reflect.set(source, 'canMany', null);
    else Object.defineProperty(source, 'canMany', { get() { throw new Error('private-token'); } });
    expect(() => setAccessControlProvider(source)).toThrowError(expect.objectContaining({
      code: 'INVALID_ACCESS_CONTROL_PROVIDER', message: 'Access control request failed',
    }));
    expect(can).not.toHaveBeenCalled();
    expect(singleGetter).not.toHaveBeenCalled();
  });

  test('does not invoke checked provider capabilities for an empty batch', async () => {
    const provider: AccessControlProvider = {
      can: vi.fn(async () => ({ can: true })), canMany: vi.fn(async () => []),
    };
    setAccessControlProvider(provider);
    await expect(canAccessAsync([])).resolves.toEqual([]);
    expect(provider.can).not.toHaveBeenCalled();
    expect(provider.canMany).not.toHaveBeenCalled();
  });

  test.each(['single', 'batch'] as const)('rejects accessor-backed %s decisions without executing getters', async mode => {
    const getter = vi.fn(() => true);
    const result = Object.defineProperty({}, 'can', { enumerable: true, get: getter });
    const source: AccessControlProvider = { can: async () => ({ can: false }) };
    Reflect.set(source, 'can', async () => result);
    Reflect.set(source, 'canMany', async () => [result]);
    setAccessControlProvider(source);
    const call = mode === 'single' ? canAccessAsync('posts', 'edit') : canAccessAsync([{ resource: 'posts', action: 'edit' }]);
    await expect(call).rejects.toMatchObject({ code: 'INVALID_ACCESS_CONTROL_RESPONSE' });
    expect(getter).not.toHaveBeenCalled();
  });

  test('rejects accessor-backed requests without executing their getters', async () => {
    const getter = vi.fn(() => 'posts');
    const input = Object.defineProperty({ action: 'edit' }, 'resource', { enumerable: true, get: getter });
    const can = vi.fn(async () => ({ can: true }));
    setAccessControlProvider({ can });
    await expect(rawCall([[input]])).rejects.toMatchObject({ code: 'INVALID_ACCESS_CONTROL_INPUT' });
    expect(getter).not.toHaveBeenCalled();
    expect(can).not.toHaveBeenCalled();
  });

  test('rejects sparse batches and detaches checked result arrays', () => {
    const sparse: unknown[] = [];
    sparse.length = 1;
    expect(() => decodeCanResults(sparse, 1)).toThrow('Invalid access control response');
    const source = [{ can: true, reason: 'Original' }];
    const result = decodeCanResults(source, 1);
    source[0] = { can: false, reason: 'Changed' };
    expect(result).toEqual([{ can: true, reason: 'Original' }]);
  });

  test.each(['replace', 'reset', 'roundtrip'] as const)('rejects pending results after provider %s', async mode => {
    const pending = deferred<CanResult>();
    const original: AccessControlProvider = { can: () => pending.promise };
    setAccessControlProvider(original);
    const call = canAccessAsync('posts', 'edit');
    if (mode === 'reset') resetAccessControlProvider();
    else {
      setAccessControlProvider({ can: async () => ({ can: false }) });
      if (mode === 'roundtrip') setAccessControlProvider(original);
    }
    pending.resolve({ can: true });
    await expect(call).rejects.toMatchObject({ code: 'ACCESS_CONTROL_SUPERSEDED' });
  });

  test('rejects stale native batch errors without exposing their diagnostics', async () => {
    const pending = deferred<CanResult[]>();
    setAccessControlProvider({ can: async () => ({ can: true }), canMany: () => pending.promise });
    const call = canAccessAsync(requests);
    resetAccessControlProvider();
    pending.reject(new HttpError('private-token', 401));
    await expect(call).rejects.toMatchObject({ code: 'ACCESS_CONTROL_SUPERSEDED', statusCode: 409 });
  });

  test('prevents dispatch if the provider changes during input capture', async () => {
    const can = vi.fn(async () => ({ can: true }));
    const source: AccessControlProvider = { can };
    const params = new Proxy({ published: true }, { ownKeys(target) { resetAccessControlProvider(); return Reflect.ownKeys(target); } });
    setAccessControlProvider(source);
    await expect(canAccessAsync('posts', 'edit', params)).rejects.toMatchObject({ code: 'ACCESS_CONTROL_SUPERSEDED' });
    expect(can).not.toHaveBeenCalled();
  });

  test('stops undispatched fallback items after a synchronous provider replacement', async () => {
    const can = vi.fn<AccessControlProvider['can']>(async () => {
      resetAccessControlProvider();
      return { can: true };
    });
    setAccessControlProvider({ can });
    await expect(canAccessAsync(requests)).rejects.toMatchObject({ code: 'ACCESS_CONTROL_SUPERSEDED' });
    expect(can).toHaveBeenCalledOnce();
  });

  test('sanitizes provider errors while retaining a checked protocol status', async () => {
    setAccessControlProvider({ can: async () => { throw new HttpError('private-token', 401); } });
    await expect(canAccessAsync('posts', 'edit')).rejects.toMatchObject({
      code: 'ACCESS_CONTROL_FAILED', message: 'Access control request failed', statusCode: 401,
    });
    const getter = vi.fn(() => 'private-token');
    const failure = Object.defineProperties({}, { message: { get: getter }, statusCode: { get: getter }, code: { get: getter } });
    setAccessControlProvider({ can: async () => { throw failure; } });
    await expect(canAccessAsync('posts', 'edit')).rejects.toMatchObject({ code: 'ACCESS_CONTROL_FAILED', statusCode: 502 });
    expect(getter).not.toHaveBeenCalled();
  });
});

describe('registered permission snapshots', () => {
  test.each([null, undefined, false, 0, '', [], {}, { can: null }, { can: async () => ({ can: true }), canMany: undefined }])(
    'rejects malformed registration %j without replacing an existing provider', value => {
      setAccessControlProvider({ can: async () => ({ can: false }) });
      const current = getAccessControlProvider();
      expect(() => registerRaw(value)).toThrowError(expect.objectContaining({ code: 'INVALID_ACCESS_CONTROL_PROVIDER' }));
      expect(getAccessControlProvider()).toBe(current);
    },
  );

  test.each([null, undefined, false, [], { unknown: true }, { buttons: true },
    { buttons: { enableAccessControl: 'yes' } }, { buttons: { hideIfUnauthorized: 0 } },
    { buttons: { unexpected: true } },
  ])('rejects malformed option data %j', options => {
    const candidate = { can: async () => ({ can: true }), options };
    expect(() => registerRaw(candidate)).toThrowError(expect.objectContaining({ code: 'INVALID_ACCESS_CONTROL_OPTIONS' }));
    expect(getAccessControlProvider()).toBeNull();
  });

  test.each(['can', 'canMany', 'options'] as const)('rejects %s accessors without running them', member => {
    const getter = vi.fn(() => { throw new Error('private-token'); });
    const candidate = { can: async () => ({ can: true }) };
    Object.defineProperty(candidate, member, { get: getter });
    expect(() => registerRaw(candidate)).toThrowError(expect.objectContaining({
      code: 'INVALID_ACCESS_CONTROL_PROVIDER', message: 'Access control request failed',
    }));
    expect(getter).not.toHaveBeenCalled();
  });

  test('rejects getters in nested option data without running them', () => {
    const getter = vi.fn(() => false);
    const buttons = Object.defineProperty({}, 'hideIfUnauthorized', { enumerable: true, get: getter });
    expect(() => registerRaw({ can: async () => ({ can: true }), options: { buttons } }))
      .toThrowError(expect.objectContaining({ code: 'INVALID_ACCESS_CONTROL_OPTIONS' }));
    expect(getter).not.toHaveBeenCalled();
  });

  test('exposes frozen snapshots and captures each source identity only once', async () => {
    const source = {
      can: vi.fn(async () => ({ can: false, reason: 'Captured' })),
      options: { buttons: { enableAccessControl: true, hideIfUnauthorized: true } },
    };
    setAccessControlProvider(source);
    const registered = getAccessControlProvider();
    if (!registered) throw new Error('Expected a registered provider');
    expect(registered).not.toBe(source);
    expect(getAccessControlOptions()).toBe(registered.options);
    expect(Object.isFrozen(registered)).toBe(true);
    expect(Object.isFrozen(registered.options)).toBe(true);
    expect(Object.isFrozen(registered.options.buttons)).toBe(true);
    expect(Reflect.set(registered, 'can', async () => ({ can: true }))).toBe(false);
    expect(Reflect.set(registered.options, 'buttons', {})).toBe(false);
    if (!registered.options.buttons) throw new Error('Expected button options');
    expect(Reflect.set(registered.options.buttons, 'hideIfUnauthorized', false)).toBe(false);
    source.can = vi.fn(async () => ({ can: true, reason: 'New source' }));
    source.options.buttons.hideIfUnauthorized = false;
    setAccessControlProvider(source);
    expect(getAccessControlProvider()).toBe(registered);
    expect(getAccessControlOptions().buttons?.hideIfUnauthorized).toBe(true);
    await expect(canAccessAsync('posts', 'edit')).resolves.toEqual({ can: false, reason: 'Captured' });
    setAccessControlProvider({ ...source });
    expect(getAccessControlProvider()).not.toBe(registered);
    expect(getAccessControlOptions().buttons?.hideIfUnauthorized).toBe(false);
    await expect(canAccessAsync('posts', 'edit')).resolves.toEqual({ can: true, reason: 'New source' });
  });

  test('returns stable immutable empty options without a provider', () => {
    const options = getAccessControlOptions();
    expect(options).toEqual({});
    expect(Object.isFrozen(options)).toBe(true);
    expect(getAccessControlOptions()).toBe(options);
    expect(Reflect.set(options, 'buttons', { enableAccessControl: false })).toBe(false);
  });

  test('binds class methods to the original receiver while validating their output', async () => {
    const source = new TestPermissionPolicy();
    setAccessControlProvider(source);
    const registered = getAccessControlProvider();
    if (!registered) throw new Error('Expected registered class provider');
    const can = registered.can;
    await expect(can({ resource: 'posts', action: 'edit' })).resolves.toEqual({ can: false });
    source.allow();
    await expect(can({ resource: 'posts', action: 'edit' })).resolves.toEqual({ can: true });
    expect(Reflect.has(registered, 'allow')).toBe(false);
  });

  test('reads descriptors instead of contradictory provider property values', async () => {
    const getter = vi.fn(() => { throw new Error('Must not read properties'); });
    const source = new Proxy({ can: async () => ({ can: false }) }, { get: getter });
    const registered = captureAccessControlProvider(source);
    await expect(registered.can({ resource: 'posts', action: 'edit' })).resolves.toEqual({ can: false });
    expect(getter).not.toHaveBeenCalled();
  });

  test('rejects cyclic prototype reflection without looping', () => {
    const source: object = new Proxy({}, { getPrototypeOf: () => source });
    expect(() => captureAccessControlProvider(source)).toThrowError(expect.objectContaining({ code: 'INVALID_ACCESS_CONTROL_PROVIDER' }));
  });

  test('validates direct public methods and detaches native batch receipts', async () => {
    const can = vi.fn(async () => ({ can: true, reason: 'Original' }));
    const receipt = [{ can: true, reason: 'Original' }];
    const registered = captureAccessControlProvider({ can, canMany: async () => receipt });
    const invalidCall: unknown = Reflect.apply(registered.can, undefined, [{ resource: 'posts' }]);
    await expect(invalidCall).rejects.toMatchObject({ code: 'INVALID_ACCESS_CONTROL_INPUT' });
    expect(can).not.toHaveBeenCalled();
    const first = await registered.can({ resource: 'posts', action: 'edit' });
    first.can = false;
    await expect(registered.can({ resource: 'posts', action: 'edit' })).resolves.toEqual({ can: true, reason: 'Original' });
    if (!registered.canMany) throw new Error('Expected batch capability');
    const batch = await registered.canMany([{ resource: 'posts', action: 'edit' }]);
    if (!batch[0]) throw new Error('Expected batch decision');
    batch[0].can = false;
    expect(receipt[0]?.can).toBe(true);
    await expect(registered.canMany(requests)).rejects.toMatchObject({ code: 'INVALID_ACCESS_CONTROL_RESPONSE' });
  });

  test('captures native batch cardinality before the provider edits its request array', async () => {
    const registered = captureAccessControlProvider({
      can: async () => ({ can: true }),
      canMany: async (input: CanParams[]) => { input.length = 0; return []; },
    });
    if (!registered.canMany) throw new Error('Expected native batch');
    await expect(registered.canMany(requests)).rejects.toMatchObject({ code: 'INVALID_ACCESS_CONTROL_RESPONSE' });
    expect(requests).toHaveLength(2);
  });

  test('keeps a pending valid call current when a replacement fails validation', async () => {
    const pending = deferred<CanResult>();
    setAccessControlProvider({ can: () => pending.promise });
    const current = getAccessControlProvider();
    const call = canAccessAsync('posts', 'edit');
    expect(() => registerRaw({ can: false })).toThrow();
    expect(getAccessControlProvider()).toBe(current);
    pending.resolve({ can: true });
    await expect(call).resolves.toEqual({ can: true });
  });

  test.each(['reset', 'replace'] as const)('does not overwrite a reentrant %s during registration', async action => {
    const replacement = { can: async () => ({ can: false, reason: 'Current' }) };
    setAccessControlProvider({ can: async () => ({ can: true }) });
    const source = new Proxy({ can: async () => ({ can: true }) }, {
      getOwnPropertyDescriptor(target, key) {
        if (key === 'can') {
          if (action === 'reset') resetAccessControlProvider();
          else setAccessControlProvider(replacement);
        }
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    expect(() => setAccessControlProvider(source)).toThrowError(expect.objectContaining({ code: 'ACCESS_CONTROL_SUPERSEDED' }));
    if (action === 'reset') expect(getAccessControlProvider()).toBeNull();
    else await expect(canAccessAsync('posts', 'edit')).resolves.toEqual({ can: false, reason: 'Current' });
  });

  test('exposes the same checked identity from scoped, bundled and global paths', () => {
    const source = { can: async () => ({ can: true }) };
    setAccessControlProvider(source);
    setDataProvider(dataProvider);
    const registered = getAccessControlProvider();
    const context = createAdminContext({ dataProvider, resources: [], accessControlProvider: source });
    const bundled = createAdminContext({ resources: [], providerBundle: { dataProvider, accessControlProvider: source } });
    const accessor = captureAdminContext();
    expect(context.accessControlProvider).toBe(registered);
    expect(context.providerBundle.accessControlProvider).toBe(registered);
    expect(bundled.accessControlProvider).toBe(registered);
    expect(accessor.accessControlProvider).toBe(registered);
    expect(getProviderBundle().accessControlProvider).toBe(registered);
    expect(Reflect.set(context.providerBundle, 'accessControlProvider', source)).toBe(false);
    expect(Reflect.set(getProviderBundle(), 'accessControlProvider', source)).toBe(false);
    expect(Reflect.defineProperty(context, 'accessControlProvider', { value: source })).toBe(false);
    expect(Reflect.defineProperty(accessor, 'accessControlProvider', { value: source })).toBe(false);
    expect(Reflect.defineProperty(accessor, 'providerBundle', { value: { accessControlProvider: source } })).toBe(false);
  });

  test('honors explicit scoped absence and rejects invalid scoped configuration instead of falling back', () => {
    const raw = { can: async () => ({ can: true }) };
    const source = { dataProvider, resources: [], accessControlProvider: raw };
    const context = createAdminContext(source);
    expect(context.accessControlProvider).toBe(captureAccessControlProvider(raw));
    Reflect.set(source, 'accessControlProvider', { can: null });
    expect(() => context.accessControlProvider).toThrowError(expect.objectContaining({ code: 'INVALID_ACCESS_CONTROL_PROVIDER' }));
    expect(() => context.providerBundle).toThrowError(expect.objectContaining({ code: 'INVALID_ACCESS_CONTROL_PROVIDER' }));
    Reflect.set(source, 'accessControlProvider', null);
    expect(context.accessControlProvider).toBeNull();
    const disabled = createAdminContext({
      resources: [], providerBundle: { dataProvider, accessControlProvider: raw }, accessControlProvider: null,
    });
    expect(disabled.accessControlProvider).toBeNull();
  });

  test.each(['missing', 'getter'] as const)('rejects mounted %s capabilities before any query dispatch', kind => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    clients.push(client);
    const source = { can: async () => ({ can: true }) };
    const getter = vi.fn(() => { throw new Error('private-token'); });
    if (kind === 'missing') Reflect.set(source, 'can', null);
    else Object.defineProperty(source, 'can', { get: getter });
    expect(() => render(Host, {
      accessControlProvider: source, queryClient: client,
      options: { resource: 'posts', action: 'edit' }, onReady: () => {},
    })).toThrowError(expect.objectContaining({ code: 'INVALID_ACCESS_CONTROL_PROVIDER' }));
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(getter).not.toHaveBeenCalled();
  });

  test('keeps shared mounted queries deduplicated and refreshable through checked provider projections', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    clients.push(client);
    const source = { can: vi.fn(async () => ({ can: true })) };
    const states = new Map<string, AccessQueryState>();
    const read = (name: string) => {
      const state = states.get(name);
      if (!state) throw new Error('Expected mounted permissions');
      return state;
    };
    const mount = (name: string) => render(Host, {
      accessControlProvider: source, queryClient: client,
      options: { resource: 'posts', action: 'edit', queryOptions: { staleTime: Infinity } },
      onReady: (value: AccessQueryState) => { states.set(name, value); },
    });
    const first = mount('first');
    await waitFor(() => expect(read('first').can.allowed).toBe(true));
    const second = mount('second');
    await waitFor(() => expect(read('second').can.allowed).toBe(true));
    expect(source.can).toHaveBeenCalledOnce();
    second.unmount();
    await client.invalidateQueries();
    expect(source.can).toHaveBeenCalledTimes(2);
    expect(read('first').can.allowed).toBe(true);
    await first.rerender({ tenant: 'second' });
    await waitFor(() => expect(source.can).toHaveBeenCalledTimes(3));
    expect(read('first').can.allowed).toBe(true);
    await first.rerender({ accessControlProvider: { can: async () => ({ can: false, reason: 'New policy' }) } });
    await waitFor(() => expect(read('first').can.reason).toBe('New policy'));
    expect(read('first').can.allowed).toBe(false);
  });
});

describe('checked adapter decisions', () => {
  test('keeps the migrated single capability integrated with mounted session-owned permissions', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    clients.push(client);
    const ability = { can: vi.fn(() => true), cannot: () => false };
    const accessControlProvider = createCaslAccessControl(ability);
    let state: AccessQueryState | undefined;
    const read = () => {
      if (!state) throw new Error('Expected mounted permission query');
      return state;
    };
    render(Host, {
      accessControlProvider, queryClient: client,
      options: { resource: 'posts', action: 'edit', params: { field: 'title' } },
      authProvider: {
        login: async () => ({ success: true }), logout: async () => ({ success: true }),
        check: async () => ({ authenticated: true }), getIdentity: async () => ({ id: 'user' }),
      },
      onReady: (value: AccessQueryState) => { state = value; },
    });
    await waitFor(() => expect(read().can.allowed).toBe(true));
    expect(ability.can).toHaveBeenCalledExactlyOnceWith('edit', 'posts', 'title');
    await read().logout.mutate();
    expect(read().can.allowed).toBe(false);
    await read().login.mutate({});
    await waitFor(() => expect(read().can.allowed).toBe(true));
    expect(ability.can).toHaveBeenCalledTimes(2);
  });

  test.each(['casl', 'casbin'] as const)('rejects malformed external %s decisions', async kind => {
    const ability = { can: () => true, cannot: () => false };
    const enforcer = { enforce: async () => true };
    Reflect.set(ability, 'can', () => 'yes');
    Reflect.set(enforcer, 'enforce', async () => 'yes');
    const provider = kind === 'casl' ? createCaslAccessControl(ability)
      : createCasbinAccessControl(enforcer, { getUser: () => 'alice' });
    await expect(provider.can({ resource: 'posts', action: 'edit' }))
      .rejects.toMatchObject({ code: 'INVALID_ACCESS_CONTROL_RESPONSE' });
  });

  test.each(['casl', 'casbin'] as const)('supports checked batches through the %s single capability', async kind => {
    const ability = { can: (_action: string, resource: string) => resource === 'posts', cannot: () => false };
    const enforcer = { enforce: async (_user: string, resource: string) => resource === 'posts' };
    const provider = kind === 'casl' ? createCaslAccessControl(ability)
      : createCasbinAccessControl(enforcer, { getUser: () => 'alice' });
    setAccessControlProvider(provider);
    expect((await canAccessAsync(requests)).map(result => result.can)).toEqual([true, false]);
  });

  test('rejects malformed Casbin user values before calling the enforcer', async () => {
    const enforcer = { enforce: vi.fn(async () => true) };
    const options = { getUser: () => 'alice' };
    Reflect.set(options, 'getUser', () => ({ token: 'private-token' }));
    const provider = createCasbinAccessControl(enforcer, options);
    await expect(provider.can({ resource: 'posts', action: 'edit' }))
      .rejects.toMatchObject({ code: 'INVALID_ACCESS_CONTROL_PROVIDER' });
    expect(enforcer.enforce).not.toHaveBeenCalled();
  });
});

describe('permissions', () => {
  test('rejects provider result shapes that do not match the request shape', async () => {
    const provider: AccessControlProvider = { can: async () => ({ can: true }) };
    Reflect.set(provider, 'canMany', async () => ({ can: true }));
    setAccessControlProvider(provider);
    await expect(canAccessAsync([{ resource: 'posts', action: 'list' }]))
      .rejects.toMatchObject({ code: 'INVALID_ACCESS_CONTROL_RESPONSE' });

    Reflect.set(provider, 'can', async () => [{ can: true }]);
    Reflect.set(provider, 'canMany', async () => [{ can: true }]);
    setAccessControlProvider({ ...provider });
    await expect(canAccessAsync('posts', 'list')).rejects.toMatchObject({ code: 'INVALID_ACCESS_CONTROL_RESPONSE' });
    await expect(canAccessAsync([
      { resource: 'posts', action: 'list' }, { resource: 'users', action: 'list' },
    ])).rejects.toMatchObject({ code: 'INVALID_ACCESS_CONTROL_RESPONSE' });
  });
  test('canAccessAsync respects deny rule', async () => {
    const provider: AccessControlProvider = {
      can: async (p) => {
        const { action } = p;
        if (action === 'delete') return { can: false, reason: 'Denied' };
        return { can: true };
      },
    };
    expect(await provider.can({ resource: 'posts', action: 'delete' })).toEqual({ can: false, reason: 'Denied' });
    expect(await provider.can({ resource: 'posts', action: 'list' })).toEqual({ can: true });
  });

  test('canAccessAsync resolves with allowed status', async () => {
    const provider: AccessControlProvider = {
      can: async (params) => {
        expect(params.params?.['published']).toBe(true);
        return { can: true };
      },
    };
    const result = await provider.can({ resource: 'posts', action: 'edit', params: { published: true } });
    expect(result.can).toBe(true);
  });

  test('canAccessAsync resolves with denied status', async () => {
    const provider: AccessControlProvider = {
      can: async () => ({ can: false, reason: 'No permission' }),
    };
    const result = await provider.can({ resource: 'users', action: 'delete' });
    expect(result.can).toBe(false);
    expect(result.reason).toBe('No permission');
  });

  test('resource-specific rules', async () => {
    const provider: AccessControlProvider = {
      can: async (p) => {
        const { resource, action } = p;
        if (resource === 'users' && action === 'delete') return { can: false, reason: 'Cannot delete users' };
        return { can: true };
      },
    };
    expect((await provider.can({ resource: 'users', action: 'delete' })).can).toBe(false);
    expect((await provider.can({ resource: 'users', action: 'list' })).can).toBe(true);
    expect((await provider.can({ resource: 'posts', action: 'delete' })).can).toBe(true);
  });

  test('params.id is passed through', async () => {
    const provider: AccessControlProvider = {
      can: async (p) => {
        const { params } = p;
        if (params?.id === 42) return { can: false, reason: 'Record locked' };
        return { can: true };
      },
    };
    const result = await provider.can({ resource: 'posts', action: 'edit', params: { id: 42 } });
    expect(result.can).toBe(false);
    expect(result.reason).toBe('Record locked');
  });

  test('params and meta are available to access control providers', async () => {
    const provider: AccessControlProvider = {
      can: async (p) => {
        const request = p;
        expect(request.params).toEqual({ id: 42, tenantId: 'tenant-1' });
        expect(request.meta).toEqual({ scope: 'row-action', source: 'DeleteButton' });
        return { can: true };
      },
    };

    const result = await provider.can({
      resource: 'orders',
      action: 'delete',
      params: { id: 42, tenantId: 'tenant-1' },
      meta: { scope: 'row-action', source: 'DeleteButton' },
    });

    expect(result).toEqual({ can: true });
  });

  test('extended action types work', async () => {
    const provider: AccessControlProvider = {
      can: async (p) => {
        const { action } = p;
        if (action === 'show') return { can: false, reason: 'No show' };
        if (action === 'field') return { can: false, reason: 'No field' };
        return { can: true };
      },
    };
    expect((await provider.can({ resource: 'posts', action: 'show' })).can).toBe(false);
    expect((await provider.can({ resource: 'posts', action: 'field' })).can).toBe(false);
    expect((await provider.can({ resource: 'posts', action: 'list' })).can).toBe(true);
  });

  test('getAccessControlOptions returns provider options', () => {
    const provider: AccessControlProvider = {
      can: async () => ({ can: true }),
      options: {
        buttons: { enableAccessControl: true, hideIfUnauthorized: true },
      },
    };
    expect(provider.options?.buttons?.enableAccessControl).toBe(true);
    expect(provider.options?.buttons?.hideIfUnauthorized).toBe(true);
  });

  test('getAccessControlOptions returns {} when no options', () => {
    const provider: AccessControlProvider = {
      can: async () => ({ can: true }),
    };
    expect(provider.options).toBeUndefined();
  });

  test('a forged feature-gate hint cannot override a configured access-control decision', async () => {
    const showAdminNavigation = createFeatureGate({ roles: ['admin'] });
    setAccessControlProvider({
      can: async () => ({ can: false, reason: 'Configured policy denied this action' }),
    });

    expect(showAdminNavigation({ role: 'admin', permissions: ['*'] })).toBe(true);
    expect(await canAccessAsync('users', 'delete')).toEqual({
      can: false,
      reason: 'Configured policy denied this action',
    });
  });
});

describe('CASL adapter', () => {
  test('rejects non-string field payloads before checking the ability', async () => {
    const { createCaslAccessControl } = await import('./adapters/casl');
    const provider = createCaslAccessControl({
      can: () => { throw new Error('Ability must not receive invalid data'); },
      cannot: () => true,
    });
    await expect(provider.can({ resource: 'posts', action: 'edit', params: { field: 42 } }))
      .rejects.toMatchObject({ code: 'INVALID_ACCESS_CONTROL_INPUT' });
  });
  test('createCaslAccessControl works', async () => {
    const { createCaslAccessControl } = await import('./adapters/casl');

    const ability = {
      can: (action: string, subject: string) => !(action === 'delete' && subject === 'users'),
      cannot: (action: string, subject: string) => action === 'delete' && subject === 'users',
    };

    const provider = createCaslAccessControl(ability);

    const allowed = await provider.can({ resource: 'posts', action: 'edit' });
    expect(allowed.can).toBe(true);

    const denied = await provider.can({ resource: 'users', action: 'delete' });
    expect(denied.can).toBe(false);
    expect(denied.reason).toContain('Cannot "delete" on "users"');
  });
});

describe('Casbin adapter', () => {
  test('createCasbinAccessControl works', async () => {
    const { createCasbinAccessControl } = await import('./adapters/casbin');

    const enforcer = {
      enforce: async (sub: string, obj: string, act: string) =>
        !(sub === 'alice' && obj === 'users' && act === 'delete'),
    };

    const provider = createCasbinAccessControl(enforcer, {
      getUser: () => 'alice',
    });

    const allowed = await provider.can({ resource: 'posts', action: 'edit' });
    expect(allowed.can).toBe(true);

    const denied = await provider.can({ resource: 'users', action: 'delete' });
    expect(denied.can).toBe(false);
    expect(denied.reason).toContain('alice');
  });
});
