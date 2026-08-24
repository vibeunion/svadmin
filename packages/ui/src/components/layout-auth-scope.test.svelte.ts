import { render, waitFor } from '@testing-library/svelte';
import { resetContext, type AuthProvider } from '@svadmin/core';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./Sidebar.svelte', async () => ({
  default: (await import('./layout-auth-scope.test-child.svelte')).default,
}));

vi.mock('./Header.svelte', async () => ({
  default: (await import('./layout-auth-scope.test-empty-child.svelte')).default,
}));
vi.mock('./CommandPalette.svelte', async () => ({
  default: (await import('./layout-auth-scope.test-empty-child.svelte')).default,
}));
vi.mock('./KeyboardShortcuts.svelte', async () => ({
  default: (await import('./layout-auth-scope.test-empty-child.svelte')).default,
}));
vi.mock('./ChatDialog.svelte', async () => ({
  default: (await import('./layout-auth-scope.test-empty-child.svelte')).default,
}));
vi.mock('./DevTools.svelte', async () => ({
  default: (await import('./layout-auth-scope.test-empty-child.svelte')).default,
}));

import LayoutAuthScopeHost from './layout-auth-scope.test-host.svelte';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function createLayoutAuthProvider(identity: Promise<{ id: string; name: string }>) {
  const getIdentity = vi.fn(() => identity);
  const provider: AuthProvider = {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    getIdentity,
  };
  return { provider, getIdentity };
}

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

afterEach(() => {
  resetContext();
  vi.restoreAllMocks();
});

describe('Layout auth scope', () => {
  it('marks the content main as an svadmin-owned style scope', async () => {
    const view = render(LayoutAuthScopeHost, {
      authProvider: undefined,
      tenant: { tenantId: 'tenant-layout-style-scope' },
    });

    await waitFor(() => expect(view.getByTestId('layout-auth-content')).not.toBeNull());

    expect(view.container.querySelector('main[data-svadmin-main]')).not.toBeNull();
  });

  it('clears the previous identity while the next auth provider is pending', async () => {
    const pendingIdentity = createDeferred<{ id: string; name: string }>();
    const firstAuth = createLayoutAuthProvider(Promise.resolve({ id: 'first', name: 'first layout user' }));
    const nextAuth = createLayoutAuthProvider(pendingIdentity.promise);
    const view = render(LayoutAuthScopeHost, {
      authProvider: firstAuth.provider,
      tenant: { tenantId: 'tenant-layout-first' },
    });

    await waitFor(() => expect(view.getAllByText('first layout user')).not.toHaveLength(0));
    await view.rerender({
      authProvider: nextAuth.provider,
      tenant: { tenantId: 'tenant-layout-next' },
    });
    await tick();

    expect(view.queryAllByText('first layout user')).toHaveLength(0);
    expect(nextAuth.getIdentity).toHaveBeenCalledTimes(1);
    pendingIdentity.resolve({ id: 'next', name: 'next layout user' });
    await waitFor(() => expect(view.getAllByText('next layout user')).not.toHaveLength(0));
  });

  it('clears identity and rejects a late result after auth becomes undefined', async () => {
    const staleIdentity = createDeferred<{ id: string; name: string }>();
    const staleAuth = createLayoutAuthProvider(staleIdentity.promise);
    const view = render(LayoutAuthScopeHost, {
      authProvider: staleAuth.provider,
      tenant: { tenantId: 'tenant-layout' },
    });

    await waitFor(() => expect(staleAuth.getIdentity).toHaveBeenCalledTimes(1));
    await view.rerender({
      authProvider: undefined,
      tenant: { tenantId: 'tenant-layout' },
    });
    await waitFor(() => expect(view.getByTestId('layout-auth-content')).not.toBeNull());

    staleIdentity.resolve({ id: 'stale', name: 'stale layout user' });
    await staleIdentity.promise;
    await tick();

    expect(view.queryAllByText('stale layout user')).toHaveLength(0);
    expect(view.getByTestId('layout-auth-content')).not.toBeNull();
  });
});
