// useCan — reactive permission check hook with TanStack Query integration

import { createQuery } from '@tanstack/svelte-query';
import { captureAdminContext } from './context.svelte';
import type { Action, CanResult } from './permissions.svelte';

export interface UseCanOptions {
  resource: string;
  action: Action;
  params?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  queryOptions?: {
    enabled?: boolean;
    staleTime?: number;
  };
}

export interface UseCanResult {
  readonly allowed: boolean;
  readonly reason: string | undefined;
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
  const adminContext = captureAdminContext();
  const query = createQuery<CanResult>(() => {
    const opts = options();
    const provider = adminContext.accessControlProvider;
    return {
      queryKey: adminContext.queryKeys(opts.resource).access.can(opts.resource, {
        action: opts.action,
        params: opts.params,
        meta: opts.meta,
      }),
      queryFn: async () => {
        if (!provider) return { can: true };
        const result = await provider.can({
          resource: opts.resource,
          action: opts.action,
          params: opts.params,
          meta: adminContext.getProviderMeta(opts.resource, opts.meta),
        });
        return Array.isArray(result) ? (result[0] ?? { can: false }) : result;
      },
      enabled: opts.queryOptions?.enabled ?? true,
      staleTime: opts.queryOptions?.staleTime ?? 5 * 60 * 1000,
    };
  });

  return {
    get allowed() { 
      const p = adminContext.accessControlProvider;
      if (!p) return true;
      return (query.data as CanResult | undefined)?.can ?? false; 
    },
    get reason() { return (query.data as CanResult | undefined)?.reason; },
    get isLoading() { return query.isLoading; },
  };
}
