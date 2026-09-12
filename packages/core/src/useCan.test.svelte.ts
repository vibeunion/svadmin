import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { flushSync, tick } from 'svelte';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HttpError, type AuthProvider, type AuthActionResult } from './types';
import type { AuthErrorResult } from './auth-query-contract';
import type { RouterProvider } from './router-provider';
import type { AccessControlProvider, CanResult } from './permissions.svelte';
import type { AccessQueryState } from './useCan.test.types';
import type { UseCanOptions } from './useCan';
import { captureAuthLiveScope, resetLogoutVersion } from './auth-hooks.svelte';
import { resetContext } from './context.svelte';
import { decodeCanResult, prepareCanCheck, snapshotCanParams } from './access-control-contract';
import { parseQueryKey } from './query-keys';
import Host from './useCan.test-host.svelte';

const clients: QueryClient[] = [];
function client() {
  const value = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  clients.push(value);
  return value;
}
function auth(): AuthProvider {
  return {
    login: vi.fn(async () => ({ success: true })),
    logout: vi.fn(async () => ({ success: true })),
    check: async () => ({ authenticated: true }),
    getIdentity: async () => ({ id: 'user' }),
    onError: vi.fn(async () => ({})),
  };
}
function policy(result: CanResult = { can: true, reason: 'Allowed' }): AccessControlProvider {
  return { can: vi.fn<AccessControlProvider['can']>().mockResolvedValue(result) };
}
function deferred<T>() {
  let resolve = (_value: T) => {};
  let reject = (_error: unknown) => {};
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function mount(accessControlProvider: AccessControlProvider | null, settings: {
  queryClient?: QueryClient;
  authProvider?: AuthProvider | null;
  options?: UseCanOptions;
  tenant?: string;
  routerProvider?: RouterProvider;
} = {}) {
  const queryClient = settings.queryClient ?? client();
  let state: AccessQueryState | undefined;
  const view = render(Host, {
    options: { resource: 'posts', action: 'edit', id: 1, queryOptions: { staleTime: Infinity } },
    ...settings, accessControlProvider, queryClient, onReady: (value: AccessQueryState) => { state = value; },
  });
  return {
    view, queryClient,
    read() {
      if (!state) throw new Error('Expected mounted access query');
      return state;
    },
  };
}
function firstQuery(queryClient: QueryClient) {
  const query = queryClient.getQueryCache().getAll()[0];
  if (!query) throw new Error('Expected an access query');
  return query;
}
function savedRequest(queryClient: QueryClient) {
  const query = firstQuery(queryClient);
  const fn = query.options.queryFn;
  if (typeof fn !== 'function') throw new Error('Expected a query function');
  return () => fn({ client: queryClient, queryKey: query.queryKey, signal: new AbortController().signal, meta: undefined });
}
afterEach(() => {
  cleanup();
  for (const value of clients.splice(0)) value.clear();
  resetContext();
  resetLogoutVersion();
  vi.restoreAllMocks();
});

describe('owned access queries', () => {
  it('strictly compiles the permission boundary, mounted fixtures and negative API cases', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const roots = ['useCan.ts', 'access-control-contract.ts', 'session-query.svelte.ts', 'query-session.svelte.ts',
      'useCan.test.svelte.ts', 'useCan.test.types.ts'].map(name => resolve(directory, name));
    const virtual = new Map(['useCan.test-host.svelte', 'useCan.test-probe.svelte'].map(name => {
      const path = resolve(directory, name);
      return [`${path}.tsx`, svelte2tsx(readFileSync(path, 'utf8'), { filename: path, isTsFile: true, mode: 'ts' }).code];
    }));
    const negativePath = resolve(directory, 'useCan.test.virtual.ts');
    const valid = [
      "import { useCan, type UseCanOptions } from './index';",
      'const options: UseCanOptions = { resource: "posts", action: "edit", id: 1, params: { published: true } };',
      'const result = useCan(() => options);',
      'const allowed: boolean = result.allowed;',
      'const reason: string | undefined = result.reason;',
      'const loading: boolean = result.isLoading;',
    ];
    const invalid = [
      'result.allowed = true;',
      'result.reason = "forged";',
      'result.isLoading = false;',
      'useCan(() => ({ resource: "posts", action: "edit", id: true }));',
      'useCan(() => ({ resource: "posts", action: "edit", params: { id: true } }));',
      'useCan(() => ({ resource: 1, action: "edit" }));',
      'useCan(() => ({ resource: "posts" }));',
      'useCan(() => ({ resource: "posts", action: "edit", queryOptions: { enabled: "yes" } }));',
      'useCan(() => ({ resource: "posts", action: "edit", queryOptions: { staleTime: "forever" } }));',
      'useCan(options);',
      'const requiredReason: string = useCan(() => options).reason;',
    ];
    virtual.set(negativePath, [...valid, ...invalid].join('\n'));
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, noImplicitOverride: true, skipLibCheck: false, types: ['svelte', 'node'],
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
    const program = ts.createProgram({ rootNames: [...roots, ...virtual.keys(),
      resolve(directory, '../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
      resolve(directory, '../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts'),
    ], options, host });
    const diagnostics = (path: string) => {
      const source = program.getSourceFile(path);
      if (!source) throw new Error(`Missing source ${path}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    };
    expect([...roots, ...virtual.keys()].filter(path => path !== negativePath).flatMap(diagnostics)
      .map(item => `${item.file?.fileName}:${item.start}: ${ts.flattenDiagnosticMessageText(item.messageText, '\n')}`)).toEqual([]);
    expect(diagnostics(negativePath).map(item => item.file && item.start !== undefined
      ? item.file.getLineAndCharacterOfPosition(item.start).line : -1)).toEqual(invalid.map((_, index) => valid.length + index));
  }, 30_000);

  it('starts denied while pending and exposes an immutable checked allow', async () => {
    const pending = deferred<CanResult>();
    const app = mount({ can: () => pending.promise });
    expect(app.read().can.allowed).toBe(false);
    expect(app.read().can.reason).toBeUndefined();
    await waitFor(() => expect(app.read().can.isLoading).toBe(true));
    pending.resolve({ can: true, reason: 'Allowed' });
    await waitFor(() => expect(app.read().can.allowed).toBe(true));
    expect(app.read().can.reason).toBe('Allowed');
    expect(Object.isFrozen(app.read().can)).toBe(true);
    expect(Reflect.set(app.read().can, 'allowed', false)).toBe(false);
  });

  it('deduplicates the same owner but isolates distinct authentication owners on a shared client', async () => {
    const source = policy();
    const shared = client();
    const owner = auth();
    const first = mount(source, { authProvider: owner, queryClient: shared });
    await waitFor(() => expect(first.read().can.allowed).toBe(true));
    const same = mount(source, { authProvider: owner, queryClient: shared });
    await waitFor(() => expect(same.read().can.allowed).toBe(true));
    expect(source.can).toHaveBeenCalledOnce();
    const other = mount(source, { authProvider: auth(), queryClient: shared });
    await waitFor(() => expect(other.read().can.allowed).toBe(true));
    expect(source.can).toHaveBeenCalledTimes(2);
    expect(parseQueryKey(firstQuery(shared).queryKey)?.params).toMatchObject({
      action: 'edit', authSession: captureAuthLiveScope(owner).cacheKey,
    });
    await first.read().logout.mutate();
    expect(first.read().can.allowed).toBe(false);
    expect(same.read().can.allowed).toBe(false);
    expect(other.read().can.allowed).toBe(true);
  });

  it.each(['disabled', 'unmounted'] as const)('keeps a shared query refreshable after another observer is %s', async change => {
    const shared = client();
    const source = policy();
    const first = mount(source, { queryClient: shared });
    await waitFor(() => expect(first.read().can.allowed).toBe(true));
    const other = mount(source, { queryClient: shared });
    await waitFor(() => expect(other.read().can.allowed).toBe(true));
    if (change === 'unmounted') other.view.unmount();
    else await other.view.rerender({ options: { resource: 'posts', action: 'edit', id: 1, queryOptions: { enabled: false } } });
    await shared.invalidateQueries();
    await waitFor(() => expect(source.can).toHaveBeenCalledTimes(2));
    expect(first.read().can.allowed).toBe(true);
  });

  it('immediately revokes grants and reasons during a login on the same provider', async () => {
    const owner = auth();
    const login = deferred<AuthActionResult>();
    owner.login = () => login.promise;
    const source = policy();
    const app = mount(source, { authProvider: owner });
    await waitFor(() => expect(app.read().can.allowed).toBe(true));
    const oldRequest = savedRequest(app.queryClient);
    const changing = app.read().login.mutate({});
    expect(app.read().can.allowed).toBe(false);
    expect(app.read().can.reason).toBeUndefined();
    await expect(oldRequest()).rejects.toMatchObject({ code: 'QUERY_SESSION_SUPERSEDED' });
    login.resolve({ success: true });
    await changing;
    await waitFor(() => expect(app.read().can.allowed).toBe(true));
    expect(source.can).toHaveBeenCalledTimes(2);
    await expect(oldRequest()).rejects.toMatchObject({ code: 'QUERY_SESSION_SUPERSEDED' });
  });

  it('keeps signed-out queries disabled until login confirms a fresh session', async () => {
    const source = policy();
    const app = mount(source, { authProvider: auth() });
    await waitFor(() => expect(app.read().can.allowed).toBe(true));
    await app.read().logout.mutate();
    expect(app.read().can.allowed).toBe(false);
    expect(app.read().can.reason).toBeUndefined();
    expect(app.read().can.isLoading).toBe(false);
    expect(source.can).toHaveBeenCalledOnce();
    await app.read().login.mutate({});
    await waitFor(() => expect(app.read().can.allowed).toBe(true));
    expect(source.can).toHaveBeenCalledTimes(2);
  });

  it.each(['success', 'failure'] as const)('quarantines an old permission %s after login', async outcome => {
    const pending = deferred<CanResult>();
    const owner = auth();
    const source: AccessControlProvider = {
      can: vi.fn<AccessControlProvider['can']>().mockImplementationOnce(() => pending.promise)
        .mockResolvedValue({ can: false, reason: 'New policy' }),
    };
    const app = mount(source, { authProvider: owner });
    await waitFor(() => expect(source.can).toHaveBeenCalledOnce());
    const original = firstQuery(app.queryClient);
    await app.read().login.mutate({});
    await waitFor(() => expect(app.read().can.reason).toBe('New policy'));
    if (outcome === 'success') pending.resolve({ can: true, reason: 'Old private policy' });
    else pending.reject(new HttpError('Old private diagnostic', 401));
    await waitFor(() => expect(original.state.status).toBe('error'));
    expect(original.state.data).toBeUndefined();
    expect(original.state.error).toMatchObject({ code: 'QUERY_SESSION_SUPERSEDED' });
    expect(app.read().can.allowed).toBe(false);
    expect(app.read().can.reason).toBe('New policy');
    expect(owner.onError).not.toHaveBeenCalled();
  });

  it.each(['provider', 'tenant', 'id', 'action', 'resource', 'auth'] as const)(
    'replaces cached grants when the %s changes', async dimension => {
      const next = deferred<CanResult>();
      const source: AccessControlProvider = {
        can: vi.fn<AccessControlProvider['can']>().mockResolvedValueOnce({ can: true, reason: 'Old allow' })
          .mockImplementation(() => next.promise),
      };
      const app = mount(source, { authProvider: auth() });
      await waitFor(() => expect(app.read().can.allowed).toBe(true));
      const oldRequest = savedRequest(app.queryClient);
      switch (dimension) {
        case 'provider': await app.view.rerender({ accessControlProvider: { can: () => next.promise } }); break;
        case 'tenant': await app.view.rerender({ tenant: 'second' }); break;
        case 'auth': await app.view.rerender({ authProvider: auth() }); break;
        case 'id': await app.view.rerender({ options: { resource: 'posts', action: 'edit', id: '1' } }); break;
        case 'action': await app.view.rerender({ options: { resource: 'posts', action: 'delete', id: 1 } }); break;
        case 'resource': await app.view.rerender({ options: { resource: 'users', action: 'edit', id: 1 } }); break;
      }
      expect(app.read().can.allowed).toBe(false);
      expect(app.read().can.reason).toBeUndefined();
      await expect(oldRequest()).rejects.toMatchObject({ code: 'QUERY_SESSION_SUPERSEDED' });
      next.resolve({ can: false, reason: 'Current denial' });
      await waitFor(() => expect(app.read().can.reason).toBe('Current denial'));
    },
  );

  it('ignores an old target response after the active record changes', async () => {
    const pending = deferred<CanResult>();
    const source: AccessControlProvider = {
      can: vi.fn<AccessControlProvider['can']>().mockImplementationOnce(() => pending.promise)
        .mockResolvedValue({ can: false, reason: 'Current record denied' }),
    };
    const app = mount(source);
    await waitFor(() => expect(source.can).toHaveBeenCalledOnce());
    await app.view.rerender({ options: { resource: 'posts', action: 'edit', id: 2 } });
    await waitFor(() => expect(app.read().can.reason).toBe('Current record denied'));
    pending.resolve({ can: true, reason: 'Old record allowed' });
    await pending.promise;
    await tick();
    expect(app.read().can.allowed).toBe(false);
    expect(app.read().can.reason).toBe('Current record denied');
  });

  it('masks previously cached decisions when disabled and blocks captured dispatch', async () => {
    const source = policy();
    const app = mount(source);
    await waitFor(() => expect(app.read().can.allowed).toBe(true));
    const oldRequest = savedRequest(app.queryClient);
    await app.view.rerender({ options: { resource: 'posts', action: 'edit', id: 1, queryOptions: { enabled: false } } });
    expect(app.read().can.allowed).toBe(false);
    expect(app.read().can.reason).toBeUndefined();
    expect(app.read().can.isLoading).toBe(false);
    await expect(oldRequest()).rejects.toMatchObject({ code: 'QUERY_SESSION_SUPERSEDED' });
    expect(source.can).toHaveBeenCalledOnce();
  });

  it('clears a cached grant and reason when a background refresh fails', async () => {
    const source: AccessControlProvider = {
      can: vi.fn<AccessControlProvider['can']>().mockResolvedValueOnce({ can: true, reason: 'Old grant' })
        .mockRejectedValue(new HttpError('private-token', 502)),
    };
    const app = mount(source);
    await waitFor(() => expect(app.read().can.allowed).toBe(true));
    await app.queryClient.invalidateQueries();
    await waitFor(() => expect(firstQuery(app.queryClient).state.status).toBe('error'));
    expect(app.read().can.allowed).toBe(false);
    expect(app.read().can.reason).toBeUndefined();
  });

  it.each([
    { enabled: 'yes' }, { staleTime: 'forever' }, { staleTime: Number.NaN }, { staleTime: -1 },
  ])('rejects invalid JavaScript query settings %j before dispatch', value => {
    const source = policy();
    const options: UseCanOptions = { resource: 'posts', action: 'edit' };
    Reflect.set(options, 'queryOptions', value);
    expect(() => mount(source, { options })).toThrow('Invalid access control query settings');
    expect(source.can).not.toHaveBeenCalled();
  });

  it('only defaults to allow without a policy for enabled, available sessions', async () => {
    const owner = auth();
    const app = mount(null, { authProvider: owner });
    await waitFor(() => expect(app.read().can.allowed).toBe(true));
    await app.read().logout.mutate();
    expect(app.read().can.allowed).toBe(false);
    await app.read().login.mutate({});
    await waitFor(() => expect(app.read().can.allowed).toBe(true));
    await app.view.rerender({ options: { resource: 'posts', action: 'edit', queryOptions: { enabled: false } } });
    expect(app.read().can.allowed).toBe(false);
    const anonymous = mount(null);
    await waitFor(() => expect(anonymous.read().can.allowed).toBe(true));
  });

  it('does not grant or dispatch again after unmount', async () => {
    const pending = deferred<CanResult>();
    const source: AccessControlProvider = { can: vi.fn(() => pending.promise) };
    const app = mount(source);
    await waitFor(() => expect(source.can).toHaveBeenCalledOnce());
    const state = app.read();
    const oldRequest = savedRequest(app.queryClient);
    app.view.unmount();
    pending.resolve({ can: true, reason: 'Late allow' });
    await pending.promise;
    await tick();
    expect(state.can.allowed).toBe(false);
    expect(state.can.reason).toBeUndefined();
    expect(state.can.isLoading).toBe(false);
    await expect(oldRequest()).rejects.toMatchObject({ code: 'QUERY_SESSION_SUPERSEDED' });
    expect(source.can).toHaveBeenCalledOnce();
  });

  it.each([null, {}, [], [{ can: true }], { can: 'yes' }, { can: true, reason: 1 }, { can: true, token: 'private' }])(
    'rejects malformed or legacy provider decision %j', async value => {
      const source = policy();
      Reflect.set(source, 'can', async () => value);
      const app = mount(source);
      await waitFor(() => expect(firstQuery(app.queryClient).state.status).toBe('error'));
      expect(firstQuery(app.queryClient).state.error).toMatchObject({ code: 'INVALID_ACCESS_CONTROL_RESPONSE' });
      expect(app.read().can.allowed).toBe(false);
      expect(app.read().can.reason).toBeUndefined();
    },
  );

  it('revalidates cached decisions and never executes a cached decision getter', async () => {
    const app = mount(policy());
    await waitFor(() => expect(app.read().can.allowed).toBe(true));
    const query = firstQuery(app.queryClient);
    const getter = vi.fn(() => true);
    const poisoned = Object.defineProperty({ reason: 'Private cache' }, 'can', { enumerable: true, get: getter });
    query.setState({ data: poisoned });
    flushSync();
    expect(app.read().can.allowed).toBe(false);
    expect(app.read().can.reason).toBeUndefined();
    expect(getter).not.toHaveBeenCalled();
    query.setState({ data: [{ can: true }] });
    flushSync();
    expect(app.read().can.allowed).toBe(false);
  });

  it('captures the provider capability and copies request and response values', async () => {
    const request = { resource: 'posts', action: 'edit', params: { id: 1, nested: { flag: true } } };
    const response = { can: false, reason: 'Denied' };
    const source: AccessControlProvider = {
      async can(params) {
        expect(this).toBe(source);
        expect(Array.isArray(params)).toBe(false);
        if (Array.isArray(params)) throw new Error('Unexpected batch');
        expect(params.params).toEqual({ id: 1, nested: { flag: true } });
        if (params.params) params.params.id = 99;
        return response;
      },
    };
    const execute = prepareCanCheck(source, request);
    source.can = async () => ({ can: true });
    request.params.id = 7;
    request.params.nested.flag = false;
    const first = await execute();
    first.can = true;
    first.reason = 'Changed';
    expect(await execute()).toEqual({ can: false, reason: 'Denied' });
    expect(response).toEqual({ can: false, reason: 'Denied' });
  });

  it('keeps fixed record IDs authoritative and passes tenant metadata', async () => {
    const source = policy();
    const app = mount(source, { options: {
      resource: 'posts', action: 'edit', id: 1, params: { id: 9, published: true }, meta: { source: 'button' },
    } });
    await waitFor(() => expect(app.read().can.allowed).toBe(true));
    expect(source.can).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'posts', action: 'edit', params: { id: 1, published: true },
      meta: expect.objectContaining({ source: 'button' }),
    }));
    expect(parseQueryKey(firstQuery(app.queryClient).queryKey)?.tenant).toBe('first');
  });

  it('rejects malformed requests and accessor-backed decisions without leaking their content', () => {
    const getter = vi.fn(() => 'private');
    expect(() => snapshotCanParams({ resource: 'posts', action: 'edit', params: { id: false } })).toThrow('Invalid access control request');
    expect(() => snapshotCanParams({ resource: '', action: 'edit' })).toThrow('Invalid access control request');
    const hostile = Object.defineProperty({}, 'can', { enumerable: true, get: getter });
    expect(() => decodeCanResult(hostile)).toThrow('Invalid access control response');
    expect(getter).not.toHaveBeenCalled();
  });

  it.each(['missing', 'getter'] as const)('rejects a %s capability during checked context projection', kind => {
    const source = policy();
    if (kind === 'missing') Reflect.set(source, 'can', null);
    else Object.defineProperty(source, 'can', { get() { throw new Error('private-token'); } });
    expect(() => mount(source)).toThrowError(expect.objectContaining({
      code: 'INVALID_ACCESS_CONTROL_PROVIDER', message: expect.stringContaining('Access control request failed'),
    }));
  });

  it('sanitizes hostile provider errors before passing them to the auth delegate', async () => {
    const getter = vi.fn(() => 'private');
    const failure = Object.defineProperties({}, {
      message: { get: getter }, statusCode: { get: getter }, code: { get: getter },
    });
    const owner = auth();
    const app = mount({ can: async () => { throw failure; } }, { authProvider: owner });
    await waitFor(() => expect(owner.onError).toHaveBeenCalledOnce());
    expect(owner.onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Resource query failed', statusCode: 502 }));
    expect(getter).not.toHaveBeenCalled();
    expect(app.read().can.allowed).toBe(false);
  });

  it('allows the current checked auth-error delegate to complete its own logout', async () => {
    const owner = auth();
    owner.onError = vi.fn(async () => ({ logout: true }));
    const go = vi.fn();
    const source: AccessControlProvider = { can: vi.fn(async () => { throw new HttpError('private-token', 401); }) };
    const app = mount(source, { authProvider: owner,
      routerProvider: { go, back: () => {}, parse: () => ({ pathname: '/', params: {} }) },
    });
    await waitFor(() => expect(go).toHaveBeenCalledExactlyOnceWith({ to: '/login', type: 'push' }));
    expect(owner.logout).toHaveBeenCalledOnce();
    expect(source.can).toHaveBeenCalledOnce();
    expect(captureAuthLiveScope(owner).available).toBe(false);
    expect(app.read().can.allowed).toBe(false);
  });

  it('does not loop permission requests after the auth delegate logout fails', async () => {
    const owner = auth();
    owner.onError = vi.fn(async () => ({ logout: true }));
    owner.logout = vi.fn(async () => ({ success: false }));
    const source: AccessControlProvider = { can: vi.fn(async () => { throw new HttpError('Unauthorized', 401); }) };
    const app = mount(source, { authProvider: owner });
    await waitFor(() => expect(owner.logout).toHaveBeenCalledOnce());
    await tick();
    expect(captureAuthLiveScope(owner).available).toBe(false);
    expect(source.can).toHaveBeenCalledOnce();
    expect(app.read().can.allowed).toBe(false);
    expect(app.read().can.isLoading).toBe(false);
  });

  it.each(['login', 'provider', 'tenant', 'id', 'disabled', 'unmount'] as const)(
    'suppresses a pending auth instruction after %s', async change => {
      const instruction = deferred<AuthErrorResult>();
      const owner = auth();
      owner.onError = vi.fn(() => instruction.promise);
      const source: AccessControlProvider = {
        can: vi.fn<AccessControlProvider['can']>().mockRejectedValueOnce(new HttpError('Unauthorized', 401))
          .mockResolvedValue({ can: true }),
      };
      const app = mount(source, { authProvider: owner });
      await waitFor(() => expect(owner.onError).toHaveBeenCalledOnce());
      switch (change) {
        case 'login': await app.read().login.mutate({}); break;
        case 'provider': await app.view.rerender({ accessControlProvider: policy() }); break;
        case 'tenant': await app.view.rerender({ tenant: 'second' }); break;
        case 'id': await app.view.rerender({ options: { resource: 'posts', action: 'edit', id: 2 } }); break;
        case 'disabled': await app.view.rerender({ options: {
          resource: 'posts', action: 'edit', id: 1, queryOptions: { enabled: false },
        } }); break;
        case 'unmount': app.view.unmount(); break;
      }
      instruction.resolve({ logout: true, redirectTo: '/login' });
      await instruction.promise;
      await tick();
      expect(owner.logout).not.toHaveBeenCalled();
      if (change === 'disabled') expect(app.read().can.allowed).toBe(false);
      else if (change !== 'unmount') await waitFor(() => expect(app.read().can.allowed).toBe(true));
    },
  );
});
