import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RouterProvider } from './router-provider';
import {
  afterEach as registerAfterEach,
  beforeEach as registerBeforeEach,
  currentPathWithProvider,
  formatLinkWithProvider,
  navigateWithProvider,
  registerRouterSync,
  resetRouter,
} from './router';

function createRouter(): RouterProvider {
  return {
    go: vi.fn(),
    back: vi.fn(),
    parse: () => ({
      resource: 'posts',
      params: { page: '2' },
      pathname: '/posts',
    }),
    formatLink: (path) => `/admin${path}`,
  };
}

afterEach(() => {
  resetRouter();
  registerRouterSync(() => {});
});

describe('scoped router navigation', () => {
  it('preserves guards, router sync and after hooks for an explicit provider', async () => {
    const router = createRouter();
    const guard = vi.fn(async () => true);
    const after = vi.fn();
    const sync = vi.fn();
    registerBeforeEach(guard);
    registerAfterEach(after);
    registerRouterSync(sync);

    await navigateWithProvider(router, '/posts/edit/1', { replaceState: true });

    expect(guard).toHaveBeenCalledWith('/posts/edit/1', '/posts?page=2');
    expect(router.go).toHaveBeenCalledWith({ to: '/posts/edit/1', type: 'replace' });
    expect(sync).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledWith('/posts/edit/1', '/posts?page=2');
  });

  it('waits for an asynchronous provider before syncing and running after hooks', async () => {
    let finishNavigation!: () => void;
    const navigation = new Promise<void>((resolve) => {
      finishNavigation = resolve;
    });
    const router = createRouter();
    router.go = vi.fn(() => navigation);
    const after = vi.fn();
    const sync = vi.fn();
    registerAfterEach(after);
    registerRouterSync(sync);

    const pending = navigateWithProvider(router, '/posts/edit/1');
    await Promise.resolve();

    expect(sync).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();

    finishNavigation();
    await pending;

    expect(sync).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledWith('/posts/edit/1', '/posts?page=2');
  });

  it('does not navigate or sync when a guard rejects the route', async () => {
    const router = createRouter();
    const sync = vi.fn();
    registerBeforeEach(() => false);
    registerRouterSync(sync);

    await navigateWithProvider(router, '/blocked');

    expect(router.go).not.toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
  });

  it('does not sync or run after hooks when the provider cancels navigation', async () => {
    const router = createRouter();
    router.go = vi.fn(async () => false as const);
    const after = vi.fn();
    const sync = vi.fn();
    registerAfterEach(after);
    registerRouterSync(sync);

    await navigateWithProvider(router, '/cancelled');

    expect(sync).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it('uses the explicit provider for current paths and formatted links', () => {
    const router = createRouter();

    expect(currentPathWithProvider(router)).toBe('/posts?page=2');
    expect(formatLinkWithProvider(router, '/posts')).toBe('/admin/posts');
  });
});
