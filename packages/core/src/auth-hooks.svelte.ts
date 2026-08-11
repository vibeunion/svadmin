// Auth Hooks — reactive wrappers around AuthProvider methods
// Each hook encapsulates the auth call + loading state + error handling + redirect
// Uses module-level $state — no component init-time constraints.

import { captureAdminContext } from './context.svelte';
import type { AdminContextAccessor } from './context.svelte';
import { notifyWithProvider } from './notification.svelte';
import { t, useTranslation } from './i18n.svelte';
import type { AuthActionResult, CheckResult, Identity, AuthProvider } from './types';
import { useQueryClient } from '@tanstack/svelte-query';

let _logoutVersion = $state(0);
export function getLogoutVersion() { return _logoutVersion; }
export function resetLogoutVersion() { _logoutVersion = 0; }

// ─── Mutate Factory ─────────────────────────────────────────────

interface CreateAuthMutationOptions {
  method: keyof AuthProvider;
  successMessage?: string | null;
  errorMessage?: string | false;
  onSuccess?: (result: AuthActionResult, adminContext: AdminContextAccessor) => void | Promise<void>;
}

function createAuthMutation(options: CreateAuthMutationOptions) {
  const adminContext = captureAdminContext();
  const i18n = useTranslation();
  let isLoading = $state(false);
  let mutationEpoch = 0;

  const activeTenantIdentity = () => adminContext.tenantCacheKey?.__svadminTenant;
  let observedProvider = adminContext.authProvider;
  let observedTenantIdentity = activeTenantIdentity();

  function isActiveMutation(
    epoch: number,
    provider: AuthProvider,
    tenantIdentity: string | number | undefined,
  ): boolean {
    return epoch === mutationEpoch
      && provider === adminContext.authProvider
      && tenantIdentity === activeTenantIdentity();
  }

  async function mutate(params?: Record<string, unknown>): Promise<AuthActionResult> {
    const provider = adminContext.authProvider;
    if (!provider) throw new Error('AuthProvider not configured');
    const fn = provider[options.method] as ((params?: Record<string, unknown>) => Promise<AuthActionResult>) | undefined;
    if (!fn) throw new Error(`AuthProvider.${options.method} not implemented`);

    const epoch = ++mutationEpoch;
    const tenantIdentity = activeTenantIdentity();
    const notificationProvider = adminContext.notificationProvider;
    const sendNotification = (notification: Parameters<typeof notifyWithProvider>[0]) =>
      notifyWithProvider(notification, notificationProvider);
    isLoading = true;
    try {
      const result = await fn.call(provider, params);
      if (!isActiveMutation(epoch, provider, tenantIdentity)) return result;
      if (result.success) {
        if (options.successMessage) sendNotification({ type: 'success', message: options.successMessage });
        if (options.onSuccess) await options.onSuccess(result, adminContext);
      } else {
        const msg = result.error?.message ?? (typeof options.errorMessage === 'string' ? options.errorMessage : i18n.t('common.operationFailed'));
        if (options.errorMessage !== false) sendNotification({ type: 'error', message: msg });
      }
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : (typeof options.errorMessage === 'string' ? options.errorMessage : i18n.t('common.operationFailed'));
      if (isActiveMutation(epoch, provider, tenantIdentity) && options.errorMessage !== false) {
        sendNotification({ type: 'error', message: msg });
      }
      return { success: false, error: { message: msg } };
    } finally {
      if (isActiveMutation(epoch, provider, tenantIdentity)) isLoading = false;
    }
  }

  if (typeof window !== 'undefined') {
    $effect(() => {
      const provider = adminContext.authProvider;
      const tenantIdentity = activeTenantIdentity();
      if (provider !== observedProvider || tenantIdentity !== observedTenantIdentity) {
        observedProvider = provider;
        observedTenantIdentity = tenantIdentity;
        mutationEpoch++;
        isLoading = false;
      }
      return () => {
        mutationEpoch++;
      };
    });
  }

  return {
    mutate,
    get isLoading() { return isLoading; },
  };
}

// ─── useLogin ─────────────────────────────────────────────────

export function useLogin(opts?: { errorMessage?: string | false }) {
  return createAuthMutation({
    method: 'login',
    successMessage: t('common.operationSuccess'),
    errorMessage: opts?.errorMessage ?? t('common.loginFailed'),
    onSuccess: async (result, adminContext) => { await adminContext.navigate(result.redirectTo ?? '/'); }
  });
}

// ─── useLogout ────────────────────────────────────────────────

export function useLogout() {
  let queryClient: ReturnType<typeof useQueryClient> | undefined;
  try {
    queryClient = useQueryClient();
  } catch {
    // Auth hooks remain usable without TanStack Query; cache clearing is best-effort.
  }
  return createAuthMutation({
    method: 'logout',
    successMessage: null,
    onSuccess: async (result, adminContext) => {
      _logoutVersion++;
      queryClient?.clear();
      await adminContext.navigate(result.redirectTo ?? '/login');
    }
  });
}

// ─── useRegister ──────────────────────────────────────────────

export function useRegister() {
  return createAuthMutation({
    method: 'register',
    successMessage: t('auth.registerSuccess'),
    onSuccess: async (result, adminContext) => {
      if (result.redirectTo) await adminContext.navigate(result.redirectTo);
    }
  });
}

// ─── useForgotPassword ───────────────────────────────────────

export function useForgotPassword() {
  return createAuthMutation({
    method: 'forgotPassword',
    successMessage: t('auth.resetLinkSent')
  });
}

// ─── useUpdatePassword ───────────────────────────────────────

export function useUpdatePassword() {
  return createAuthMutation({
    method: 'updatePassword',
    successMessage: t('common.operationSuccess'),
    onSuccess: async (result, adminContext) => {
      if (result.redirectTo) await adminContext.navigate(result.redirectTo);
    }
  });
}

// ─── useUpdateIdentity / useUpdateProfile ────────────────────

export function useUpdateIdentity() {
  return createAuthMutation({
    method: 'updateIdentity',
    successMessage: t('common.operationSuccess'),
    onSuccess: async (result, adminContext) => {
      if (result.redirectTo) await adminContext.navigate(result.redirectTo);
    }
  });
}

export function useUpdateProfile() {
  return createAuthMutation({
    method: 'updateProfile',
    successMessage: t('common.operationSuccess'),
    onSuccess: async (result, adminContext) => {
      if (result.redirectTo) await adminContext.navigate(result.redirectTo);
    }
  });
}

// ─── useGetIdentity ──────────────────────────────────────────

export function useGetIdentity() {
  const adminContext = captureAdminContext();
  let data = $state<Identity | null>(null);
  let isLoading = $state(true);
  let error = $state<Error | null>(null);
  let requestEpoch = 0;
  let observedLogoutVersion = _logoutVersion;

  function requestIdentity(provider: AuthProvider | null): void {
    const epoch = ++requestEpoch;
    error = null;
    if (!provider) {
      data = null;
      isLoading = false;
      return;
    }
    isLoading = true;
    provider.getIdentity().then(identity => {
      if (epoch !== requestEpoch) return;
      data = identity;
      isLoading = false;
    }).catch(err => {
      if (epoch !== requestEpoch) return;
      error = err instanceof Error ? err : new Error(String(err));
      isLoading = false;
      console.warn('[svadmin] useGetIdentity failed:', err);
    });
  }

  function refetchIdentity(): void {
    requestIdentity(adminContext.authProvider);
  }

  function loadScopedIdentity(provider: AuthProvider | null): void {
    data = null;
    requestIdentity(provider);
  }

  if (typeof window !== 'undefined') {
    $effect(() => {
      const provider = adminContext.authProvider;
      void adminContext.tenantCacheKey?.__svadminTenant;
      const logoutVersion = _logoutVersion;
      if (logoutVersion !== observedLogoutVersion) {
        observedLogoutVersion = logoutVersion;
        requestEpoch++;
        data = null;
        error = null;
        isLoading = false;
        return;
      }

      loadScopedIdentity(provider);
      return () => {
        requestEpoch++;
      };
    });
  }

  return {
    get data() { return data; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    refetch: refetchIdentity,
  };
}

// ─── useIsAuthenticated ──────────────────────────────────────

export function useIsAuthenticated() {
  const adminContext = captureAdminContext();
  let isAuthenticated = $state(false);
  let isLoading = $state(true);
  let checkResult = $state<CheckResult | null>(null);

  function check() {
    const provider = adminContext.authProvider;
    if (!provider) {
      isAuthenticated = true;
      isLoading = false;
      return;
    }
    if (typeof window === 'undefined') {
      // In SSR we assume false to prevent hydration mismatch before check
      isAuthenticated = false;
      isLoading = false;
      return;
    }
    isLoading = true;
    provider.check().then((result: CheckResult) => {
      isAuthenticated = result.authenticated;
      checkResult = result;
      isLoading = false;
    }).catch(() => {
      isAuthenticated = false;
      checkResult = { authenticated: false };
      isLoading = false;
    });
  }

  // Initial check
  check();

  if (typeof window !== 'undefined') {
    $effect(() => {
      void _logoutVersion;
      isAuthenticated = false;
    });
  }

  return {
    get isAuthenticated() { return isAuthenticated; },
    get isLoading() { return isLoading; },
    get data() { return checkResult; },
    refetch: check,
  };
}

// ─── useOnError ──────────────────────────────────────────────

/**
 * Handles errors from data hooks by calling authProvider.onError().
 * If the provider returns { logout: true }, triggers logout flow.
 * If it returns { redirectTo }, navigates there.
 */
export function useOnError() {
  const adminContext = captureAdminContext();

  async function mutate(error: unknown) {
    const provider = adminContext.authProvider;
    if (!provider?.onError) {
      console.warn('[svadmin] useOnError: authProvider.onError not implemented');
      return;
    }
    try {
      const result = await provider.onError(error);
      if (result.logout) {
        await provider.logout?.();
        await adminContext.navigate(result.redirectTo ?? '/login');
      } else if (result.redirectTo) {
        await adminContext.navigate(result.redirectTo);
      }
    } catch (err) {
      console.warn('[svadmin] useOnError failed:', err);
    }
  }

  return { mutate };
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
export function usePermissions<T = unknown>() {
  const adminContext = captureAdminContext();
  let permissions = $state<T | null>(null);
  let isLoading = $state(true);
  let error = $state<Error | null>(null);
  let version = $state(0);

  function fetch() {
    const provider = adminContext.authProvider;
    if (!provider?.getPermissions) { isLoading = false; return; }
    isLoading = true;
    error = null;
    provider.getPermissions().then(p => {
      permissions = p as T;
      version++;
      isLoading = false;
    }).catch(err => {
      error = err instanceof Error ? err : new Error(String(err));
      isLoading = false;
      console.warn('[svadmin] usePermissions failed:', err);
    });
  }

  if (typeof window !== 'undefined') {
    fetch();
  }

  const hasFn = (perm: string): boolean => {
    if (!permissions) return false;
    if (Array.isArray(permissions)) return permissions.includes(perm);
    if (permissions instanceof Set) return (permissions as Set<string>).has(perm);
    if (typeof permissions === 'object') return !!(permissions as Record<string, boolean>)[perm];
    return false;
  };

  return {
    get isLoading() { return isLoading; },
    get error() { return error; },
    get version() { return version; },
    get raw() { return permissions; },
    refetch: fetch,

    /** Check if a specific permission string exists */
    has: hasFn,

    /** Check resource:action style permission */
    can: (resource: string, action: string): boolean => hasFn(`${resource}:${action}`),
  };
}
