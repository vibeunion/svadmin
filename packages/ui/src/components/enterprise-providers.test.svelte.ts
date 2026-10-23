import { requireValue } from "../../../../scripts/test-assertions";
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  AuthProvider,
  CredentialProvider,
  DataProvider,
  IdentityGovernanceProvider,
  NotificationProvider,
  OrganizationProvider,
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

function identityProvider(overrides: Partial<IdentityGovernanceProvider> = {}): IdentityGovernanceProvider {
  return {
    getSecurityPolicy: vi.fn(async () => ({ sessionTimeoutMinutes: 30, auditRetentionDays: 365, auditLoggingEnabled: true, requireSso: false })),
    updateSecurityPolicy: vi.fn(async (policy) => policy),
    listIdentityProviders: vi.fn(async () => []),
    testIdentityProvider: vi.fn(async () => ({ success: true })),
    ...overrides,
  };
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
      {},
    );

    await fireEvent.click(screen.getByRole('button', { name: /Delete Deployment key|删除 Deployment key/ }));
    expect(credentialProvider.revokeApiCredential).not.toHaveBeenCalled();
    await fireEvent.click(await screen.findByRole('button', { name: /^(Cancel|取消)$/ }));
    expect(credentialProvider.revokeApiCredential).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: /Delete Deployment key|删除 Deployment key/ }));
    await fireEvent.click(await screen.findByRole('button', { name: /^(Confirm|确认)$/ }));
    await waitFor(() => expect(credentialProvider.revokeApiCredential).toHaveBeenCalledWith(
      'key-1',
      {},
    ));
  });

  it('keeps API labels and permission changes scoped to their page instance', async () => {
    const credentialProvider: CredentialProvider = {
      listApiCredentials: vi.fn(async () => []),
      createApiCredential: vi.fn(),
      revokeApiCredential: vi.fn(),
      listWebhooks: vi.fn(async () => []),
      createWebhook: vi.fn(),
      deleteWebhook: vi.fn(),
    };
    const props = { page: 'api' as const, providerBundle: bundle({ credentialProvider }) };
    const first = render(EnterpriseProvidersTestHost, { props });
    const second = render(EnterpriseProvidersTestHost, { props });
    await within(first.container).findByRole('button', { name: 'Add Webhook' });
    await within(second.container).findByRole('button', { name: 'Add Webhook' });
    const firstRead = within(first.container).getByRole('checkbox', { name: 'Read' });
    const secondRead = within(second.container).getByRole('checkbox', { name: 'Read' });
    const ids = new Set<string>();
    for (const container of [first.container, second.container]) {
      const labels = container.querySelectorAll('label');
      expect(labels.length).toBe(8);
      for (const label of labels) {
        expect(container.contains(document.getElementById(label.htmlFor))).toBe(true);
        expect(ids.has(label.htmlFor)).toBe(false);
        ids.add(label.htmlFor);
      }
    }
    const secondLabel = Array.from(second.container.querySelectorAll('label')).find(label => label.htmlFor === secondRead.id);
    await userEvent.setup().click(requireValue(secondLabel));
    expect(firstRead.getAttribute('aria-checked')).toBe('true');
    expect(secondRead.getAttribute('aria-checked')).toBe('false');
  });

  it('does not expose provider diagnostics in API settings feedback', async () => {
    const credentialProvider: CredentialProvider = {
      listApiCredentials: vi.fn(async () => { throw new Error('PRIVATE_API_DIAGNOSTIC'); }),
      createApiCredential: vi.fn(async () => { throw new Error('PRIVATE_CREATE_DIAGNOSTIC'); }),
      revokeApiCredential: vi.fn(async () => ({ success: false, error: { message: 'PRIVATE_REVOKE_DIAGNOSTIC' } })),
      listWebhooks: vi.fn(async () => []),
      createWebhook: vi.fn(async () => { throw new Error('PRIVATE_WEBHOOK_DIAGNOSTIC'); }),
      deleteWebhook: vi.fn(async () => ({ success: true })),
    };
    const notificationProvider: NotificationProvider = { open: vi.fn(), close: vi.fn() };
    render(EnterpriseProvidersTestHost, { props: { page: 'api', providerBundle: bundle({ credentialProvider, notificationProvider }) } });

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Operation failed'));
    expect(document.body.textContent).not.toContain('PRIVATE_API_DIAGNOSTIC');

    await fireEvent.input(screen.getByPlaceholderText('CI deployment token'), { target: { value: 'Automation key' } });
    await fireEvent.click(screen.getByRole('button', { name: /Generate Token|生成令牌/ }));
    await waitFor(() => expect(notificationProvider.open).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', message: 'Operation failed' }),
    ));
    expect(document.body.textContent).not.toContain('PRIVATE_CREATE_DIAGNOSTIC');
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
    expect(sessionProvider.revokeSession).not.toHaveBeenCalled();
    await fireEvent.click(await screen.findByRole('button', { name: /^(Confirm|确认)$/ }));
    await waitFor(() => expect(sessionProvider.revokeSession).toHaveBeenCalledWith(
      'other',
      {},
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
    const retention = screen.getByLabelText(/Data Retention|数据保留/);
    expect(timeout.getAttribute('aria-invalid')).toBe('false');
    await fireEvent.input(timeout, { target: { value: '' } });
    expect(timeout.getAttribute('aria-invalid')).toBe('true');
    expect(retention.getAttribute('aria-invalid')).toBe('false');
    expect(document.getElementById(timeout.getAttribute('aria-describedby') ?? '')?.textContent).toContain('positive integers');
    expect((screen.getByRole('button', { name: /Save|保存/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(updateSecurityPolicy).not.toHaveBeenCalled();
    await fireEvent.input(timeout, { target: { value: '45' } });
    expect(timeout.getAttribute('aria-invalid')).toBe('false');
    expect(timeout.hasAttribute('aria-describedby')).toBe(false);
    for (const value of ['0', '1.5', '-1']) {
      await fireEvent.input(retention, { target: { value } });
      expect(retention.getAttribute('aria-invalid')).toBe('true');
      expect((screen.getByRole('button', { name: /Save|保存/ }) as HTMLButtonElement).disabled).toBe(true);
    }
    await fireEvent.input(retention, { target: { value: '365' } });
    await fireEvent.click(screen.getByRole('button', { name: /Save|保存/ }));

    await waitFor(() => expect(updateSecurityPolicy).toHaveBeenCalledWith(
      expect.objectContaining({ sessionTimeoutMinutes: 45 }),
      {},
    ));

    await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Test' })[2]));
    await waitFor(() => expect(identityGovernanceProvider.testIdentityProvider).toHaveBeenCalledWith(
      {
        id: 'saml',
        protocol: 'saml',
        metadataUrl: 'https://partner.example/saml',
      },
      {},
    ));
  });

  it.each(['success', 'failure'] as const)('serializes each enterprise save independently and unlocks after %s', async outcome => {
    type Policy = Awaited<ReturnType<IdentityGovernanceProvider['updateSecurityPolicy']>>;
    type Organization = Awaited<ReturnType<NonNullable<OrganizationProvider['updateCurrentOrganization']>>>;
    let resolvePolicy!: (value: Policy) => void;
    let rejectPolicy!: (reason: Error) => void;
    let resolveOrganization!: (value: Organization) => void;
    let rejectOrganization!: (reason: Error) => void;
    const pendingPolicy = new Promise<Policy>((resolve, reject) => { resolvePolicy = resolve; rejectPolicy = reject; });
    const pendingOrganization = new Promise<Organization>((resolve, reject) => { resolveOrganization = resolve; rejectOrganization = reject; });
    const expectedPolicy: Policy = {
      sessionTimeoutMinutes: 45, auditRetentionDays: 365, auditLoggingEnabled: true, requireSso: false,
    };
    const updateSecurityPolicy = vi.fn<IdentityGovernanceProvider['updateSecurityPolicy']>()
      .mockReturnValueOnce(pendingPolicy).mockImplementation(async policy => policy);
    const updateCurrentOrganization = vi.fn<NonNullable<OrganizationProvider['updateCurrentOrganization']>>()
      .mockReturnValueOnce(pendingOrganization)
      .mockImplementation(async input => ({ id: 'org-1', name: input.name ?? 'Original organization' }));
    const notificationProvider: NotificationProvider = { open: vi.fn(), close: vi.fn() };
    render(EnterpriseProvidersTestHost, {
      props: { page: 'enterprise', providerBundle: bundle({
        identityGovernanceProvider: identityProvider({ updateSecurityPolicy }),
        organizationProvider: {
          getCurrentOrganization: async () => ({ id: 'org-1', name: 'Original organization' }),
          updateCurrentOrganization,
        },
        notificationProvider,
      }) },
    });
    const timeout = await screen.findByLabelText(/Session Timeout/);
    const name = screen.getByLabelText('Organization name');
    await fireEvent.input(timeout, { target: { value: '45' } });
    await fireEvent.input(name, { target: { value: 'Updated organization' } });
    const [organizationSave, policySave] = screen.getAllByRole('button', { name: 'Save', exact: true });
    // 在 DOM 更新前重复分发事件，验证函数门禁而非仅验证 disabled。
    for (const button of [policySave, policySave, organizationSave, organizationSave]) {
      requireValue(button).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    await waitFor(() => {
      expect(updateSecurityPolicy).toHaveBeenCalledTimes(1);
      expect(updateCurrentOrganization).toHaveBeenCalledTimes(1);
      expect(timeout).toHaveProperty('disabled', true);
      expect(name).toHaveProperty('disabled', true);
    });
    expect(updateSecurityPolicy).toHaveBeenCalledWith(expectedPolicy, {});
    expect(updateCurrentOrganization).toHaveBeenCalledWith({ name: 'Updated organization' }, {});
    if (outcome === 'failure') rejectPolicy(new Error('PRIVATE_PENDING_POLICY'));
    else resolvePolicy({ ...expectedPolicy, sessionTimeoutMinutes: 50 });
    await waitFor(() => expect(timeout).toHaveProperty('disabled', false));
    expect(timeout).toHaveProperty('value', outcome === 'failure' ? '45' : '50');
    expect(name).toHaveProperty('disabled', true);
    expect(organizationSave).toHaveProperty('disabled', true);
    expect(notificationProvider.open).toHaveBeenCalledTimes(1);
    expect(notificationProvider.open).toHaveBeenLastCalledWith(expect.objectContaining({
      type: outcome === 'failure' ? 'error' : 'success',
      message: outcome === 'failure' ? 'Operation failed' : 'Enterprise policy saved',
    }));
    if (outcome === 'success') await fireEvent.input(timeout, { target: { value: '45' } });
    await fireEvent.click(requireValue(policySave));
    await waitFor(() => expect(timeout).toHaveProperty('disabled', false));
    expect(updateSecurityPolicy).toHaveBeenCalledTimes(2);
    expect(updateSecurityPolicy).toHaveBeenLastCalledWith(expectedPolicy, {});
    expect(updateCurrentOrganization).toHaveBeenCalledTimes(1);
    expect(name).toHaveProperty('disabled', true);
    if (outcome === 'failure') rejectOrganization(new Error('PRIVATE_PENDING_ORGANIZATION'));
    else resolveOrganization({ id: 'org-1', name: 'Canonical organization' });
    await waitFor(() => expect(name).toHaveProperty('disabled', false));
    expect(name).toHaveProperty('value', outcome === 'failure' ? 'Updated organization' : 'Canonical organization');
    if (outcome === 'success') {
      expect(organizationSave).toHaveProperty('disabled', true);
      await fireEvent.input(name, { target: { value: 'Updated organization' } });
    }
    await fireEvent.click(requireValue(organizationSave));
    await waitFor(() => expect(name).toHaveProperty('disabled', false));
    expect(updateCurrentOrganization).toHaveBeenCalledTimes(2);
    expect(updateCurrentOrganization).toHaveBeenLastCalledWith({ name: 'Updated organization' }, {});
    expect(organizationSave).toHaveProperty('disabled', true);
    expect(notificationProvider.open).toHaveBeenCalledTimes(4);
    expect(notificationProvider.open).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'success', message: 'Organization saved',
    }));
  });

  it('keeps enterprise field labels unique across page instances', async () => {
    const first = render(EnterpriseProvidersTestHost, { props: { page: 'enterprise', providerBundle: bundle() } });
    const second = render(EnterpriseProvidersTestHost, { props: { page: 'enterprise', providerBundle: bundle() } });
    await waitFor(() => {
      expect(first.container.querySelectorAll('label').length).toBe(5);
      expect(second.container.querySelectorAll('label').length).toBe(5);
    });
    const ids = new Set<string>();
    for (const container of [first.container, second.container]) {
      for (const label of container.querySelectorAll('label')) {
        const control = document.getElementById(label.htmlFor);
        expect(control).not.toBeNull();
        expect(container.contains(control)).toBe(true);
        expect(ids.has(label.htmlFor)).toBe(false);
        ids.add(label.htmlFor);
        if (control?.getAttribute('role') === 'switch') {
          expect(control.getAttribute('aria-label')).toBeNull();
        }
      }
    }
  });

  it('names connection tests accurately and serializes all test entry points until recovery', async () => {
    let rejectTest!: (reason: Error) => void;
    const pendingTest = new Promise<never>((_, reject) => { rejectTest = reject; });
    const testIdentityProvider = vi.fn<IdentityGovernanceProvider['testIdentityProvider']>()
      .mockReturnValueOnce(pendingTest).mockResolvedValue({ success: true });
    const notificationProvider: NotificationProvider = { open: vi.fn(), close: vi.fn() };
    const provider = identityProvider({
      listIdentityProviders: async () => [
        { id: 'oidc', name: 'Company OIDC', protocol: 'oidc', status: 'connected' },
        { id: 'saml', name: 'Partner SAML', protocol: 'saml', status: 'disconnected' },
      ],
      testIdentityProvider,
    });
    render(EnterpriseProvidersTestHost, {
      props: { page: 'enterprise', providerBundle: bundle({ identityGovernanceProvider: provider, notificationProvider }) },
    });
    await screen.findByText('Partner SAML');
    expect(screen.queryByRole('button', { name: /^(Manage|Connect)$/ })).toBeNull();
    const buttons = screen.getAllByRole('button', { name: 'Test' });
    expect(buttons).toHaveLength(3);
    // 同一同步事件栈触发多个入口，不能只依赖下一次 DOM 更新后的 disabled。
    for (const button of [requireValue(buttons[1]), requireValue(buttons[2]), requireValue(buttons[0])]) {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    await waitFor(() => expect(testIdentityProvider).toHaveBeenCalledTimes(1));
    expect(testIdentityProvider).toHaveBeenCalledWith({ id: 'oidc', protocol: 'oidc' }, {});
    for (const button of buttons) expect(button).toHaveProperty('disabled', true);
    rejectTest(new Error('PRIVATE_TEST_CONCURRENCY'));
    await waitFor(() => expect(notificationProvider.open).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', message: 'Operation failed' }),
    ));
    for (const button of buttons) expect(button).toHaveProperty('disabled', false);
    await fireEvent.click(requireValue(buttons[2]));
    await waitFor(() => expect(testIdentityProvider).toHaveBeenCalledTimes(2));
    expect(testIdentityProvider).toHaveBeenLastCalledWith({ id: 'saml', protocol: 'saml' }, {});
    await waitFor(() => expect(notificationProvider.open).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'success', message: 'Identity provider connection succeeded' }),
    ));
  });

  it.each(['success', 'failure'] as const)('does not let a late %s release a replacement provider test', async (outcome) => {
    type Result = Awaited<ReturnType<IdentityGovernanceProvider['testIdentityProvider']>>;
    let resolveOld!: (value: Result) => void;
    let rejectOld!: (reason: Error) => void;
    let resolveNew!: (value: Result) => void;
    const oldResult = new Promise<Result>((resolve, reject) => { resolveOld = resolve; rejectOld = reject; });
    const newResult = new Promise<Result>((resolve) => { resolveNew = resolve; });
    const notificationProvider: NotificationProvider = { open: vi.fn(), close: vi.fn() };
    const oldProvider = identityProvider({
      listIdentityProviders: async () => [{ id: 'old', name: 'Old OIDC', protocol: 'oidc', status: 'connected' }],
      testIdentityProvider: vi.fn(async () => oldResult),
    });
    const newProvider = identityProvider({
      listIdentityProviders: async () => [{ id: 'new', name: 'New OIDC', protocol: 'oidc', status: 'connected' }],
      testIdentityProvider: vi.fn(async () => newResult),
    });
    const { rerender } = render(EnterpriseProvidersTestHost, {
      props: { page: 'enterprise', providerBundle: bundle({ identityGovernanceProvider: oldProvider, notificationProvider }) },
    });
    await screen.findByText('Old OIDC');
    await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Test' })[1]));
    await rerender({
      page: 'enterprise', providerBundle: bundle({ identityGovernanceProvider: newProvider, notificationProvider }),
    });
    await screen.findByText('New OIDC');
    await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Test' })[1]));
    await waitFor(() => expect(newProvider.testIdentityProvider).toHaveBeenCalledTimes(1));
    expect(newProvider.testIdentityProvider).toHaveBeenCalledWith({ id: 'new', protocol: 'oidc' }, {});
    if (outcome === 'success') resolveOld({ success: true });
    else rejectOld(new Error('PRIVATE_OLD_CONNECTION'));
    await oldResult.catch(() => undefined);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(notificationProvider.open).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Testing...' })).toHaveProperty('disabled', true);
    resolveNew({ success: true });
    await waitFor(() => expect(notificationProvider.open).toHaveBeenCalledTimes(1));
    for (const button of screen.getAllByRole('button', { name: 'Test' })) {
      expect(button).toHaveProperty('disabled', false);
    }
  });

  describe.each([
    ['diagnostic', new Error('PRIVATE_ENTERPRISE_DIAGNOSTIC')],
    ['empty Error', new Error('')],
    ['non-Error', 'PRIVATE_ENTERPRISE_DIAGNOSTIC'],
  ])('enterprise failure recovery: %s', (_label, failure) => {
    it('shows a safe load error instead of empty content and recovers on retry', async () => {
      const provider = identityProvider();
      const getSecurityPolicy = vi.fn(provider.getSecurityPolicy).mockRejectedValueOnce(failure);
      render(EnterpriseProvidersTestHost, {
        props: { page: 'enterprise', providerBundle: bundle({ identityGovernanceProvider: { ...provider, getSecurityPolicy } }) },
      });

      expect(await screen.findByText('Enterprise settings failed to load')).toBeTruthy();
      expect(screen.getByText('Operation failed')).toBeTruthy();
      expect(screen.queryByText('No identity provider configured')).toBeNull();
      expect(screen.queryByLabelText(/Session Timeout/)).toBeNull();
      expect(document.body.textContent).not.toContain('PRIVATE_ENTERPRISE_DIAGNOSTIC');
      await fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(await screen.findByLabelText(/Session Timeout/)).toHaveProperty('value', '30');
      expect(screen.queryByText('Operation failed')).toBeNull();
      expect(getSecurityPolicy).toHaveBeenCalledTimes(2);
    });

    it('preserves the policy draft on save failure and permits a successful retry', async () => {
      const provider = identityProvider();
      const updateSecurityPolicy = vi.fn(provider.updateSecurityPolicy).mockRejectedValueOnce(failure);
      const notificationProvider: NotificationProvider = { open: vi.fn(), close: vi.fn() };
      render(EnterpriseProvidersTestHost, {
        props: { page: 'enterprise', providerBundle: bundle({ identityGovernanceProvider: { ...provider, updateSecurityPolicy }, notificationProvider }) },
      });

      const timeout = await screen.findByLabelText(/Session Timeout/);
      await fireEvent.input(timeout, { target: { value: '45' } });
      await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(notificationProvider.open).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: 'error', message: 'Operation failed' }),
      ));
      expect(timeout).toHaveProperty('value', '45');
      await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(notificationProvider.open).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: 'success', message: 'Enterprise policy saved' }),
      ));
      expect(updateSecurityPolicy).toHaveBeenCalledTimes(2);
      expect(updateSecurityPolicy).toHaveBeenLastCalledWith(
        { sessionTimeoutMinutes: 45, auditRetentionDays: 365, auditLoggingEnabled: true, requireSso: false }, {},
      );
    });

    it('preserves the organization draft on failure and permits a successful retry', async () => {
      const updateCurrentOrganization = vi.fn(async ({ name }: { name?: string }) => ({ id: 'org-1', name: name ?? 'Acme' }))
        .mockRejectedValueOnce(failure);
      const notificationProvider: NotificationProvider = { open: vi.fn(), close: vi.fn() };
      render(EnterpriseProvidersTestHost, {
        props: {
          page: 'enterprise',
          providerBundle: bundle({
            notificationProvider,
            organizationProvider: {
              getCurrentOrganization: vi.fn(async () => ({ id: 'org-1', name: 'Acme' })),
              updateCurrentOrganization,
            },
          }),
        },
      });

      const name = await screen.findByLabelText('Organization name');
      await fireEvent.input(name, { target: { value: 'Acme Global' } });
      await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Save' })[0]));
      await waitFor(() => expect(notificationProvider.open).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: 'error', message: 'Operation failed' }),
      ));
      expect(name).toHaveProperty('value', 'Acme Global');
      await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Save' })[0]));
      await waitFor(() => expect(notificationProvider.open).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: 'success', message: 'Organization saved' }),
      ));
      expect(updateCurrentOrganization).toHaveBeenCalledTimes(2);
      expect(updateCurrentOrganization).toHaveBeenLastCalledWith({ name: 'Acme Global' }, {});
    });

    it('sanitizes thrown connection failures and allows retesting', async () => {
      const testIdentityProvider = vi.fn<IdentityGovernanceProvider['testIdentityProvider']>()
        .mockRejectedValueOnce(failure).mockResolvedValue({ success: true });
      const notificationProvider: NotificationProvider = { open: vi.fn(), close: vi.fn() };
      render(EnterpriseProvidersTestHost, {
        props: { page: 'enterprise', providerBundle: bundle({ identityGovernanceProvider: identityProvider({ testIdentityProvider }), notificationProvider }) },
      });
      await screen.findByLabelText(/Session Timeout/);
      await fireEvent.click(screen.getByRole('button', { name: 'Test' }));
      await waitFor(() => expect(notificationProvider.open).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: 'error', message: 'Operation failed' }),
      ));
      await fireEvent.click(screen.getByRole('button', { name: 'Test' }));
      await waitFor(() => expect(notificationProvider.open).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: 'success', message: 'Identity provider connection succeeded' }),
      ));
      expect(testIdentityProvider).toHaveBeenCalledTimes(2);
    });
  });

  it.each(['PRIVATE_CONNECTION_DIAGNOSTIC', ''])('sanitizes unsuccessful connection results (%s)', async (message) => {
    const testIdentityProvider = vi.fn<IdentityGovernanceProvider['testIdentityProvider']>()
      .mockResolvedValueOnce({ success: false, error: { message } }).mockResolvedValue({ success: true });
    const notificationProvider: NotificationProvider = { open: vi.fn(), close: vi.fn() };
    render(EnterpriseProvidersTestHost, {
      props: { page: 'enterprise', providerBundle: bundle({ identityGovernanceProvider: identityProvider({ testIdentityProvider }), notificationProvider }) },
    });
    await screen.findByLabelText(/Session Timeout/);
    await fireEvent.click(screen.getByRole('button', { name: 'Test' }));
    await waitFor(() => expect(notificationProvider.open).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'error', message: 'Operation failed' }),
    ));
    await fireEvent.click(screen.getByRole('button', { name: 'Test' }));
    await waitFor(() => expect(notificationProvider.open).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'success', message: 'Identity provider connection succeeded' }),
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
    await fireEvent.click(requireValue(saveButtons[0]));

    await waitFor(() => expect(updateCurrentOrganization).toHaveBeenCalledWith(
      { name: 'Acme Global' },
      {},
    ));
  });
});
