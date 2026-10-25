import { definedOptions } from '@svadmin/core/options';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import {
  resetContext,
  getToastQueue,
  type AuthProvider,
  type DataProvider,
  type ResourceDefinition,
} from '@svadmin/core';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ScopedProviderActionsHost from './scoped-provider-actions.test-host.svelte';
import utilityClasses from '../../scripts/utility-class-map.json';
import { renderWithI18n } from '../../test/fixtures/render-with-i18n';

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
  const provider: AuthProvider = definedOptions({
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    getIdentity: async () => ({ id: scope, name: `${scope} user` }),
    getRoles: async () => [{ id: 'shared-role', name: `${scope} role` }],
    getRolePermissions,
    updateRolePermissions,
  });
  return provider;
}

afterEach(() => {
  resetContext();
  vi.restoreAllMocks();
});

describe('scoped provider actions', () => {
  it('does not show an empty role matrix while roles are still loading', async () => {
    const roles = createDeferred<Array<{ id: string; name: string }>>();
    const permissions = vi.fn(async () => ({ 'shared-resource': ['read'] }));
    const provider = createRolesAuthProvider('scope', permissions, vi.fn(async () => ({ success: true })));
    provider.getRoles = vi.fn(() => roles.promise);
    const view = render(ScopedProviderActionsHost, {
      consumer: 'roles', authProvider: provider, resources: [createResource()], tenant: { tenantId: 'tenant-a' },
    });
    await waitFor(() => expect(provider.getRoles).toHaveBeenCalledOnce());
    expect(view.getByRole('status')).toBeTruthy();
    expect(view.container.textContent).not.toContain('No roles available');
    expect(view.queryByRole('button', { name: 'Toggle Create' })).toBeNull();
    roles.resolve([{ id: 'shared-role', name: 'Operator' }]);
    await waitFor(() => expect(view.getByRole('button', { name: 'Toggle Create' })).toHaveProperty('disabled', false));
    expect(permissions).toHaveBeenCalledOnce();
  });

  it('does not show unchecked permissions while the selected role is loading', async () => {
    const permissions = createDeferred<Record<string, string[]>>();
    const getPermissions = vi.fn(() => permissions.promise);
    const provider = createRolesAuthProvider('scope', getPermissions, vi.fn(async () => ({ success: true })));
    const view = render(ScopedProviderActionsHost, {
      consumer: 'roles', authProvider: provider, resources: [createResource()], tenant: { tenantId: 'tenant-a' },
    });
    await waitFor(() => expect(getPermissions).toHaveBeenCalledOnce());
    expect(view.getByRole('status')).toBeTruthy();
    expect(view.container.textContent).not.toContain('No resources available');
    expect(view.queryByRole('button', { name: 'Toggle Create' })).toBeNull();
    expect(view.getByRole('combobox')).toHaveProperty('value', 'shared-role');
    expect(view.getByRole('button', { name: 'scope role shared-role' })).toBeTruthy();
    permissions.resolve({ 'shared-resource': ['read'] });
    await waitFor(() => expect(view.getByRole('button', { name: 'Toggle Detail' })).toHaveProperty('disabled', false));
    expect(view.getByRole('button', { name: 'Toggle Detail' }).getAttribute('aria-pressed')).toBe('true');
  });

  it.each(['roles', 'permissions', 'unsupported'] as const)('updates %s feedback on locale changes without restarting reads', async state => {
    const getRoles = vi.fn(async () => [{ id: 'shared-role', name: 'Operator' }]);
    const getPermissions = vi.fn(async () => ({ 'shared-resource': ['read'] }));
    const update = vi.fn(async () => ({ success: true }));
    const provider = createRolesAuthProvider('scope', getPermissions, update);
    if (state === 'unsupported') delete provider.getRoles;
    else provider.getRoles = getRoles;
    if (state === 'roles') getRoles.mockRejectedValueOnce(new Error('PRIVATE_ROLE_LOCALE'));
    if (state === 'permissions') getPermissions.mockRejectedValueOnce(new Error('PRIVATE_PERMISSION_LOCALE'));
    const view = renderWithI18n(ScopedProviderActionsHost, {
      consumer: 'roles', authProvider: provider, resources: [createResource()], tenant: { tenantId: 'tenant-a' },
    });
    const english = state === 'unsupported' ? 'RBAC management is not supported by the current data provider' : 'Operation failed';
    const chinese = state === 'unsupported' ? '当前数据源不支持 RBAC 管理' : '操作失败';
    await view.findByText(english);
    for (const [locale, message] of [['zh-CN', chinese], ['en', english]] as const) {
      await view.wrapper.setLocale(locale);
      expect(view.getByRole('alert').textContent).toContain(message);
      expect(view.container.textContent).not.toContain('PRIVATE_');
      expect(getRoles).toHaveBeenCalledTimes(state === 'unsupported' ? 0 : 1);
      expect(getPermissions).toHaveBeenCalledTimes(state === 'permissions' ? 1 : 0);
      expect(update).not.toHaveBeenCalled();
    }
    if (state !== 'unsupported') {
      await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
      await waitFor(() => expect(view.getByRole('button', { name: 'Toggle Create' })).toHaveProperty('disabled', false));
      expect(getRoles).toHaveBeenCalledTimes(state === 'roles' ? 2 : 1);
      expect(getPermissions).toHaveBeenCalledTimes(state === 'permissions' ? 2 : 1);
    } else expect(view.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('updates action names without changing the selected role or unlocking a pending write', async () => {
    const pending = createDeferred<{ success: boolean }>();
    const getPermissions = vi.fn(async () => ({ 'shared-resource': ['read'] }));
    const update = vi.fn(() => pending.promise);
    const getRoles = vi.fn(async () => [{ id: 'first', name: 'First' }, { id: 'second', name: 'Second' }]);
    const provider = { ...createRolesAuthProvider('scope', getPermissions, update), getRoles };
    const view = renderWithI18n(ScopedProviderActionsHost, {
      consumer: 'roles', authProvider: provider, resources: [createResource()], tenant: { tenantId: 'tenant-a' },
    });
    await waitFor(() => expect(view.getByRole('button', { name: 'Toggle Create' })).toHaveProperty('disabled', false));
    await fireEvent.change(view.getByRole('combobox'), { target: { value: 'second' } });
    const create = view.getByRole('button', { name: 'Toggle Create' });
    await waitFor(() => expect(create).toHaveProperty('disabled', false));
    await fireEvent.click(create);
    expect(update).toHaveBeenCalledWith('second', { 'shared-resource': ['read', 'create'] });
    for (const [locale, labels] of [
      ['zh-CN', ['新建', '详情', '编辑', '删除']],
      ['en', ['Create', 'Detail', 'Edit', 'Delete']],
    ] as const) {
      await view.wrapper.setLocale(locale);
      expect(view.getByRole('combobox')).toHaveProperty('value', 'second');
      for (const label of labels) {
        expect(view.getByRole('columnheader', { name: new RegExp(`^${label} `) })).toBeTruthy();
        expect(view.getByRole('button', { name: locale === 'zh-CN' ? `切换${label}` : `Toggle ${label}` })).toHaveProperty('disabled', true);
      }
      expect(view.getByRole('button', { name: locale === 'zh-CN' ? `切换${labels[0]}` : `Toggle ${labels[0]}` })).toBe(create);
      expect(getRoles).toHaveBeenCalledTimes(1);
      expect(getPermissions).toHaveBeenCalledTimes(2);
      expect(update).toHaveBeenCalledTimes(1);
    }
    pending.resolve({ success: true });
    await waitFor(() => expect(create).toHaveProperty('disabled', false));
    await fireEvent.click(create);
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(update).toHaveBeenLastCalledWith('second', { 'shared-resource': ['read'] });
  });

  it('exposes saving state as aria-busy while a role permission write is pending', async () => {
    const pending = createDeferred<{ success: boolean }>();
    const getPermissions = vi.fn(async () => ({ 'shared-resource': ['read'] }));
    const update = vi.fn(() => pending.promise);
    const provider = createRolesAuthProvider('scope', getPermissions, update);
    const view = render(ScopedProviderActionsHost, {
      consumer: 'roles', authProvider: provider, resources: [createResource()], tenant: { tenantId: 'tenant-a' },
    });
    await waitFor(() => expect(view.getByRole('button', { name: 'Toggle Detail' })).toHaveProperty('disabled', false));
    await fireEvent.click(view.getByRole('button', { name: 'Toggle Detail' }));
    expect(view.container.querySelector('[aria-busy="true"]')).toBeTruthy();
    pending.resolve({ success: true });
    await waitFor(() => expect(view.container.querySelector('[aria-busy="false"]')).toBeTruthy());
  });

  it.each(['read', 'write'] as const)('keeps permission edits disabled when the %s capability is missing', async capability => {
    const provider = createRolesAuthProvider('scope',
      capability === 'read' ? undefined : async () => ({ 'shared-resource': ['read'] }),
      capability === 'write' ? undefined : vi.fn(async () => ({ success: true })),
    );
    const view = render(ScopedProviderActionsHost, {
      consumer: 'roles', authProvider: provider, resources: [createResource()], tenant: { tenantId: 'tenant-a' },
    });
    await waitFor(() => expect(view.getAllByText('scope role').length).toBeGreaterThan(0));
    if (capability === 'read') {
      expect(view.queryByRole('button', { name: 'Toggle Create' })).toBeNull();
      expect((await view.findByRole('alert')).textContent).toContain('RBAC management is not supported by the current data provider');
      expect(view.queryByRole('button', { name: 'Retry' })).toBeNull();
    } else {
      expect(view.getByRole('button', { name: 'Toggle Create' })).toHaveProperty('disabled', true);
      expect(view.queryByRole('button', { name: 'Retry' })).toBeNull();
    }
  });

  it('keeps edits locked after rollback read failure until an explicit retry succeeds', async () => {
    const getPermissions = vi.fn<NonNullable<AuthProvider['getRolePermissions']>>()
      .mockResolvedValueOnce({ 'shared-resource': ['read'] })
      .mockRejectedValueOnce(new Error('PRIVATE_ROLLBACK'))
      .mockResolvedValue({ 'shared-resource': ['read'] });
    const update = vi.fn(async () => ({ success: false }));
    const view = render(ScopedProviderActionsHost, {
      consumer: 'roles', authProvider: createRolesAuthProvider('scope', getPermissions, update),
      resources: [createResource()], tenant: { tenantId: 'tenant-a' },
    });
    const toggle = await view.findByRole('button', { name: 'Toggle Create' });
    await waitFor(() => expect(toggle).toHaveProperty('disabled', false));
    await fireEvent.click(toggle);
    await view.findByText('Operation failed');
    await tick();
    expect(getPermissions).toHaveBeenCalledTimes(2);
    expect(view.queryByRole('button', { name: 'Toggle Create' })).toBeNull();
    expect(view.getByRole('alert').textContent).toContain('Operation failed');
    expect(view.getByRole('combobox')).toHaveProperty('value', 'shared-role');
    expect(view.getByRole('button', { name: 'scope role shared-role' })).toBeTruthy();
    expect(view.container.textContent).not.toContain('PRIVATE_ROLLBACK');
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    const recoveredToggle = await view.findByRole('button', { name: 'Toggle Create' });
    await waitFor(() => expect(recoveredToggle).toHaveProperty('disabled', false));
    expect(getPermissions).toHaveBeenCalledTimes(3);
    expect(update).toHaveBeenCalledTimes(1);
    expect(recoveredToggle.querySelector('svg')?.classList.contains(utilityClasses.block)).toBe(false);
  });

  it.each(['select', 'sidebar'] as const)('discards a failed permission read after selecting another role via %s', async control => {
    const oldRead = createDeferred<Record<string, string[]>>();
    const getPermissions = vi.fn(async (id: string) => id === 'shared-role' ? oldRead.promise : { 'shared-resource': ['read'] });
    const provider = {
      ...createRolesAuthProvider('scope', getPermissions, vi.fn(async () => ({ success: true }))),
      getRoles: async () => [{ id: 'shared-role', name: 'First role' }, { id: 'second', name: 'Second role' }],
    };
    const view = render(ScopedProviderActionsHost, {
      consumer: 'roles', authProvider: provider, resources: [createResource()], tenant: { tenantId: 'tenant-a' },
    });
    await waitFor(() => expect(getPermissions).toHaveBeenCalledTimes(1));
    if (control === 'select') await fireEvent.change(view.getByRole('combobox'), { target: { value: 'second' } });
    else await fireEvent.click(view.getByRole('button', { name: 'Second role second' }));
    expect(view.getByRole('combobox')).toHaveProperty('value', 'second');
    expect(getPermissions.mock.calls).toEqual([['shared-role'], ['second']]);
    const toggle = view.getByRole('button', { name: 'Toggle Detail' });
    await waitFor(() => expect(toggle).toHaveProperty('disabled', false));
    oldRead.reject(new Error('PRIVATE_OLD_ROLE'));
    await oldRead.promise.catch(() => {});
    await tick();
    expect(view.queryByRole('alert')).toBeNull();
    expect(toggle.querySelector('svg')?.classList.contains(utilityClasses.block)).toBe(true);
    expect(getToastQueue()).toHaveLength(0);
    expect(getPermissions).toHaveBeenCalledTimes(2);
  });

  it.each(['diagnostic', 'empty', 'non-error'] as const)('recovers from %s role and permission reads only after explicit retry', async failure => {
    const rejected = failure === 'non-error' ? 'PRIVATE_RBAC' : new Error(failure === 'empty' ? '' : 'PRIVATE_RBAC');
    const getRoles = vi.fn(async () => [{ id: 'shared-role', name: 'Operator' }]).mockRejectedValueOnce(rejected);
    const getPermissions = vi.fn(async () => ({ 'shared-resource': ['read'] })).mockRejectedValueOnce(rejected);
    const update = vi.fn(async () => ({ success: true }));
    const provider = { ...createRolesAuthProvider('scope', getPermissions, update), getRoles };
    const view = render(ScopedProviderActionsHost, {
      consumer: 'roles', authProvider: provider, resources: [createResource()], tenant: { tenantId: 'tenant-a' },
    });
    await view.findByText('Operation failed');
    expect(view.queryByText('No roles available')).toBeNull();
    expect(getRoles).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).not.toContain('PRIVATE_RBAC');
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    await view.findByText('Operation failed');
    await tick();
    expect(getRoles).toHaveBeenCalledTimes(2);
    expect(getPermissions).toHaveBeenCalledTimes(1);
    expect(getToastQueue()).toHaveLength(0);
    expect(view.queryByRole('button', { name: 'Toggle Create' })).toBeNull();
    expect(view.getByRole('alert').textContent).toContain('Operation failed');
    expect(view.getByRole('combobox')).toHaveProperty('disabled', false);
    expect(update).not.toHaveBeenCalled();
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    const toggle = await view.findByRole('button', { name: 'Toggle Create' });
    await waitFor(() => expect(toggle).toHaveProperty('disabled', false));
    expect(getPermissions).toHaveBeenCalledTimes(2);
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getByRole('button', { name: 'Toggle Detail' }).querySelector('svg')?.classList.contains(utilityClasses.block)).toBe(true);
  });

  it.each(['diagnostic', 'empty', 'non-error', 'result'] as const)('sanitizes %s role writes and reloads permissions before another write', async failure => {
    const update = vi.fn<NonNullable<AuthProvider['updateRolePermissions']>>().mockResolvedValue({ success: true });
    if (failure === 'result') update.mockResolvedValueOnce({ success: false, error: { message: 'PRIVATE_RBAC' } });
    else update.mockRejectedValueOnce(failure === 'non-error' ? 'PRIVATE_RBAC' : new Error(failure === 'empty' ? '' : 'PRIVATE_RBAC'));
    const reload = createDeferred<Record<string, string[]>>();
    const getPermissions = vi.fn<NonNullable<AuthProvider['getRolePermissions']>>()
      .mockResolvedValueOnce({ 'shared-resource': ['read'] }).mockImplementationOnce(() => reload.promise);
    const view = render(ScopedProviderActionsHost, {
      consumer: 'roles', authProvider: createRolesAuthProvider('scope', getPermissions, update),
      resources: [createResource()], tenant: { tenantId: 'tenant-a' },
    });
    const toggle = await view.findByRole('button', { name: 'Toggle Create' });
    await waitFor(() => expect(toggle).toHaveProperty('disabled', false));
    await fireEvent.click(toggle);
    await waitFor(() => expect(getPermissions).toHaveBeenCalledTimes(2));
    expect(getToastQueue()).toHaveLength(1);
    expect(getToastQueue()[0]).toMatchObject({ type: 'error', message: 'Operation failed' });
    expect(view.getByRole('status')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Toggle Create' })).toBeNull();
    expect(view.getByRole('combobox')).toHaveProperty('value', 'shared-role');
    expect(update).toHaveBeenCalledTimes(1);
    reload.resolve({ 'shared-resource': ['read'] });
    const recoveredToggle = await view.findByRole('button', { name: 'Toggle Create' });
    await waitFor(() => expect(recoveredToggle).toHaveProperty('disabled', false));
    expect(recoveredToggle.querySelector('svg')?.classList.contains(utilityClasses.block)).toBe(false);
    await fireEvent.click(recoveredToggle);
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(update).toHaveBeenLastCalledWith('shared-role', { 'shared-resource': ['read', 'create'] });
    expect(getToastQueue()).toHaveLength(1);
  });

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
    expect(readToggle.querySelector('svg')?.classList.contains(utilityClasses.block)).toBe(true);

    staleUpdate.reject(new Error('stale scope A failure'));
    await staleUpdate.promise.catch(() => undefined);
    await tick();

    expect(freshPermissions).toHaveBeenCalledTimes(1);
    expect(freshUpdatePermissions).not.toHaveBeenCalled();
    expect(readToggle.querySelector('svg')?.classList.contains(utilityClasses.block)).toBe(true);
  });
});
