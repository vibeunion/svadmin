import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import type { AuthProvider } from './types';
import type { PermissionHintsState } from './permission-hints.test.types';
import { resetContext } from './context.svelte';
import { resetLogoutVersion } from './auth-hooks.svelte';
import { PermissionHintsError } from './permission-hints-contract';
import Host from './permission-hints.test-host.svelte';

function mount(getPermissions?: AuthProvider['getPermissions']) {
  const provider: AuthProvider = {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    getIdentity: async () => ({ id: 'user-1' }),
    ...(getPermissions ? { getPermissions } : {}),
  };
  let state: PermissionHintsState | undefined;
  const view = render(Host, { provider, onReady: (value: PermissionHintsState) => { state = value; } });
  return {
    view, provider,
    read() {
      if (!state) throw new Error('Expected mounted permission hints.');
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

describe('validated permission hints', () => {
  it('starts without grants and supports a provider without permission hints', async () => {
    const app = mount();
    await waitFor(() => expect(app.read().permissions.isLoading).toBe(false));
    expect(app.read().permissions.raw).toBeNull();
    expect(app.read().permissions.has('admin')).toBe(false);
    expect(app.read().permissions.error).toBeNull();
  });

  it('exposes only immutable validated hints and never grants inherited keys', async () => {
    const app = mount(async () => ({ 'posts:read': true, 'posts:delete': false }));
    await waitFor(() => expect(app.read().permissions.can('posts', 'read')).toBe(true));
    const permissions = app.read().permissions;
    expect(permissions.can('posts', 'delete')).toBe(false);
    expect(permissions.has('constructor')).toBe(false);
    expect(Object.isFrozen(permissions.raw)).toBe(true);
  });

  it('rejects malformed provider results without exposing their contents', async () => {
    const app = mount(async () => ({ admin: 'private-token' }));
    await waitFor(() => expect(app.read().permissions.error?.code).toBe('INVALID_PERMISSION_HINTS'));
    expect(app.read().permissions.raw).toBeNull();
    expect(app.read().permissions.has('admin')).toBe(false);
    expect(String(app.read().permissions.error)).not.toContain('private-token');
  });

  it('clears old grants when refreshing and keeps them cleared after failure', async () => {
    const next = deferred();
    let calls = 0;
    const app = mount(() => ++calls === 1 ? Promise.resolve(['admin']) : next.promise);
    await waitFor(() => expect(app.read().permissions.has('admin')).toBe(true));
    const refresh = app.read().permissions.refetch();
    expect(app.read().permissions.raw).toBeNull();
    expect(app.read().permissions.isLoading).toBe(true);
    next.reject(new Error('private-token'));
    await refresh;
    expect(app.read().permissions.raw).toBeNull();
    expect(app.read().permissions.error?.code).toBe('PERMISSION_HINTS_FAILED');
    expect(String(app.read().permissions.error)).not.toContain('private-token');
  });

  it('ignores a superseded refresh result', async () => {
    const first = deferred();
    const second = deferred();
    let calls = 0;
    const app = mount(() => ++calls === 1 ? first.promise : second.promise);
    await waitFor(() => expect(calls).toBe(1));
    const refresh = app.read().permissions.refetch();
    second.resolve(['reader']);
    await refresh;
    first.resolve(['admin']);
    await first.promise;
    flushSync();
    expect(app.read().permissions.has('reader')).toBe(true);
    expect(app.read().permissions.has('admin')).toBe(false);
  });

  it('isolates tenant changes and rejects the old tenant response', async () => {
    const first = deferred();
    const second = deferred();
    let calls = 0;
    const app = mount(() => ++calls === 1 ? first.promise : second.promise);
    await waitFor(() => expect(calls).toBe(1));
    await app.view.rerender({ tenant: 'second' });
    expect(app.read().permissions.raw).toBeNull();
    first.resolve(['admin']);
    await first.promise;
    flushSync();
    expect(app.read().permissions.has('admin')).toBe(false);
    second.resolve(['reader']);
    await waitFor(() => expect(app.read().permissions.has('reader')).toBe(true));
  });

  it('clears grants on provider replacement and ignores the old provider failure', async () => {
    const first = deferred();
    const app = mount(() => first.promise);
    await app.view.rerender({ provider: { ...app.provider, getPermissions: async () => ['reader'] } });
    await waitFor(() => expect(app.read().permissions.has('reader')).toBe(true));
    first.reject(new Error('private-token'));
    await first.promise.catch(() => {});
    flushSync();
    expect(app.read().permissions.has('reader')).toBe(true);
    expect(app.read().permissions.error).toBeNull();
  });

  it('revokes hints on logout without re-requesting stale session grants', async () => {
    const pending = deferred();
    let calls = 0;
    const getPermissions = vi.fn(() => ++calls === 1 ? Promise.resolve(['admin']) : pending.promise);
    const app = mount(getPermissions);
    await waitFor(() => expect(app.read().permissions.has('admin')).toBe(true));
    const refresh = app.read().permissions.refetch();
    await app.read().logout.mutate();
    flushSync();
    pending.resolve(['admin']);
    await refresh;
    expect(getPermissions).toHaveBeenCalledTimes(2);
    expect(app.read().permissions.raw).toBeNull();
    expect(app.read().permissions.isLoading).toBe(false);
  });

  it('does not admit a pending result or start new requests after unmount', async () => {
    const pending = deferred();
    const getPermissions = vi.fn(() => pending.promise);
    const app = mount(getPermissions);
    await waitFor(() => expect(getPermissions).toHaveBeenCalledOnce());
    const permissions = app.read().permissions;
    app.view.unmount();
    pending.resolve(['admin']);
    await pending.promise;
    await permissions.refetch();
    expect(getPermissions).toHaveBeenCalledOnce();
    expect(permissions.raw).toBeNull();
    expect(permissions.isLoading).toBe(false);
  });

  it('normalizes malformed methods and throwing method accessors without leaving loading active', async () => {
    const app = mount();
    Reflect.set(app.provider, 'getPermissions', null);
    await app.read().permissions.refetch();
    expect(app.read().permissions.error?.code).toBe('PERMISSION_HINTS_FAILED');
    expect(app.read().permissions.isLoading).toBe(false);
    Object.defineProperty(app.provider, 'getPermissions', {
      get() { throw new Error('private-token'); },
    });
    await app.read().permissions.refetch();
    expect(app.read().permissions.error?.message).toBe('Permission hints request failed.');
    expect(app.read().permissions.raw).toBeNull();
    expect(app.read().permissions.isLoading).toBe(false);
  });

  it('does not trust a provider exception to select the public failure code', async () => {
    const app = mount(async () => { throw new PermissionHintsError('INVALID_PERMISSION_HINTS'); });
    await waitFor(() => expect(app.read().permissions.error?.code).toBe('PERMISSION_HINTS_FAILED'));
    expect(app.read().permissions.raw).toBeNull();
  });
});
