import { requireValue } from '../../../../scripts/test-assertions';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetContext, type AuthProvider, type DataProvider, type Organization } from '@svadmin/core';
import Host from './builtin-pm.test-host.svelte';
import type { NotificationPreferences } from './NotificationsSettings.svelte';
import userEvent from '@testing-library/user-event';

const dataProvider = {
  getList: async () => ({ data: [], total: 0 }),
  getOne: async () => ({ data: { id: '1' } }),
  create: async () => ({ data: { id: '1' } }),
  update: async () => ({ data: { id: '1' } }),
  deleteOne: async () => ({ data: { id: '1' } }),
  getApiUrl: () => '/api',
} as DataProvider;
const bundle = { dataProvider };
afterEach(() => { cleanup(); resetContext(); vi.restoreAllMocks(); });

describe('builtin capability boundaries', () => {
  it('shows host-provided storage and directory scope descriptions', async () => {
    const preferences = render(Host, { bundle, page: 'notifications', preferences: {
      description: 'Local demo preferences; no delivery channels are changed.',
      load: async () => ({
        email: { security: false, activity: false, reports: false },
        push: { security: false, activity: false, reports: false },
        sms: { security: false },
      }),
      save: async () => {},
    } });
    expect(screen.getByRole('note').textContent).toBe('Local demo preferences; no delivery channels are changed.');
    await waitFor(() => expect(document.querySelector('fieldset')?.disabled).toBe(false));
    preferences.unmount();
    render(Host, { bundle, page: 'members', members: {
      description: 'Directory from local sample users.',
      list: async () => [],
    } });
    expect(screen.getByRole('note').textContent).toBe('Directory from local sample users.');
    expect(screen.getByText(/This directory is read-only/)).toBeTruthy();
    await screen.findByText('No matching members');
  });

  it('reloads saved notification preferences on re-entry', async () => {
    let stored: NotificationPreferences = {
      email: { security: true, activity: true, reports: true },
      push: { security: true, activity: true, reports: true },
      sms: { security: true },
    };
    const preferences = {
      load: vi.fn(async () => structuredClone(stored)),
      save: vi.fn(async (value: NotificationPreferences) => { stored = structuredClone(value); }),
    };
    const first = render(Host, { bundle, page: 'notifications', preferences });
    await waitFor(() => expect(document.querySelector('fieldset')?.disabled).toBe(false));
    expect(screen.getByRole('heading', { level: 1, name: /Notifications/ })).toBeTruthy();
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(7);
    for (const control of switches) {
      expect(document.querySelector(`label[for="${control.id}"]`)?.textContent?.trim()).toBeTruthy();
    }
    await fireEvent.click(requireValue(document.querySelector('[id$="-email-security"]')));
    await fireEvent.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(stored.email.security).toBe(false));
    first.unmount();
    render(Host, { bundle, page: 'notifications', preferences });
    await waitFor(() => expect(document.querySelector('fieldset')?.disabled).toBe(false));
    expect(document.querySelector('[id$="-email-security"]')?.getAttribute('aria-checked')).toBe('false');
    expect(preferences.load).toHaveBeenCalledTimes(2);
  });

  it('keeps notification label activation within its component instance', async () => {
    const preferences = {
      load: async (): Promise<NotificationPreferences> => ({
        email: { security: true, activity: true, reports: true },
        push: { security: true, activity: true, reports: true },
        sms: { security: true },
      }),
      save: async () => {},
    };
    const first = render(Host, { bundle, page: 'notifications', preferences });
    const second = render(Host, { bundle, page: 'notifications', preferences });
    await waitFor(() => {
      expect(first.container.querySelector('fieldset')?.disabled).toBe(false);
      expect(second.container.querySelector('fieldset')?.disabled).toBe(false);
    });
    const firstSwitch = requireValue(first.container.querySelector('[id$="-email-security"]'));
    const secondSwitch = requireValue(second.container.querySelector('[id$="-email-security"]'));
    expect(firstSwitch.id).not.toBe(secondSwitch.id);
    const label = requireValue(second.container.querySelector('label[for$="-email-security"]'));
    await userEvent.setup().click(label);
    expect(firstSwitch.getAttribute('aria-checked')).toBe('true');
    expect(secondSwitch.getAttribute('aria-checked')).toBe('false');
  });

  it('renders real directory rows without requiring invitation capability', async () => {
    render(Host, { bundle, page: 'members', members: {
      list: async () => [{ id: 'user-7', name: 'Actual member', email: 'actual@example.com', role: 'Operator' }],
    } });
    expect(await screen.findByText('Actual member')).toBeTruthy();
    expect(document.body.textContent).toContain('actual@example.com');
    expect(screen.queryByLabelText('Member email')).toBeNull();
    expect(screen.queryByRole('button', { name: /Send Invite/i })).toBeNull();
    expect(screen.getByRole('table', { name: 'Members' })).toBeTruthy();
    expect(screen.getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Name', 'Email', 'Role']);
    expect(screen.getByRole('region', { name: 'Member directory' }).classList.contains('overflow-x-auto')).toBe(true);
    const search = screen.getByLabelText('Search members');
    await fireEvent.input(search, { target: { value: 'not-found' } });
    expect(await screen.findByText('No matching members')).toBeTruthy();
    await fireEvent.input(search, { target: { value: 'Actual' } });
    expect(await screen.findByRole('rowheader', { name: 'Actual member' })).toBeTruthy();
    expect(screen.getByText(/This directory is read-only/)).toBeTruthy();
  });
  it('keeps audit failures visible and retries the actual request', async () => {
    const getAuditLogs = vi.fn().mockRejectedValueOnce(new Error('Audit offline'))
      .mockResolvedValueOnce({ data: [], total: 0 });
    const authProvider = {
      login: async () => ({ success: true }),
      logout: async () => ({ success: true }),
      check: async () => ({ authenticated: true }),
      getIdentity: async () => ({ id: 'audit-user' }),
      onError: async () => ({}),
      getAuditLogs,
    } satisfies AuthProvider;
    render(Host, { bundle: { ...bundle, authProvider }, page: 'audit' });
    expect(await screen.findByText('Audit offline')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
    await waitFor(() => expect(getAuditLogs).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('Audit offline')).toBeNull());
  });

  it('discards enrollment secrets from a replaced provider', async () => {
    let resolve!: (value: { secret: string }) => void;
    const mfa = { begin: () => new Promise<{ secret: string }>(done => { resolve = done; }), verify: async () => ({ recoveryCodes: [] }) };
    const view = render(Host, { bundle, page: 'mfa', mfa });
    await fireEvent.click(screen.getByRole('button'));
    await view.rerender({ bundle, page: 'mfa', mfa: { ...mfa, begin: async () => ({ secret: 'new-secret' }) } });
    resolve({ secret: 'stale-secret' });
    await fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByText('new-secret')).toBeTruthy();
    expect(screen.queryByText('stale-secret')).toBeNull();
  });
  it('renders readable role labels and no build placeholder', async () => {
    const roles = render(Host, { bundle, page: 'roles' });
    expect(await screen.findByText('Permission Matrix')).toBeTruthy();
    expect(document.body.textContent).not.toContain('permissions.');
    roles.unmount();
    render(Host, { bundle, page: 'about' });
    expect(await screen.findByText('Development build (version unavailable)')).toBeTruthy();
    expect(document.body.textContent).not.toContain('__SVADMIN_VERSION__');
  });

  it('saves company details without depending on identity governance', async () => {
    const organization: Organization = { id: 'org-1', name: 'Original company' };
    const updateCurrentOrganization = vi.fn(async (input: Partial<Omit<Organization, 'id'>>): Promise<Organization> => ({
      ...organization, ...input,
    }));
    render(Host, { page: 'company', bundle: {
      ...bundle,
      organizationProvider: {
        getCurrentOrganization: async () => organization,
        updateCurrentOrganization,
      },
    } });
    const input = await screen.findByDisplayValue('Original company');
    await fireEvent.input(input, { target: { value: 'Updated company' } });
    await fireEvent.submit(requireValue(input.closest('form')));
    expect(await screen.findByText('Organization saved')).toBeTruthy();
    expect(updateCurrentOrganization).toHaveBeenCalledWith({ name: 'Updated company' }, {});
  });
  it('does not invent MFA enrollment when no verifier exists', async () => {
    render(Host, { bundle, page: 'mfa' });
    expect(await screen.findByText(/Enrollment and verification are not configured/)).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('requires provider verification before showing recovery codes', async () => {
    const verify = vi.fn().mockRejectedValueOnce(new Error('Invalid OTP'))
      .mockResolvedValueOnce({ recoveryCodes: ['server-recovery-code'] });
    render(Host, { bundle, page: 'mfa', mfa: { begin: async () => ({ secret: 'server-secret' }), verify } });
    await fireEvent.click(screen.getByRole('button'));
    await screen.findByText('server-secret');
    const input = screen.getByRole('textbox');
    await fireEvent.input(input, { target: { value: 'abcdef' } });
    await fireEvent.submit(requireValue(input.closest('form')));
    expect(verify).not.toHaveBeenCalled();
    await fireEvent.input(input, { target: { value: '123456' } });
    await fireEvent.submit(requireValue(input.closest('form')));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Invalid OTP');
    expect(screen.queryByText('server-recovery-code')).toBeNull();
    await fireEvent.submit(requireValue(input.closest('form')));
    expect(await screen.findByText('server-recovery-code')).toBeTruthy();
    expect(verify).toHaveBeenCalledTimes(2);
  });

  it('disables notification saving without persistence', async () => {
    render(Host, { bundle, page: 'notifications' });
    expect(await screen.findByText(/Notification preference storage is not configured/)).toBeTruthy();
    expect(document.querySelector('fieldset')?.disabled).toBe(true);
  });

  it('loads preferences and preserves inputs when save fails', async () => {
    const values: NotificationPreferences = {
      email: { security: false, activity: false, reports: false },
      push: { security: false, activity: false, reports: false },
      sms: { security: false },
    };
    const save = vi.fn(async () => { throw new Error('Storage unavailable'); });
    render(Host, { bundle, page: 'notifications', preferences: { load: async () => values, save } });
    await waitFor(() => expect(document.querySelector('fieldset')?.disabled).toBe(false));
    await fireEvent.click(screen.getByRole('button', { name: /Save/ }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Storage unavailable');
    expect(save).toHaveBeenCalledWith(values);
    expect(document.querySelector('fieldset')?.disabled).toBe(false);
  });

  it('does not report successful invitation after provider rejection', async () => {
    const invite = vi.fn(async () => { throw new Error('Delivery failed'); });
    render(Host, { bundle, page: 'members', members: { list: async () => [], invite } });
    await screen.findByText('No matching members');
    const input = screen.getByLabelText('Member email');
    await fireEvent.input(input, { target: { value: 'member@example.com' } });
    await fireEvent.submit(requireValue(input.closest('form')));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Delivery failed');
    expect(screen.queryByText('Invitation submitted')).toBeNull();
    expect(invite).toHaveBeenCalledWith('member@example.com');
  });
});
