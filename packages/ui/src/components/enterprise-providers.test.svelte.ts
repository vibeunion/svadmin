import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  AuthProvider,
  CredentialProvider,
  DataProvider,
  IdentityGovernanceProvider,
  NotificationProvider,
  ProviderBundle,
  SessionProvider,
} from '@svadmin/core';
import { resetContext } from '@svadmin/core';
import EnterpriseProvidersTestHost from './enterprise-providers.test-host.svelte';

const dataProvider = {
  getList: async () => ({ data: [], total: 0 }),
  getOne: async () => ({ data: { id: '1' } }),
  create: async () => ({ data: { id: '1' } }),
  update: async () => ({ data: { id: '1' } }),
  deleteOne: async () => ({ data: { id: '1' } }),
  getApiUrl: () => '/api',
} as DataProvider;

function bundle(overrides: Partial<ProviderBundle> = {}): ProviderBundle {
  return { dataProvider, ...overrides };
}

afterEach(() => {
  resetContext();
  vi.restoreAllMocks();
});

describe('enterprise provider settings', () => {
  it('fails closed when enterprise providers are not configured', async () => {
    const { unmount } = render(EnterpriseProvidersTestHost, { props: { page: 'api', providerBundle: bundle() } });

    expect(await screen.findByText('CredentialProvider is not configured. This page does not generate simulated browser credentials or webhooks.')).toBeTruthy();
    expect((screen.getByRole('button', { name: /Generate Token|生成令牌/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(document.body.textContent).not.toContain('sv_demo_');
    unmount();
  });

  it('loads, creates and revokes credentials through CredentialProvider', async () => {
    const credentialProvider: CredentialProvider = {
      listApiCredentials: vi.fn(async () => [{ id: 'key-1', name: 'Deployment key', prefix: 'sv_live_', createdAt: '2026-08-25T00:00:00.000Z', permissions: ['Read'] }]),
      createApiCredential: vi.fn(async ({ name, permissions }) => ({
        credential: { id: 'key-2', name, prefix: 'sv_live_', createdAt: '2026-08-25T00:00:00.000Z', permissions },
        secret: 'sv_live_one_time_secret',
      })),
      revokeApiCredential: vi.fn(async () => ({ success: true })),
      listWebhooks: vi.fn(async () => []),
      createWebhook: vi.fn(async (params) => ({ id: 'hook-1', ...params })),
      deleteWebhook: vi.fn(async () => ({ success: true })),
    };
    render(EnterpriseProvidersTestHost, { props: { page: 'api', providerBundle: bundle({ credentialProvider }) } });

    expect(await screen.findByText('Deployment key')).toBeTruthy();
    await fireEvent.input(screen.getByPlaceholderText('CI deployment token'), { target: { value: 'Automation key' } });
    await fireEvent.click(screen.getByRole('button', { name: /Generate Token|生成令牌/ }));

    expect(await screen.findByDisplayValue('sv_live_one_time_secret')).toBeTruthy();
    expect(credentialProvider.createApiCredential).toHaveBeenCalledWith(
      { name: 'Automation key', permissions: ['Read'] },
      expect.objectContaining({ tenantId: undefined }),
    );

    await fireEvent.click(screen.getByRole('button', { name: /Delete Deployment key|删除 Deployment key/ }));
    await waitFor(() => expect(credentialProvider.revokeApiCredential).toHaveBeenCalledWith(
      'key-1',
      expect.objectContaining({ tenantId: undefined }),
    ));
  });

  it('passes the active tenant context when one provider serves multiple tenants', async () => {
    const credentialProvider: CredentialProvider = {
      listApiCredentials: vi.fn(async () => []),
      createApiCredential: vi.fn(async ({ name, permissions }) => ({
        credential: { id: 'key-1', name, prefix: 'sv_', createdAt: '2026-08-25T00:00:00.000Z', permissions },
        secret: 'one-time-secret',
      })),
      revokeApiCredential: vi.fn(async () => ({ success: true })),
      listWebhooks: vi.fn(async () => []),
      createWebhook: vi.fn(async (params) => ({ id: 'hook-1', ...params })),
      deleteWebhook: vi.fn(async () => ({ success: true })),
    };
    const { rerender } = render(EnterpriseProvidersTestHost, {
      props: {
        page: 'api',
        providerBundle: bundle({ credentialProvider }),
        tenant: { tenantId: 'tenant-1', meta: { requestId: 'request-1', traceId: 'trace-1' } },
      },
    });

    await waitFor(() => expect(credentialProvider.listApiCredentials).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      requestId: 'request-1',
      traceId: 'trace-1',
    })));
    await rerender({
      page: 'api',
      providerBundle: bundle({ credentialProvider }),
      tenant: { tenantId: 'tenant-2', meta: { requestId: 'request-2', traceId: 'trace-2' } },
    });

    await waitFor(() => expect(credentialProvider.listApiCredentials).toHaveBeenLastCalledWith(expect.objectContaining({
      tenantId: 'tenant-2',
      requestId: 'request-2',
      traceId: 'trace-2',
    })));
  });

  it('does not expose a credential secret after the provider context changes', async () => {
    let resolveCredential!: (value: Awaited<ReturnType<CredentialProvider['createApiCredential']>>) => void;
    const pendingCredential = new Promise<Awaited<ReturnType<CredentialProvider['createApiCredential']>>>((resolve) => {
      resolveCredential = resolve;
    });
    const firstProvider: CredentialProvider = {
      listApiCredentials: vi.fn(async () => []),
      createApiCredential: vi.fn(async () => pendingCredential),
      revokeApiCredential: vi.fn(async () => ({ success: true })),
      listWebhooks: vi.fn(async () => []),
      createWebhook: vi.fn(async (params) => ({ id: 'hook-1', ...params })),
      deleteWebhook: vi.fn(async () => ({ success: true })),
    };
    const secondProvider: CredentialProvider = {
      listApiCredentials: vi.fn(async () => []),
      createApiCredential: vi.fn(async () => ({
        credential: { id: 'key-2', name: 'Second', prefix: 'sv_second_', createdAt: '2026-08-25T00:00:00.000Z', permissions: ['Read'] },
        secret: 'second-secret',
      })),
      revokeApiCredential: vi.fn(async () => ({ success: true })),
      listWebhooks: vi.fn(async () => []),
      createWebhook: vi.fn(async (params) => ({ id: 'hook-2', ...params })),
      deleteWebhook: vi.fn(async () => ({ success: true })),
    };
    const { rerender } = render(EnterpriseProvidersTestHost, { props: { page: 'api', providerBundle: bundle({ credentialProvider: firstProvider }) } });

    await fireEvent.input(screen.getByPlaceholderText('CI deployment token'), { target: { value: 'First tenant key' } });
    await fireEvent.click(screen.getByRole('button', { name: /Generate Token|生成令牌/ }));
    await rerender({ page: 'api', providerBundle: bundle({ credentialProvider: secondProvider }) });
    resolveCredential({
      credential: { id: 'stale-key', name: 'Stale', prefix: 'sv_stale_', createdAt: '2026-08-25T00:00:00.000Z', permissions: ['Read'] },
      secret: 'stale-one-time-secret',
    });

    await waitFor(() => expect(document.body.textContent).not.toContain('stale-one-time-secret'));
    expect(document.body.textContent).not.toContain('Stale');
  });

  it('does not send a stale provider error to the current notification provider', async () => {
    let rejectCredential!: (reason: Error) => void;
    const pendingCredential = new Promise<never>((_, reject) => {
      rejectCredential = reject;
    });
    const firstProvider: CredentialProvider = {
      listApiCredentials: vi.fn(async () => []),
      createApiCredential: vi.fn(async () => pendingCredential),
      revokeApiCredential: vi.fn(async () => ({ success: true })),
      listWebhooks: vi.fn(async () => []),
      createWebhook: vi.fn(async (params) => ({ id: 'hook-1', ...params })),
      deleteWebhook: vi.fn(async () => ({ success: true })),
    };
    const secondProvider: CredentialProvider = {
      listApiCredentials: vi.fn(async () => []),
      createApiCredential: vi.fn(async () => ({
        credential: { id: 'key-2', name: 'Second', prefix: 'sv_second_', createdAt: '2026-08-25T00:00:00.000Z', permissions: ['Read'] },
        secret: 'second-secret',
      })),
      revokeApiCredential: vi.fn(async () => ({ success: true })),
      listWebhooks: vi.fn(async () => []),
      createWebhook: vi.fn(async (params) => ({ id: 'hook-2', ...params })),
      deleteWebhook: vi.fn(async () => ({ success: true })),
    };
    const notificationProvider: NotificationProvider = {
      open: vi.fn(),
      close: vi.fn(),
    };
    const { rerender } = render(EnterpriseProvidersTestHost, { props: { page: 'api', providerBundle: bundle({ credentialProvider: firstProvider }) } });

    await fireEvent.input(screen.getByPlaceholderText('CI deployment token'), { target: { value: 'First tenant key' } });
    await fireEvent.click(screen.getByRole('button', { name: /Generate Token|生成令牌/ }));
    await rerender({ page: 'api', providerBundle: bundle({ credentialProvider: secondProvider, notificationProvider }) });
    rejectCredential(new Error('old tenant failed'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(notificationProvider.open).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain('old tenant failed');
  });

  it('loads and revokes real sessions and updates the password provider', async () => {
    const sessionProvider: SessionProvider = {
      listSessions: vi.fn(async () => [
        { id: 'current', os: 'macOS', browser: 'Safari', current: true },
        { id: 'other', os: 'Windows', browser: 'Edge', current: false },
      ]),
      revokeSession: vi.fn(async () => ({ success: true })),
      revokeOtherSessions: vi.fn(async () => ({ success: true })),
      getMfaState: vi.fn(async () => ({ enabled: false })),
      setMfaEnabled: vi.fn(async (enabled) => ({ enabled })),
    };
    const updatePassword = vi.fn(async () => ({ success: true }));
    const authProvider: AuthProvider = {
      login: async () => ({ success: true }),
      logout: async () => ({ success: true }),
      check: async () => ({ authenticated: true }),
      getIdentity: async () => ({ id: 'user-1' }),
      updatePassword,
    };
    render(EnterpriseProvidersTestHost, { props: { page: 'security', providerBundle: bundle({ sessionProvider }), authProvider } });

    expect(await screen.findByText(/Windows - Edge/)).toBeTruthy();
    await fireEvent.click(screen.getByTitle(/Sign out device|注销此设备/));
    await waitFor(() => expect(sessionProvider.revokeSession).toHaveBeenCalledWith(
      'other',
      expect.objectContaining({ tenantId: undefined }),
    ));

    await fireEvent.input(screen.getByLabelText(/Current Password|当前密码/), { target: { value: 'old-password' } });
    await fireEvent.input(screen.getByLabelText(/New Password|新密码/), { target: { value: 'New-password-123' } });
    await fireEvent.input(screen.getByLabelText(/Confirm Password|确认密码/), { target: { value: 'New-password-123' } });
    await fireEvent.click(screen.getByRole('button', { name: /Update Password|更新密码/ }));
    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith({ currentPassword: 'old-password', password: 'New-password-123', confirmPassword: 'New-password-123' }));
  });

  it('loads and persists enterprise security policy through IdentityGovernanceProvider', async () => {
    const updateSecurityPolicy = vi.fn(async (policy) => policy);
    const identityGovernanceProvider: IdentityGovernanceProvider = {
      getSecurityPolicy: vi.fn(async () => ({ sessionTimeoutMinutes: 30, auditRetentionDays: 365, auditLoggingEnabled: true, requireSso: false })),
      updateSecurityPolicy,
      listIdentityProviders: vi.fn(async () => [
        { id: 'oidc', name: 'Company OIDC', protocol: 'oidc', status: 'connected', metadataUrl: 'https://company.example/oidc' },
        { id: 'saml', name: 'Partner SAML', protocol: 'saml', status: 'connected', metadataUrl: 'https://partner.example/saml' },
      ]),
      testIdentityProvider: vi.fn(async () => ({ success: true })),
      listSecurityEvents: vi.fn(async () => ({ data: [], total: 0 })),
    };
    render(EnterpriseProvidersTestHost, { props: { page: 'enterprise', providerBundle: bundle({ identityGovernanceProvider }) } });

    const timeout = await screen.findByLabelText(/Session Timeout|会话超时/);
    await fireEvent.input(timeout, { target: { value: '' } });
    expect((screen.getByRole('button', { name: /Save|保存/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(updateSecurityPolicy).not.toHaveBeenCalled();
    await fireEvent.input(timeout, { target: { value: '45' } });
    await fireEvent.click(screen.getByRole('button', { name: /Save|保存/ }));

    await waitFor(() => expect(updateSecurityPolicy).toHaveBeenCalledWith(
      expect.objectContaining({ sessionTimeoutMinutes: 45 }),
      expect.objectContaining({ tenantId: undefined }),
    ));

    await fireEvent.click(screen.getAllByRole('button', { name: 'Manage' })[1]);
    await waitFor(() => expect(identityGovernanceProvider.testIdentityProvider).toHaveBeenCalledWith(
      {
        id: 'saml',
        protocol: 'saml',
        metadataUrl: 'https://partner.example/saml',
      },
      expect.objectContaining({ tenantId: undefined }),
    ));
  });

  it('updates organization details without requiring identity governance', async () => {
    const updateCurrentOrganization = vi.fn(async ({ name }) => ({ id: 'org-1', name: name ?? 'Acme' }));
    render(EnterpriseProvidersTestHost, {
      props: {
        page: 'enterprise',
        providerBundle: bundle({
          organizationProvider: {
            getCurrentOrganization: vi.fn(async () => ({ id: 'org-1', name: 'Acme' })),
            updateCurrentOrganization,
          },
        }),
      },
    });

    const organizationName = await screen.findByLabelText(/Organization name|组织名称/);
    await fireEvent.input(organizationName, { target: { value: 'Acme Global' } });
    const saveButtons = screen.getAllByRole('button', { name: /Save|保存/ });
    await fireEvent.click(saveButtons[0]);

    await waitFor(() => expect(updateCurrentOrganization).toHaveBeenCalledWith(
      { name: 'Acme Global' },
      expect.objectContaining({ tenantId: undefined }),
    ));
  });
});
