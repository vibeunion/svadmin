import { requireValue } from '../../../../scripts/test-assertions';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetContext, type AuthProvider, type DataProvider, type Organization } from '@svadmin/core';
import Host from './builtin-pm.test-host.svelte';
import { renderWithI18n } from '../../test/fixtures/render-with-i18n';
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
    await screen.findByText('No members yet');
    expect(document.querySelector('[data-svadmin-data-state="filtered-empty"]')).toBeNull();
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

  it.each(['diagnostic', 'empty', 'non-error'] as const)('sanitizes %s notification load and save failures while preserving recovery', async failure => {
    let loadCount = 0;
    let saveCount = 0;
    const preferences = {
      load: vi.fn(async (): Promise<NotificationPreferences> => {
        loadCount += 1;
        if (loadCount === 1) {
          throw failure === 'non-error' ? 'PRIVATE_NOTIFICATION_LOAD' : new Error(failure === 'empty' ? '' : 'PRIVATE_NOTIFICATION_LOAD');
        }
        return {
          email: { security: true, activity: false, reports: true },
          push: { security: true, activity: true, reports: false },
          sms: { security: true },
        };
      }),
      save: vi.fn(async () => {
        saveCount += 1;
        if (saveCount === 1) {
          throw failure === 'non-error' ? 'PRIVATE_NOTIFICATION_SAVE' : new Error(failure === 'empty' ? '' : 'PRIVATE_NOTIFICATION_SAVE');
        }
      }),
    };
    const view = render(Host, { bundle, page: 'notifications', preferences });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Operation failed'));
    expect(view.container.innerHTML).not.toContain('PRIVATE_NOTIFICATION_LOAD');
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
    await fireEvent.click(screen.getByRole('button', { name: 'Retry', exact: true }));
    await waitFor(() => expect(document.querySelector('fieldset')?.disabled).toBe(false));

    const security = requireValue(document.querySelector('[id$="-email-security"]'));
    await fireEvent.click(security);
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('Operation failed')).toBeTruthy());
    expect(view.container.innerHTML).not.toContain('PRIVATE_NOTIFICATION_SAVE');
    expect(security.getAttribute('aria-checked')).toBe('false');
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByText('Operation failed')).toBeNull());
    expect(saveCount).toBe(2);
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

  it('updates notification error feedback when the local language changes without reloading', async () => {
    let loadCount = 0;
    const preferences = {
      load: vi.fn(async (): Promise<NotificationPreferences> => {
        loadCount += 1;
        throw new Error('PRIVATE_NOTIFICATION_LOCALE');
      }),
      save: async () => {},
    };
    const view = renderWithI18n(Host, { bundle, page: 'notifications', preferences });
    await waitFor(() => expect(screen.getByText('Operation failed')).toBeTruthy());
    expect(loadCount).toBe(1);
    await view.wrapper.setLocale('zh-CN');
    expect(screen.getByText('操作失败')).toBeTruthy();
    expect(loadCount).toBe(1);
    expect(screen.getByRole('button', { name: '保存' })).toHaveProperty('disabled', true);
    await view.wrapper.setLocale('en');
    expect(screen.getByText('Operation failed')).toBeTruthy();
    expect(preferences.load).toHaveBeenCalledOnce();
    expect(view.container.innerHTML).not.toContain('PRIVATE_NOTIFICATION_LOCALE');
  });

  it('preserves the edited draft and save feedback across locale changes without repeating requests', async () => {
    const values: NotificationPreferences = {
      email: { security: false, activity: false, reports: false },
      push: { security: true, activity: false, reports: false },
      sms: { security: true },
    };
    const load = vi.fn(async () => values);
    const save = vi.fn<(value: NotificationPreferences) => Promise<void>>()
      .mockRejectedValueOnce(new Error('PRIVATE_NOTIFICATION_LOCALE_SAVE'))
      .mockResolvedValueOnce(undefined);
    const view = renderWithI18n(Host, { bundle, page: 'notifications', preferences: { load, save } });
    await waitFor(() => expect(screen.getAllByRole('switch')).toHaveLength(7));
    const security = requireValue(view.container.querySelector('[id$="-email-security"]'));
    await fireEvent.click(security);
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Operation failed');
    for (const locale of ['zh-CN', 'en']) {
      await view.wrapper.setLocale(locale);
      expect(screen.getByRole('alert').textContent).toContain(locale === 'zh-CN' ? '操作失败' : 'Operation failed');
      expect(view.container.querySelector('[id$="-email-security"]')).toBe(security);
      expect(security.getAttribute('aria-checked')).toBe('true');
      expect(view.container.innerHTML).not.toContain('PRIVATE_NOTIFICATION_LOCALE_SAVE');
      expect(load).toHaveBeenCalledOnce();
      expect(save).toHaveBeenCalledOnce();
    }
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ ...values, email: { ...values.email, security: true } });
    expect(load).toHaveBeenCalledOnce();
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

  it.each(['diagnostic', 'empty', 'non-error'] as const)('sanitizes %s member directory failures while preserving recovery', async failure => {
    let loadCount = 0;
    let inviteCount = 0;
    const provider = {
      list: vi.fn(async () => {
        loadCount += 1;
        if (loadCount === 1) throw failure === 'non-error' ? 'PRIVATE_MEMBER_LOAD' : new Error(failure === 'empty' ? '' : 'PRIVATE_MEMBER_LOAD');
        return [{ id: 'member', name: 'Recovered member', email: 'member@example.com', role: 'Operator' }];
      }),
      invite: vi.fn(async () => {
        inviteCount += 1;
        if (inviteCount === 1) throw failure === 'non-error' ? 'PRIVATE_MEMBER_INVITE' : new Error(failure === 'empty' ? '' : 'PRIVATE_MEMBER_INVITE');
      }),
    };
    const view = render(Host, { bundle, page: 'members', members: provider });
    await waitFor(() => expect(screen.getByText('Operation failed')).toBeTruthy());
    expect(view.container.innerHTML).not.toContain('PRIVATE_MEMBER_LOAD');
    expect(screen.queryByText('No members yet')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Retry', exact: true }));
    await screen.findByText('Recovered member');

    const email = screen.getByLabelText('Member email');
    await fireEvent.input(email, { target: { value: 'member@example.com' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Operation failed'));
    expect(view.container.innerHTML).not.toContain('PRIVATE_MEMBER_INVITE');
    expect(email).toHaveProperty('value', 'member@example.com');
    await fireEvent.input(email, { target: { value: 'invalid-email' } });
    await fireEvent.submit(requireValue(email.closest('form')));
    expect(screen.getByRole('alert').textContent).toBe('Enter a valid email address');
    expect(provider.invite).toHaveBeenCalledOnce();
    await fireEvent.input(email, { target: { value: 'member@example.com' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Invitation submitted'));
    expect(inviteCount).toBe(2);
    expect(loadCount).toBe(2);
    expect(provider.invite).toHaveBeenLastCalledWith('member@example.com');
    expect(email).toHaveProperty('value', '');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each(['success', 'failure'] as const)('keeps a pending invitation owned until %s before allowing directory retry', async outcome => {
    let resolveInvite: () => void = () => { throw new Error('Invite not started'); };
    let rejectInvite: (reason: unknown) => void = () => { throw new Error('Invite not started'); };
    const pendingInvite = new Promise<void>((resolve, reject) => { resolveInvite = resolve; rejectInvite = reject; });
    const provider = {
      list: vi.fn(async () => { throw new Error('PRIVATE_MEMBER_LOAD'); }),
      invite: vi.fn(() => pendingInvite),
    };
    render(Host, { bundle, page: 'members', members: provider });
    await screen.findByText('Operation failed');
    const retry = screen.getByRole('button', { name: 'Retry', exact: true });
    const email = screen.getByLabelText('Member email');
    await fireEvent.input(email, { target: { value: 'member@example.com' } });
    await act(() => {
      requireValue(email.closest('form')).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      retry.click();
    });
    expect(provider.list).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Loading...' })).toHaveProperty('disabled', true));
    expect(screen.queryByRole('button', { name: 'Retry', exact: true })).toBeNull();
    if (outcome === 'success') resolveInvite();
    else rejectInvite(new Error('PRIVATE_INVITE_ERROR'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send Invite' })).toHaveProperty('disabled', false));
    if (outcome === 'success') {
      expect(screen.getByRole('status').textContent).toContain('Invitation submitted');
      expect(email).toHaveProperty('value', '');
    } else {
      expect(screen.queryByText('Invitation submitted')).toBeNull();
      expect(email).toHaveProperty('value', 'member@example.com');
      expect(document.body.innerHTML).not.toContain('PRIVATE_INVITE_ERROR');
    }
    expect(provider.invite).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Send Invite' })).toHaveProperty('disabled', false);
    await fireEvent.click(screen.getByRole('button', { name: 'Retry', exact: true }));
    await waitFor(() => expect(provider.list).toHaveBeenCalledTimes(2));
  });

  it('still loads a replacement directory while the old provider invitation is pending', async () => {
    let resolveInvite: () => void = () => { throw new Error('Invite not started'); };
    const pending = new Promise<void>(resolve => { resolveInvite = resolve; });
    const old = { list: async () => [], invite: vi.fn(() => pending) };
    const current = {
      list: vi.fn(async () => [{ id: 'new', name: 'New directory', email: 'new@example.com', role: 'Viewer' }]),
      invite: vi.fn(async () => {}),
    };
    const view = render(Host, { bundle, page: 'members', members: old });
    await screen.findByText('No members yet');
    await fireEvent.input(screen.getByLabelText('Member email'), { target: { value: 'old@example.com' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));
    await view.rerender({ members: current });
    await screen.findByText('New directory');
    const email = screen.getByLabelText('Member email');
    await fireEvent.input(email, { target: { value: 'current@example.com' } });
    await act(async () => {
      resolveInvite();
      await pending;
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(email).toHaveProperty('value', 'current@example.com');
    expect(screen.queryByText('Invitation submitted')).toBeNull();
    expect(current.list).toHaveBeenCalledOnce();
    await fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));
    await screen.findByText('Invitation submitted');
    expect(current.invite).toHaveBeenCalledExactlyOnceWith('current@example.com');
  });

  it.each([false, true])('clears a member search with keyboard focus and preserves invitation capability %s', async canInvite => {
    const list = vi.fn(async () => [
      { id: 'user-7', name: 'Actual member', email: 'actual@example.com', role: 'Operator' },
    ]);
    const invite = vi.fn(async () => {});
    const view = render(Host, { bundle, page: 'members', members: {
      list, ...(canInvite ? { invite } : {}),
    } });
    await screen.findByRole('rowheader', { name: 'Actual member' });
    if (canInvite) {
      await fireEvent.input(screen.getByLabelText('Member email'), { target: { value: 'draft@example.com' } });
    }
    const search = screen.getByLabelText('Search members');
    await fireEvent.input(search, { target: { value: 'not-found' } });
    expect(view.container.querySelector('[data-svadmin-data-state="filtered-empty"]')).toBeTruthy();
    const clear = screen.getByRole('button', { name: 'Clear search' });
    clear.focus();
    await userEvent.setup().keyboard('{Enter}');
    expect(search).toHaveProperty('value', '');
    expect(document.activeElement).toBe(search);
    expect(await screen.findByRole('rowheader', { name: 'Actual member' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
    if (canInvite) {
      expect(screen.getByLabelText('Member email')).toHaveProperty('value', 'draft@example.com');
    } else {
      expect(screen.queryByLabelText('Member email')).toBeNull();
      expect(screen.queryByRole('button', { name: /Send Invite/i })).toBeNull();
    }
    expect(list).toHaveBeenCalledTimes(1);
    expect(invite).not.toHaveBeenCalled();
  });

  it('does not offer search recovery for an initially empty member directory', async () => {
    const view = render(Host, { bundle, page: 'members', members: { list: async () => [] } });
    await screen.findByText('No members yet');
    await fireEvent.input(screen.getByLabelText('Search members'), { target: { value: 'not-found' } });
    expect(view.container.querySelector('[data-svadmin-data-state="empty"]')).toBeTruthy();
    expect(view.container.querySelector('[data-svadmin-data-state="filtered-empty"]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
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

  it.each(['diagnostic', 'empty', 'non-error'] as const)('sanitizes %s company profile failures and preserves recovery', async failure => {
    let loadCount = 0;
    let saveCount = 0;
    const organization: Organization = { id: 'org-1', name: 'Original company' };
    const provider = {
      getCurrentOrganization: vi.fn(async () => {
        loadCount += 1;
        if (loadCount === 1) throw failure === 'non-error' ? 'PRIVATE_COMPANY_LOAD' : new Error(failure === 'empty' ? '' : 'PRIVATE_COMPANY_LOAD');
        return organization;
      }),
      updateCurrentOrganization: vi.fn(async ({ name }: Partial<Omit<Organization, 'id'>>) => {
        saveCount += 1;
        if (saveCount === 1) throw failure === 'non-error' ? 'PRIVATE_COMPANY_SAVE' : new Error(failure === 'empty' ? '' : 'PRIVATE_COMPANY_SAVE');
        return { ...organization, name: name ?? organization.name };
      }),
    };
    const view = render(Host, { page: 'company', bundle: { ...bundle, organizationProvider: provider } });
    await waitFor(() => expect(screen.getByText('Operation failed')).toBeTruthy());
    expect(view.container.innerHTML).not.toContain('PRIVATE_COMPANY_LOAD');
    expect(screen.queryByDisplayValue('Original company')).toBeNull();
    expect(screen.queryByText('No organization details')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Retry', exact: true }));
    const input = await screen.findByDisplayValue('Original company');
    await fireEvent.input(input, { target: { value: 'Updated company' } });
    await fireEvent.submit(requireValue(input.closest('form')));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Operation failed'));
    expect(view.container.innerHTML).not.toContain('PRIVATE_COMPANY_SAVE');
    expect(input).toHaveProperty('value', 'Updated company');
    await fireEvent.submit(requireValue(input.closest('form')));
    await waitFor(() => expect(screen.getByText('Organization saved')).toBeTruthy());
    expect(saveCount).toBe(2);
    expect(loadCount).toBe(2);
    expect(screen.getByDisplayValue('Updated company')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(provider.updateCurrentOrganization).toHaveBeenNthCalledWith(2, { name: 'Updated company' }, {});
  });
  it('isolates company name labels and values across two instances', async () => {
    const first: Organization = { id: 'org-1', name: 'First company' };
    const second: Organization = { id: 'org-2', name: 'Second company' };
    const firstProvider = {
      getCurrentOrganization: async () => first,
      updateCurrentOrganization: vi.fn(async (input: Partial<Omit<Organization, 'id'>>) => ({ ...first, ...input })),
    };
    const secondProvider = {
      getCurrentOrganization: async () => second,
      updateCurrentOrganization: vi.fn(async (input: Partial<Omit<Organization, 'id'>>) => ({ ...second, ...input })),
    };
    const firstView = render(Host, { page: 'company', bundle: { ...bundle, organizationProvider: firstProvider } });
    const firstInput = await within(firstView.container).findByLabelText('Organization name');
    const secondView = render(Host, { page: 'company', bundle: { ...bundle, organizationProvider: secondProvider } });
    const secondInput = await within(secondView.container).findByLabelText('Organization name');
    const user = userEvent.setup();
    await user.click(within(secondView.container).getByText('Organization name'));
    expect(document.activeElement).toBe(secondInput);
    expect(firstInput.id).not.toBe(secondInput.id);
    await fireEvent.input(secondInput, { target: { value: 'Second updated' } });
    expect(firstInput).toHaveProperty('value', 'First company');
    await fireEvent.submit(requireValue(secondInput.closest('form')));
    await within(secondView.container).findByText('Organization saved');
    expect(firstProvider.updateCurrentOrganization).not.toHaveBeenCalled();
    expect(secondProvider.updateCurrentOrganization).toHaveBeenCalledExactlyOnceWith({ name: 'Second updated' }, {});
  });
  it('does not invent MFA enrollment when no verifier exists', async () => {
    render(Host, { bundle, page: 'mfa' });
    expect(await screen.findByText(/Enrollment and verification are not configured/)).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('requires provider verification and sanitizes enrollment failures before showing recovery codes', async () => {
    const verify = vi.fn().mockRejectedValueOnce(new Error('PRIVATE_OTP_DIAGNOSTIC'))
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
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Operation failed');
    expect(document.body.textContent).not.toContain('PRIVATE_OTP_DIAGNOSTIC');
    expect(screen.queryByText('server-recovery-code')).toBeNull();
    await fireEvent.submit(requireValue(input.closest('form')));
    expect(await screen.findByText('server-recovery-code')).toBeTruthy();
    expect(verify).toHaveBeenCalledTimes(2);
  });

  it.each(['diagnostic', 'empty', 'non-error'] as const)('recovers from %s MFA begin and verify failures without exposing diagnostics', async failure => {
    const rejection = failure === 'non-error' ? 'PRIVATE_MFA_DIAGNOSTIC' : new Error(failure === 'empty' ? '' : 'PRIVATE_MFA_DIAGNOSTIC');
    const begin = vi.fn(async () => ({ secret: 'server-secret' })).mockRejectedValueOnce(rejection);
    const verify = vi.fn(async (_code: string) => ({ recoveryCodes: ['server-recovery-code'] })).mockRejectedValueOnce(rejection);
    render(Host, { bundle, page: 'mfa', mfa: { begin, verify } });
    await fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Operation failed');
    expect(document.body.textContent).not.toContain('PRIVATE_MFA_DIAGNOSTIC');
    expect(screen.queryByText('server-secret')).toBeNull();
    await fireEvent.click(screen.getByRole('button'));
    await screen.findByText('server-secret');
    expect(screen.queryByRole('alert')).toBeNull();
    const input = screen.getByRole('textbox');
    await fireEvent.input(input, { target: { value: '123456' } });
    await fireEvent.submit(requireValue(input.closest('form')));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Operation failed');
    expect(input).toHaveProperty('value', '123456');
    expect(document.body.textContent).not.toContain('PRIVATE_MFA_DIAGNOSTIC');
    expect(screen.queryByText('server-recovery-code')).toBeNull();
    await fireEvent.submit(requireValue(input.closest('form')));
    await screen.findByText('server-recovery-code');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(begin).toHaveBeenCalledTimes(2);
    expect(verify).toHaveBeenCalledTimes(2);
    expect(verify).toHaveBeenLastCalledWith('123456');
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
    const load = vi.fn(async () => values);
    const save = vi.fn<(value: NotificationPreferences) => Promise<void>>()
      .mockRejectedValueOnce(new Error('Storage unavailable'))
      .mockResolvedValueOnce(undefined);
    render(Host, { bundle, page: 'notifications', preferences: { load, save } });
    await waitFor(() => expect(document.querySelector('fieldset')?.disabled).toBe(false));
    const security = requireValue(document.querySelector('[id$="-email-security"]'));
    await fireEvent.click(security);
    const edited = { ...values, email: { ...values.email, security: true } };
    await fireEvent.click(screen.getByRole('button', { name: /Save/ }));
    expect((await screen.findByRole('alert')).textContent).toContain('Operation failed');
    expect(document.body.innerHTML).not.toContain('Storage unavailable');
    expect(document.querySelector('[data-svadmin-feedback-notice][data-tone="danger"]')).toBeTruthy();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull();
    expect(save).toHaveBeenCalledExactlyOnceWith(edited);
    expect(security.getAttribute('aria-checked')).toBe('true');
    expect(document.querySelector('fieldset')?.disabled).toBe(false);
    await fireEvent.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(edited);
    expect(load).toHaveBeenCalledTimes(1);
    expect(security.getAttribute('aria-checked')).toBe('true');
  });

  it('keeps an initial load failure blocking and retries the provider request', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('Preferences unavailable'))
      .mockResolvedValueOnce({
        email: { security: true, activity: false, reports: true },
        push: { security: true, activity: true, reports: false },
        sms: { security: true },
      });
    render(Host, { bundle, page: 'notifications', preferences: { load, save: async () => {} } });
    expect(await screen.findByText('Operation failed')).toBeTruthy();
    expect(document.body.innerHTML).not.toContain('Preferences unavailable');
    expect(document.querySelector('[data-svadmin-data-state="error"]')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Save/ })).toHaveProperty('disabled', true);
    expect(screen.queryByRole('switch')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getAllByRole('switch')).toHaveLength(7));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows only the loading state until notification preferences arrive', async () => {
    let resolveLoad: (value: NotificationPreferences) => void = () => { throw new Error('Load not started'); };
    const pending = new Promise<NotificationPreferences>(resolve => { resolveLoad = resolve; });
    render(Host, { bundle, page: 'notifications', preferences: { load: () => pending, save: async () => {} } });
    await waitFor(() => expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true'));
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
    expect(screen.getByRole('button', { name: /Save/ })).toHaveProperty('disabled', true);
    resolveLoad({
      email: { security: false, activity: false, reports: false },
      push: { security: false, activity: false, reports: false },
      sms: { security: false },
    });
    await waitFor(() => expect(screen.getAllByRole('switch')).toHaveLength(7));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: /Save/ })).toHaveProperty('disabled', false);
  });

  it('does not report successful invitation after provider rejection', async () => {
    const invite = vi.fn(async () => { throw new Error('Delivery failed'); });
    render(Host, { bundle, page: 'members', members: { list: async () => [], invite } });
    await screen.findByText('No members yet');
    const input = screen.getByLabelText('Member email');
    await fireEvent.input(input, { target: { value: 'member@example.com' } });
    await fireEvent.submit(requireValue(input.closest('form')));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Operation failed');
    expect(document.body.innerHTML).not.toContain('Delivery failed');
    expect(screen.queryByText('Invitation submitted')).toBeNull();
    expect(invite).toHaveBeenCalledWith('member@example.com');
  });
});
