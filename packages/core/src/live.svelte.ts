import { definedOptions } from './defined-options';
// LiveProvider — Real-time subscription interface + hooks

import { useQueryClient } from '@tanstack/svelte-query';
import { captureAdminContext } from './context.svelte';
import { createCheckedLiveSubscription } from './live-subscription.svelte';
import type { ResourceContract } from './resource-contract';
import { snapshotLiveEvent } from './live-transport';
import { HttpError } from './types';
import { captureAuthLiveScope } from './auth-hooks.svelte';
import type { LiveEvent } from './live-transport';
export type { LiveEvent } from './live-transport';

// ─── Types ──────────────────────────────────────────────────────

export type LiveMode='auto'|'manual'|'off';

export interface LiveProvider {
  subscribe(params: { resource: string; liveParams?: Record<string,unknown>; callback: (event: LiveEvent) => void }): () => void;
  unsubscribe?(params: { resource: string; liveParams?: Record<string,unknown> }): void;
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
  liveProvider: LiveProvider|(() => LiveProvider),
  resource: string|(() => string),
  options?: { liveMode?: LiveMode|(() => LiveMode); onLiveEvent?: (event: LiveEvent) => void; liveParams?: Record<string,unknown>|(() => Record<string,unknown>); dataProviderName?: string; contract?: ResourceContract }
): void {
  const queryClient=useQueryClient();
  createCheckedLiveSubscription(() => ({
    resource: typeof resource==='function'? resource():resource,
    liveProvider: typeof liveProvider==='function'? liveProvider():liveProvider,
    liveMode: typeof options?.liveMode==='function'? options.liveMode() : options?.liveMode === undefined ? 'auto' : options.liveMode,
    ...definedOptions({
      liveParams: typeof options?.liveParams==='function'? options.liveParams():options?.liveParams,
      onLiveEvent: options?.onLiveEvent, dataProviderName: options?.dataProviderName, contract: options?.contract,
    }),
  }),queryClient);
}

// ─── useSubscription — manual channel subscription ──────────────

interface UseSubscriptionOptions {
  resource: string|(() => string);
  liveProvider: LiveProvider|(() => LiveProvider);
  onLiveEvent: (event: LiveEvent) => void;
  enabled?: boolean|(() => boolean);
  liveParams?: Record<string,unknown>|(() => Record<string,unknown>);
}

export function useSubscription(options: UseSubscriptionOptions): void {
  createCheckedLiveSubscription(() => ({
    resource: typeof options.resource==='function'? options.resource():options.resource,
    liveProvider: typeof options.liveProvider==='function'? options.liveProvider():options.liveProvider,
    liveMode: 'manual', onLiveEvent: options.onLiveEvent,
    ...definedOptions({
      enabled: typeof options.enabled==='function'? options.enabled():options.enabled,
      liveParams: typeof options.liveParams==='function'? options.liveParams():options.liveParams,
    }),
  }));
}

// ─── usePublish — publish custom events ─────────────────────────

/** Await publication failures; successful invocation is not a remote delivery receipt. */
export function usePublish(liveProvider: LiveProvider | (() => LiveProvider)) {
  const context = captureAdminContext();
  let mounted = true;
  $effect(() => () => { mounted = false; });
  return async (event: LiveEvent): Promise<void> => {
    const checked = snapshotLiveEvent(event);
    if (!checked) throw new HttpError('Invalid live event', 422, undefined, { code: 'INVALID_LIVE_EVENT' });
    let dispatched = false;
    try {
      const provider = typeof liveProvider === 'function' ? liveProvider() : liveProvider;
      const publish = provider.publish;
      const auth = context.authProvider;
      const authScope = captureAuthLiveScope(auth);
      const router = context.routerProvider;
      const tenant = context.tenantCacheKey?.__svadminTenant;
      const current = () => mounted && (typeof liveProvider === 'function' ? liveProvider() : liveProvider) === provider &&
        context.authProvider === auth && authScope.available && authScope.isCurrent() &&
        context.routerProvider === router && context.tenantCacheKey?.__svadminTenant === tenant;
      if (!current()) throw new Error();
      if (typeof publish !== 'function') throw new Error();
      dispatched = true;
      const result: unknown = publish.call(provider, checked);
      await result;
      if (!current()) throw new Error();
    } catch {
      throw new HttpError('Live publication failed', 502, undefined, {
        code: 'LIVE_PUBLISH_FAILED', details: { writeMayHaveSucceeded: dispatched },
      });
    }
  };
}
