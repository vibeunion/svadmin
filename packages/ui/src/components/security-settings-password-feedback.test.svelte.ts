import { fireEvent, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetContext, type AuthProvider } from '@svadmin/core';
import SecuritySettingsHarness from '../../test/fixtures/SecuritySettingsHarness.svelte';
import { renderWithI18n } from '../../test/fixtures/render-with-i18n';

function createAuthProvider(updatePassword: NonNullable<AuthProvider['updatePassword']>): AuthProvider {
  return {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    getIdentity: async () => ({ id: 'admin', name: 'Admin' }),
    updatePassword,
  };
}

afterEach(() => {
  resetContext();
  vi.restoreAllMocks();
});

describe('SecuritySettings password feedback', () => {
  it('confirms a successful password change in place', async () => {
    const updatePassword = vi.fn(async () => ({ success: true }));
    const view = renderWithI18n(SecuritySettingsHarness, {
      authProvider: createAuthProvider(updatePassword),
    });

    await fireEvent.input(view.getByLabelText('Current Password'), { target: { value: 'old-password' } });
    await fireEvent.input(view.getByLabelText('New Password'), { target: { value: 'new-password' } });
    await fireEvent.input(view.getByLabelText('Confirm Password'), { target: { value: 'new-password' } });
    await fireEvent.click(view.getByRole('button', { name: 'Update Password' }));

    await waitFor(() => expect(updatePassword).toHaveBeenCalledTimes(1));
    expect(await view.findByText('Last changed: just now')).toBeTruthy();
  });
});