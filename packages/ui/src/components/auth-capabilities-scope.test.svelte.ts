import { render, waitFor, within } from '@testing-library/svelte';
import { resetContext, type AuthProvider } from '@svadmin/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./ProfilePage.svelte', async () => ({
  default: (await import('./layout-auth-scope.test-empty-child.svelte')).default,
}));
vi.mock('./AppearanceSettings.svelte', async () => ({
  default: (await import('./layout-auth-scope.test-empty-child.svelte')).default,
}));
vi.mock('./AboutSettings.svelte', async () => ({
  default: (await import('./layout-auth-scope.test-empty-child.svelte')).default,
}));
vi.mock('./RolesSettings.svelte', async () => ({
  default: (await import('./layout-auth-scope.test-empty-child.svelte')).default,
}));
vi.mock('./SecuritySettings.svelte', async () => ({
  default: (await import('./layout-auth-scope.test-empty-child.svelte')).default,
}));
vi.mock('./IntegrationsSettings.svelte', async () => ({
  default: (await import('./layout-auth-scope.test-empty-child.svelte')).default,
}));
vi.mock('./NotificationsSettings.svelte', async () => ({
  default: (await import('./layout-auth-scope.test-empty-child.svelte')).default,
}));
vi.mock('./ApiSettings.svelte', async () => ({
  default: (await import('./layout-auth-scope.test-empty-child.svelte')).default,
}));

import AuthCapabilitiesScopeHost from './auth-capabilities-scope.test-host.svelte';

function createCapabilityAuthProvider() {
  const getAuditLogs = vi.fn(async () => ({
    data: [{
      id: 'fresh-audit',
      userName: 'fresh audit user',
      action: 'update',
      resource: 'profiles',
      createdAt: '2026-08-11T00:00:00.000Z',
    }],
    total: 1,
  }));
  const provider: AuthProvider = {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    getIdentity: async () => ({ id: 'fresh-auth', name: 'fresh auth user' }),
    register: async () => ({ success: true }),
    forgotPassword: async () => ({ success: true }),
    getAuditLogs,
  };
  return { provider, getAuditLogs };
}

afterEach(() => {
  resetContext();
  vi.restoreAllMocks();
});

describe('auth capability scope', () => {
  it('reveals current auth capabilities and audit data after adding a provider on rerender', async () => {
    const freshAuth = createCapabilityAuthProvider();
    const view = render(AuthCapabilitiesScopeHost, {
      authProvider: undefined,
      tenant: { tenantId: 'tenant-auth' },
    });
    const login = within(view.getByTestId('snapshot-login'));
    const settings = within(view.getByTestId('snapshot-settings'));

    expect(login.queryByText(/forgot password/i)).toBeNull();
    expect(login.queryByText(/register/i)).toBeNull();
    expect(settings.queryByText(/roles.*permissions/i)).toBeNull();
    expect(settings.queryByText(/audit logs/i)).toBeNull();

    await view.rerender({
      authProvider: freshAuth.provider,
      tenant: { tenantId: 'tenant-auth' },
    });

    await waitFor(() => expect(freshAuth.getAuditLogs).toHaveBeenCalledWith({ page: 1, pageSize: 20 }));
    expect(login.getByText(/forgot password/i)).not.toBeNull();
    expect(login.getByText(/register/i)).not.toBeNull();
    expect(settings.getAllByText(/roles.*permissions/i)).not.toHaveLength(0);
    expect(settings.getAllByText(/audit logs/i)).not.toHaveLength(0);
    expect(view.getByText('fresh audit user')).not.toBeNull();
  });
});
