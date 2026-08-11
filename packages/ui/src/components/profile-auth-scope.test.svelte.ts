import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import {
  resetContext,
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
    await waitFor(() => expect(view.getByText('Updated successfully')).not.toBeNull());

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
