import { definedOptions } from './defined-options';
// Component-scoped auth calls with validated results and provider-scoped session revisions.

import { captureAdminContext } from './context.svelte';
import type { AdminContextAccessor } from './context.svelte';
import { notifyWithProvider } from './notification.svelte';
import { t,useTranslation } from './i18n.svelte';
import type { AuthActionResult,CheckResult,Identity,AuthProvider } from './types';
import { useQueryClient } from '@tanstack/svelte-query';
import { untrack } from 'svelte';
import { createSubscriber } from 'svelte/reactivity';
import { parseQueryKey } from './query-keys';
import { decodePermissionHints, hasPermissionHint, PermissionHintsError, type PermissionHints } from './permission-hints-contract';
import {
  AuthQueryError, decodeAuthCheck, decodeIdentity, AuthErrorHandlingError, decodeAuthErrorResult,
  type AuthErrorHandlingResult,
} from './auth-query-contract';
import {
  AuthMutationError, authMutationFailure, decodeAuthAction, prepareAuthMutation,
  type AuthMutationArgs, type AuthMutationMethod,
} from './auth-mutation-contract';
import { navigateWithProvider } from './router';

let _logoutVersion=$state(0);
interface AuthSession {
  readonly cacheId: number;
  readonly observe: () => void;
  readonly changed: () => void;
  version: number;
  logout: number;
  intent: number;
  liveRevision: number;
  liveState: 'ready' | 'changing' | 'signed-out' | 'uncertain';
  inFlight: number;
}
let sessions=$state.raw(new WeakMap<AuthProvider, AuthSession>());
let nextAuthMutationInstanceId=0;
let nextAuthSessionId=0;
export function getLogoutVersion() { return _logoutVersion; }
export function resetLogoutVersion() {
  _logoutVersion=0;
  sessions=new WeakMap<AuthProvider, AuthSession>();
}

function authSession(provider: AuthProvider | null) {
  if(!provider) return { cacheId: 0, observe: () => {}, changed: () => {},
    version: 0, logout: 0, intent: 0, liveRevision: 0, liveState: 'ready' as const, inFlight: 0 };
  const existing=sessions.get(provider);
  if(existing) return existing;
  let update: (() => void) | undefined;
  // A lazily created session may originate inside a derived expression.
  const observe=createSubscriber(notify => { update=notify; return () => { update=undefined; }; });
  const session=$state<AuthSession>({ cacheId: ++nextAuthSessionId, observe, changed: () => update?.(),
    version: 0, logout: 0, intent: 0, liveRevision: 0, liveState: 'ready', inFlight: 0 });
  sessions.set(provider,session);
  return session;
}

function setLiveSession(provider: AuthProvider, state: AuthSession['liveState']) {
  const session=authSession(provider);
  session.liveRevision++;
  session.liveState=state;
  session.changed();
}

function beginLiveSessionChange(provider: AuthProvider, intent: number) {
  const session=authSession(provider);
  session.inFlight++;
  setLiveSession(provider,'changing');
  return () => {
    session.inFlight--;
    session.changed();
    // An older request finishing last leaves the effective remote principal uncertain.
    if(authSession(provider)===session && session.inFlight===0 && session.intent!==intent) {
      setLiveSession(provider,'uncertain');
    }
  };
}

/** Read-only capability snapshot; consumers cannot mutate the underlying auth session. */
export function captureAuthLiveScope(provider: AuthProvider | null) {
  if(!provider) return Object.freeze({ cacheKey: 'anonymous', available: true, isCurrent: () => true });
  const session=authSession(provider);
  session.observe();
  const revision=session.liveRevision;
  const available=session.liveState==='ready' && session.inFlight===0;
  return Object.freeze({
    cacheKey: `auth:${session.cacheId}:${revision}`,
    available,
    isCurrent: () => available && authSession(provider)===session && session.liveRevision===revision &&
      session.liveState==='ready' && session.inFlight===0,
  });
}

function rejectedLiveState(previous: AuthSession['liveState']): AuthSession['liveState'] {
  return previous==='ready' || previous==='signed-out' ? previous : 'uncertain';
}

function advanceAuthSession(provider: AuthProvider, logout: boolean, liveState: AuthSession['liveState']='ready'): number {
  const session=authSession(provider);
  session.version++;
  setLiveSession(provider,logout ? 'signed-out' : liveState);
  if(logout) {
    session.logout++;
    _logoutVersion++;
  }
  return session.version;
}

// ─── Mutate Factory ─────────────────────────────────────────────

interface CreateAuthMutationOptions<M extends AuthMutationMethod> {
  method: M;
  successMessage?: string|null;
  errorMessage?: string|false;
  onSuccess?: (result: AuthActionResult,navigate: (path: string) => Promise<void>) => void|Promise<void>;
}

export interface AuthNotificationOptions {
  /** Set to false when the page owns the success state. */
  successNotification?: string|false;
  errorNotification?: string|false;
}

function resolveSuccessMessage(
  configured: string|false|undefined,
  defaultMessage: string,
): string|null {
  return configured===false? null:configured??defaultMessage;
}

function createAuthMutation<M extends AuthMutationMethod>(options: CreateAuthMutationOptions<M>) {
  const mutationInstanceId=nextAuthMutationInstanceId++;
  const adminContext=captureAdminContext();
  const i18n=useTranslation();
  interface Pending {
    epoch: number;
    provider: AuthProvider | null;
    tenant: string | number | undefined;
    authVersion: number;
    intent: number;
    previousLive: AuthSession['liveState'];
    changedLive: boolean;
  }
  let pending=$state.raw<Pending | null>(null);
  let mutationEpoch=0;
  let disposed=false;

  const activeTenantIdentity=() => adminContext.tenantCacheKey?.__svadminTenant;
  function current(value: Pending): boolean {
    return !disposed && value.epoch === mutationEpoch
      && value.provider === adminContext.authProvider
      && value.tenant === activeTenantIdentity()
      && value.intent === authSession(value.provider).intent
      && value.authVersion === authSession(value.provider).version;
  }

  async function mutate(...[params]: AuthMutationArgs<M>): Promise<AuthActionResult> {
    if(disposed) return authMutationFailure('AUTH_RESULT_SUPERSEDED');
    const provider=adminContext.authProvider;
    const epoch=++mutationEpoch;
    const started: Pending={
      epoch, provider, tenant: activeTenantIdentity(),
      authVersion: authSession(provider).version, intent: authSession(provider).intent,
      previousLive: authSession(provider).liveState, changedLive: false,
    };
    pending=started;
    const router=adminContext.routerProvider;
    const notificationProvider=adminContext.notificationProvider;
    const eventKey=`auth:${mutationInstanceId}:${options.method}:${epoch}`;
    const sendNotification=(notification: Parameters<typeof notifyWithProvider>[0]) => {
      try {
        notifyWithProvider(notification,notificationProvider);
      } catch {
        // A presentation failure cannot change an already completed authentication operation.
      }
    };
    const failure=(code: AuthMutationError['code']) => {
      const result=authMutationFailure(code);
      if(current(started)) {
        if(provider && started.changedLive) {
          setLiveSession(provider,code==='AUTH_REJECTED' ? rejectedLiveState(started.previousLive) : 'uncertain');
        }
        pending=null;
        if(options.errorMessage!==false) {
          sendNotification({
            type: 'error',
            message: typeof options.errorMessage==='string' ? options.errorMessage : i18n.t('common.operationFailed'),
            key: `${eventKey}:error`,
          });
        }
      }
      return result;
    };
    let invoke: () => Promise<unknown>;
    try {
      if(!provider) return failure('AUTH_METHOD_UNAVAILABLE');
      invoke=prepareAuthMutation(provider,options.method,params);
    } catch(err) {
      return failure(err instanceof AuthMutationError ? err.code : 'INVALID_AUTH_INPUT');
    }
    if(!current(started)) return authMutationFailure('AUTH_RESULT_SUPERSEDED');
    let releaseLive: (() => void) | undefined;
    if(provider && options.method!=='forgotPassword') {
      started.intent=++authSession(provider).intent;
      started.changedLive=true;
      releaseLive=beginLiveSessionChange(provider,started.intent);
    }
    let response: unknown;
    try {
      response=await invoke();
    } catch {
      return current(started) ? failure('AUTH_REQUEST_FAILED') : authMutationFailure('AUTH_RESULT_SUPERSEDED');
    } finally {
      releaseLive?.();
    }
    if(!current(started)) return authMutationFailure('AUTH_RESULT_SUPERSEDED');
    let result: AuthActionResult;
    try {
      result=decodeAuthAction(response);
    } catch {
      return failure('INVALID_AUTH_RESULT');
    }
    if(!current(started)) return authMutationFailure('AUTH_RESULT_SUPERSEDED');
    if(!result.success) return failure('AUTH_REJECTED');
    pending=null;
    if(provider && options.method!=='forgotPassword') {
      started.authVersion=advanceAuthSession(provider,options.method==='logout',
        options.method==='login' ? 'ready' : rejectedLiveState(started.previousLive));
    }
    try {
      if(options.successMessage) {
        sendNotification({
          type: 'success', message: options.successMessage, key: `${eventKey}:success`,
        });
      }
      if(current(started) && options.onSuccess) {
        await options.onSuccess(result,async path => {
          await navigateWithProvider(router,path,undefined,
            () => current(started) && router===adminContext.routerProvider);
        });
      }
    } catch {
      // Navigation is a separate side effect; do not report the server write as failed.
    }
    return current(started) ? result : authMutationFailure('AUTH_RESULT_SUPERSEDED');
  }

  if(typeof window!=='undefined') {
    $effect(() => {
      void adminContext.authProvider;
      void activeTenantIdentity();
      return () => { ++mutationEpoch; };
    });
    $effect(() => () => { disposed=true; ++mutationEpoch; });
  }

  return {
    mutate,
    get isLoading() { return pending !== null && current(pending); },
  };
}

// ─── useLogin ─────────────────────────────────────────────────

export function useLogin(opts?: AuthNotificationOptions&{ errorMessage?: string|false }) {
  return createAuthMutation({
    method: 'login',
    successMessage: resolveSuccessMessage(opts?.successNotification,t('common.operationSuccess')),
    errorMessage: opts?.errorNotification??opts?.errorMessage??t('common.loginFailed'),
    onSuccess: async (result,navigate) => { await navigate(result.redirectTo??'/'); }
  });
}

// ─── useLogout ────────────────────────────────────────────────

export function useLogout() {
  const context=captureAdminContext();
  let queryClient: ReturnType<typeof useQueryClient>|undefined;
  try {
    queryClient=useQueryClient();
  } catch {
    // Auth hooks remain usable without TanStack Query; cache clearing is best-effort.
  }
  return createAuthMutation({
    method: 'logout',
    successMessage: null,
    onSuccess: async (result,navigate) => {
      clearAuthQueries(queryClient,context.authProvider);
      await navigate(result.redirectTo??'/login');
    }
  });
}

/** @internal Preserve caches with a proven different authentication owner. */
export function clearAuthQueries(client: ReturnType<typeof useQueryClient> | undefined, provider: AuthProvider | null): void {
  if(!client) return;
  client.getMutationCache().clear();
  const prefix=provider ? `auth:${authSession(provider).cacheId}:` : 'anonymous';
  client.removeQueries({ predicate: query => {
    const params=parseQueryKey(query.queryKey)?.params;
    const tag: unknown=typeof params==='object' && params!==null
      ? Object.getOwnPropertyDescriptor(params,'authSession')?.value : undefined;
    // Untagged caches have no provable session owner and retain conservative logout eviction.
    return typeof tag!=='string' || (provider ? tag.startsWith(prefix) : tag===prefix);
  } });
}

// ─── useRegister ──────────────────────────────────────────────

export function useRegister(opts?: AuthNotificationOptions) {
  return createAuthMutation({
    method: 'register',
    successMessage: resolveSuccessMessage(opts?.successNotification,t('auth.registerSuccess')),
    ...definedOptions({ errorMessage: opts?.errorNotification }),
    onSuccess: async (result,navigate) => {
      if(result.redirectTo) await navigate(result.redirectTo);
    }
  });
}

// ─── useForgotPassword ───────────────────────────────────────

export function useForgotPassword(opts?: AuthNotificationOptions) {
  return createAuthMutation({
    method: 'forgotPassword',
    successMessage: resolveSuccessMessage(opts?.successNotification,t('auth.resetLinkSent')),
    ...definedOptions({ errorMessage: opts?.errorNotification }),
  });
}

// ─── useUpdatePassword ───────────────────────────────────────

export function useUpdatePassword(opts?: AuthNotificationOptions) {
  return createAuthMutation({
    method: 'updatePassword',
    successMessage: resolveSuccessMessage(opts?.successNotification,t('common.operationSuccess')),
    ...definedOptions({ errorMessage: opts?.errorNotification }),
    onSuccess: async (result,navigate) => {
      if(result.redirectTo) await navigate(result.redirectTo);
    }
  });
}

// ─── useUpdateIdentity / useUpdateProfile ────────────────────

export function useUpdateIdentity(opts?: AuthNotificationOptions) {
  return createAuthMutation({
    method: 'updateIdentity',
    successMessage: resolveSuccessMessage(opts?.successNotification,t('common.operationSuccess')),
    ...definedOptions({ errorMessage: opts?.errorNotification }),
    onSuccess: async (result,navigate) => {
      if(result.redirectTo) await navigate(result.redirectTo);
    }
  });
}

export function useUpdateProfile(opts?: AuthNotificationOptions) {
  return createAuthMutation({
    method: 'updateProfile',
    successMessage: resolveSuccessMessage(opts?.successNotification,t('common.operationSuccess')),
    ...definedOptions({ errorMessage: opts?.errorNotification }),
    onSuccess: async (result,navigate) => {
      if(result.redirectTo) await navigate(result.redirectTo);
    }
  });
}

// ─── useGetIdentity ──────────────────────────────────────────

function createAuthQuery<T>(options: {
  empty: T;
  withoutProvider: T;
  request: (provider: AuthProvider) => Promise<unknown>;
  decode: (value: unknown) => T;
  invalidCode: 'INVALID_AUTH_IDENTITY' | 'INVALID_AUTH_CHECK';
  onValidated?: (provider: AuthProvider, data: T, liveRevision: number) => void;
}) {
  const adminContext=captureAdminContext();
  interface Snapshot {
    provider: AuthProvider | null;
    tenant: string | number | undefined;
    logout: number;
    authVersion: number;
    data: T;
    isLoading: boolean;
    error: AuthQueryError | null;
  }
  let snapshot=$state.raw<Snapshot | null>(null);
  let epoch=0;
  let disposed=false;
  let observedProvider=adminContext.authProvider;
  let observedLogoutVersion=authSession(observedProvider).logout;

  function current(value: Snapshot | null): value is Snapshot {
    return !disposed && value !== null
      && value.provider === adminContext.authProvider
      && value.tenant === adminContext.tenantCacheKey?.__svadminTenant
      && value.authVersion === authSession(value.provider).version
      && value.logout === authSession(value.provider).logout;
  }

  async function fetch(): Promise<void> {
    if(disposed) return;
    const provider=adminContext.authProvider;
    const liveRevision=authSession(provider).liveRevision;
    const request=++epoch;
    const started: Snapshot={
      provider, tenant: adminContext.tenantCacheKey?.__svadminTenant,
      logout: authSession(provider).logout, authVersion: authSession(provider).version,
      data: provider ? options.empty : options.withoutProvider,
      isLoading: provider !== null && typeof window !== 'undefined', error: null,
    };
    snapshot=started;
    if(!started.isLoading || !provider) return;
    const fail=(code: AuthQueryError['code']) => {
      if(request !== epoch || !current(started)) return;
      snapshot={ ...started, isLoading: false, error: new AuthQueryError(code) };
    };
    let response: unknown;
    try {
      response=await options.request(provider);
    } catch {
      fail('AUTH_QUERY_FAILED');
      return;
    }
    try {
      const data=options.decode(response);
      if(request !== epoch || !current(started)) return;
      options.onValidated?.(provider,data,liveRevision);
      snapshot={ ...started, data, isLoading: false };
    } catch {
      fail(options.invalidCode);
    }
  }

  if(typeof window!=='undefined') {
    $effect(() => {
      const provider=adminContext.authProvider;
      const tenant=adminContext.tenantCacheKey?.__svadminTenant;
      const logout=authSession(provider).logout;
      const authVersion=authSession(provider).version;
      if(provider===observedProvider && logout!==observedLogoutVersion) {
        observedLogoutVersion=logout;
        ++epoch;
        snapshot={
          provider, tenant, logout, authVersion,
          data: provider ? options.empty : options.withoutProvider, isLoading: false, error: null,
        };
        return;
      }
      observedProvider=provider;
      observedLogoutVersion=logout;
      untrack(() => { void fetch(); });
      return () => { ++epoch; };
    });
    $effect(() => () => { disposed=true; ++epoch; });
  }

  return {
    get data() {
      if(current(snapshot)) return snapshot.data;
      return !disposed && !adminContext.authProvider ? options.withoutProvider : options.empty;
    },
    get isLoading() {
      return current(snapshot) ? snapshot.isLoading
        : !disposed && adminContext.authProvider !== null && typeof window !== 'undefined';
    },
    get error() { return current(snapshot) ? snapshot.error : null; },
    refetch: fetch,
  };
}

export function useGetIdentity() {
  return createAuthQuery<Readonly<Identity> | null>({
    empty: null,
    withoutProvider: null,
    request: provider => {
      const method=provider.getIdentity;
      if(typeof method !== 'function') throw new AuthQueryError('AUTH_QUERY_FAILED');
      return method.call(provider);
    },
    decode: decodeIdentity,
    invalidCode: 'INVALID_AUTH_IDENTITY',
  });
}

// ─── useIsAuthenticated ──────────────────────────────────────

export function useIsAuthenticated() {
  const query=createAuthQuery<Readonly<CheckResult> | null>({
    empty: null,
    withoutProvider: Object.freeze({ authenticated: true }),
    request: provider => {
      const method=provider.check;
      if(typeof method !== 'function') throw new AuthQueryError('AUTH_QUERY_FAILED');
      return method.call(provider);
    },
    decode: decodeAuthCheck,
    invalidCode: 'INVALID_AUTH_CHECK',
    onValidated(provider,data,revision) {
      const session=authSession(provider);
      if(data && session.liveRevision===revision && session.liveState!=='changing' && session.inFlight===0) {
        setLiveSession(provider,data.authenticated ? 'ready' : 'signed-out');
      }
    },
  });

  return {
    get isAuthenticated() { return query.data?.authenticated === true; },
    get isLoading() { return query.isLoading; },
    get data() { return query.data; },
    get error() { return query.error; },
    refetch: query.refetch,
  };
}

// ─── useOnError ──────────────────────────────────────────────

/**
 * Handles errors from data hooks by calling authProvider.onError().
 * If the provider returns { logout: true }, triggers logout flow.
 * If it returns { redirectTo }, navigates there.
 */
export function useOnError() {
  const adminContext=captureAdminContext();
  let queryClient: ReturnType<typeof useQueryClient> | undefined;
  try {
    queryClient=useQueryClient();
  } catch {
    // Standalone auth hooks may not have a query cache.
  }
  let epoch=0;
  let disposed=false;
  $effect(() => {
    void adminContext.authProvider;
    void adminContext.tenantCacheKey?.__svadminTenant;
    return () => { ++epoch; };
  });
  $effect(() => () => { disposed=true; ++epoch; });

  return {
    mutate(error: unknown): Promise<AuthErrorHandlingResult> {
      const request=++epoch;
      return handleAuthError(error,adminContext,
        () => !disposed && request===epoch, () => clearAuthQueries(queryClient,adminContext.authProvider));
    },
  };
}

/** Shared validated delegate for auth hooks and data-hook errors. */
export async function handleAuthError(
  error: unknown,
  adminContext: AdminContextAccessor,
  isActive: () => boolean = () => true,
  onLogout: () => void = () => {},
  origin?: ReturnType<typeof captureAuthLiveScope>,
  isExplicitlyCancelled: () => boolean = () => false,
): Promise<AuthErrorHandlingResult> {
  const provider=adminContext.authProvider;
  const tenant=adminContext.tenantCacheKey?.__svadminTenant;
  const router=adminContext.routerProvider;
  let version=authSession(provider).version;
  let intent=authSession(provider).intent;
  let previousLive: AuthSession['liveState'] | undefined;
  let ownsLogout=false;
  // Once this handler has started its own checked logout, its origin scope may
  // become inactive as the live session transitions, but its caller can still
  // explicitly retire the pending operation.
  const current=() => (isActive() || (ownsLogout && !isExplicitlyCancelled()))
    && (ownsLogout || origin===undefined || origin.isCurrent()) && provider===adminContext.authProvider
    && tenant===adminContext.tenantCacheKey?.__svadminTenant && version===authSession(provider).version
    && intent===authSession(provider).intent
    && router===adminContext.routerProvider;
  const fail=(code: AuthErrorHandlingError['code'], rejected=false): AuthErrorHandlingResult => {
    if(provider && previousLive!==undefined && current()) {
      // A failed data-query logout must not automatically restart the unauthorized read.
      setLiveSession(provider,rejected && origin===undefined ? rejectedLiveState(previousLive) : 'uncertain');
    }
    return { status: 'failed', error: new AuthErrorHandlingError(code) };
  };
  if(!current()) return { status: 'superseded' };
  let response: unknown;
  let invokeLogout: (() => Promise<unknown>) | undefined;
  try {
    const method=provider?.onError;
    if(method===undefined) {
      const descriptor=typeof error==='object' && error!==null
        ? Object.getOwnPropertyDescriptor(error,'statusCode') : undefined;
      const status: unknown=descriptor && 'value' in descriptor ? descriptor.value : undefined;
      if(status!==401) return { status: 'ignored' };
      await navigateWithProvider(router,'/login',undefined,current);
      return { status: current() ? 'handled' : 'superseded' };
    }
    if(typeof method!=='function' || !provider) return fail('AUTH_ERROR_HANDLER_FAILED');
    try {
      invokeLogout=prepareAuthMutation(provider,'logout',undefined);
    } catch {
      // A missing logout method matters only if the validated handler requests logout.
    }
    if(!current()) return { status: 'superseded' };
    response=await method.call(provider,error);
  } catch {
    return current() ? fail('AUTH_ERROR_HANDLER_FAILED') : { status: 'superseded' };
  }
  if(!current()) return { status: 'superseded' };
  let result: ReturnType<typeof decodeAuthErrorResult>;
  try {
    result=decodeAuthErrorResult(response);
  } catch {
    return fail('INVALID_AUTH_ERROR_RESULT');
  }
  if(!current()) return { status: 'superseded' };
  if(result.logout) {
    if(!invokeLogout || !provider) return fail('AUTH_LOGOUT_FAILED');
    previousLive=authSession(provider).liveState;
    // The checked origin hands ownership to this delegate's own logout intent.
    ownsLogout=true;
    intent=++authSession(provider).intent;
    const releaseLive=beginLiveSessionChange(provider,intent);
    let logout: unknown;
    try {
      logout=await invokeLogout();
    } catch {
      return current() ? fail('AUTH_LOGOUT_FAILED') : { status: 'superseded' };
    } finally {
      releaseLive();
    }
    if(!current()) return { status: 'superseded' };
    try {
      if(!decodeAuthAction(logout).success) return fail('AUTH_LOGOUT_FAILED',true);
    } catch {
      return fail('AUTH_LOGOUT_FAILED');
    }
    if(!current()) return { status: 'superseded' };
    version=advanceAuthSession(provider,true);
    try {
      onLogout();
    } catch {
      // A cache observer cannot undo a confirmed server logout.
    }
  }
  const redirect=result.redirectTo ?? (result.logout ? '/login' : undefined);
  if(redirect!==undefined) {
    try {
      await navigateWithProvider(router,redirect,undefined,current);
    } catch {
      return current() ? fail('AUTH_ERROR_HANDLER_FAILED') : { status: 'superseded' };
    }
  }
  return { status: current() ? 'handled' : 'superseded' };
}

// ─── usePermissions ──────────────────────────────────────────

/**
 * Fetches UI-only hints from authProvider.getPermissions().
 * Returns a reactive UI helper with convenience methods for permission checks.
 * The result can change labels, navigation, and disabled controls, but it runs
 * in the browser and never authorizes API, RLS, or action requests. Those
 * requests must be independently authenticated and authorized by the backend.
 *
 * Supports `refetch()` for session-level permission refresh (e.g., after role change).
 *
 * @example
 * ```svelte
 * <script>
 *   import { usePermissions } from '@svadmin/core';
 *   const perms = usePermissions();
 *   const canAdmin = $derived(perms.has('admin'));
 * </script>
 * ```
 */
export function usePermissions() {
  const adminContext=captureAdminContext();
  interface Snapshot {
    provider: AuthProvider | null;
    tenant: string | number | undefined;
    logout: number;
    authVersion: number;
    hints: PermissionHints;
    isLoading: boolean;
    error: PermissionHintsError | null;
  }
  let snapshot=$state.raw<Snapshot | null>(null);
  let epoch=0;
  let disposed=false;
  let observedProvider=adminContext.authProvider;
  let observedLogoutVersion=authSession(observedProvider).logout;
  let version=$state(0);

  function current(value: Snapshot | null): value is Snapshot {
    return !disposed && value !== null
      && value.provider === adminContext.authProvider
      && value.tenant === adminContext.tenantCacheKey?.__svadminTenant
      && value.authVersion === authSession(value.provider).version
      && value.logout === authSession(value.provider).logout;
  }

  async function fetch(): Promise<void> {
    if(disposed) return;
    const provider=adminContext.authProvider;
    const request=++epoch;
    const started: Snapshot={
      provider, tenant: adminContext.tenantCacheKey?.__svadminTenant,
      logout: authSession(provider).logout, authVersion: authSession(provider).version,
      hints: null, isLoading: true, error: null,
    };
    snapshot=started;
    const fail=(code: PermissionHintsError['code']) => {
      if(request!==epoch || !current(started)) return;
      snapshot={ ...started, isLoading: false, error: new PermissionHintsError(code) };
    };
    let response: unknown;
    try {
      const getPermissions=provider?.getPermissions;
      if(getPermissions===undefined) {
        snapshot={ ...started, isLoading: false };
        return;
      }
      if(typeof getPermissions!=='function') {
        fail('PERMISSION_HINTS_FAILED');
        return;
      }
      response=await getPermissions.call(provider);
    } catch {
      fail('PERMISSION_HINTS_FAILED');
      return;
    }
    try {
      const hints=decodePermissionHints(response);
      if(request!==epoch || !current(started)) return;
      snapshot={ ...started, hints, isLoading: false };
      version++;
    } catch {
      fail('INVALID_PERMISSION_HINTS');
    }
  }

  $effect(() => {
    const provider=adminContext.authProvider;
    const tenant=adminContext.tenantCacheKey?.__svadminTenant;
    const logout=authSession(provider).logout;
    const authVersion=authSession(provider).version;
    if(provider===observedProvider && logout!==observedLogoutVersion) {
      observedLogoutVersion=logout;
      ++epoch;
      snapshot={ provider, tenant, logout, authVersion, hints: null, isLoading: false, error: null };
      return;
    }
    observedProvider=provider;
    observedLogoutVersion=logout;
    untrack(() => { void fetch(); });
    return () => { ++epoch; };
  });
  $effect(() => () => { disposed=true; ++epoch; });

  const raw=(): PermissionHints => current(snapshot) ? snapshot.hints : null;
  const hasFn=(permission: string): boolean => hasPermissionHint(raw(),permission);

  return {
    get isLoading() { return current(snapshot) ? snapshot.isLoading : !disposed && typeof window!=='undefined'; },
    get error() { return current(snapshot) ? snapshot.error : null; },
    get version() { return version; },
    get raw() { return raw(); },
    refetch: fetch,

    /** Check if a specific permission string exists */
    has: hasFn,

    /** Check resource:action style permission */
    can: (resource: string,action: string): boolean => hasFn(`${resource}:${action}`),
  };
}
