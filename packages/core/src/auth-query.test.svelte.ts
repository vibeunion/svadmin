import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { resetContext } from './context.svelte';
import { resetLogoutVersion } from './auth-hooks.svelte';
import { AuthQueryError } from './auth-query-contract';
import type { AuthProvider } from './types';
import type { AuthQueryState } from './auth-query.test.types';
import Host from './auth-query.test-host.svelte';

function authProvider(): AuthProvider {
  return {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: vi.fn(async () => ({ authenticated: true })),
    getIdentity: vi.fn(async () => ({ id: 'first', name: 'Reader' })),
  };
}

function mount(provider: AuthProvider | null = authProvider()) {
  let state: AuthQueryState | undefined;
  const view = render(Host, { provider, onReady: (value: AuthQueryState) => { state = value; } });
  return {
    view,
    read() {
      if (!state) throw new Error('Expected mounted authentication queries.');
      return state;
    },
  };
}

function deferred() {
  let resolve = (_value: unknown) => {};
  let reject = (_error: unknown) => {};
  const promise = new Promise<unknown>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

afterEach(() => {
  cleanup();
  resetContext();
  resetLogoutVersion();
});

describe('validated authentication queries', () => {
  it('retains explicit no-provider mode without making a request', async () => {
    const app = mount(null);
    await waitFor(() => expect(app.read().check.isAuthenticated).toBe(true));
    expect(app.read().check.isLoading).toBe(false);
    expect(app.read().identity.data).toBeNull();
    expect(app.read().identity.isLoading).toBe(false);
    await app.read().check.refetch();
    expect(app.read().check.isAuthenticated).toBe(true);
  });

  it('invokes each provider method once on mount with its original receiver', async () => {
    const provider = authProvider();
    provider.check = vi.fn(async function(this: AuthProvider) {
      expect(this).toBe(provider);
      return { authenticated: true };
    });
    provider.getIdentity = vi.fn(async function(this: AuthProvider) {
      expect(this).toBe(provider);
      return { id: 'first' };
    });
    const app = mount(provider);
    await waitFor(() => expect(app.read().check.isAuthenticated).toBe(true));
    expect(app.read().identity.data?.id).toBe('first');
    expect(provider.check).toHaveBeenCalledOnce();
    expect(provider.getIdentity).toHaveBeenCalledOnce();
  });

  it('rejects malformed JavaScript provider replies and keeps both queries fail closed', async () => {
    const provider = authProvider();
    Reflect.set(provider, 'check', async () => ({ authenticated: 'private-token' }));
    Reflect.set(provider, 'getIdentity', async () => ({ name: 17 }));
    const app = mount(provider);
    await waitFor(() => expect(app.read().check.error?.code).toBe('INVALID_AUTH_CHECK'));
    expect(app.read().identity.error?.code).toBe('INVALID_AUTH_IDENTITY');
    expect(app.read().identity.data).toBeNull();
    expect(app.read().check.isAuthenticated).toBe(false);
    expect(app.read().check.isLoading).toBe(false);
    expect(String(app.read().check.error)).not.toContain('private-token');
  });

  it('withdraws identity and authentication immediately on refresh and after rejection', async () => {
    const provider = authProvider();
    const app = mount(provider);
    await waitFor(() => expect(app.read().check.isAuthenticated).toBe(true));
    const identity = deferred();
    const check = deferred();
    Reflect.set(provider, 'getIdentity', () => identity.promise);
    Reflect.set(provider, 'check', () => check.promise);
    const refreshIdentity = app.read().identity.refetch();
    const refreshCheck = app.read().check.refetch();
    expect(app.read().identity.data).toBeNull();
    expect(app.read().check.isAuthenticated).toBe(false);
    expect(app.read().identity.isLoading).toBe(true);
    expect(app.read().check.isLoading).toBe(true);
    identity.reject(new Error('private-token'));
    check.reject(new AuthQueryError('INVALID_AUTH_CHECK'));
    await Promise.all([refreshIdentity, refreshCheck]);
    expect(app.read().identity.error?.code).toBe('AUTH_QUERY_FAILED');
    expect(app.read().check.error?.code).toBe('AUTH_QUERY_FAILED');
    expect(app.read().identity.data).toBeNull();
    expect(app.read().check.isAuthenticated).toBe(false);
    expect(String(app.read().identity.error)).not.toContain('private-token');
  });

  it('ignores a superseded refresh, including its failure', async () => {
    const first = deferred();
    const provider = authProvider();
    Reflect.set(provider, 'check', () => first.promise);
    Reflect.set(provider, 'getIdentity', () => first.promise);
    const app = mount(provider);
    await waitFor(() => expect(app.read().check.isLoading).toBe(true));
    provider.check = async () => ({ authenticated: true });
    provider.getIdentity = async () => ({ id: 'second' });
    await Promise.all([app.read().identity.refetch(), app.read().check.refetch()]);
    first.reject(new Error('private-token'));
    await first.promise.catch(() => {});
    flushSync();
    expect(app.read().identity.data?.id).toBe('second');
    expect(app.read().check.isAuthenticated).toBe(true);
    expect(app.read().identity.error).toBeNull();
    expect(app.read().check.error).toBeNull();
  });

  it.each(['tenant', 'provider'] as const)('isolates pending results across %s changes', async change => {
    const firstIdentity = deferred();
    const firstCheck = deferred();
    const provider = authProvider();
    Reflect.set(provider, 'getIdentity', () => firstIdentity.promise);
    Reflect.set(provider, 'check', () => firstCheck.promise);
    const app = mount(provider);
    await waitFor(() => expect(app.read().identity.isLoading).toBe(true));
    const second = change === 'provider' ? authProvider() : provider;
    second.getIdentity = async () => ({ id: 'second' });
    second.check = async () => ({ authenticated: false });
    await app.view.rerender({ provider: second, tenant: 'second' });
    await waitFor(() => expect(app.read().identity.data?.id).toBe('second'));
    firstIdentity.resolve({ id: 'first' });
    firstCheck.resolve({ authenticated: true });
    await Promise.all([firstIdentity.promise, firstCheck.promise]);
    flushSync();
    expect(app.read().identity.data?.id).toBe('second');
    expect(app.read().check.isAuthenticated).toBe(false);
  });

  it('revokes both results on logout without re-requesting the old session', async () => {
    const provider = authProvider();
    const app = mount(provider);
    await waitFor(() => expect(app.read().check.isAuthenticated).toBe(true));
    const pending = deferred();
    const identity = vi.fn(() => pending.promise);
    const check = vi.fn(() => pending.promise);
    Reflect.set(provider, 'getIdentity', identity);
    Reflect.set(provider, 'check', check);
    const requests = [app.read().identity.refetch(), app.read().check.refetch()];
    await app.read().logout.mutate();
    expect(app.read().identity.data).toBeNull();
    expect(app.read().check.isAuthenticated).toBe(false);
    flushSync();
    pending.resolve({ authenticated: true, id: 'first' });
    await Promise.all(requests);
    expect(identity).toHaveBeenCalledOnce();
    expect(check).toHaveBeenCalledOnce();
    expect(app.read().identity.data).toBeNull();
    expect(app.read().check.isAuthenticated).toBe(false);
    expect(app.read().identity.isLoading).toBe(false);
    expect(app.read().check.isLoading).toBe(false);
  });

  it('does not publish results or start requests after unmount', async () => {
    const pending = deferred();
    const provider = authProvider();
    const request = vi.fn(() => pending.promise);
    Reflect.set(provider, 'getIdentity', request);
    Reflect.set(provider, 'check', request);
    const app = mount(provider);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    const state = app.read();
    app.view.unmount();
    pending.resolve({ authenticated: true, id: 'first' });
    await pending.promise;
    await Promise.all([state.identity.refetch(), state.check.refetch()]);
    expect(request).toHaveBeenCalledTimes(2);
    expect(state.identity.data).toBeNull();
    expect(state.check.isAuthenticated).toBe(false);
    expect(state.identity.isLoading).toBe(false);
    expect(state.check.isLoading).toBe(false);
  });

  it.each(['check', 'getIdentity'] as const)('normalizes missing and throwing %s methods', async method => {
    const provider = authProvider();
    Reflect.set(provider, method, null);
    const app = mount(provider);
    const read = () => method === 'check' ? app.read().check : app.read().identity;
    await waitFor(() => expect(read().error?.code).toBe('AUTH_QUERY_FAILED'));
    expect(read().isLoading).toBe(false);
    Object.defineProperty(provider, method, { get() { throw new Error('private-token'); } });
    await read().refetch();
    expect(read().error?.code).toBe('AUTH_QUERY_FAILED');
    expect(read().isLoading).toBe(false);
    expect(String(read().error)).not.toContain('private-token');
  });
});
