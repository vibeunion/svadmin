import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import {
  resetContext,
  getToastQueue,
  type AuthActionResult,
  type AuthProvider,
  type Identity,
} from '@svadmin/core';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProfileAuthScopeHost from './profile-auth-scope.test-host.svelte';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function baseAuthProvider(getIdentity: () => Promise<Identity | null>): AuthProvider {
  return {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    getIdentity,
  };
}

function passwordInputs(container: HTMLElement) {
  const profile = within(container);
  return {
    current: profile.getByLabelText('Current Password') as HTMLInputElement,
    next: profile.getByLabelText('Password') as HTMLInputElement,
    confirm: profile.getByLabelText('Confirm Password') as HTMLInputElement,
  };
}

function enclosingForm(input: HTMLInputElement): HTMLFormElement {
  const form = input.closest('form');
  if (!(form instanceof HTMLFormElement)) throw new Error('Password input must belong to a form.');
  return form;
}

function profileFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('Profile avatar input was not rendered.');
  return input;
}

function avatarUploadButton(input: HTMLInputElement): HTMLButtonElement {
  const button = input.previousElementSibling;
  if (!(button instanceof HTMLButtonElement)) throw new Error('Profile avatar button was not rendered.');
  return button;
}

afterEach(() => {
  resetContext();
  vi.restoreAllMocks();
});

describe('Profile auth scope', () => {
  it('reports a successful password update and clears sensitive fields', async () => {
    const updatePassword = vi.fn(async () => ({ success: true }));
    const authProvider: AuthProvider = {
      ...baseAuthProvider(async () => ({ id: 'user-a', name: 'Tenant A User' })),
      updatePassword,
    };
    const view = render(ProfileAuthScopeHost, {
      authProvider,
      tenant: { tenantId: 'tenant-a' },
    });

    await waitFor(() => expect(view.getByText('Tenant A User')).not.toBeNull());
    const passwords = passwordInputs(view.container);
    await fireEvent.input(passwords.current, { target: { value: 'current-password' } });
    await fireEvent.input(passwords.next, { target: { value: 'next-password' } });
    await fireEvent.input(passwords.confirm, { target: { value: 'next-password' } });
    await fireEvent.submit(enclosingForm(passwords.confirm));

    await waitFor(() => expect(updatePassword).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(
      getToastQueue().some((item) => item.message === 'Password updated successfully'),
    ).toBe(true));
    expect(getToastQueue()).toHaveLength(1);
    expect(passwords.current.value).toBe('');
    expect(passwords.next.value).toBe('');
    expect(passwords.confirm.value).toBe('');
  });

  it('shows a safe identity load error and recovers through retry', async () => {
    const getIdentity = vi.fn()
      .mockRejectedValueOnce(new Error('PRIVATE_IDENTITY_DIAGNOSTIC'))
      .mockResolvedValue({ id: 'user-a', name: 'Tenant A User' });
    const authProvider: AuthProvider = {
      ...baseAuthProvider(getIdentity),
    };
    const view = render(ProfileAuthScopeHost, {
      authProvider,
      tenant: { tenantId: 'tenant-a' },
    });

    await waitFor(() => expect(view.getByText('Operation failed')).not.toBeNull());
    expect(view.container.textContent).not.toContain('PRIVATE_IDENTITY_DIAGNOSTIC');
    expect(view.queryByText('Tenant A User')).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(view.getByText('Tenant A User')).not.toBeNull());
    expect(getIdentity).toHaveBeenCalledTimes(2);
  });

  it.each(['diagnostic', 'empty', 'non-error', 'result'] as const)('sanitizes %s profile and password failures while preserving retryable drafts', async failure => {
    const updateProfile = vi.fn<NonNullable<AuthProvider['updateProfile']>>()
      .mockResolvedValue({ success: true });
    const updatePassword = vi.fn<NonNullable<AuthProvider['updatePassword']>>()
      .mockResolvedValue({ success: true });
    if (failure === 'result') {
      updateProfile.mockResolvedValueOnce({ success: false, error: { message: 'PRIVATE_PROFILE_DIAGNOSTIC' } });
      updatePassword.mockResolvedValueOnce({ success: false, error: { message: 'PRIVATE_PASSWORD_DIAGNOSTIC' } });
    } else {
      updateProfile.mockRejectedValueOnce(failure === 'non-error' ? 'PRIVATE_PROFILE_DIAGNOSTIC' : new Error(failure === 'empty' ? '' : 'PRIVATE_PROFILE_DIAGNOSTIC'));
      updatePassword.mockRejectedValueOnce(failure === 'non-error' ? 'PRIVATE_PASSWORD_DIAGNOSTIC' : new Error(failure === 'empty' ? '' : 'PRIVATE_PASSWORD_DIAGNOSTIC'));
    }
    const authProvider: AuthProvider = {
      ...baseAuthProvider(async () => ({ id: 'user-a', name: 'Tenant A User' })),
      updateProfile,
      updatePassword,
    };
    const view = render(ProfileAuthScopeHost, {
      authProvider,
      tenant: { tenantId: 'tenant-a' },
    });

    await waitFor(() => expect(view.getByText('Tenant A User')).not.toBeNull());
    await fireEvent.click(view.getByRole('button', { name: 'Edit' }));
    const name = view.getByLabelText('Name') as HTMLInputElement;
    await fireEvent.input(name, { target: { value: 'Tenant A Updated' } });
    await fireEvent.click(view.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(view.getByText('Operation failed')).not.toBeNull());
    expect(view.container.textContent).not.toContain('PRIVATE_PROFILE_DIAGNOSTIC');
    expect(name.value).toBe('Tenant A Updated');

    await fireEvent.click(view.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(2));
    expect(updateProfile).toHaveBeenLastCalledWith({ name: 'Tenant A Updated' });
    expect(view.queryByText('Operation failed')).toBeNull();

    const passwords = passwordInputs(view.container);
    await fireEvent.input(passwords.current, { target: { value: 'current-password' } });
    await fireEvent.input(passwords.next, { target: { value: 'next-password' } });
    await fireEvent.input(passwords.confirm, { target: { value: 'next-password' } });
    await fireEvent.submit(enclosingForm(passwords.confirm));
    await waitFor(() => expect(view.getByText('Operation failed')).not.toBeNull());
    expect(view.container.textContent).not.toContain('PRIVATE_PASSWORD_DIAGNOSTIC');
    expect(getToastQueue().some(item => item.message.includes('PRIVATE_'))).toBe(false);
    expect(passwords.current.value).toBe('current-password');
    expect(passwords.next.value).toBe('next-password');
    expect(passwords.confirm.value).toBe('next-password');
    await fireEvent.submit(enclosingForm(passwords.confirm));
    await waitFor(() => expect(updatePassword).toHaveBeenCalledTimes(2));
    expect(view.queryByText('Operation failed')).toBeNull();
    expect(passwords.current.value).toBe('');
    expect(passwords.next.value).toBe('');
    expect(passwords.confirm.value).toBe('');
  });

  it.each(['diagnostic', 'empty', 'non-error', 'result'] as const)('sanitizes %s avatar failures and permits retry with the same file', async failure => {
    const updateProfile = vi.fn<NonNullable<AuthProvider['updateProfile']>>()
      .mockResolvedValue({ success: true });
    if (failure === 'result') {
      updateProfile.mockResolvedValueOnce({ success: false, error: { message: 'PRIVATE_AVATAR_DIAGNOSTIC' } });
    } else {
      updateProfile.mockRejectedValueOnce(failure === 'non-error' ? 'PRIVATE_AVATAR_DIAGNOSTIC' : new Error(failure === 'empty' ? '' : 'PRIVATE_AVATAR_DIAGNOSTIC'));
    }
    const getIdentity = vi.fn(async () => ({ id: 'user-a', name: 'Tenant A User' }));
    const authProvider: AuthProvider = {
      ...baseAuthProvider(getIdentity),
      updateProfile,
    };
    const view = render(ProfileAuthScopeHost, {
      authProvider,
      tenant: { tenantId: 'tenant-a' },
    });
    await waitFor(() => expect(view.getByText('Tenant A User')).not.toBeNull());
    const input = profileFileInput(view.container);
    const file = new File(['avatar-a'], 'avatar-a.png', { type: 'image/png' });
    const user = userEvent.setup();
    expect(view.getByRole('button', { name: 'Upload Avatar' })).toBe(avatarUploadButton(input));
    await user.upload(input, file);
    await waitFor(() => expect(view.getByRole('alert')).toHaveProperty('textContent', 'Operation failed'));
    expect(view.container.textContent).not.toContain('PRIVATE_AVATAR_DIAGNOSTIC');
    expect(avatarUploadButton(input).disabled).toBe(false);
    expect(input.value).toBe('');
    expect(getIdentity).toHaveBeenCalledTimes(1);
    await user.upload(input, file);
    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(view.queryByRole('alert')).toBeNull());
    await waitFor(() => expect(getIdentity).toHaveBeenCalledTimes(2));
    expect(updateProfile).toHaveBeenLastCalledWith({ avatar: file });
  });

  it('ignores duplicate avatar uploads and stale rejected uploads after a scope change', async () => {
    let reject!: (reason: Error) => void;
    const pending = new Promise<AuthActionResult>((_resolve, fail) => { reject = fail; });
    const firstUpdateProfile = vi.fn(async () => pending);
    const firstAuth: AuthProvider = {
      ...baseAuthProvider(async () => ({ id: 'user-a', name: 'Tenant A User' })),
      updateProfile: firstUpdateProfile,
    };
    const nextGetIdentity = vi.fn(async () => ({ id: 'user-b', name: 'Tenant B User' }));
    const nextAuth: AuthProvider = {
      ...baseAuthProvider(nextGetIdentity),
      updateProfile: vi.fn(async () => ({ success: true })),
    };
    const view = render(ProfileAuthScopeHost, { authProvider: firstAuth, tenant: { tenantId: 'tenant-a' } });
    await view.findByText('Tenant A User');
    const input = profileFileInput(view.container);
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    await fireEvent.change(input, { target: { files: [file] } });
    await fireEvent.change(input, { target: { files: [file] } });
    expect(firstUpdateProfile).toHaveBeenCalledTimes(1);
    expect(avatarUploadButton(input).disabled).toBe(true);
    await view.rerender({ authProvider: nextAuth, tenant: { tenantId: 'tenant-b' } });
    await view.findByText('Tenant B User');
    reject(new Error('PRIVATE_STALE_AVATAR'));
    await pending.catch(() => {});
    await tick();
    expect(view.queryByRole('alert')).toBeNull();
    expect(nextGetIdentity).toHaveBeenCalledTimes(1);
    expect(view.getByRole('button', { name: 'Upload Avatar' })).toHaveProperty('disabled', false);
  });

  it('clears identity status and sensitive drafts when the tenant changes under one auth provider', async () => {
    const pendingFreshIdentity = createDeferred<Identity | null>();
    const scopedGetIdentity = vi.fn()
      .mockResolvedValueOnce({ id: 'user-a', name: 'Tenant A User' })
      .mockResolvedValueOnce({ id: 'user-a', name: 'Tenant A Refreshed' })
      .mockImplementationOnce(() => pendingFreshIdentity.promise);
    const scopedAuth: AuthProvider = {
      ...baseAuthProvider(scopedGetIdentity),
      updateProfile: vi.fn(async () => ({ success: true })),
      updatePassword: vi.fn(async () => ({ success: true })),
    };
    const view = render(ProfileAuthScopeHost, {
      authProvider: scopedAuth,
      tenant: { tenantId: 'tenant-a' },
    });

    await waitFor(() => expect(view.getByText('Tenant A User')).not.toBeNull());
    await fireEvent.click(view.getByRole('button', { name: 'Edit' }));
    await fireEvent.input(view.getByLabelText('Name'), { target: { value: 'Tenant A Draft' } });
    await fireEvent.click(view.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(scopedGetIdentity).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(
      getToastQueue().some((item) => item.message === 'Updated successfully'),
    ).toBe(true));
    expect(view.queryByText('Updated successfully')).toBeNull();

    const firstPasswords = passwordInputs(view.container);
    await fireEvent.input(firstPasswords.current, { target: { value: 'tenant-a-current' } });
    await fireEvent.input(firstPasswords.next, { target: { value: 'tenant-a-next' } });
    await fireEvent.input(firstPasswords.confirm, { target: { value: 'mismatch' } });
    await fireEvent.submit(enclosingForm(firstPasswords.confirm));
    expect(view.getByText('Passwords do not match')).not.toBeNull();

    await view.rerender({
      authProvider: scopedAuth,
      tenant: { tenantId: 'tenant-b' },
    });
    await waitFor(() => expect(scopedGetIdentity).toHaveBeenCalledTimes(3));

    expect(view.queryByText('Tenant A User')).toBeNull();
    expect(view.queryByText('Tenant A Refreshed')).toBeNull();
    expect(view.queryByText('Updated successfully')).toBeNull();
    expect(view.queryByText('Passwords do not match')).toBeNull();
    const clearedPasswords = passwordInputs(view.container);
    expect(clearedPasswords.current.value).toBe('');
    expect(clearedPasswords.next.value).toBe('');
    expect(clearedPasswords.confirm.value).toBe('');

    pendingFreshIdentity.resolve({ id: 'user-b', name: 'Tenant B User' });
    await waitFor(() => expect(view.getByText('Tenant B User')).not.toBeNull());
    await fireEvent.click(view.getByRole('button', { name: 'Edit' }));
    expect((view.getByLabelText('Name') as HTMLInputElement).value).toBe('Tenant B User');
  });

  it('rejects an identity that resolves after the auth and tenant scope changed', async () => {
    const staleIdentity = createDeferred<Identity | null>();
    const firstGetIdentity = vi.fn(() => staleIdentity.promise);
    const firstAuth = baseAuthProvider(firstGetIdentity);
    const nextGetIdentity = vi.fn(async () => ({ id: 'user-b', name: 'Tenant B User' }));
    const nextAuth = baseAuthProvider(nextGetIdentity);
    const view = render(ProfileAuthScopeHost, {
      authProvider: firstAuth,
      tenant: { tenantId: 'tenant-a' },
    });

    await waitFor(() => expect(firstGetIdentity).toHaveBeenCalledTimes(1));
    await view.rerender({
      authProvider: nextAuth,
      tenant: { tenantId: 'tenant-b' },
    });
    await waitFor(() => expect(view.getByText('Tenant B User')).not.toBeNull());

    staleIdentity.resolve({ id: 'stale-a', name: 'Late Tenant A User' });
    await staleIdentity.promise;
    await tick();

    expect(view.queryByText('Late Tenant A User')).toBeNull();
    expect(view.getByText('Tenant B User')).not.toBeNull();
  });

  it('keeps stale profile, avatar, and password mutations out of the next scope', async () => {
    const staleProfile = createDeferred<AuthActionResult>();
    const staleAvatar = createDeferred<AuthActionResult>();
    const stalePassword = createDeferred<AuthActionResult>();
    const freshAvatar = createDeferred<AuthActionResult>();
    const firstGetIdentity = vi.fn(async () => ({ id: 'user-a', name: 'Tenant A User' }));
    const firstUpdateProfile = vi.fn((params: { name?: string; avatar?: string | File }) =>
      params.avatar ? staleAvatar.promise : staleProfile.promise
    );
    const firstUpdatePassword = vi.fn(() => stalePassword.promise);
    const firstAuth: AuthProvider = {
      ...baseAuthProvider(firstGetIdentity),
      updateProfile: firstUpdateProfile,
      updatePassword: firstUpdatePassword,
    };
    const nextGetIdentity = vi.fn(async () => ({ id: 'user-b', name: 'Tenant B User' }));
    const nextUpdateProfile = vi.fn((params: { name?: string; avatar?: string | File }) =>
      params.avatar ? freshAvatar.promise : Promise.resolve({ success: true })
    );
    const nextUpdatePassword = vi.fn(async () => ({ success: true }));
    const nextAuth: AuthProvider = {
      ...baseAuthProvider(nextGetIdentity),
      updateProfile: nextUpdateProfile,
      updatePassword: nextUpdatePassword,
    };
    const view = render(ProfileAuthScopeHost, {
      authProvider: firstAuth,
      tenant: { tenantId: 'tenant-a' },
    });

    await waitFor(() => expect(view.getByText('Tenant A User')).not.toBeNull());
    await fireEvent.click(view.getByRole('button', { name: 'Edit' }));
    await fireEvent.input(view.getByLabelText('Name'), { target: { value: 'Tenant A Saved Late' } });
    await fireEvent.click(view.getByRole('button', { name: 'Save' }));
    expect(firstUpdateProfile).toHaveBeenCalledWith({ name: 'Tenant A Saved Late' });

    const firstFileInput = profileFileInput(view.container);
    await fireEvent.change(firstFileInput, {
      target: { files: [new File(['avatar-a'], 'avatar-a.png', { type: 'image/png' })] },
    });
    expect(firstUpdateProfile).toHaveBeenCalledTimes(2);

    const firstPasswords = passwordInputs(view.container);
    await fireEvent.input(firstPasswords.current, { target: { value: 'tenant-a-current' } });
    await fireEvent.input(firstPasswords.next, { target: { value: 'tenant-a-next' } });
    await fireEvent.input(firstPasswords.confirm, { target: { value: 'tenant-a-next' } });
    await fireEvent.submit(enclosingForm(firstPasswords.confirm));
    expect(firstUpdatePassword).toHaveBeenCalledWith({
      password: 'tenant-a-next',
      currentPassword: 'tenant-a-current',
      confirmPassword: 'tenant-a-next',
    });

    await view.rerender({
      authProvider: nextAuth,
      tenant: { tenantId: 'tenant-b' },
    });
    await waitFor(() => expect(view.getByText('Tenant B User')).not.toBeNull());
    expect((view.getByRole('button', { name: 'Update Password' }) as HTMLButtonElement).disabled).toBe(false);

    await fireEvent.click(view.getByRole('button', { name: 'Edit' }));
    const nextName = view.getByLabelText('Name') as HTMLInputElement;
    await fireEvent.input(nextName, { target: { value: 'Tenant B Draft' } });
    const nextPasswords = passwordInputs(view.container);
    await fireEvent.input(nextPasswords.current, { target: { value: 'tenant-b-current' } });
    await fireEvent.input(nextPasswords.next, { target: { value: 'tenant-b-next' } });
    await fireEvent.input(nextPasswords.confirm, { target: { value: 'tenant-b-next' } });

    const nextFileInput = profileFileInput(view.container);
    await fireEvent.change(nextFileInput, {
      target: { files: [new File(['avatar-b'], 'avatar-b.png', { type: 'image/png' })] },
    });
    const nextAvatarButton = avatarUploadButton(nextFileInput);
    expect(nextAvatarButton.disabled).toBe(true);

    staleProfile.resolve({ success: true });
    staleAvatar.resolve({ success: true });
    stalePassword.resolve({ success: true });
    await Promise.all([staleProfile.promise, staleAvatar.promise, stalePassword.promise]);
    await tick();

    expect(view.getByLabelText('Name')).not.toBeNull();
    expect((view.getByLabelText('Name') as HTMLInputElement).value).toBe('Tenant B Draft');
    expect(nextPasswords.current.value).toBe('tenant-b-current');
    expect(nextPasswords.next.value).toBe('tenant-b-next');
    expect(nextPasswords.confirm.value).toBe('tenant-b-next');
    expect(view.queryByText('Password updated successfully')).toBeNull();
    expect(nextAvatarButton.disabled).toBe(true);
    expect(nextGetIdentity).toHaveBeenCalledTimes(1);

    await fireEvent.click(view.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(nextUpdateProfile).toHaveBeenCalledWith({ name: 'Tenant B Draft' }));
    await fireEvent.submit(enclosingForm(nextPasswords.confirm));
    await waitFor(() => expect(nextUpdatePassword).toHaveBeenCalledWith({
      password: 'tenant-b-next',
      currentPassword: 'tenant-b-current',
      confirmPassword: 'tenant-b-next',
    }));

    freshAvatar.resolve({ success: true });
    await freshAvatar.promise;
    await waitFor(() => {
      const activeFileInput = profileFileInput(view.container);
      expect(avatarUploadButton(activeFileInput).disabled).toBe(false);
    });
    expect(firstUpdateProfile).toHaveBeenCalledTimes(2);
    expect(firstUpdatePassword).toHaveBeenCalledTimes(1);
  });
});
