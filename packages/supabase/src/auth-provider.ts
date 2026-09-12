import { definedOptions } from '@svadmin/core/options';
import type { Static } from '@sinclair/typebox';
import { snapshotPlainData } from '@svadmin/core/schema';
import { audit } from '@svadmin/core/audit';
import type { AuthProvider, Identity, AuthActionResult, CheckResult } from '@svadmin/core';
import {
  authRequest, credentials, decodeAuth, inspectAuthError, loginResponse, passwordUpdate,
  registration, registrationResponse, resetRequest, resetResponse, sessionResponse,
  signOutResponse, SupabaseAuthError, updateResponse, userResponse, validateIdentifier,
  type SupabaseAuthSession, type SupabaseAuthUser,
} from './auth-contract';

export interface SupabaseAuthClient {
  readonly auth: {
    signInWithPassword(credentials: { email: string; password: string }): Promise<unknown>;
    signUp(credentials: { email: string; password: string; options: { data: Record<string, unknown> } }): Promise<unknown>;
    signOut(options?: { scope: 'local' | 'global' }): Promise<unknown>;
    getSession(): Promise<unknown>;
    getUser(jwt?: string): Promise<unknown>;
    resetPasswordForEmail(email: string): Promise<unknown>;
    updateUser(attributes: { password: string }): Promise<unknown>;
  };
}

export interface SupabasePermissionResolverContext<C extends SupabaseAuthClient = SupabaseAuthClient> {
  client: C;
  user: SupabaseAuthUser;
}

export type SupabasePermissionResolver<C extends SupabaseAuthClient = SupabaseAuthClient> = (
  context: SupabasePermissionResolverContext<C>,
) => Promise<unknown> | unknown;

export interface SupabaseAuthProviderOptions<C extends SupabaseAuthClient = SupabaseAuthClient> {
  getPermissions?: SupabasePermissionResolver<C>;
}

function safeError(error: unknown): SupabaseAuthError {
  try { if (error instanceof SupabaseAuthError) return error; }
  catch { /* Untrusted exceptions may have throwing prototypes. */ }
  return new SupabaseAuthError('AUTH_REQUEST_FAILED');
}

function actionFailure(error: unknown): AuthActionResult {
  const failure = safeError(error);
  return { success: false, error: { name: failure.code, message: failure.message } };
}

function requiresCleanup(error: SupabaseAuthError): boolean {
  return error.code === 'INVALID_AUTH_SESSION' || error.code === 'AUTH_SESSION_EXPIRED';
}

function requireFreshSession(session: SupabaseAuthSession): void {
  if (session.expires_at <= Math.floor(Date.now() / 1000)) throw new SupabaseAuthError('AUTH_SESSION_EXPIRED');
}

/** Authentication and permissions use schema-validated snapshots, not SDK metadata assertions. */
export function createSupabaseAuthProvider<C extends SupabaseAuthClient>(
  client: C, options: SupabaseAuthProviderOptions<C> = {},
): AuthProvider {
  let revision = 0;
  let mutations: Promise<void> = Promise.resolve();

  // Serialize this provider's writes so a late login cannot undo a later logout.
  function mutate(work: () => Promise<AuthActionResult>): Promise<AuthActionResult> {
    revision++;
    const result = mutations.then(work).catch(actionFailure);
    mutations = result.then(() => {});
    return result;
  }

  async function readSession(): Promise<SupabaseAuthSession | null> {
    const result = await authRequest(() => client.auth.getSession(), sessionResponse, 'session');
    if (result.data.session) requireFreshSession(result.data.session);
    return result.data.session;
  }

  async function signOut(scope: 'local' | 'global'): Promise<void> {
    try {
      await authRequest(() => client.auth.signOut({ scope }), signOutResponse, 'response', true);
      const result = await authRequest(() => client.auth.getSession(), sessionResponse, 'session');
      if (result.data.session !== null) throw new SupabaseAuthError('AUTH_CLEANUP_FAILED');
    } catch {
      throw new SupabaseAuthError('AUTH_CLEANUP_FAILED');
    }
  }

  async function clearInvalidRead(expectedRevision: number): Promise<void> {
    if (revision !== expectedRevision) throw new SupabaseAuthError('AUTH_SESSION_CHANGED');
    const cleanupRevision = expectedRevision + 1;
    const result = await mutate(async () => {
      if (revision !== cleanupRevision) throw new SupabaseAuthError('AUTH_SESSION_CHANGED');
      await signOut('local');
      return { success: true };
    });
    if (revision !== cleanupRevision) throw new SupabaseAuthError('AUTH_SESSION_CHANGED');
    if (!result.success) throw new SupabaseAuthError('AUTH_CLEANUP_FAILED');
  }

  async function assertCurrent(session: SupabaseAuthSession, expectedRevision: number): Promise<void> {
    if (revision !== expectedRevision) throw new SupabaseAuthError('AUTH_SESSION_CHANGED');
    const current = await readSession();
    if (revision !== expectedRevision || current === null ||
        current.access_token !== session.access_token || current.user.id !== session.user.id) {
      throw new SupabaseAuthError('AUTH_SESSION_CHANGED');
    }
  }

  async function principal(expectedRevision: number) {
    const session = await readSession();
    if (revision !== expectedRevision) throw new SupabaseAuthError('AUTH_SESSION_CHANGED');
    if (session === null) return null;
    let user: SupabaseAuthUser | null;
    try {
      const result = await authRequest(() => client.auth.getUser(session.access_token), userResponse, 'session');
      user = result.data.user;
    } catch (error) {
      await assertCurrent(session, expectedRevision);
      throw error;
    }
    await assertCurrent(session, expectedRevision);
    if (user === null || user.id !== session.user.id) throw new SupabaseAuthError('INVALID_AUTH_SESSION');
    return { session, user };
  }

  async function readPrincipal() {
    const pending = mutations;
    await pending;
    if (mutations !== pending) throw new SupabaseAuthError('AUTH_SESSION_CHANGED');
    const expectedRevision = revision;
    try {
      const current = await principal(expectedRevision);
      return current === null ? null : { ...current, revision: expectedRevision };
    } catch (error) {
      if (revision !== expectedRevision) throw new SupabaseAuthError('AUTH_SESSION_CHANGED');
      const failure = safeError(error);
      if (requiresCleanup(failure)) await clearInvalidRead(expectedRevision);
      throw failure;
    }
  }

  return {
    async login(params): Promise<AuthActionResult> {
      let input: Static<typeof credentials>;
      try {
        input = decodeAuth(credentials, params, 'input');
        validateIdentifier(input);
      } catch (error) { return actionFailure(error); }
      const credentialsSnapshot = { email: input.email, password: input.password };
      return mutate(async () => {
        try {
          const { data } = await authRequest(
            () => client.auth.signInWithPassword(credentialsSnapshot), loginResponse, 'response', true,
          );
          requireFreshSession(data.session);
          if (data.session.user.id !== data.user.id) throw new SupabaseAuthError('INVALID_AUTH_SESSION');
          audit({ action: 'login', userId: data.user.id });
          return { success: true, redirectTo: '/' };
        } catch (error) {
          const failure = safeError(error);
          if (failure.code === 'WRITE_OUTCOME_UNKNOWN' || requiresCleanup(failure)) await signOut('local');
          throw failure;
        }
      });
    },

    logout(): Promise<AuthActionResult> {
      return mutate(async () => {
        let userId: string | undefined;
        try {
          const current = await principal(revision);
          userId = current?.user.id;
        } catch {
          // An unavailable identity lookup must not prevent a requested sign-out.
        }
        await signOut('global');
        audit(definedOptions({ action: 'logout', userId }));
        return { success: true, redirectTo: '/login' };
      });
    },

    async check(): Promise<CheckResult> {
      try {
        return await readPrincipal()
          ? { authenticated: true }
          : { authenticated: false, redirectTo: '/login', logout: true };
      } catch (error) {
        const failure = safeError(error);
        return {
          authenticated: false,
          ...definedOptions({
            redirectTo: requiresCleanup(failure) || failure.code === 'AUTH_CLEANUP_FAILED' ? '/login' : undefined,
            logout: requiresCleanup(failure) || failure.code === 'AUTH_CLEANUP_FAILED' ? true : undefined,
          }),
          error: { name: failure.code, message: failure.message },
        };
      }
    },

    async getIdentity(): Promise<Identity | null> {
      try {
        const current = await readPrincipal();
        if (!current) return null;
        const { user, session } = current;
        return definedOptions({
          id: user.id,
          name: user.user_metadata.name || user.email?.split('@')[0] || user.id,
          email: user.email,
          avatar: user.user_metadata.avatar_url ?? undefined,
          token: session.access_token,
        });
      } catch (error) {
        const failure = safeError(error);
        if (requiresCleanup(failure) || failure.code === 'AUTH_SESSION_CHANGED') return null;
        throw failure;
      }
    },

    async getPermissions(): Promise<unknown> {
      if (!options.getPermissions) return null;
      let current: Awaited<ReturnType<typeof readPrincipal>>;
      try { current = await readPrincipal(); }
      catch (error) {
        const failure = safeError(error);
        if (requiresCleanup(failure) || failure.code === 'AUTH_SESSION_CHANGED') return null;
        throw failure;
      }
      if (!current) return null;
      let result: unknown;
      try { result = await options.getPermissions({ client, user: current.user }); }
      catch { throw new SupabaseAuthError('PERMISSION_LOOKUP_FAILED'); }
      let permissions: unknown;
      try { permissions = snapshotPlainData(result); }
      catch { throw new SupabaseAuthError('INVALID_PERMISSIONS'); }
      try { await assertCurrent(current.session, current.revision); }
      catch (error) {
        const failure = safeError(error);
        if (failure.code === 'AUTH_SESSION_CHANGED') return null;
        throw failure;
      }
      return permissions;
    },

    async register(params): Promise<AuthActionResult> {
      let input: Static<typeof registration>;
      try {
        input = decodeAuth(registration, params, 'input');
        validateIdentifier(input);
      } catch (error) { return actionFailure(error); }
      const payload = {
        email: input.email, password: input.password,
        options: { data: definedOptions({ name: input.name, username: input.username }) },
      };
      return mutate(async () => {
        try {
          const { data } = await authRequest(() => client.auth.signUp(payload), registrationResponse, 'response', true);
          if (data.session) {
            requireFreshSession(data.session);
            if (data.user.id !== data.session.user.id) throw new SupabaseAuthError('INVALID_AUTH_SESSION');
          }
          return { success: true, redirectTo: '/login' };
        } catch (error) {
          const failure = safeError(error);
          if (failure.code === 'WRITE_OUTCOME_UNKNOWN' || requiresCleanup(failure)) await signOut('local');
          throw failure;
        }
      });
    },

    async forgotPassword(params): Promise<AuthActionResult> {
      try {
        const input = decodeAuth(resetRequest, params, 'input');
        validateIdentifier(input);
        await authRequest(() => client.auth.resetPasswordForEmail(input.email), resetResponse, 'response', true);
        return { success: true };
      } catch (error) { return actionFailure(error); }
    },

    async updatePassword(params): Promise<AuthActionResult> {
      let input: Static<typeof passwordUpdate>;
      try {
        input = decodeAuth(passwordUpdate, params, 'input');
        if (input.confirmPassword !== undefined && input.password !== input.confirmPassword) {
          throw new SupabaseAuthError('INVALID_AUTH_INPUT');
        }
      } catch (error) { return actionFailure(error); }
      const payload = { password: input.password };
      return mutate(async () => {
        const current = await principal(revision);
        if (!current) throw new SupabaseAuthError('AUTH_SESSION_EXPIRED');
        const { data } = await authRequest(() => client.auth.updateUser(payload), updateResponse, 'response', true);
        if (data.user.id !== current.user.id) throw new SupabaseAuthError('WRITE_OUTCOME_UNKNOWN');
        return { success: true, redirectTo: '/' };
      });
    },

    async onError(error): Promise<{ redirectTo?: string; logout?: boolean }> {
      const kind = inspectAuthError(error);
      if (kind !== 'expired' && kind !== 'unauthorized') return {};
      try {
        if (await readPrincipal()) return {};
      } catch (failure) {
        const normalized = safeError(failure);
        if (normalized.code === 'AUTH_SESSION_CHANGED') return {};
        if (!requiresCleanup(normalized)) throw normalized;
      }
      return { redirectTo: '/login', logout: true };
    },
  };
}
