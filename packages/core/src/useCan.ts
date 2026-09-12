// useCan — reactive permission check hook with TanStack Query integration

import { hashKey, useQueryClient, type QueryClient } from '@tanstack/svelte-query';
import { onDestroy } from 'svelte';
import { definedOptions } from './defined-options';
import { captureAdminContext } from './context.svelte';
import type { Action, CanParams, CanResult } from './permissions.svelte';
import { accessControlSource, snapshotCanParams, decodeCanResult, prepareCanCheck } from './access-control-contract';
import { createSessionQuery } from './session-query.svelte';
import { supersededQuerySession } from './query-session.svelte';
import { HttpError } from './types';
import { captureAuthLiveScope } from './auth-hooks.svelte';

interface AccessQueryOwner {
  readonly key: string;
  readonly current: () => boolean;
  readonly execute: () => Promise<CanResult>;
}
const accessQueryOwners = new WeakMap<QueryClient, Set<AccessQueryOwner>>();

export interface UseCanOptions {
  resource: string;
  action: Action;
  /** Fixed record target; overrides an ID in additional permission params after validation. */
  id?: string | number;
  params?: NonNullable<CanParams['params']>;
  meta?: Record<string,unknown>;
  queryOptions?: {
    enabled?: boolean;
    staleTime?: number;
  };
}

export interface UseCanResult {
  readonly allowed: boolean;
  readonly reason: string|undefined;
  readonly isLoading: boolean;
}

/**
 * Reactive permission check backed by TanStack Query for caching and deduplication.
 * Accepts a getter function for Svelte 5 fine-grained reactivity.
 *
 * @example
 * ```ts
 * const can = useCan(() => ({ resource: 'posts', action: 'delete', params: { id: 1 } }));
 * if (can.allowed) { ... }
 * ```
 */
export function useCan(options: () => UseCanOptions): UseCanResult {
  const adminContext=captureAdminContext();
  const client = useQueryClient();
  const peers = accessQueryOwners.get(client) ?? new Set<AccessQueryOwner>();
  accessQueryOwners.set(client, peers);
  let disposed = false;
  let release = () => {};
  onDestroy(() => { disposed = true; release(); });

  function captureTarget() {
    const opts=options();
    const provider=adminContext.accessControlProvider;
    const { enabled = true, staleTime = 5 * 60 * 1000 } = opts.queryOptions ?? {};
    if (typeof enabled !== 'boolean' || typeof staleTime !== 'number' || Number.isNaN(staleTime) || staleTime < 0) {
      throw new HttpError('Invalid access control query settings', 422, undefined, { code: 'INVALID_ACCESS_CONTROL_INPUT' });
    }
    const explicit=snapshotCanParams(definedOptions({
      resource: opts.resource, action: opts.action, params: opts.params, meta: opts.meta,
    }));
    const params=snapshotCanParams({
      ...explicit,
      ...definedOptions({
        params: opts.id === undefined ? explicit.params : { ...explicit.params, id: opts.id },
        meta: adminContext.getProviderMeta(opts.resource, explicit.meta),
      }),
    });
    return {
      resource: params.resource, params, provider, enabled, staleTime,
      queryKey: adminContext.queryKeys(opts.resource).access.can(opts.resource,{
        ...params,
        source: accessControlSource(provider),
      }),
    };
  }

  const query=createSessionQuery<CanResult>(adminContext, () => {
    const target = captureTarget();
    const signature = hashKey(target.queryKey);
    const authProvider = adminContext.authProvider;
    const auth = captureAuthLiveScope(authProvider);
    const key = hashKey([target.queryKey, auth.cacheKey]);
    const execute = prepareCanCheck(target.provider, target.params);
    const owner: AccessQueryOwner = {
      key, execute,
      current() {
        if (disposed || adminContext.authProvider !== authProvider || !auth.isCurrent()) return false;
        try {
          const current = captureTarget();
          return current.enabled && current.provider === target.provider && hashKey(current.queryKey) === signature;
        } catch {
          return false;
        }
      },
    };
    release();
    if (!disposed) peers.add(owner);
    release = () => { peers.delete(owner); };
    return {
      resource: target.resource, queryKey: target.queryKey,
      successNotification: false, errorNotification: false,
      isTargetCurrent: () => !disposed && options().queryOptions?.enabled !== false,
      queryFn: async () => {
        // Native cache refreshes may retain an unmounted peer's query function.
        for (const peer of peers) {
          if (peer.key === key && peer.current()) return peer.execute();
        }
        throw supersededQuerySession();
      },
      decode: decodeCanResult,
      enabled: target.enabled, staleTime: target.staleTime,
    };
  });

  return Object.freeze({
    get allowed() {
      const auth = captureAuthLiveScope(adminContext.authProvider);
      if (adminContext.accessControlProvider === null) return query.isEnabled && auth.isCurrent();
      if (!auth.isCurrent()) return false;
      return query.isEnabled && query.isSuccess && query.data?.can === true;
    },
    get reason() { return query.isEnabled && query.isSuccess ? query.data?.reason : undefined; },
    get isLoading() { return adminContext.accessControlProvider !== null && query.isLoading; },
  });
}
