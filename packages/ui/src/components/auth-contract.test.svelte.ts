import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetContext } from '@svadmin/core';
import { resetAuditLogProvider, setAuditHandler } from '@svadmin/core/audit';
import type { AuthProvider } from '@svadmin/core';
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

function failingAuthProvider(method: 'login' | 'register' | 'forgotPassword' | 'updatePassword'): AuthProvider {
  return {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: false }),
    getIdentity: async () => null,
    [method]: async () => ({ success: false, error: { message: `PRIVATE_${method.toUpperCase()}_DIAGNOSTIC` } }),
  };
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

it.each([
  ['login', 'login-identifier', 'login-password', undefined, 'Welcome Back'],
  ['register', 'register-identifier', 'register-password', 'register-confirm', 'Create Account'],
  ['forgotPassword', 'forgot-identifier', undefined, undefined, 'Forgot Password'],
  ['updatePassword', undefined, 'new-password', 'confirm-password', 'Reset Password'],
] as const)('does not expose provider diagnostics on the %s page', async (method, identifierId, passwordId, confirmId, label) => {
  const screen = method === 'login' ? 'login' : method === 'register' ? 'register' : method === 'forgotPassword' ? 'forgot' : 'update';
  const view = render(Host, { provider: failingAuthProvider(method), screen });
  if (identifierId) await input(view.container, identifierId, 'admin@example.com');
  if (passwordId) await input(view.container, passwordId, 'new-password');
  if (confirmId) await input(view.container, confirmId, 'new-password');
  await submit(view.container);
  await waitFor(() => expect(view.getByRole('alert').textContent).toContain(method === 'login' ? 'Login failed' : 'Operation failed'));
  expect(view.container.textContent).not.toContain(`PRIVATE_${method.toUpperCase()}_DIAGNOSTIC`);
  expect(view.getByRole('heading', { name: label, level: 1 })).toBeTruthy();
});

it('supports login copy overrides and stable accessibility hooks', async () => {
  const fixture = supabaseFixture();
  const view = render(Host, {
    provider: fixture.provider,
    screen: 'login',
    loginProps: {
      identifierLabel: '账号',
      identifierPlaceholder: '请输入账号',
      passwordLabel: '访问密码',
      loginButtonLabel: '进入系统',
    },
  });

  expect(view.container.querySelector('[data-svadmin-login-page]')).not.toBeNull();
  expect(view.container.querySelector('[data-svadmin-login-form]')).not.toBeNull();
  expect(view.getByLabelText('账号').getAttribute('placeholder')).toBe('请输入账号');
  expect(view.getByLabelText('访问密码')).toBeTruthy();
  expect(view.container.querySelectorAll('label[for="login-password"]')).toHaveLength(1);
  expect(view.getByRole('button', { name: '进入系统' })).toBeTruthy();

  await input(view.container, 'login-identifier', 'admin@example.com');
  await input(view.container, 'login-password', 'test-password');
  await submit(view.container);
  await waitFor(() => expect(fixture.calls.login).toHaveBeenCalledTimes(1));
});

it('publishes field and form error semantics after invalid submit', async () => {
  const fixture = supabaseFixture();
  const view = render(Host, { provider: fixture.provider, screen: 'login' });
  await submit(view.container);

  const alert = view.container.querySelector('[data-svadmin-login-error]');
  expect(alert?.getAttribute('aria-live')).toBe('assertive');
  expect(view.container.querySelector('#login-identifier')?.getAttribute('aria-invalid')).toBe('true');
  expect(view.container.querySelector('#login-identifier')?.getAttribute('aria-describedby')).toBe('login-error');
  expect(view.container.querySelector('#login-password')?.getAttribute('aria-invalid')).toBe('true');
  expect(view.container.querySelector('button[data-svadmin-login-submit]')).not.toBeNull();
});
