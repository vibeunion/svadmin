import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetContext } from '@svadmin/core';
import { resetAuditLogProvider, setAuditHandler } from '@svadmin/core/audit';
import { createSupabaseAuthProvider, type SupabaseAuthClient } from '../../../supabase/src/auth-provider';
import { createPocketBaseAuthProvider, type PocketBaseAuthClient } from '../../../pocketbase/src/auth-provider';
import type { SupabaseAuthSession, SupabaseAuthUser } from '../../../supabase/src/auth-contract';
import Host from './auth-contract.test-host.svelte';

function supabaseFixture() {
  const user: SupabaseAuthUser = {
    id: 'user-1', aud: 'authenticated', created_at: '2026-09-09T00:00:00Z',
    email: 'admin@example.com', app_metadata: {}, user_metadata: {},
  };
  const session: SupabaseAuthSession = {
    user, access_token: 'access-token', refresh_token: 'refresh-token', token_type: 'bearer',
    expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600,
  };
  let stored: SupabaseAuthSession | null = session;
  const auth = {
    signInWithPassword: vi.fn(async (_credentials: { email: string; password: string }) => {
      stored = session;
      return { data: { user, session }, error: null };
    }),
    signUp: vi.fn(async (_credentials: { email: string; password: string; options: { data: Record<string, unknown> } }) =>
      ({ data: { user, session: null }, error: null })),
    signOut: async () => { stored = null; return { error: null }; },
    getSession: async () => ({ data: { session: stored }, error: null }),
    getUser: async (_token?: string) => ({ data: { user: stored ? user : null }, error: null }),
    resetPasswordForEmail: vi.fn(async (_email: string) => ({ data: {}, error: null })),
    updateUser: vi.fn(async (_attributes: { password: string }) => ({ data: { user }, error: null })),
  };
  const client = { auth } satisfies SupabaseAuthClient;
  return {
    provider: createSupabaseAuthProvider(client),
    calls: { login: auth.signInWithPassword, register: auth.signUp, forgot: auth.resetPasswordForEmail },
    update: auth.updateUser,
  };
}

function pocketbaseFixture() {
  let record: { id: string; email: string } | null = null;
  const authStore = {
    get isValid() { return record !== null; },
    get record() { return record; },
    get token() { return record ? 'access-token' : ''; },
    clear() { record = null; },
  };
  const collection = {
    authWithPassword: vi.fn(async (_email: string, _password: string) => {
      record = { id: 'user-1', email: 'admin@example.com' };
      return { record, token: 'access-token' };
    }),
    create: vi.fn(async (_data: Record<string, unknown>) => ({ id: 'user-1' })),
    requestPasswordReset: vi.fn(async (_email: string) => true),
    confirmPasswordReset: async (_token: string, _password: string, _confirmation: string) => true,
  };
  const pb = { authStore, collection: (_name: string) => collection } satisfies PocketBaseAuthClient;
  return {
    provider: createPocketBaseAuthProvider({ pb }),
    calls: { login: collection.authWithPassword, register: collection.create, forgot: collection.requestPasswordReset },
  };
}

async function input(container: HTMLElement, id: string, value: string): Promise<void> {
  const field = container.querySelector(`#${id}`);
  if (!(field instanceof HTMLInputElement)) throw new Error(`Missing input ${id}`);
  await fireEvent.input(field, { target: { value } });
}

async function submit(container: HTMLElement): Promise<void> {
  const form = container.querySelector('form');
  if (!(form instanceof HTMLFormElement)) throw new Error('Missing authentication form');
  await fireEvent.submit(form);
}

beforeEach(() => setAuditHandler(() => {}));
afterEach(() => {
  cleanup();
  resetContext();
  resetAuditLogProvider();
});

describe.each([
  { name: 'Supabase', create: supabaseFixture },
  { name: 'PocketBase', create: pocketbaseFixture },
])('$name actual authentication pages', ({ create }) => {
  it.each(['login', 'register', 'forgot'] as const)('submits the %s page to the validated adapter', async screen => {
    const fixture = create();
    const view = render(Host, { provider: fixture.provider, screen });
    await input(view.container, `${screen}-identifier`, 'admin@example.com');
    if (screen !== 'forgot') await input(view.container, `${screen}-password`, 'test-password');
    if (screen === 'register') await input(view.container, 'register-confirm', 'test-password');
    await submit(view.container);
    await waitFor(() => expect(fixture.calls[screen]).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(view.queryByRole('alert')).toBeNull();
      const button = view.container.querySelector('button[type="submit"]');
      expect(button instanceof HTMLButtonElement && button.disabled).not.toBe(true);
    });
  });
});

it('submits the Supabase password update page with the validated confirmation field', async () => {
  const fixture = supabaseFixture();
  const view = render(Host, { provider: fixture.provider, screen: 'update' });
  await input(view.container, 'new-password', 'new-password');
  await input(view.container, 'confirm-password', 'new-password');
  await submit(view.container);
  await waitFor(() => expect(fixture.update).toHaveBeenCalledWith({ password: 'new-password' }));
  await waitFor(() => expect(view.queryByRole('alert')).toBeNull());
});
