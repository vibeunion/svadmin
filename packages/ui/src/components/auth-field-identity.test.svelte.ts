import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetContext, type AuthProvider, type DataProvider } from '@svadmin/core';
import ProfileHost from './profile-auth-scope.test-host.svelte';
import EnterpriseHost from './enterprise-providers.test-host.svelte';
import MfaHost from './builtin-pm.test-host.svelte';
import { requireValue } from '../../../../scripts/test-assertions';

const dataProvider: DataProvider = {
  getApiUrl: () => '/fixture',
  getList: async () => ({ data: [], total: 0 }),
  getOne: async () => ({ data: { id: '1' } }),
  create: async () => ({ data: { id: '1' } }),
  update: async () => ({ data: { id: '1' } }),
  deleteOne: async () => ({ data: { id: '1' } }),
};
function auth(): AuthProvider {
  return {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    getIdentity: async () => ({ id: 'user', name: 'Ada' }),
    updateProfile: vi.fn(async () => ({ success: true })),
    updatePassword: vi.fn(async () => ({ success: true })),
  };
}

async function checkLabels(containers: HTMLElement[], expected: number): Promise<void> {
  const ids = new Set<string>();
  const user = userEvent.setup();
  for (const container of containers) {
    const labels = [...container.querySelectorAll('label')].filter(label => !!label.htmlFor);
    expect(labels).toHaveLength(expected);
    for (const label of labels) {
      const input = requireValue(document.getElementById(label.htmlFor));
      expect(container.contains(input)).toBe(true);
      expect(ids.has(input.id)).toBe(false);
      ids.add(input.id);
      await user.click(label);
      expect(document.activeElement).toBe(input);
    }
  }
}

afterEach(() => { cleanup(); resetContext(); vi.restoreAllMocks(); });

describe('auth page field identity', () => {
  it('isolates profile labels and edits across two page instances', async () => {
    const firstAuth = auth();
    const secondAuth = auth();
    const first = render(ProfileHost, { authProvider: firstAuth, tenant: { tenantId: 'a' } });
    const second = render(ProfileHost, { authProvider: secondAuth, tenant: { tenantId: 'b' } });
    const a = within(first.container);
    const b = within(second.container);
    await fireEvent.click(await a.findByRole('button', { name: 'Edit', exact: true }));
    await fireEvent.click(await b.findByRole('button', { name: 'Edit', exact: true }));
    await checkLabels([first.container, second.container], 4);
    const name = b.getByLabelText('Name', { exact: true });
    const id = name.id;
    await fireEvent.input(name, { target: { value: 'Second name' } });
    expect(name.id).toBe(id);
    expect(a.getByLabelText('Name', { exact: true })).toHaveProperty('value', 'Ada');
    await fireEvent.click(b.getByRole('button', { name: 'Save', exact: true }));
    await waitFor(() => expect(secondAuth.updateProfile).toHaveBeenCalledWith({ name: 'Second name' }));
    expect(firstAuth.updateProfile).not.toHaveBeenCalled();
  });

  it('isolates security password labels and preserves autocomplete semantics', async () => {
    const firstAuth = auth();
    const secondAuth = auth();
    const first = render(EnterpriseHost, { page: 'security', providerBundle: { dataProvider }, authProvider: firstAuth });
    const second = render(EnterpriseHost, { page: 'security', providerBundle: { dataProvider }, authProvider: secondAuth });
    const a = within(first.container);
    const b = within(second.container);
    // 未配置 MFA 的开关禁用，密码标签仍应关联各自页面。
    const ids = new Set<string>();
    const user = userEvent.setup();
    for (const container of [first.container, second.container]) {
      const inputs = container.querySelectorAll('input[type="password"]');
      expect(inputs).toHaveLength(3);
      for (const input of inputs) {
        expect(ids.has(input.id)).toBe(false);
        ids.add(input.id);
        const label = requireValue([...container.querySelectorAll('label')].find(item => item.htmlFor === input.id));
        await user.click(label);
        expect(document.activeElement).toBe(input);
      }
    }
    for (const [label, value, autocomplete] of [
      ['Current Password', 'old-password', 'current-password'],
      ['New Password', 'New-password-123', 'new-password'],
      ['Confirm Password', 'New-password-123', 'new-password'],
    ]) {
      const input = b.getByLabelText(requireValue(label), { exact: true });
      expect(input.getAttribute('autocomplete')).toBe(autocomplete);
      await fireEvent.input(input, { target: { value } });
      expect(a.getByLabelText(requireValue(label), { exact: true })).toHaveProperty('value', '');
    }
    await fireEvent.click(b.getByRole('button', { name: 'Update Password', exact: true }));
    await waitFor(() => expect(secondAuth.updatePassword).toHaveBeenCalledWith({
      currentPassword: 'old-password', password: 'New-password-123', confirmPassword: 'New-password-123',
    }));
    expect(firstAuth.updatePassword).not.toHaveBeenCalled();
  });

  it('isolates MFA labels, codes, and verification callbacks', async () => {
    const firstProvider = { begin: async () => ({ secret: 'fixture-a' }), verify: vi.fn(async () => ({ recoveryCodes: [] })) };
    const secondProvider = { begin: async () => ({ secret: 'fixture-b' }), verify: vi.fn(async () => ({ recoveryCodes: [] })) };
    const first = render(MfaHost, { page: 'mfa', bundle: { dataProvider }, mfa: firstProvider });
    const second = render(MfaHost, { page: 'mfa', bundle: { dataProvider }, mfa: secondProvider });
    const a = within(first.container);
    const b = within(second.container);
    await fireEvent.click(a.getByRole('button', { name: 'Two-Factor Authentication Setup', exact: true }));
    await fireEvent.click(b.getByRole('button', { name: 'Two-Factor Authentication Setup', exact: true }));
    await a.findByLabelText('Enter Verification Code');
    const code = await b.findByLabelText('Enter Verification Code');
    await checkLabels([first.container, second.container], 1);
    expect(code.getAttribute('autocomplete')).toBe('one-time-code');
    await fireEvent.input(code, { target: { value: '123456' } });
    expect(a.getByLabelText('Enter Verification Code')).toHaveProperty('value', '');
    await fireEvent.click(b.getByRole('button', { name: 'Confirm', exact: true }));
    await waitFor(() => expect(secondProvider.verify).toHaveBeenCalledExactlyOnceWith('123456'));
    expect(firstProvider.verify).not.toHaveBeenCalled();
  });
});
