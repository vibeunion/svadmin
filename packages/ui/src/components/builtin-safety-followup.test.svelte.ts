import { requireValue } from '../../../../scripts/test-assertions';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetContext, type AuthProvider, type CredentialProvider, type DataProvider, type NotificationProvider, type SessionProvider } from '@svadmin/core';
import Host from './enterprise-providers.test-host.svelte';
import MemberHost from './builtin-pm.test-host.svelte';
import SecurityLog from './account/SecurityLogPage.svelte';
import TeamCrew from './network/TeamCrewTablePage.svelte';
import { referenceDemoData } from '../reference-data.js';
import { exactRoleName } from '../../test/accessible-name';

const dataProvider = {
  getList: async () => ({ data: [], total: 0 }), getOne: async () => ({ data: { id: '1' } }),
  create: async () => ({ data: { id: '1' } }), update: async () => ({ data: { id: '1' } }),
  deleteOne: async () => ({ data: { id: '1' } }), getApiUrl: () => '/api',
} as DataProvider;
function credentials(): CredentialProvider {
  return {
    listApiCredentials: async () => [],
    createApiCredential: async () => ({
      credential: { id: 'key', name: 'Key', prefix: 'test_', createdAt: '2026-09-21', permissions: [] },
      secret: 'test-secret',
    }),
    revokeApiCredential: async () => ({ success: true }),
    listWebhooks: async () => [{ id: 'hook', name: 'Order Events', url: 'https://example.com/hook', eventType: 'resource.created' }],
    createWebhook: async input => ({ id: 'hook', ...input }),
    deleteWebhook: vi.fn(async () => ({ success: false, error: { message: 'Delete rejected' } })),
  };
}
function sessions(): SessionProvider {
  return {
    listSessions: async () => [
      { id: 'current', current: true, os: 'macOS', browser: 'Safari' },
      { id: 'other', current: false, os: 'Windows', browser: 'Edge' },
    ],
    revokeSession: async () => ({ success: true }),
    revokeOtherSessions: vi.fn(async () => ({ success: false, error: { message: 'Revoke rejected' } })),
    getMfaState: async () => ({ enabled: true }),
    setMfaEnabled: vi.fn(async () => { throw new Error('MFA rejected'); }),
  };
}
function notifications(): NotificationProvider { return { open: vi.fn(), close: vi.fn() }; }
function passwordAuth(updatePassword: NonNullable<AuthProvider['updatePassword']>): AuthProvider {
  return {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    getIdentity: async () => ({ id: 'password-user' }),
    updatePassword,
  };
}
const cancel = async () => fireEvent.click(await screen.findByRole('button', { name: /^Cancel$/ }));
const confirm = async () => fireEvent.click(await screen.findByRole('button', { name: /^Confirm$/ }));
afterEach(() => { cleanup(); resetContext(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('builtin safety follow-up', () => {
  it.each(['empty', 'records'] as const)('owns API loading and retry feedback once before recovering to %s', async outcome => {
    type Hooks = Awaited<ReturnType<CredentialProvider['listWebhooks']>>;
    let fail: (reason: unknown) => void = () => { throw new Error('Missing request'); };
    const first = new Promise<Hooks>((_resolve, reject) => { fail = reject; });
    let recover: (value: Hooks) => void = () => { throw new Error('Missing retry'); };
    const second = new Promise<Hooks>(resolve => { recover = resolve; });
    const credentialProvider = credentials();
    const readKeys = vi.fn(credentialProvider.listApiCredentials);
    const readHooks = vi.fn<CredentialProvider['listWebhooks']>()
      .mockReturnValueOnce(first).mockReturnValueOnce(second);
    credentialProvider.listApiCredentials = readKeys;
    credentialProvider.listWebhooks = readHooks;
    const view = render(Host, { page: 'api', providerBundle: { dataProvider, credentialProvider } });
    await waitFor(() => expect(readHooks).toHaveBeenCalledOnce());
    expect(view.container.querySelectorAll('[data-svadmin-data-state="loading"]')).toHaveLength(1);
    expect(screen.queryByText('No webhooks configured yet.')).toBeNull();
    expect(screen.queryByText('No active API keys generated yet.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add Webhook' })).toBeNull();

    fail(new Error('PRIVATE_READ_ERROR'));
    await screen.findByRole('alert');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: exactRoleName('Retry') })).toHaveLength(1);
    expect(screen.queryByText('No webhooks configured yet.')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: exactRoleName('Retry') }));
    expect(view.container.querySelectorAll('[data-svadmin-data-state="loading"]')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: exactRoleName('Retry') })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    recover(outcome === 'empty' ? [] : [
      { id: 'recovered', name: 'Recovered webhook', url: 'https://example.com/recovered', eventType: 'resource.created' },
    ]);
    await screen.findByText(outcome === 'empty' ? 'No webhooks configured yet.' : 'Recovered webhook');
    expect(view.container.querySelector('[data-svadmin-data-state="loading"]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add Webhook' })).toBeTruthy();
    expect(readKeys).toHaveBeenCalledTimes(2);
    expect(readHooks).toHaveBeenCalledTimes(2);
  });

  it.each(['keys', 'webhooks'] as const)('sanitizes %s loading failure and recovers through read-only retry', async source => {
    const credentialProvider = credentials();
    const readKeys = vi.fn(credentialProvider.listApiCredentials);
    const readHooks = vi.fn(credentialProvider.listWebhooks);
    credentialProvider.listApiCredentials = readKeys;
    credentialProvider.listWebhooks = readHooks;
    if (source === 'keys') readKeys.mockRejectedValueOnce(new Error(''));
    else readHooks.mockRejectedValueOnce({ message: 'PRIVATE_READ_ERROR' });
    const notificationProvider = notifications();
    const view = render(Host, { page: 'api', providerBundle: { dataProvider, credentialProvider, notificationProvider } });
    expect((await screen.findByRole('alert')).textContent).toContain('Operation failed');
    expect(view.container.innerHTML).not.toContain('PRIVATE_READ_ERROR');
    expect(screen.queryByText('No webhooks configured yet.')).toBeNull();
    expect(notificationProvider.open).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: exactRoleName('Retry') }));
    await screen.findByText('Order Events');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(readKeys).toHaveBeenCalledTimes(2);
    expect(readHooks).toHaveBeenCalledTimes(2);
  });

  it.each(['key', 'webhook'] as const)('sanitizes %s creation failure and preserves the draft for retry', async kind => {
    const credentialProvider = credentials();
    const createKey = vi.fn(credentialProvider.createApiCredential);
    const createWebhook = vi.fn<CredentialProvider['createWebhook']>(async input => ({ id: 'new-hook', ...input }));
    credentialProvider.createApiCredential = createKey;
    credentialProvider.createWebhook = createWebhook;
    if (kind === 'key') createKey.mockRejectedValueOnce(new Error('PRIVATE_CREATION_ERROR'));
    else createWebhook.mockRejectedValueOnce('PRIVATE_CREATION_ERROR');
    const notificationProvider = notifications();
    const view = render(Host, { page: 'api', providerBundle: { dataProvider, credentialProvider, notificationProvider } });
    await screen.findByText('Order Events');
    const name = screen.getByPlaceholderText(kind === 'key' ? 'CI deployment token' : 'Order Events');
    await fireEvent.input(name, { target: { value: 'New integration' } });
    if (kind === 'webhook') {
      await fireEvent.input(screen.getByPlaceholderText('https://api.example.com/hooks'), { target: { value: 'https://example.com/new-hook' } });
    }
    const submit = screen.getByRole('button', { name: kind === 'key' ? /Generate Token/ : 'Add Webhook' });
    await fireEvent.click(submit);
    await waitFor(() => expect(notificationProvider.open).toHaveBeenCalledExactlyOnceWith({ type: 'error', message: 'Operation failed' }));
    expect(view.container.innerHTML).not.toContain('PRIVATE_CREATION_ERROR');
    expect(screen.getByDisplayValue('New integration')).toBe(name);
    await fireEvent.click(submit);
    if (kind === 'key') await screen.findByDisplayValue('test-secret');
    else await screen.findByText('New integration');
    expect(kind === 'key' ? createKey : createWebhook).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['key', 'success'], ['key', 'failure'], ['webhook', 'success'], ['webhook', 'failure'],
  ] as const)('serializes %s creation through %s and preserves the other form', async (kind, outcome) => {
    let finish!: () => void;
    let fail!: (reason: Error) => void;
    const pending = new Promise<void>((resolve, reject) => { finish = resolve; fail = reject; });
    const credentialProvider = credentials();
    const keyResult = {
      credential: { id: 'concurrent-key', name: 'Concurrent key', prefix: 'test_', createdAt: '2026-09-21', permissions: ['Read'] },
      secret: 'concurrent-secret',
    };
    const webhookResult = { id: 'concurrent-hook', name: 'Concurrent hook', url: 'https://example.com/concurrent', eventType: 'resource.created' };
    const createKey = vi.fn<CredentialProvider['createApiCredential']>().mockResolvedValue(keyResult);
    const createWebhook = vi.fn<CredentialProvider['createWebhook']>().mockResolvedValue(webhookResult);
    if (kind === 'key') createKey.mockImplementationOnce(async () => { await pending; return keyResult; });
    else createWebhook.mockImplementationOnce(async () => { await pending; return webhookResult; });
    credentialProvider.createApiCredential = createKey;
    credentialProvider.createWebhook = createWebhook;
    const notificationProvider = notifications();
    render(Host, { page: 'api', providerBundle: { dataProvider, credentialProvider, notificationProvider } });
    await screen.findByText('Order Events');
    const keyName = screen.getByPlaceholderText('CI deployment token');
    const hookName = screen.getByPlaceholderText('Order Events');
    const hookUrl = screen.getByPlaceholderText('https://api.example.com/hooks');
    await fireEvent.input(keyName, { target: { value: 'Concurrent key' } });
    await fireEvent.input(hookName, { target: { value: 'Concurrent hook' } });
    await fireEvent.input(hookUrl, { target: { value: 'https://example.com/concurrent' } });
    const keyForm = requireValue(keyName.closest('form'));
    const hookForm = requireValue(hookName.closest('form'));
    const firstForm = kind === 'key' ? keyForm : hookForm;
    const otherForm = kind === 'key' ? hookForm : keyForm;
    // 同一事件栈绕过按钮禁用更新，检验两个提交函数共享的同步门禁。
    for (const form of [firstForm, firstForm, otherForm]) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
    expect(kind === 'key' ? createKey : createWebhook).toHaveBeenCalledTimes(1);
    expect(kind === 'key' ? createWebhook : createKey).not.toHaveBeenCalled();
    await waitFor(() => expect(keyName).toHaveProperty('disabled', true));
    expect(hookName).toHaveProperty('disabled', true);
    if (outcome === 'failure') {
      fail(new Error('PRIVATE_CONCURRENT_CREATE'));
      await waitFor(() => expect(notificationProvider.open).toHaveBeenCalledExactlyOnceWith({ type: 'error', message: 'Operation failed' }));
      expect(keyName).toHaveProperty('value', 'Concurrent key');
      expect(hookName).toHaveProperty('value', 'Concurrent hook');
      await fireEvent.submit(firstForm);
    } else {
      finish();
    }
    if (kind === 'key') await screen.findByDisplayValue('concurrent-secret');
    else await screen.findByText('Concurrent hook');
    await waitFor(() => expect(keyName).toHaveProperty('disabled', false));
    expect(hookName).toHaveProperty('disabled', false);
    expect(kind === 'key' ? keyName : hookName).toHaveProperty('value', '');
    expect(kind === 'key' ? hookName : keyName).toHaveProperty('value', kind === 'key' ? 'Concurrent hook' : 'Concurrent key');
    expect(kind === 'key' ? createKey : createWebhook).toHaveBeenCalledTimes(outcome === 'failure' ? 2 : 1);
    await fireEvent.submit(otherForm);
    await waitFor(() => expect(kind === 'key' ? createWebhook : createKey).toHaveBeenCalledTimes(1));
    expect(createKey).toHaveBeenLastCalledWith({ name: 'Concurrent key', permissions: ['Read'] }, {});
    expect(createWebhook).toHaveBeenLastCalledWith({
      name: 'Concurrent hook', url: 'https://example.com/concurrent', eventType: 'resource.created',
    }, {});
    await screen.findByDisplayValue('concurrent-secret');
    await screen.findByText('Concurrent hook');
    await waitFor(() => {
      expect(keyName).toHaveProperty('disabled', false);
      expect(hookName).toHaveProperty('disabled', false);
      expect(keyName).toHaveProperty('value', '');
      expect(hookName).toHaveProperty('value', '');
    });
  });

  it.each(['throw', 'result'] as const)('sanitizes credential revoke %s failures without removing the record', async failure => {
    const credentialProvider = credentials();
    credentialProvider.listApiCredentials = async () => [
      { id: 'key', name: 'Existing key', prefix: 'test_', createdAt: '2026-09-21', permissions: [] },
    ];
    const revoke = vi.fn(credentialProvider.revokeApiCredential);
    credentialProvider.revokeApiCredential = revoke;
    if (failure === 'throw') revoke.mockRejectedValueOnce(new Error('PRIVATE_REVOKE_ERROR'));
    else revoke.mockResolvedValueOnce({ success: false, error: { message: 'PRIVATE_REVOKE_ERROR' } });
    const notificationProvider = notifications();
    const view = render(Host, { page: 'api', providerBundle: { dataProvider, credentialProvider, notificationProvider } });
    await fireEvent.click(await screen.findByRole('button', { name: 'Delete Existing key' }));
    await confirm();
    await waitFor(() => expect(notificationProvider.open).toHaveBeenCalledExactlyOnceWith({ type: 'error', message: 'Operation failed' }));
    expect(screen.getByText('Existing key')).toBeTruthy();
    expect(view.container.innerHTML).not.toContain('PRIVATE_REVOKE_ERROR');
    await fireEvent.click(screen.getByRole('button', { name: 'Delete Existing key' }));
    await confirm();
    await waitFor(() => expect(screen.queryByText('Existing key')).toBeNull());
    expect(revoke).toHaveBeenCalledTimes(2);
  });

  it('cancels webhook deletion without writes and retains the webhook after rejection, then retries', async () => {
    const credentialProvider = credentials();
    const notificationProvider = notifications();
    render(Host, { page: 'api', providerBundle: { dataProvider, credentialProvider, notificationProvider } });
    const remove = await screen.findByRole('button', { name: 'Delete Order Events' });
    await fireEvent.click(remove); await cancel();
    expect(credentialProvider.deleteWebhook).not.toHaveBeenCalled();
    await fireEvent.click(remove); await confirm();
    await waitFor(() => expect(notificationProvider.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'Operation failed' })));
    expect(screen.getByText('Order Events')).toBeTruthy();
    vi.mocked(credentialProvider.deleteWebhook).mockResolvedValueOnce({ success: true });
    await fireEvent.click(remove); await confirm();
    await waitFor(() => expect(screen.queryByText('Order Events')).toBeNull());
    expect(credentialProvider.deleteWebhook).toHaveBeenCalledTimes(2);
  });

  it.each([true, false])('keeps MFA unknown while loading, then displays the returned %s state', async enabled => {
    let resolveMfa!: (value: { enabled: boolean }) => void;
    const pending = new Promise<{ enabled: boolean }>(resolve => { resolveMfa = resolve; });
    const sessionProvider = sessions();
    sessionProvider.getMfaState = () => pending;
    render(Host, { page: 'security', providerBundle: { dataProvider, sessionProvider } });
    const toggle = await screen.findByRole('switch');
    expect(toggle).toHaveProperty('disabled', true);
    expect(screen.getByText('Two-factor authentication status is currently unavailable.')).toBeTruthy();
    await fireEvent.click(toggle);
    expect(sessionProvider.setMfaEnabled).not.toHaveBeenCalled();
    resolveMfa({ enabled });
    await waitFor(() => expect(toggle).toHaveProperty('disabled', false));
    expect(toggle.getAttribute('aria-checked')).toBe(String(enabled));
    expect(screen.queryByText('Two-factor authentication status is currently unavailable.')).toBeNull();
    expect(screen.getByText(enabled
      ? '2FA is currently active. Verification codes will be required on new logins.'
      : '2FA is currently disabled. Protect your account by turning it on.')).toBeTruthy();
  });

  it('keeps MFA unknown after its own read fails and recovers only on explicit retry', async () => {
    const sessionProvider = sessions();
    const readMfa = vi.fn<NonNullable<SessionProvider['getMfaState']>>()
      .mockRejectedValueOnce(new Error('PRIVATE_MFA_READ'))
      .mockResolvedValue({ enabled: false });
    sessionProvider.getMfaState = readMfa;
    render(Host, { page: 'security', providerBundle: { dataProvider, sessionProvider } });
    await screen.findByRole('alert');
    expect(screen.getByRole('switch')).toHaveProperty('disabled', true);
    expect(screen.getByText('Two-factor authentication status is currently unavailable.')).toBeTruthy();
    expect(document.body.textContent).not.toContain('PRIVATE_MFA_READ');
    expect(readMfa).toHaveBeenCalledTimes(1);
    await fireEvent.click(screen.getByRole('button', { name: exactRoleName('Retry') }));
    await waitFor(() => expect(screen.getByRole('switch')).toHaveProperty('disabled', false));
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText('2FA is currently disabled. Protect your account by turning it on.')).toBeTruthy();
    expect(readMfa).toHaveBeenCalledTimes(2);
    expect(sessionProvider.setMfaEnabled).not.toHaveBeenCalled();
  });

  it('does not infer a disabled MFA state when the read capability is missing', async () => {
    const sessionProvider = sessions();
    delete sessionProvider.getMfaState;
    render(Host, { page: 'security', providerBundle: { dataProvider, sessionProvider } });
    await screen.findByText('Windows - Edge');
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveProperty('disabled', true);
    expect(screen.getByText('Two-factor authentication status is currently unavailable.')).toBeTruthy();
    await fireEvent.click(toggle);
    expect(sessionProvider.setMfaEnabled).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('cancels disabling MFA and keeps it enabled after provider failure', async () => {
    const sessionProvider = sessions();
    const notificationProvider = notifications();
    render(Host, { page: 'security', providerBundle: { dataProvider, sessionProvider, notificationProvider } });
    const toggle = await screen.findByRole('switch');
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'));
    await fireEvent.click(toggle); await cancel();
    expect(sessionProvider.setMfaEnabled).not.toHaveBeenCalled();
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    await fireEvent.click(toggle); await confirm();
    await waitFor(() => expect(notificationProvider.open).toHaveBeenCalledExactlyOnceWith({ message: 'Operation failed', type: 'error' }));
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(sessionProvider.setMfaEnabled).toHaveBeenCalledWith(false, {});
    vi.mocked(requireValue(sessionProvider.setMfaEnabled)).mockResolvedValueOnce({ enabled: false });
    await fireEvent.click(toggle); await confirm();
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('false'));
  });

  it.each(['throw', 'result', 'empty'] as const)('sanitizes security reads and password %s failures, then recovers', async failure => {
    const sessionProvider = sessions();
    const listSessions = vi.fn<SessionProvider['listSessions']>()
      .mockRejectedValueOnce(new Error('PRIVATE_SESSION_READ'))
      .mockResolvedValueOnce([
        { id: 'current', current: true, os: 'macOS', browser: 'Safari' },
      ]);
    sessionProvider.listSessions = listSessions;
    const updatePassword = vi.fn<NonNullable<AuthProvider['updatePassword']>>(async () => ({ success: true }));
    if (failure === 'result') {
      updatePassword.mockResolvedValueOnce({ success: false, error: { message: 'PRIVATE_PASSWORD_UPDATE' } });
    } else {
      updatePassword.mockRejectedValueOnce(new Error(failure === 'empty' ? '' : 'PRIVATE_PASSWORD_UPDATE'));
    }
    const authProvider: AuthProvider = {
      login: async () => ({ success: true }),
      logout: async () => ({ success: true }),
      check: async () => ({ authenticated: true }),
      getIdentity: async () => ({ id: 'user-1' }),
      updatePassword,
    };
    const view = render(Host, { page: 'security', providerBundle: { dataProvider, sessionProvider }, authProvider });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Operation failed'));
    expect(view.container.innerHTML).not.toContain('PRIVATE_SESSION_READ');
    expect(screen.getByText('Two-factor authentication status is currently unavailable.')).toBeTruthy();
    expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: exactRoleName('Retry') }));
    await screen.findByText(/macOS - Safari/);
    expect(screen.getByText('2FA is currently active. Verification codes will be required on new logins.')).toBeTruthy();
    expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(false);

    await fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));
    expect(screen.getByRole('alert').textContent).toContain('Current Password');
    expect(updatePassword).not.toHaveBeenCalled();
    await fireEvent.input(screen.getByLabelText('Current Password'), { target: { value: 'old-password' } });
    await fireEvent.input(screen.getByLabelText('New Password'), { target: { value: 'New-password-123' } });
    await fireEvent.input(screen.getByLabelText('Confirm Password'), { target: { value: 'New-password-123' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Operation failed'));
    expect(view.container.innerHTML).not.toContain('PRIVATE_PASSWORD_UPDATE');
    expect(updatePassword).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Current Password')).toHaveProperty('value', 'old-password');
    await fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    await waitFor(() => expect(screen.getByLabelText('Current Password')).toHaveProperty('value', ''));
    expect(screen.getByLabelText('New Password')).toHaveProperty('value', '');
    expect(screen.getByLabelText('Confirm Password')).toHaveProperty('value', '');
    expect(updatePassword).toHaveBeenCalledTimes(2);
    expect(updatePassword).toHaveBeenLastCalledWith({
      currentPassword: 'old-password', password: 'New-password-123', confirmPassword: 'New-password-123',
    });
    expect(listSessions).toHaveBeenCalledTimes(2);
  });

  it.each(['success', 'throw', 'result'] as const)('serializes security password submissions and recovers after %s', async outcome => {
    type Result = Awaited<ReturnType<NonNullable<AuthProvider['updatePassword']>>>;
    let resolve!: (value: Result) => void;
    let reject!: (reason: Error) => void;
    const pending = new Promise<Result>((done, fail) => { resolve = done; reject = fail; });
    const updatePassword = vi.fn<NonNullable<AuthProvider['updatePassword']>>()
      .mockReturnValueOnce(pending).mockResolvedValue({ success: true });
    const notificationProvider = notifications();
    render(Host, {
      page: 'security',
      providerBundle: { dataProvider, sessionProvider: sessions(), notificationProvider },
      authProvider: passwordAuth(updatePassword),
    });
    await screen.findByText(/macOS - Safari/);
    const fields = ['Current Password', 'New Password', 'Confirm Password'].map(label => screen.getByLabelText(label));
    const values = ['old-password', 'New-password-123', 'New-password-123'];
    for (const [index, field] of fields.entries()) {
      await fireEvent.input(field, { target: { value: values[index] } });
    }
    const form = requireValue(requireValue(fields[0]).closest('form'));
    // 不等待 DOM disabled 更新，覆盖函数层重复提交。
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(() => expect(updatePassword).toHaveBeenCalledTimes(1));
    for (const field of fields) expect(field).toHaveProperty('disabled', true);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(updatePassword).toHaveBeenCalledTimes(1);
    expect(updatePassword).toHaveBeenCalledWith({
      currentPassword: values[0], password: values[1], confirmPassword: values[2],
    });
    if (outcome === 'throw') reject(new Error('PRIVATE_PENDING_PASSWORD'));
    else resolve(outcome === 'result'
      ? { success: false, error: { message: 'PRIVATE_PENDING_PASSWORD' } }
      : { success: true });
    await waitFor(() => expect(requireValue(fields[0])).toHaveProperty('disabled', false));
    for (const [index, field] of fields.entries()) {
      expect(field).toHaveProperty('value', outcome === 'success' ? '' : values[index]);
    }
    if (outcome !== 'success') {
      expect(screen.getByRole('alert').textContent).toContain('Operation failed');
      expect(document.body.textContent).not.toContain('PRIVATE_PENDING_PASSWORD');
      expect(notificationProvider.open).not.toHaveBeenCalled();
    } else {
      expect(notificationProvider.open).toHaveBeenCalledTimes(1);
      for (const [index, field] of fields.entries()) {
        await fireEvent.input(field, { target: { value: values[index] } });
      }
    }
    await fireEvent.submit(form);
    await waitFor(() => expect(updatePassword).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(requireValue(fields[0])).toHaveProperty('value', ''));
    for (const field of fields) {
      expect(field).toHaveProperty('value', '');
      expect(field).toHaveProperty('disabled', false);
    }
    expect(screen.queryByRole('alert')).toBeNull();
    expect(updatePassword).toHaveBeenLastCalledWith({
      currentPassword: values[0], password: values[1], confirmPassword: values[2],
    });
    expect(notificationProvider.open).toHaveBeenCalledTimes(outcome === 'success' ? 2 : 1);
  });

  it.each([
    ['success', true], ['throw', true], ['result', true],
    ['success', false], ['throw', false], ['result', false],
  ] as const)('finishes password %s independently of a session retry (read finishes first: %s)', async (outcome, readFirst) => {
    type Result = Awaited<ReturnType<NonNullable<AuthProvider['updatePassword']>>>;
    type Sessions = Awaited<ReturnType<SessionProvider['listSessions']>>;
    let finishRead!: (value: Sessions) => void;
    let finishWrite!: (value: Result) => void;
    let failWrite!: (reason: Error) => void;
    const read = new Promise<Sessions>(resolve => { finishRead = resolve; });
    const write = new Promise<Result>((resolve, reject) => { finishWrite = resolve; failWrite = reject; });
    const sessionProvider = sessions();
    const listSessions = vi.fn<SessionProvider['listSessions']>()
      .mockRejectedValueOnce(new Error('PRIVATE_INITIAL_READ'))
      .mockReturnValueOnce(read);
    sessionProvider.listSessions = listSessions;
    const updatePassword = vi.fn<NonNullable<AuthProvider['updatePassword']>>()
      .mockReturnValueOnce(write).mockResolvedValue({ success: true });
    const notificationProvider = notifications();
    const view = render(Host, {
      page: 'security', providerBundle: { dataProvider, sessionProvider, notificationProvider },
      authProvider: passwordAuth(updatePassword),
    });
    await screen.findByRole('alert');
    const fields = ['Current Password', 'New Password', 'Confirm Password'].map(label => screen.getByLabelText(label));
    const values = ['old-password', 'New-password-123', 'New-password-123'];
    for (const [index, field] of fields.entries()) {
      await fireEvent.input(field, { target: { value: values[index] } });
    }
    const form = requireValue(requireValue(fields[0]).closest('form'));
    await fireEvent.submit(form);
    await fireEvent.click(screen.getByRole('button', { name: exactRoleName('Retry') }));
    expect(listSessions).toHaveBeenCalledTimes(2);
    await fireEvent.submit(form);
    expect(updatePassword).toHaveBeenCalledTimes(1);
    for (const field of fields) expect(field).toHaveProperty('disabled', true);

    const recovered = [{ id: 'current', current: true, os: 'macOS', browser: 'Safari' }];
    if (readFirst) {
      finishRead(recovered);
      await screen.findByText('macOS - Safari');
    }
    if (outcome === 'throw') failWrite(new Error('PRIVATE_PASSWORD_WRITE'));
    else finishWrite(outcome === 'success' ? { success: true } : {
      success: false, error: { message: 'PRIVATE_PASSWORD_WRITE' },
    });
    await waitFor(() => expect(requireValue(fields[0])).toHaveProperty('disabled', false));
    for (const [index, field] of fields.entries()) {
      expect(field).toHaveProperty('value', outcome === 'success' ? '' : values[index]);
      expect(field).toHaveProperty('disabled', false);
    }
    expect(document.body.textContent).not.toContain('PRIVATE_');
    if (outcome !== 'success') {
      expect(screen.getByRole('alert').textContent).toContain('Operation failed');
      expect(notificationProvider.open).not.toHaveBeenCalled();
      await fireEvent.submit(form);
      await waitFor(() => expect(requireValue(fields[0])).toHaveProperty('value', ''));
      expect(updatePassword).toHaveBeenCalledTimes(2);
    }
    expect(updatePassword).toHaveBeenLastCalledWith({
      currentPassword: values[0], password: values[1], confirmPassword: values[2],
    });
    expect(notificationProvider.open).toHaveBeenCalledTimes(1);
    if (!readFirst) {
      expect(view.container.querySelector('[data-svadmin-data-state="loading"]')).not.toBeNull();
      finishRead(recovered);
      await screen.findByText('macOS - Safari');
    }
    expect(screen.queryByRole('alert')).toBeNull();
    expect(listSessions).toHaveBeenCalledTimes(2);
  });

  it.each(['success', 'failure'] as const)('ignores a late session read %s after provider replacement', async outcome => {
    type Sessions = Awaited<ReturnType<SessionProvider['listSessions']>>;
    let finish!: (value: Sessions) => void;
    let fail!: (reason: Error) => void;
    const pending = new Promise<Sessions>((resolve, reject) => { finish = resolve; fail = reject; });
    const oldProvider = sessions();
    oldProvider.listSessions = vi.fn(() => pending);
    const notificationProvider = notifications();
    const view = render(Host, {
      page: 'security', providerBundle: { dataProvider, sessionProvider: oldProvider, notificationProvider },
    });
    await waitFor(() => expect(oldProvider.listSessions).toHaveBeenCalledOnce());
    const newProvider = sessions();
    newProvider.listSessions = vi.fn(async () => [
      { id: 'new-session', current: true, os: 'Linux', browser: 'Firefox' },
    ]);
    await view.rerender({ providerBundle: { dataProvider, sessionProvider: newProvider, notificationProvider } });
    await screen.findByText('Linux - Firefox');
    if (outcome === 'success') finish([{ id: 'old-session', current: true, os: 'Old', browser: 'Browser' }]);
    else fail(new Error('PRIVATE_OLD_READ'));
    await pending.catch(() => undefined);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.getByText('Linux - Firefox')).toBeTruthy();
    expect(screen.queryByText('Old - Browser')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(notificationProvider.open).not.toHaveBeenCalled();
    expect(newProvider.listSessions).toHaveBeenCalledOnce();
  });

  it.each(['success', 'failure'] as const)('ignores late password %s while a replacement provider is saving', async outcome => {
    type Result = Awaited<ReturnType<NonNullable<AuthProvider['updatePassword']>>>;
    let resolveOld!: (value: Result) => void;
    let rejectOld!: (reason: Error) => void;
    let resolveNew!: (value: Result) => void;
    const oldPending = new Promise<Result>((resolve, reject) => { resolveOld = resolve; rejectOld = reject; });
    const newPending = new Promise<Result>(resolve => { resolveNew = resolve; });
    const oldWrite = vi.fn<NonNullable<AuthProvider['updatePassword']>>(() => oldPending);
    const newWrite = vi.fn<NonNullable<AuthProvider['updatePassword']>>(() => newPending);
    const notificationProvider = notifications();
    const view = render(Host, {
      page: 'security',
      providerBundle: { dataProvider, sessionProvider: sessions(), notificationProvider },
      authProvider: passwordAuth(oldWrite),
    });
    await screen.findByText(/macOS - Safari/);
    const labels = ['Current Password', 'New Password', 'Confirm Password'];
    const oldValues = ['old-current', 'Old-password-123', 'Old-password-123'];
    for (const [index, label] of labels.entries()) {
      await fireEvent.input(screen.getByLabelText(label), { target: { value: oldValues[index] } });
    }
    await fireEvent.submit(requireValue(screen.getByLabelText('Current Password').closest('form')));
    expect(oldWrite).toHaveBeenCalledTimes(1);
    await view.rerender({ authProvider: passwordAuth(newWrite) });
    await waitFor(() => expect(screen.getByLabelText('Current Password')).toHaveProperty('value', ''));
    const newValues = ['new-current', 'Replacement-password-123', 'Replacement-password-123'];
    for (const [index, label] of labels.entries()) {
      await fireEvent.input(screen.getByLabelText(label), { target: { value: newValues[index] } });
    }
    const form = requireValue(screen.getByLabelText('Current Password').closest('form'));
    await fireEvent.submit(form);
    expect(newWrite).toHaveBeenCalledTimes(1);
    if (outcome === 'success') resolveOld({ success: true });
    else rejectOld(new Error('PRIVATE_OLD_PASSWORD'));
    await oldPending.catch(() => undefined);
    await new Promise(resolve => setTimeout(resolve, 0));
    for (const [index, label] of labels.entries()) {
      expect(screen.getByLabelText(label)).toHaveProperty('value', newValues[index]);
      expect(screen.getByLabelText(label)).toHaveProperty('disabled', true);
    }
    expect(notificationProvider.open).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    await fireEvent.submit(form);
    expect(newWrite).toHaveBeenCalledTimes(1);
    resolveNew({ success: true });
    await waitFor(() => expect(screen.getByLabelText('Current Password')).toHaveProperty('value', ''));
    for (const label of labels) {
      expect(screen.getByLabelText(label)).toHaveProperty('value', '');
      expect(screen.getByLabelText(label)).toHaveProperty('disabled', false);
    }
    expect(notificationProvider.open).toHaveBeenCalledTimes(1);
    expect(newWrite).toHaveBeenCalledWith({
      currentPassword: newValues[0], password: newValues[1], confirmPassword: newValues[2],
    });
  });

  it.each(['throw', 'result'] as const)('preserves a session after a sanitized %s revocation failure, then retries', async failure => {
    const sessionProvider = sessions();
    const revoke = vi.fn(sessionProvider.revokeSession);
    sessionProvider.revokeSession = revoke;
    if (failure === 'throw') revoke.mockRejectedValueOnce('PRIVATE_REVOKE_SESSION');
    else revoke.mockResolvedValueOnce({ success: false, error: { message: 'PRIVATE_REVOKE_SESSION' } });
    const notificationProvider = notifications();
    const view = render(Host, { page: 'security', providerBundle: { dataProvider, sessionProvider, notificationProvider } });
    await screen.findByText(/Windows - Edge/);
    await fireEvent.click(screen.getByTitle('Sign out device'));
    await cancel();
    expect(revoke).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByTitle('Sign out device'));
    await confirm();
    await waitFor(() => expect(notificationProvider.open).toHaveBeenCalledExactlyOnceWith({ type: 'error', message: 'Operation failed' }));
    expect(view.container.innerHTML).not.toContain('PRIVATE_REVOKE_SESSION');
    expect(screen.getByText(/Windows - Edge/)).toBeTruthy();
    await fireEvent.click(screen.getByTitle('Sign out device'));
    await confirm();
    await waitFor(() => expect(screen.queryByText(/Windows - Edge/)).toBeNull());
    expect(screen.getByText(/macOS - Safari/)).toBeTruthy();
    expect(revoke).toHaveBeenCalledTimes(2);
    expect(revoke).toHaveBeenLastCalledWith('other', {});
  });

  it('cancels revoking other sessions and retains them on failure, then retries', async () => {
    const sessionProvider = sessions();
    const notificationProvider = notifications();
    render(Host, { page: 'security', providerBundle: { dataProvider, sessionProvider, notificationProvider } });
    await screen.findByText(/Windows - Edge/);
    const revoke = screen.getByRole('button', { name: 'Sign Out Other Devices' });
    await fireEvent.click(revoke); await cancel();
    expect(sessionProvider.revokeOtherSessions).not.toHaveBeenCalled();
    await fireEvent.click(revoke); await confirm();
    await waitFor(() => expect(notificationProvider.open).toHaveBeenCalledExactlyOnceWith({ message: 'Operation failed', type: 'error' }));
    expect(screen.getByText(/Windows - Edge/)).toBeTruthy();
    vi.mocked(sessionProvider.revokeOtherSessions).mockResolvedValueOnce({ success: true });
    await fireEvent.click(revoke); await confirm();
    await waitFor(() => expect(screen.queryByText(/Windows - Edge/)).toBeNull());
    expect(screen.getByText(/macOS - Safari/)).toBeTruthy();
  });

  it.each(['individual', 'bulk'] as const)('serializes %s revocation against the other entry before DOM updates', async first => {
    const sessionProvider = sessions();
    let release: (value: { success: true }) => void = () => { throw new Error('Missing revoke release'); };
    const pending = new Promise<{ success: true }>(resolve => { release = resolve; });
    const revokeSession = vi.fn(() => pending);
    const revokeOtherSessions = vi.fn(() => pending);
    sessionProvider.revokeSession = revokeSession;
    sessionProvider.revokeOtherSessions = revokeOtherSessions;
    render(Host, { page: 'security', providerBundle: { dataProvider, sessionProvider } });
    await screen.findByText(/Windows - Edge/);

    const individual = screen.getByTitle('Sign out device');
    const bulk = screen.getByRole('button', { name: 'Sign Out Other Devices' });
    await fireEvent.click(first === 'individual' ? individual : bulk);
    const confirmation = screen.getByRole('button', { name: exactRoleName('Confirm') });
    confirmation.click();
    (first === 'individual' ? bulk : individual).click();
    confirmation.click();
    expect(first === 'individual' ? revokeSession : revokeOtherSessions).toHaveBeenCalledOnce();
    expect(first === 'individual' ? revokeOtherSessions : revokeSession).not.toHaveBeenCalled();
    if (first === 'individual') expect(revokeSession).toHaveBeenCalledWith('other', {});
    else expect(revokeOtherSessions).toHaveBeenCalledWith({});
    await waitFor(() => expect(bulk).toHaveProperty('disabled', true));
    expect(individual).toHaveProperty('disabled', true);

    release({ success: true });
    await waitFor(() => expect(screen.queryByText(/Windows - Edge/)).toBeNull());
    expect(screen.getByText(/macOS - Safari/)).toBeTruthy();
  });

  it('blocks a duplicate individual revocation before the DOM disabled state settles', async () => {
    const sessionProvider = sessions();
    let release: (value: { success: true }) => void = () => { throw new Error('Missing revoke release'); };
    const pending = new Promise<{ success: true }>(resolve => { release = resolve; });
    const revoke = vi.fn(() => pending);
    sessionProvider.revokeSession = revoke;
    render(Host, { page: 'security', providerBundle: { dataProvider, sessionProvider } });
    await screen.findByText(/Windows - Edge/);
    const button = screen.getByTitle('Sign out device');

    await fireEvent.click(button);
    const confirmation = screen.getByRole('button', { name: exactRoleName('Confirm') });
    confirmation.click();
    button.click();
    confirmation.click();
    expect(revoke).toHaveBeenCalledOnce();

    release({ success: true });
    await waitFor(() => expect(screen.queryByText(/Windows - Edge/)).toBeNull());
  });

  it('distinguishes an empty security-log search from an empty event source', async () => {
    render(SecurityLog);
    const firstEvent = requireValue(referenceDemoData.securityEvents[0]);
    await screen.findByText(firstEvent.event);

    await fireEvent.input(screen.getByPlaceholderText('Search...'), { target: { value: 'zz-no-match-938' } });

    await waitFor(() => expect(screen.getByText('No matching security events')).toBeTruthy());
    expect(document.querySelector('[data-svadmin-data-state="filtered-empty"]')).toBeTruthy();
    expect(document.querySelector('[data-svadmin-data-state="empty"]')).toBeNull();

    await fireEvent.input(screen.getByPlaceholderText('Search...'), { target: { value: '' } });
    await screen.findByText(firstEvent.event);
    expect(screen.queryByText('No matching security events')).toBeNull();
    expect(document.querySelector('[data-svadmin-data-state]')).toBeNull();
  });

  it('reports API secret clipboard rejection visibly', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Denied'));
    render(Host, { page: 'api', providerBundle: { dataProvider, credentialProvider: credentials() } });
    await screen.findByText('Order Events');
    await fireEvent.input(screen.getByPlaceholderText('CI deployment token'), { target: { value: 'Key' } });
    await fireEvent.click(screen.getByRole('button', { name: /Generate Token/ }));
    await screen.findByDisplayValue('test-secret');
    await fireEvent.click(screen.getByRole('button', { name: /^Copy$/ }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Copy failed. Save the secret manually.');
  });

  it('reports member invitation-link copy failure without success', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Denied'));
    render(MemberHost, { page: 'members', bundle: { dataProvider }, members: {
      list: async () => [], invitationUrl: 'https://example.com/invite',
    } });
    await screen.findByText('No members yet');
    await fireEvent.click(screen.getByRole('button', { name: /Copy Link/i }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Copy failed');
    expect(screen.queryByText('Link copied')).toBeNull();
  });

  it('reports recovery-code copy failure without claiming success', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Denied'));
    render(MemberHost, { page: 'mfa', bundle: { dataProvider }, mfa: {
      begin: async () => ({ secret: 'enrollment-secret' }),
      verify: async () => ({ recoveryCodes: ['server-code'] }),
    } });
    await fireEvent.click(screen.getByRole('button'));
    await screen.findByText('enrollment-secret');
    const code = screen.getByRole('textbox');
    await fireEvent.input(code, { target: { value: '123456' } });
    await fireEvent.submit(requireValue(code.closest('form')));
    await screen.findByText('server-code');
    await fireEvent.click(screen.getByRole('button', { name: /^Copy$/ }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Copy failed. Save the recovery codes manually.');
    expect(screen.queryByRole('button', { name: 'Copied' })).toBeNull();
  });

  it('does not display an old secret copy error after the provider changes', async () => {
    let rejectCopy!: (error: Error) => void;
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(() => new Promise<void>((_resolve, reject) => { rejectCopy = reject; }));
    const view = render(Host, { page: 'api', providerBundle: { dataProvider, credentialProvider: credentials() } });
    await screen.findByText('Order Events');
    await fireEvent.input(screen.getByPlaceholderText('CI deployment token'), { target: { value: 'Key' } });
    await fireEvent.click(screen.getByRole('button', { name: /Generate Token/ }));
    await screen.findByDisplayValue('test-secret');
    await fireEvent.click(screen.getByRole('button', { name: /^Copy$/ }));
    await view.rerender({ page: 'api', providerBundle: { dataProvider, credentialProvider: credentials() } });
    rejectCopy(new Error('Denied'));
    await screen.findByText('Order Events');
    expect(screen.queryByText('Copy failed. Save the secret manually.')).toBeNull();
    expect(screen.queryByDisplayValue('test-secret')).toBeNull();
  });

  it.each(['security', 'crew'] as const)('downloads actual filtered JSON for %s and empty arrays for no matches', async page => {
    const blobs: Blob[] = [];
    const create = vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
      blobs.push(blob as Blob); return 'blob:reference-export';
    });
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloads.push(this.download); });
    if (page === 'security') render(SecurityLog); else render(TeamCrew);
    const query = page === 'security' ? requireValue(referenceDemoData.securityEvents[0]).actor : 'sarah@acme.com';
    await fireEvent.input(screen.getByPlaceholderText('Search...'), { target: { value: query } });
    await fireEvent.click(screen.getByRole('button', { name: /^Export$/ }));
    expect(create).toHaveBeenCalledTimes(1);
    expect(requireValue(blobs[0]).type).toBe('application/json');
    const content: unknown = JSON.parse(await requireValue(blobs[0]).text());
    if (page === 'security') {
      expect(content).toEqual(referenceDemoData.securityEvents.filter(event =>
        `${event.event} ${event.actor} ${event.location}`.toLowerCase().includes(query.toLowerCase())));
    } else {
      expect(content).toEqual([{ id: '2', name: 'Sarah Kim', email: 'sarah@acme.com', role: 'Senior Designer', department: 'Design', status: 'active', projects: 8 }]);
    }
    expect(downloads).toEqual([page === 'security' ? 'sample-security-events.json' : 'sample-team.json']);
    await fireEvent.input(screen.getByPlaceholderText('Search...'), { target: { value: 'zz-no-match-938' } });
    await fireEvent.click(screen.getByRole('button', { name: /^Export$/ }));
    expect(JSON.parse(await requireValue(blobs[1]).text())).toEqual([]);
    await waitFor(() => expect(revoke).toHaveBeenCalledTimes(2));
  });
});
