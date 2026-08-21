import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthProvider, CheckResult, DataProvider, ResourceDefinition, RouterProvider } from '@svadmin/core';
import { resetContext } from '@svadmin/core';
import AdminApp from './AdminApp.svelte';
import TestPage from './admin-app-auth-navigation.test-page.svelte';

function createDataProvider(): DataProvider {
  return {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'test' } }),
    create: async () => ({ data: { id: 'test' } }),
    update: async () => ({ data: { id: 'test' } }),
    deleteOne: async () => ({ data: { id: 'test' } }),
    getApiUrl: () => 'https://example.test',
  } as DataProvider;
}

function deferredCheck() {
  let resolve!: (result: CheckResult) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<CheckResult>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function deferredNavigation() {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function createTestRouter(go: RouterProvider['go']): RouterProvider {
  return {
    go,
    back: () => {},
    parse: () => {
      const pathname = window.location.hash.replace(/^#/, '').split('?')[0] || '/';
      const segments = pathname.split('/').filter(Boolean);
      return {
        resource: segments[0],
        action: segments[1],
        id: segments[2],
        params: {},
        pathname,
      };
    },
    formatLink: (path) => `#${path.replace(/^#/, '')}`,
  };
}

const resources: ResourceDefinition[] = [{
  name: 'posts',
  label: 'Posts',
  fields: [],
}];

let pageMountedListener: (() => void) | undefined;

function createAuthProvider(check: AuthProvider['check']): AuthProvider {
  return {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check,
    getIdentity: async () => ({ id: 'admin', name: 'Admin' }),
  };
}

beforeEach(() => {
  window.location.hash = '#/';
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({
      cancel: () => {},
      finished: Promise.resolve(),
    }),
  });
  resetContext();
});

afterEach(() => {
  if (pageMountedListener) {
    window.removeEventListener('svadmin:test-page-mounted', pageMountedListener);
    pageMountedListener = undefined;
  }
  cleanup();
  resetContext();
  vi.restoreAllMocks();
});

describe('AdminApp authenticated navigation', () => {
  it('blocks the layout until the initial auth check completes', async () => {
    const initialCheck = deferredCheck();

    const view = render(AdminApp, {
      dataProvider: createDataProvider(),
      authProvider: createAuthProvider(() => initialCheck.promise),
      resources,
    });

    expect(view.queryByRole('complementary', { name: 'Sidebar navigation' })).toBeNull();
    expect(view.getByText('Loading...')).not.toBeNull();

    initialCheck.resolve({ authenticated: true });
    await waitFor(() => expect(view.getByRole('complementary', { name: 'Sidebar navigation' })).not.toBeNull());
  });

  it('keeps the authenticated layout mounted while a route recheck is pending', async () => {
    const recheck = deferredCheck();
    const pageMounted = vi.fn();
    pageMountedListener = pageMounted;
    window.addEventListener('svadmin:test-page-mounted', pageMountedListener);
    const check = vi.fn<AuthProvider['check']>()
      .mockResolvedValueOnce({ authenticated: true })
      .mockImplementation(() => recheck.promise);

    const view = render(AdminApp, {
      dataProvider: createDataProvider(),
      authProvider: createAuthProvider(check),
      resources,
      resourcePages: { posts: { list: TestPage } },
    });

    const postsLink = await waitFor(() => view.getByRole('link', { name: 'Posts' }));
    expect(view.queryByRole('complementary', { name: 'Sidebar navigation' })).not.toBeNull();

    await fireEvent.click(postsLink);
    await waitFor(() => expect(check).toHaveBeenCalledTimes(2));

    expect(view.queryByRole('complementary', { name: 'Sidebar navigation' })).not.toBeNull();
    expect(view.queryByRole('region', { name: 'Posts page' })).toBeNull();
    expect(pageMounted).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('#/');

    recheck.resolve({ authenticated: true });
    await waitFor(() => expect(view.getByRole('region', { name: 'Posts page' })).not.toBeNull());
    expect(pageMounted).toHaveBeenCalledTimes(1);
  });

  it('blocks the layout again when the auth provider changes', async () => {
    const replacementCheck = deferredCheck();
    const dataProvider = createDataProvider();
    const initialAuthProvider = createAuthProvider(async () => ({ authenticated: true }));
    const replacementAuthProvider = createAuthProvider(() => replacementCheck.promise);
    const view = render(AdminApp, {
      dataProvider,
      authProvider: initialAuthProvider,
      resources,
    });

    await waitFor(() => expect(view.getByRole('complementary', { name: 'Sidebar navigation' })).not.toBeNull());

    await view.rerender({
      dataProvider,
      authProvider: replacementAuthProvider,
      resources,
    });

    expect(view.queryByRole('complementary', { name: 'Sidebar navigation' })).toBeNull();
    expect(view.getByText('Loading...')).not.toBeNull();

    replacementCheck.resolve({ authenticated: true });
    await waitFor(() => expect(view.getByRole('complementary', { name: 'Sidebar navigation' })).not.toBeNull());
  });

  it('does not mount a protected standalone page before an external route recheck completes', async () => {
    const recheck = deferredCheck();
    const check = vi.fn<AuthProvider['check']>()
      .mockResolvedValueOnce({ authenticated: true })
      .mockImplementation(() => recheck.promise);
    const view = render(AdminApp, {
      dataProvider: createDataProvider(),
      authProvider: createAuthProvider(check),
      resources,
    });

    await waitFor(() => expect(view.getByRole('complementary', { name: 'Sidebar navigation' })).not.toBeNull());

    window.location.hash = '#/2fa';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await waitFor(() => expect(check).toHaveBeenCalledTimes(2));

    expect(view.queryByRole('complementary', { name: 'Sidebar navigation' })).not.toBeNull();
    expect(view.container.querySelector('[data-svadmin-content-page="auth-2fa"]')).toBeNull();
    expect(view.getByText('Loading...')).not.toBeNull();

    recheck.resolve({ authenticated: true });
    await waitFor(() => expect(view.container.querySelector('[data-svadmin-content-page="auth-2fa"]')).not.toBeNull());
  });

  it('does not let a stale async router commit overwrite a replacement auth provider', async () => {
    const navigation = deferredNavigation();
    const routerGo = vi.fn<RouterProvider['go']>(() => navigation.promise);
    const router = createTestRouter(routerGo);
    const dataProvider = createDataProvider();
    const initialAuthProvider = createAuthProvider(async () => ({ authenticated: true }));
    const replacementAuthProvider = createAuthProvider(async () => ({ authenticated: true }));
    const view = render(AdminApp, {
      dataProvider,
      authProvider: initialAuthProvider,
      routerProvider: router,
      resources,
    });

    const postsLink = await waitFor(() => view.getByRole('link', { name: 'Posts' }));
    await fireEvent.click(postsLink);
    await waitFor(() => expect(routerGo).toHaveBeenCalledTimes(1));

    await view.rerender({
      dataProvider,
      authProvider: replacementAuthProvider,
      routerProvider: router,
      resources,
    });
    await waitFor(() => expect(view.getByRole('complementary', { name: 'Sidebar navigation' })).not.toBeNull());

    navigation.resolve();
    await navigation.promise;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(view.queryByRole('complementary', { name: 'Sidebar navigation' })).not.toBeNull();
    expect(view.queryByText('Loading...')).toBeNull();
  });

  it('removes the layout and redirects when a route recheck expires', async () => {
    const recheck = deferredCheck();
    const check = vi.fn<AuthProvider['check']>()
      .mockResolvedValueOnce({ authenticated: true })
      .mockImplementation(() => recheck.promise);

    const view = render(AdminApp, {
      dataProvider: createDataProvider(),
      authProvider: createAuthProvider(check),
      resources,
      resourcePages: { posts: { list: TestPage } },
    });

    const postsLink = await waitFor(() => view.getByRole('link', { name: 'Posts' }));
    await fireEvent.click(postsLink);
    await waitFor(() => expect(check).toHaveBeenCalledTimes(2));

    recheck.resolve({ authenticated: false, redirectTo: '/login' });

    await waitFor(() => expect(window.location.hash).toBe('#/login'));
    expect(view.queryByRole('complementary', { name: 'Sidebar navigation' })).toBeNull();
    expect(view.queryByRole('region', { name: 'Posts page' })).toBeNull();
  });

  it('removes the layout and redirects when a route recheck fails', async () => {
    const recheck = deferredCheck();
    const check = vi.fn<AuthProvider['check']>()
      .mockResolvedValueOnce({ authenticated: true })
      .mockImplementation(() => recheck.promise);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const view = render(AdminApp, {
      dataProvider: createDataProvider(),
      authProvider: createAuthProvider(check),
      resources,
      resourcePages: { posts: { list: TestPage } },
    });

    const postsLink = await waitFor(() => view.getByRole('link', { name: 'Posts' }));
    await fireEvent.click(postsLink);
    await waitFor(() => expect(check).toHaveBeenCalledTimes(2));

    recheck.reject(new Error('session check failed'));

    await waitFor(() => expect(window.location.hash).toBe('#/login'));
    expect(view.queryByRole('complementary', { name: 'Sidebar navigation' })).toBeNull();
    expect(view.queryByRole('region', { name: 'Posts page' })).toBeNull();
  });
});
