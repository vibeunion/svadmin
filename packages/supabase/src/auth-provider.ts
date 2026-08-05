// Supabase AuthProvider
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { AuthProvider, Identity, AuthActionResult, CheckResult } from '@svadmin/core';
import { audit } from '@svadmin/core';

export interface SupabasePermissionResolverContext {
  client: SupabaseClient;
  user: User;
}

export type SupabasePermissionResolver = (
  context: SupabasePermissionResolverContext,
) => Promise<unknown> | unknown;

export interface SupabaseAuthProviderOptions {
  getPermissions?: SupabasePermissionResolver;
}

const INVALID_REFRESH_TOKEN_MESSAGES = [
  'refresh token is not valid',
  'invalid refresh token',
  'refresh_token_not_found',
  'jwt expired',
];

function isInvalidRefreshTokenError(error: unknown): error is Error {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return INVALID_REFRESH_TOKEN_MESSAGES.some((fragment) => message.includes(fragment));
}

async function clearInvalidSession(client: SupabaseClient): Promise<void> {
  await client.auth.signOut({ scope: 'local' });
}

async function currentPermissionUser(client: SupabaseClient): Promise<User | null> {
  const { data: { user }, error } = await client.auth.getUser();
  if (error && isInvalidRefreshTokenError(error)) {
    await clearInvalidSession(client);
    return null;
  }
  if (error) throw error;
  return user ?? null;
}

export function createSupabaseAuthProvider(
  client: SupabaseClient,
  options: SupabaseAuthProviderOptions = {},
): AuthProvider {
  return {
    async login({ email, password }: Record<string, unknown>): Promise<AuthActionResult> {
      const { data, error } = await client.auth.signInWithPassword({
        email: email as string,
        password: password as string,
      });
      if (error) return { success: false, error: { message: error.message } };
      audit({ action: 'login', userId: data.user?.id });
      return { success: true, redirectTo: '/' };
    },

    async logout(): Promise<AuthActionResult> {
      const { data: { user } } = await client.auth.getUser();
      await client.auth.signOut();
      audit({ action: 'logout', userId: user?.id });
      return { success: true, redirectTo: '/login' };
    },

    async check(): Promise<CheckResult> {
      const { data: { session }, error } = await client.auth.getSession();
      if (error) {
        if (isInvalidRefreshTokenError(error)) {
          await clearInvalidSession(client);
          return {
            authenticated: false,
            redirectTo: '/login',
            logout: true,
            error: { message: 'Session expired, please sign in again.' },
          };
        }

        return {
          authenticated: false,
          redirectTo: '/login',
          logout: true,
          error: { message: 'Session validation failed.' },
        };
      }
      if (session) return { authenticated: true };
      return { authenticated: false, redirectTo: '/login', logout: true };
    },

    async getIdentity(): Promise<Identity | null> {
      const { data: { user }, error } = await client.auth.getUser();
      if (error && isInvalidRefreshTokenError(error)) {
        await clearInvalidSession(client);
        return null;
      }
      if (!user) return null;
      
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      if (sessionError && isInvalidRefreshTokenError(sessionError)) {
        await clearInvalidSession(client);
        return null;
      }
      
      return {
        id: user.id,
        name: user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'User',
        email: user.email,
        avatar: user.user_metadata?.avatar_url,
        token: session?.access_token,
      };
    },

    async getPermissions(): Promise<unknown> {
      if (!options.getPermissions) return null;
      const user = await currentPermissionUser(client);
      if (!user) return null;
      return options.getPermissions({ client, user });
    },

    async register({ email, password, ...rest }: Record<string, unknown>): Promise<AuthActionResult> {
      const { error } = await client.auth.signUp({
        email: email as string,
        password: password as string,
        options: { data: rest },
      });
      if (error) return { success: false, error: { message: error.message } };
      return { success: true, redirectTo: '/login' };
    },

    async forgotPassword({ email }: Record<string, unknown>): Promise<AuthActionResult> {
      const { error } = await client.auth.resetPasswordForEmail(email as string);
      if (error) return { success: false, error: { message: error.message } };
      return { success: true };
    },

    async updatePassword({ password }: Record<string, unknown>): Promise<AuthActionResult> {
      const { error } = await client.auth.updateUser({ password: password as string });
      if (error) return { success: false, error: { message: error.message } };
      return { success: true, redirectTo: '/' };
    },

    async onError(error: unknown): Promise<{ redirectTo?: string; logout?: boolean }> {
      if (isInvalidRefreshTokenError(error)) {
        await clearInvalidSession(client);
        return { redirectTo: '/login', logout: true };
      }

      if (error instanceof Error && error.message.includes('401')) {
        // Pre-flight check: race-condition guard
        // Supabase might have just refreshed the token in the background right after our fetch failed
        const { data: { session } } = await client.auth.getSession();
        
        if (session?.access_token) {
          // Token is actually still valid in Supabase! The 401 was a stale race condition.
          // We intercept and swallow the logout action so the user isn't falsely kicked.
          return {};
        }

        // Truly expired
        await client.auth.signOut();
        return { redirectTo: '/login', logout: true };
      }
      return {};
    },
  };
}
