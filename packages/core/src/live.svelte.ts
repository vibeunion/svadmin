// LiveProvider — Real-time subscription interface + hooks

import { useQueryClient } from '@tanstack/svelte-query';
import { captureAdminContext } from './context.svelte';
import { dataQueryMatches } from './query-keys';

// ─── Types ──────────────────────────────────────────────────────

export type LiveMode = 'auto' | 'manual' | 'off';

export interface LiveEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  resource: string;
  payload: Record<string, unknown>;
}

export interface LiveProvider {
  subscribe(params: { resource: string; liveParams?: Record<string, unknown>; callback: (event: LiveEvent) => void }): () => void;
  unsubscribe?(params: { resource: string; liveParams?: Record<string, unknown> }): void;
  publish?(event: LiveEvent): void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export interface LiveProviderReconnectOptions {
  enabled?: boolean;
  retryCount?: number;
  retryInterval?: number;
}

// ─── useLive — auto-invalidate queries on real-time events ──────

export function useLive(
  liveProvider: LiveProvider | (() => LiveProvider),
  resource: string | (() => string),
  options?: { liveMode?: LiveMode | (() => LiveMode); onLiveEvent?: (event: LiveEvent) => void; liveParams?: Record<string, unknown> | (() => Record<string, unknown>); dataProviderName?: string }
): void {
  const queryClient = useQueryClient();
  const adminContext = captureAdminContext();

  $effect(() => {
    const lp = typeof liveProvider === 'function' ? liveProvider() : liveProvider;
    const res = typeof resource === 'function' ? resource() : resource;
    const liveMode = typeof options?.liveMode === 'function' ? options.liveMode() : (options?.liveMode ?? 'auto');
    const liveParams = typeof options?.liveParams === 'function' ? options.liveParams() : options?.liveParams;
    if (liveMode === 'off') return;

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = lp.subscribe({
        resource: res,
        liveParams,
        callback: (event) => {
          options?.onLiveEvent?.(event);
          if (liveMode === 'auto') {
            const matcher = adminContext.queryKeyMatcher(res, options?.dataProviderName);
            queryClient.invalidateQueries({
              predicate: (q) => dataQueryMatches(q.queryKey, { ...matcher, resource: res }),
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

// ─── useSubscription — manual channel subscription ──────────────

interface UseSubscriptionOptions {
  resource: string | (() => string);
  liveProvider: LiveProvider | (() => LiveProvider);
  onLiveEvent: (event: LiveEvent) => void;
  enabled?: boolean | (() => boolean);
  liveParams?: Record<string, unknown> | (() => Record<string, unknown>);
}

export function useSubscription(options: UseSubscriptionOptions): void {
  $effect(() => {
    const res = typeof options.resource === 'function' ? options.resource() : options.resource;
    const lp = typeof options.liveProvider === 'function' ? options.liveProvider() : options.liveProvider;
    const enabled = typeof options.enabled === 'function' ? options.enabled() : (options.enabled ?? true);
    const liveParams = typeof options.liveParams === 'function' ? options.liveParams() : options.liveParams;
    if (!enabled) return;

    const unsubscribe = lp.subscribe({
      resource: res,
      liveParams,
      callback: options.onLiveEvent,
    });
    return unsubscribe;
  });
}

// ─── usePublish — publish custom events ─────────────────────────

export function usePublish(liveProvider: LiveProvider) {
  return (event: LiveEvent) => {
    if (liveProvider.publish) {
      liveProvider.publish(event);
    } else {
      console.warn('[svadmin] LiveProvider.publish() not implemented');
    }
  };
}
