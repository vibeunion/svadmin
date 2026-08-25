// Hook Utilities — shared reactive helpers for all hooks
// Uses Svelte 5 runes ($state, $effect) for automatic lifecycle management

import { useQueryClient } from '@tanstack/svelte-query';
import type { LiveProvider, LiveEvent, LiveMode } from './live.svelte';
import { captureAdminContext } from './context.svelte';
import type { AdminContextAccessor } from './context.svelte';
import { dataQueryMatches } from './query-keys';
import { notifyWithProvider } from './notification.svelte';
import type { NotificationProvider } from './types';

// ─── Auth Error Delegate ────────────────────────────────────────
// Delegate auth errors to authProvider.onError() — refine pattern

export async function checkError(
  error: unknown,
  adminContext: AdminContextAccessor = captureAdminContext(),
): Promise<void> {
  try {
    const authProvider = adminContext.authProvider;
    if (authProvider?.onError) {
      const result = await authProvider.onError(error);
      if (!result) return;
      if (result.logout) {
        await authProvider.logout?.();
        await adminContext.navigate(result.redirectTo ?? '/login');
      } else if (result.redirectTo) {
        await adminContext.navigate(result.redirectTo);
      }
      return;
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const status = (error as { statusCode: number }).statusCode;
      if (status === 401) {
        await adminContext.navigate('/login');
      }
    }
  } catch { /* auth check failed silently */ }
}

// ─── Overtime Tracker ───────────────────────────────────────────
// Tracks elapsed time during loading, auto-cleans via $effect

export interface OvertimeOptions {
  interval?: number; // ms, default 1000
  onInterval?: (elapsedTime: number) => void;
}

export interface OvertimeResult {
  readonly elapsedTime: number;
}

export function createOvertimeTracker(
  isLoadingFn: () => boolean,
  options: OvertimeOptions = {},
): OvertimeResult {
  const { interval = 1000, onInterval } = options;
  let elapsedTime = $state(0);

  $effect(() => {
    if (isLoadingFn()) {
      elapsedTime = 0;
      const timer = setInterval(() => {
        elapsedTime += interval;
        onInterval?.(elapsedTime);
      }, interval);
      return () => clearInterval(timer);
    } else {
      elapsedTime = 0;
    }
  });

  return {
    get elapsedTime() { return elapsedTime; },
  };
}

// ─── Live Subscription ──────────────────────────────────────────
// Auto-subscribes to realtime events, invalidates queries on 'auto' mode

export interface LiveSubscriptionParams {
  resource: string;
  liveProvider?: LiveProvider;
  liveMode?: LiveMode;
  onLiveEvent?: (event: LiveEvent) => void;
  liveParams?: Record<string, unknown>;
  enabled?: boolean;
  dataProviderName?: string;
}

export function createLiveSubscription(paramsFn: () => LiveSubscriptionParams): void {
  const queryClient = useQueryClient();
  const adminContext = captureAdminContext();

  $effect(() => {
    const params = paramsFn();
    const liveProvider = params.liveProvider;
    const liveMode = params.liveMode ?? 'off';
    const enabled = params.enabled ?? true;

    if (!liveProvider || liveMode === 'off' || !enabled) return;

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = liveProvider.subscribe({
        resource: params.resource,
        liveParams: params.liveParams,
        callback: (event: LiveEvent) => {
          params.onLiveEvent?.(event);
          if (liveMode === 'auto') {
            const matcher = adminContext.queryKeyMatcher(params.resource, params.dataProviderName);
            queryClient.invalidateQueries({
              predicate: (q) => dataQueryMatches(q.queryKey, { ...matcher, resource: params.resource }),
            });
          }
        },
      });
    } catch (e) {
      console.warn('[svadmin] LiveProvider.subscribe failed:', e);
      return;
    }
    return unsubscribe;
  });
}

// ─── Notification Helpers ───────────────────────────────────────

export type NotificationConfig =
  | string
  | false
  | ((data?: unknown, values?: unknown, resource?: string) => {
      message: string;
      description?: string;
      type?: 'success' | 'error';
      key?: string;
    })
  | undefined;

export interface SuccessNotificationRequest {
  config: NotificationConfig;
  defaultMessage: string;
  data?: unknown;
  values?: unknown;
  resource?: string;
  provider?: NotificationProvider | null;
}

export interface ErrorNotificationRequest {
  config: NotificationConfig;
  defaultMessage: string;
  error?: unknown;
  resource?: string;
  provider?: NotificationProvider | null;
}

export function fireSuccessNotification(request: SuccessNotificationRequest): void {
  const { config, defaultMessage, data, values, resource, provider } = request;
  if (config === false) return;
  if (!config && !defaultMessage) return;
  if (typeof config === 'function') {
    const result = config(data, values, resource);
    notifyWithProvider({
      type: 'success',
      message: result.message,
      description: result.description,
      key: result.key,
    }, provider);
    return;
  }
  notifyWithProvider({ type: 'success', message: config || defaultMessage }, provider);
}

export function fireErrorNotification(request: ErrorNotificationRequest): void {
  const { config, defaultMessage, error, resource, provider } = request;
  if (config === false) return;
  if (!config && !defaultMessage) return;
  if (typeof config === 'function') {
    const result = config(error, undefined, resource);
    notifyWithProvider({
      type: 'error',
      message: result.message,
      description: result.description,
      key: result.key,
    }, provider);
    return;
  }
  const errMsg = error instanceof Error ? error.message : String(error ?? '');
  notifyWithProvider({ type: 'error', message: config || `${defaultMessage}${errMsg ? ': ' + errMsg : ''}` }, provider);
}
