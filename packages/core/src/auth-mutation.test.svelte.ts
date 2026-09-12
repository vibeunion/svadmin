import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { resetContext } from './context.svelte';
import { resetLogoutVersion } from './auth-hooks.svelte';
import { AuthMutationError } from './auth-mutation-contract';
import { beforeEach as registerGuard } from './router';
import type { AuthProvider, NotificationProvider } from './types';
import type { RouterProvider } from './router-provider';
import type { AuthQueryState } from './auth-query.test.types';
import Host from './auth-query.test-host.svelte';

function authProvider(): AuthProvider {
  return {
    login: vi.fn(async () => ({ success: true, redirectTo: '/posts' })),
    logout: vi.fn(async () => ({ success: true, redirectTo: '/login' })),
    register: vi.fn(async () => ({ success: true })),
    forgotPassword: vi.fn(async () => ({ success: true })),
    updatePassword: vi.fn(async () => ({ success: true })),
    updateIdentity: vi.fn(async () => ({ success: true })),
    updateProfile: vi.fn(async () => ({ success: true })),
    check: vi.fn(async () => ({ authenticated: true })),
    getIdentity: vi.fn(async () => ({ id: 'reader' })),
  };
}

function mount(provider: AuthProvider | null = authProvider()) {
  let state: AuthQueryState | undefined;
  const router: RouterProvider = {
    go: vi.fn(), back: vi.fn(), parse: () => ({ pathname: '/', params: {} }),
  };
  const notification: NotificationProvider = { open: vi.fn(), close: vi.fn() };
  const queryClient = new QueryClient();
  const view = render(Host, {
    provider, routerProvider: router, notificationProvider: notification, queryClient,
    onReady: (value: AuthQueryState) => { state = value; },
  });
  return {
    view, router, notification, queryClient,
    read() {
      if (!state) throw new Error('Expected mounted authentication hooks.');
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

describe('validated authentication mutations', () => {
  it('runs the actual login hook with a detached payload and refreshes session queries', async () => {
    const pending = deferred();
    const provider = authProvider();
    const login = vi.fn(() => pending.promise);
    Reflect.set(provider, 'login', login);
    const app = mount(provider);
    await waitFor(() => expect(app.read().identity.data?.id).toBe('reader'));
    const params = { credentials: { password: 'before' } };
    const task = app.read().login.mutate(params);
    params.credentials.password = 'after';
    expect(login).toHaveBeenCalledWith({ credentials: { password: 'before' } });
    expect(app.read().login.isLoading).toBe(true);
    provider.getIdentity = vi.fn(async () => ({ id: 'new-session' }));
    pending.resolve({ success: true, redirectTo: '/posts' });
    expect(await task).toEqual({ success: true, redirectTo: '/posts' });
    expect(app.read().login.isLoading).toBe(false);
    expect(app.router.go).toHaveBeenCalledWith({ to: '/posts', type: 'push' });
    await waitFor(() => expect(app.read().identity.data?.id).toBe('new-session'));
  });

  it.each(['register', 'forgotPassword', 'updatePassword', 'updateIdentity', 'updateProfile'] as const)(
    'dispatches the %s hook through the validated method', async method => {
      const provider = authProvider();
      const app = mount(provider);
      await waitFor(() => expect(app.read().identity.isLoading).toBe(false));
      expect(await app.read()[method].mutate({ name: 'Reader' })).toEqual({ success: true });
      expect(provider[method]).toHaveBeenCalledWith({ name: 'Reader' });
      expect(app.read()[method].isLoading).toBe(false);
    },
  );

  it('preserves an avatar File in the actual profile hook', async () => {
    const provider = authProvider();
    const app = mount(provider);
    await waitFor(() => expect(app.read().identity.isLoading).toBe(false));
    const avatar = new File(['image'], 'avatar.png', { type: 'image/png' });
    expect((await app.read().updateProfile.mutate({ avatar })).success).toBe(true);
    expect(provider.updateProfile).toHaveBeenCalledWith({ avatar });
  });

  it('rejects invalid JavaScript input before invoking any provider method', async () => {
    const provider = authProvider();
    const app = mount(provider);
    await waitFor(() => expect(app.read().identity.isLoading).toBe(false));
    const result: unknown = await Reflect.apply(app.read().updateProfile.mutate, null, [{ name: 1 }]);
    expect(result).toMatchObject({ success: false, error: { name: 'INVALID_AUTH_INPUT' } });
    expect(provider.updateProfile).not.toHaveBeenCalled();
    expect(app.router.go).not.toHaveBeenCalled();
    expect(app.read().updateProfile.isLoading).toBe(false);
  });

  it.each([
    { success: 'true' }, { success: true, redirectTo: '//example.test' },
    { success: true, error: { message: 'private-token' } },
  ])('rejects malformed receipts without navigating %#', async response => {
    const provider = authProvider();
    Reflect.set(provider, 'login', async () => response);
    const app = mount(provider);
    await waitFor(() => expect(app.read().identity.isLoading).toBe(false));
    const result = await app.read().login.mutate({});
    expect(result).toMatchObject({ success: false, error: { name: 'INVALID_AUTH_RESULT' } });
    expect(JSON.stringify(result)).not.toContain('private-token');
    expect(app.router.go).not.toHaveBeenCalled();
    expect(app.read().login.isLoading).toBe(false);
  });

  it('normalizes provider throws separately from decoded rejection and never displays raw messages', async () => {
    const provider = authProvider();
    provider.login = async () => { throw new AuthMutationError('INVALID_AUTH_INPUT'); };
    const app = mount(provider);
    await waitFor(() => expect(app.read().identity.isLoading).toBe(false));
    expect(await app.read().login.mutate({})).toMatchObject({ error: { name: 'AUTH_REQUEST_FAILED' } });
    provider.login = async () => ({ success: false, error: { message: 'private-token' } });
    expect(await app.read().login.mutate({})).toMatchObject({ error: { name: 'AUTH_REJECTED' } });
    expect(JSON.stringify(vi.mocked(app.notification.open).mock.calls)).not.toContain('private-token');
    expect(app.router.go).not.toHaveBeenCalled();
  });

  it('reports an absent provider or a throwing method getter as unavailable', async () => {
    const app = mount(null);
    await waitFor(() => expect(app.read().check.isLoading).toBe(false));
    expect(await app.read().login.mutate({})).toMatchObject({ error: { name: 'AUTH_METHOD_UNAVAILABLE' } });
    const provider = authProvider();
    Object.defineProperty(provider, 'login', { get() { throw new Error('private-token'); } });
    await app.view.rerender({ provider });
    expect(await app.read().login.mutate({})).toMatchObject({ error: { name: 'AUTH_METHOD_UNAVAILABLE' } });
    expect(app.read().login.isLoading).toBe(false);
  });

  it.each(['tenant', 'provider', 'unmount'] as const)('discards late login results after %s changes', async change => {
    const pending = deferred();
    const provider = authProvider();
    Reflect.set(provider, 'login', () => pending.promise);
    const app = mount(provider);
    await waitFor(() => expect(app.read().identity.isLoading).toBe(false));
    const login = app.read().login;
    const task = login.mutate({});
    if (change === 'tenant') await app.view.rerender({ tenant: 'second' });
    if (change === 'provider') await app.view.rerender({ provider: authProvider() });
    if (change === 'unmount') app.view.unmount();
    pending.resolve({ success: true, redirectTo: '/old' });
    expect(await task).toMatchObject({ error: { name: 'AUTH_RESULT_SUPERSEDED' } });
    expect(app.router.go).not.toHaveBeenCalled();
    expect(app.notification.open).not.toHaveBeenCalled();
    expect(login.isLoading).toBe(false);
  });

  it('isolates concurrent calls even when they reuse the same input object', async () => {
    const first = deferred();
    const second = deferred();
    let calls = 0;
    const provider = authProvider();
    Reflect.set(provider, 'login', () => ++calls === 1 ? first.promise : second.promise);
    const app = mount(provider);
    await waitFor(() => expect(app.read().identity.isLoading).toBe(false));
    const input = { identifier: 'reader' };
    const old = app.read().login.mutate(input);
    const current = app.read().login.mutate(input);
    first.resolve({ success: true, redirectTo: '/old' });
    expect(await old).toMatchObject({ error: { name: 'AUTH_RESULT_SUPERSEDED' } });
    expect(app.read().login.isLoading).toBe(true);
    second.resolve({ success: true, redirectTo: '/current' });
    expect((await current).success).toBe(true);
    expect(app.router.go).toHaveBeenCalledTimes(1);
    expect(app.router.go).toHaveBeenCalledWith({ to: '/current', type: 'push' });
  });

  it('does not cancel another provider tree when a separate tree logs out', async () => {
    const pending = deferred();
    const provider = authProvider();
    Reflect.set(provider, 'login', () => pending.promise);
    const first = mount(provider);
    const second = mount();
    await waitFor(() => expect(first.read().identity.data?.id).toBe('reader'));
    await waitFor(() => expect(second.read().identity.data?.id).toBe('reader'));
    const login = first.read().login.mutate({});
    await second.read().logout.mutate();
    flushSync();
    expect(first.read().identity.data?.id).toBe('reader');
    expect(first.read().login.isLoading).toBe(true);
    pending.resolve({ success: true, redirectTo: '/first' });
    expect((await login).success).toBe(true);
    expect(first.router.go).toHaveBeenCalledWith({ to: '/first', type: 'push' });
  });

  it('clears query caches only after a validated logout and ignores a late login', async () => {
    const pending = deferred();
    const provider = authProvider();
    Reflect.set(provider, 'login', () => pending.promise);
    const app = mount(provider);
    await waitFor(() => expect(app.read().check.isAuthenticated).toBe(true));
    app.queryClient.setQueryData(['private'], 'record');
    Reflect.set(provider, 'logout', async () => ({ success: 'true' }));
    expect((await app.read().logout.mutate()).success).toBe(false);
    expect(app.queryClient.getQueryData(['private'])).toBe('record');
    provider.logout = async () => ({ success: true });
    const login = app.read().login.mutate({});
    expect((await app.read().logout.mutate()).success).toBe(true);
    expect(app.queryClient.getQueryData(['private'])).toBeUndefined();
    pending.resolve({ success: true, redirectTo: '/private' });
    expect(await login).toMatchObject({ error: { name: 'AUTH_RESULT_SUPERSEDED' } });
    flushSync();
    expect(app.read().identity.data).toBeNull();
    expect(app.read().check.isAuthenticated).toBe(false);
    expect(app.router.go).toHaveBeenCalledTimes(1);
    expect(app.router.go).toHaveBeenCalledWith({ to: '/login', type: 'push' });
  });

  it('honors the later logout intent even when the earlier login completes first', async () => {
    const loginReply = deferred();
    const logoutReply = deferred();
    const provider = authProvider();
    Reflect.set(provider, 'login', () => loginReply.promise);
    Reflect.set(provider, 'logout', () => logoutReply.promise);
    const app = mount(provider);
    await waitFor(() => expect(app.read().check.isAuthenticated).toBe(true));
    app.queryClient.setQueryData(['private'], 'record');
    const login = app.read().login.mutate({});
    const logout = app.read().logout.mutate();
    loginReply.resolve({ success: true, redirectTo: '/private' });
    expect(await login).toMatchObject({ error: { name: 'AUTH_RESULT_SUPERSEDED' } });
    expect(app.read().logout.isLoading).toBe(true);
    logoutReply.resolve({ success: true });
    expect((await logout).success).toBe(true);
    expect(app.read().check.isAuthenticated).toBe(false);
    expect(app.queryClient.getQueryData(['private'])).toBeUndefined();
    expect(app.router.go).toHaveBeenCalledTimes(1);
    expect(app.router.go).toHaveBeenCalledWith({ to: '/login', type: 'push' });
  });

  it('cancels login navigation while awaiting a guard if its tenant changes', async () => {
    const app = mount();
    await waitFor(() => expect(app.read().identity.isLoading).toBe(false));
    let proceed = (_allowed: boolean) => {};
    const guard = vi.fn(() => new Promise<boolean>(resolve => { proceed = resolve; }));
    registerGuard(guard);
    const login = app.read().login.mutate({});
    await waitFor(() => expect(guard).toHaveBeenCalledOnce());
    await app.view.rerender({ tenant: 'second' });
    proceed(true);
    expect(await login).toMatchObject({ error: { name: 'AUTH_RESULT_SUPERSEDED' } });
    expect(app.router.go).not.toHaveBeenCalled();
  });

  it('does not change a confirmed action result when presentation fails', async () => {
    const app = mount();
    await waitFor(() => expect(app.read().identity.isLoading).toBe(false));
    vi.mocked(app.notification.open).mockImplementation(() => { throw new Error('private-token'); });
    vi.mocked(app.router.go).mockImplementation(() => { throw new Error('private-router'); });
    expect(await app.read().login.mutate({})).toEqual({ success: true, redirectTo: '/posts' });
    expect(app.read().login.isLoading).toBe(false);
  });

  it('validates error-driven logout before clearing cache and revoking identity', async () => {
    const provider = authProvider();
    provider.onError = vi.fn(async () => ({ logout: true, redirectTo: '/expired' }));
    const app = mount(provider);
    await waitFor(() => expect(app.read().check.isAuthenticated).toBe(true));
    app.queryClient.setQueryData(['private'], 'record');
    const error = new Error('upstream');
    expect(await app.read().onError.mutate(error)).toEqual({ status: 'handled' });
    expect(provider.onError).toHaveBeenCalledWith(error);
    expect(provider.logout).toHaveBeenCalledOnce();
    expect(app.queryClient.getQueryData(['private'])).toBeUndefined();
    expect(app.read().identity.data).toBeNull();
    expect(app.read().check.isAuthenticated).toBe(false);
    expect(app.router.go).toHaveBeenCalledWith({ to: '/expired', type: 'push' });
  });

  it.each([
    null, { logout: 'true' }, { logout: true, redirectTo: '//example.test' },
  ].map(value => ({ value })))('does not act on malformed error-handler instructions %#', async ({ value }) => {
    const provider = authProvider();
    Reflect.set(provider, 'onError', async () => value);
    const app = mount(provider);
    await waitFor(() => expect(app.read().identity.isLoading).toBe(false));
    expect(await app.read().onError.mutate(new Error('private-token')))
      .toMatchObject({ status: 'failed', error: { code: 'INVALID_AUTH_ERROR_RESULT' } });
    expect(provider.logout).not.toHaveBeenCalled();
    expect(app.router.go).not.toHaveBeenCalled();
  });

  it('requires a validated successful logout before navigating or clearing cache', async () => {
    const provider = authProvider();
    provider.onError = async () => ({ logout: true, redirectTo: '/expired' });
    Reflect.set(provider, 'logout', async () => ({ success: 'true' }));
    const app = mount(provider);
    await waitFor(() => expect(app.read().check.isAuthenticated).toBe(true));
    app.queryClient.setQueryData(['private'], 'record');
    expect(await app.read().onError.mutate(new Error('private-token')))
      .toMatchObject({ status: 'failed', error: { code: 'AUTH_LOGOUT_FAILED' } });
    expect(app.queryClient.getQueryData(['private'])).toBe('record');
    expect(app.router.go).not.toHaveBeenCalled();
  });

  it.each(['login', 'tenant', 'unmount'] as const)('does not apply an old error-handler result after %s', async change => {
    const pending = deferred();
    const provider = authProvider();
    Reflect.set(provider, 'onError', () => pending.promise);
    const app = mount(provider);
    await waitFor(() => expect(app.read().identity.isLoading).toBe(false));
    const request = app.read().onError.mutate(new Error('old-session'));
    if (change === 'login') await app.read().login.mutate({});
    if (change === 'tenant') await app.view.rerender({ tenant: 'second' });
    if (change === 'unmount') app.view.unmount();
    vi.mocked(app.router.go).mockClear();
    pending.resolve({ logout: true, redirectTo: '/expired' });
    expect(await request).toEqual({ status: 'superseded' });
    expect(provider.logout).not.toHaveBeenCalled();
    expect(app.router.go).not.toHaveBeenCalled();
  });

  it('captures the logout method before waiting for an error handler', async () => {
    const pending = deferred();
    const provider = authProvider();
    Reflect.set(provider, 'onError', () => pending.promise);
    const original = provider.logout;
    const app = mount(provider);
    await waitFor(() => expect(app.read().identity.isLoading).toBe(false));
    const request = app.read().onError.mutate(new Error('expired'));
    provider.logout = vi.fn(async () => ({ success: true }));
    pending.resolve({ logout: true });
    expect(await request).toEqual({ status: 'handled' });
    expect(original).toHaveBeenCalledOnce();
    expect(provider.logout).not.toHaveBeenCalled();
  });

  it('discards logout completion if the error handler loses its scope during logout', async () => {
    const pending = deferred();
    const provider = authProvider();
    provider.onError = async () => ({ logout: true });
    const logout = vi.fn(() => pending.promise);
    Reflect.set(provider, 'logout', logout);
    const app = mount(provider);
    await waitFor(() => expect(app.read().identity.isLoading).toBe(false));
    const request = app.read().onError.mutate(new Error('expired'));
    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
    await app.view.rerender({ provider: authProvider() });
    app.queryClient.setQueryData(['new-session'], 'record');
    pending.resolve({ success: true });
    expect(await request).toEqual({ status: 'superseded' });
    expect(app.queryClient.getQueryData(['new-session'])).toBe('record');
    expect(app.router.go).not.toHaveBeenCalled();
  });

  it('does not read an accessor or inherited statusCode in fallback handling', async () => {
    let reads = 0;
    const app = mount();
    await waitFor(() => expect(app.read().identity.isLoading).toBe(false));
    const accessor = { get statusCode() { ++reads; return 401; } };
    const inherited: unknown = Object.create({ statusCode: 401 });
    expect(await app.read().onError.mutate(accessor)).toEqual({ status: 'ignored' });
    expect(await app.read().onError.mutate(inherited)).toEqual({ status: 'ignored' });
    expect(await app.read().onError.mutate({ statusCode: '401' })).toEqual({ status: 'ignored' });
    expect(reads).toBe(0);
    expect(app.router.go).not.toHaveBeenCalled();
    expect(await app.read().onError.mutate({ statusCode: 401 })).toEqual({ status: 'handled' });
    expect(app.router.go).toHaveBeenCalledWith({ to: '/login', type: 'push' });
  });

  it('normalizes error-handler exceptions without leaking diagnostic text', async () => {
    const provider = authProvider();
    provider.onError = async () => { throw new Error('private-token'); };
    const app = mount(provider);
    await waitFor(() => expect(app.read().identity.isLoading).toBe(false));
    const result = await app.read().onError.mutate(new Error('expired'));
    expect(result).toMatchObject({ status: 'failed', error: { code: 'AUTH_ERROR_HANDLER_FAILED' } });
    expect(JSON.stringify(result)).not.toContain('private-token');
    expect(provider.logout).not.toHaveBeenCalled();
    expect(app.router.go).not.toHaveBeenCalled();
  });
});
