import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetContext, type CredentialProvider, type DataProvider, type NotificationProvider, type SessionProvider } from '@svadmin/core';
import Host from './enterprise-providers.test-host.svelte';
import MemberHost from './builtin-pm.test-host.svelte';
import SecurityLog from './account/SecurityLogPage.svelte';
import TeamCrew from './network/TeamCrewTablePage.svelte';
import { referenceDemoData } from '../reference-data.js';

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
const cancel = async () => fireEvent.click(await screen.findByRole('button', { name: /^Cancel$/ }));
const confirm = async () => fireEvent.click(await screen.findByRole('button', { name: /^Confirm$/ }));
afterEach(() => { cleanup(); resetContext(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('builtin safety follow-up', () => {
  it('cancels webhook deletion without writes and retains the webhook after rejection, then retries', async () => {
    const credentialProvider = credentials();
    const notificationProvider = notifications();
    render(Host, { page: 'api', providerBundle: { dataProvider, credentialProvider, notificationProvider } });
    const remove = await screen.findByRole('button', { name: 'Delete Order Events' });
    await fireEvent.click(remove); await cancel();
    expect(credentialProvider.deleteWebhook).not.toHaveBeenCalled();
    await fireEvent.click(remove); await confirm();
    await waitFor(() => expect(notificationProvider.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'Delete rejected' })));
    expect(screen.getByText('Order Events')).toBeTruthy();
    vi.mocked(credentialProvider.deleteWebhook).mockResolvedValueOnce({ success: true });
    await fireEvent.click(remove); await confirm();
    await waitFor(() => expect(screen.queryByText('Order Events')).toBeNull());
    expect(credentialProvider.deleteWebhook).toHaveBeenCalledTimes(2);
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
    await waitFor(() => expect(notificationProvider.open).toHaveBeenCalledWith(expect.objectContaining({ message: 'MFA rejected', type: 'error' })));
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(sessionProvider.setMfaEnabled).toHaveBeenCalledWith(false, {});
    vi.mocked(sessionProvider.setMfaEnabled!).mockResolvedValueOnce({ enabled: false });
    await fireEvent.click(toggle); await confirm();
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('false'));
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
    await waitFor(() => expect(notificationProvider.open).toHaveBeenCalledWith(expect.objectContaining({ message: 'Revoke rejected', type: 'error' })));
    expect(screen.getByText(/Windows - Edge/)).toBeTruthy();
    vi.mocked(sessionProvider.revokeOtherSessions).mockResolvedValueOnce({ success: true });
    await fireEvent.click(revoke); await confirm();
    await waitFor(() => expect(screen.queryByText(/Windows - Edge/)).toBeNull());
    expect(screen.getByText(/macOS - Safari/)).toBeTruthy();
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
    await screen.findByText('No matching members');
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
    await fireEvent.submit(code.closest('form')!);
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
    const query = page === 'security' ? referenceDemoData.securityEvents[0]!.actor : 'sarah@acme.com';
    await fireEvent.input(screen.getByPlaceholderText('Search...'), { target: { value: query } });
    await fireEvent.click(screen.getByRole('button', { name: /^Export$/ }));
    expect(create).toHaveBeenCalledTimes(1);
    expect(blobs[0]!.type).toBe('application/json');
    const content: unknown = JSON.parse(await blobs[0]!.text());
    if (page === 'security') {
      expect(content).toEqual(referenceDemoData.securityEvents.filter(event =>
        `${event.event} ${event.actor} ${event.location}`.toLowerCase().includes(query.toLowerCase())));
    } else {
      expect(content).toEqual([{ id: '2', name: 'Sarah Kim', email: 'sarah@acme.com', role: 'Senior Designer', department: 'Design', status: 'active', projects: 8 }]);
    }
    expect(downloads).toEqual([page === 'security' ? 'sample-security-events.json' : 'sample-team.json']);
    await fireEvent.input(screen.getByPlaceholderText('Search...'), { target: { value: 'zz-no-match-938' } });
    await fireEvent.click(screen.getByRole('button', { name: /^Export$/ }));
    expect(JSON.parse(await blobs[1]!.text())).toEqual([]);
    await waitFor(() => expect(revoke).toHaveBeenCalledTimes(2));
  });
});
