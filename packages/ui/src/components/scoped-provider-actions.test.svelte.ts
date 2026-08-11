import { fireEvent, render, waitFor } from '@testing-library/svelte';
import {
  resetContext,
  type AuthProvider,
  type DataProvider,
  type ResourceDefinition,
} from '@svadmin/core';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ScopedProviderActionsHost from './scoped-provider-actions.test-host.svelte';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function createDataProvider(getList: DataProvider['getList']) {
  return {
    getList,
    getOne: async () => ({ data: { id: 'test' } }),
    create: async () => ({ data: { id: 'test' } }),
    update: async () => ({ data: { id: 'test' } }),
    deleteOne: async () => ({ data: { id: 'test' } }),
    getApiUrl: () => 'https://scoped-provider-actions.example.test',
  } as DataProvider;
}

function createResource(name = 'shared-resource'): ResourceDefinition {
  return { name, label: name, fields: [] };
}

function createRolesAuthProvider(
  scope: string,
  getRolePermissions: AuthProvider['getRolePermissions'],
  updateRolePermissions: AuthProvider['updateRolePermissions'],
) {
  const provider: AuthProvider = {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    getIdentity: async () => ({ id: scope, name: `${scope} user` }),
    getRoles: async () => [{ id: 'shared-role', name: `${scope} role` }],
    getRolePermissions,
    updateRolePermissions,
  };
  return provider;
}

afterEach(() => {
  resetContext();
  vi.restoreAllMocks();
});

describe('scoped provider actions', () => {
  it('keeps a late InferencerPanel result from provider A out of provider B output', async () => {
    const staleList = createDeferred<{ data: Array<{ id: string; staleOnly: string }>; total: number }>();
    const staleGetList = vi.fn(() => staleList.promise);
    const freshGetList = vi.fn(async () => ({ data: [{ id: 'fresh', freshOnly: 'yes' }], total: 1 }));
    const staleProvider = createDataProvider(staleGetList as DataProvider['getList']);
    const freshProvider = createDataProvider(freshGetList as DataProvider['getList']);
    const view = render(ScopedProviderActionsHost, {
      consumer: 'inferencer',
      dataProvider: staleProvider,
      resources: [createResource()],
      tenant: { tenantId: 'tenant-a' },
    });

    await fireEvent.change(view.getByRole('combobox'), { target: { value: 'shared-resource' } });
    await fireEvent.click(view.getByRole('button', { name: 'Infer Fields' }));
    expect(staleGetList).toHaveBeenCalledTimes(1);
    await view.rerender({
      consumer: 'inferencer',
      dataProvider: freshProvider,
      resources: [createResource()],
      tenant: { tenantId: 'tenant-b' },
    });
    await fireEvent.click(view.getByRole('button', { name: 'Infer Fields' }));
    await waitFor(() => expect(view.getByText('freshOnly')).not.toBeNull());

    staleList.resolve({ data: [{ id: 'stale', staleOnly: 'yes' }], total: 1 });
    await staleList.promise;
    await tick();

    expect(view.queryByText('staleOnly')).toBeNull();
    expect(view.getByText('freshOnly')).not.toBeNull();
  });

  it('invalidates a pending RolesSettings mutation before provider B becomes interactive', async () => {
    const staleUpdate = createDeferred<{ success: boolean }>();
    const stalePermissions = vi.fn(async () => ({}));
    const staleUpdatePermissions = vi.fn(() => staleUpdate.promise);
    const freshPermissions = vi.fn()
      .mockResolvedValueOnce({ 'shared-resource': ['read'] })
      .mockImplementation(() => new Promise(() => {}));
    const freshUpdatePermissions = vi.fn(async () => ({ success: true }));
    const scopeA = createRolesAuthProvider('scope-a', stalePermissions, staleUpdatePermissions);
    const scopeB = createRolesAuthProvider('scope-b', freshPermissions, freshUpdatePermissions);
    const view = render(ScopedProviderActionsHost, {
      consumer: 'roles',
      authProvider: scopeA,
      resources: [createResource()],
      tenant: { tenantId: 'tenant-a' },
    });

    await waitFor(() => expect(view.getAllByText('scope-a role')).not.toHaveLength(0));
    await waitFor(() => expect(stalePermissions).toHaveBeenCalledTimes(1));
    await fireEvent.click(view.getByRole('button', { name: 'Toggle Create' }));
    expect(staleUpdatePermissions).toHaveBeenCalledTimes(1);

    await view.rerender({
      consumer: 'roles',
      authProvider: scopeB,
      resources: [createResource()],
      tenant: { tenantId: 'tenant-b' },
    });
    await waitFor(() => expect(view.getAllByText('scope-b role')).not.toHaveLength(0));
    await waitFor(() => expect(freshPermissions).toHaveBeenCalledTimes(1));
    const readToggle = view.getByRole('button', { name: 'Toggle Detail' }) as HTMLButtonElement;
    expect(readToggle.disabled).toBe(false);
    expect(readToggle.querySelector('svg')?.classList.contains('block')).toBe(true);

    staleUpdate.reject(new Error('stale scope A failure'));
    await staleUpdate.promise.catch(() => undefined);
    await tick();

    expect(freshPermissions).toHaveBeenCalledTimes(1);
    expect(freshUpdatePermissions).not.toHaveBeenCalled();
    expect(readToggle.querySelector('svg')?.classList.contains('block')).toBe(true);
  });
});
