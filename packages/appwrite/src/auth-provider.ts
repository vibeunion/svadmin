import { definedOptions } from '@svadmin/core/options';
// @svadmin/appwrite — Appwrite AuthProvider
import type { AuthProvider, Identity, AuthActionResult, CheckResult } from '@svadmin/core';

interface AppwriteAuthOptions {
  /** Appwrite Account instance */
  account: unknown; // Appwrite.Account
  /** Full base URL for recovery link. Required if forgotPassword is used in SSR. */
  recoveryUrl?: string;
}

export type AppwriteProviderOptions = AppwriteAuthOptions;

// Duck-typed Appwrite Account interface
interface AppwriteAccount {
  createEmailPasswordSession: (email: string, password: string) => Promise<Record<string, unknown>>;
  deleteSession: (sessionId: string) => Promise<void>;
  get: () => Promise<{ $id: string; name: string; email: string; prefs?: Record<string, unknown> }>;
  create: (userId: string, email: string, password: string, name?: string) => Promise<Record<string, unknown>>;
  createRecovery: (email: string, url: string) => Promise<Record<string, unknown>>;
  updatePassword: (password: string, oldPassword?: string) => Promise<Record<string, unknown>>;
}

/**
 * Create an AuthProvider backed by Appwrite Account.
 *
 * Usage:
 * ```ts
 * import { Account, Client } from 'appwrite';
 * import { createAppwriteAuthProvider } from '@svadmin/appwrite';
 *
 * const client = new Client().setEndpoint('https://cloud.appwrite.io/v1').setProject('PROJECT_ID');
 * const account = new Account(client);
 * const authProvider = createAppwriteAuthProvider({ account });
 * ```
 */
export function createAppwriteAuthProvider(options: AppwriteAuthOptions): AuthProvider {
  const account = options.account as AppwriteAccount;

  return {
    async login({ email, password }: Record<string, unknown>): Promise<AuthActionResult> {
      try {
        await account.createEmailPasswordSession(email as string, password as string);
        return { success: true, redirectTo: '/' };
      } catch (err) {
        return { success: false, error: { message: (err as Error).message } };
      }
    },

    async logout(): Promise<AuthActionResult> {
      try {
        await account.deleteSession('current');
        return { success: true, redirectTo: '/login' };
      } catch (err) {
        return { success: false, error: { message: (err as Error).message } };
      }
    },

    async check(): Promise<CheckResult> {
      try {
        await account.get();
        return { authenticated: true };
      } catch {
        return { authenticated: false, redirectTo: '/login', logout: true };
      }
    },

    async getIdentity(): Promise<Identity | null> {
      try {
        const user = await account.get();
        return definedOptions({
          id: user.$id,
          name: user.name || user.email.split('@')[0],
          email: user.email,
          avatar: user.prefs?.['avatar'] as string | undefined,
        });
      } catch {
        return null;
      }
    },

    async register({ email, password, name }: Record<string, unknown>): Promise<AuthActionResult> {
      try {
        await account.create('unique()', email as string, password as string, name as string | undefined);
        return { success: true, redirectTo: '/login' };
      } catch (err) {
        return { success: false, error: { message: (err as Error).message } };
      }
    },

    async forgotPassword({ email }: Record<string, unknown>): Promise<AuthActionResult> {
      try {
        const base = options.recoveryUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');
        if (!base) throw new Error('recoveryUrl is required in options when calling forgotPassword from server');
        await account.createRecovery(email as string, `${base}/update-password`);
        return { success: true };
      } catch (err) {
        return { success: false, error: { message: (err as Error).message } };
      }
    },

    async updatePassword({ password, oldPassword }: Record<string, unknown>): Promise<AuthActionResult> {
      try {
        await account.updatePassword(password as string, oldPassword as string | undefined);
        return { success: true, redirectTo: '/' };
      } catch (err) {
        return { success: false, error: { message: (err as Error).message } };
      }
    },

    async onError(error: unknown): Promise<{ redirectTo?: string; logout?: boolean }> {
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('unauthorized'))) {
        return { redirectTo: '/login', logout: true };
      }
      return {};
    },
  };
}
