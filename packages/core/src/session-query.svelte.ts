import { createQuery, hashKey, type QueryObserverResult, type RefetchOptions } from '@tanstack/svelte-query';
import { tick, untrack } from 'svelte';
import type { AdminContextAccessor } from './context.svelte';
import { definedOptions } from './defined-options';
import {
  createQuerySession, createQueryResultView, pendingQueryResult, querySessionError, supersededQuerySession,
  type QuerySessionOptions,
} from './query-session.svelte';

interface SessionQueryOptions<TQuery, T> extends QuerySessionOptions {
  queryFn: (signal?: AbortSignal) => Promise<TQuery>;
  decode: (value: unknown, dataUpdateCount: number) => T;
  enabled: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
}

/** Ordinary reads keep their public result shape while cache and effects own an auth revision. */
export function createSessionQuery<TQuery, T = TQuery>(
  context: AdminContextAccessor,
  getOptions: () => SessionQueryOptions<TQuery, T>,
): QueryObserverResult<T, unknown> {
  const session = createQuerySession(context, getOptions);
  const inFlight = new Map<string, { origin: typeof session.options; request: Promise<TQuery> }>();
  type Origin = typeof session.options;
  const query = createQuery<TQuery, unknown>(() => {
    const origin = session.options;
    return {
      queryKey: origin.queryKey,
      queryFn: (queryContext) => {
        const key = hashKey(origin.queryKey);
        const existing = inFlight.get(key);
        if (existing && session.current(existing.origin)) return existing.request;
        if (existing) inFlight.delete(key);
        const request = session.run(origin, () => origin.queryFn(queryContext?.signal));
        inFlight.set(key, { origin, request });
        void request.then(() => {
          if (inFlight.get(key)?.request === request) inFlight.delete(key);
        }, () => {
          if (inFlight.get(key)?.request === request) inFlight.delete(key);
        });
        return request;
      },
      enabled: origin.enabled && origin.auth.available,
      ...definedOptions({
        staleTime: origin.staleTime, gcTime: origin.gcTime, refetchOnWindowFocus: origin.refetchOnWindowFocus,
      }),
    };
  });

  function project(origin: Origin, result: QueryObserverResult<TQuery, unknown>): QueryObserverResult<T, unknown> {
    const refetch = async (settings?: RefetchOptions): Promise<QueryObserverResult<T, unknown>> => {
      if (!session.current(origin)) return pendingQueryResult(refetch);
      await tick();
      if (!session.current(origin)) return pendingQueryResult(refetch);
      try {
        return project(origin, await query.refetch(settings));
      } catch (error) {
        throw session.current(origin) ? querySessionError(error) : supersededQuerySession();
      }
    };
    if (!session.current(origin)) return pendingQueryResult(refetch);
    const state = session.client.getQueryState(origin.queryKey);
    // The observer may still expose its previous key until Svelte flushes its effects.
    if (!state || state.data !== result.data || state.error !== result.error) return pendingQueryResult(refetch);
    const failureReason = result.failureReason === null ? null : querySessionError(result.failureReason);
    try {
      if (result.isSuccess || result.isRefetchError) {
        const data = untrack(() => origin.decode(result.data, state.dataUpdateCount));
        if (!session.current(origin)) return pendingQueryResult(refetch);
        if (result.isSuccess) return { ...result, data, failureReason, refetch };
        return { ...result, data, error: querySessionError(result.error), failureReason, refetch };
      }
      if (result.isError) return { ...result, error: querySessionError(result.error), failureReason, refetch };
      return { ...result, failureReason, refetch };
    } catch (error) {
      if (!session.current(origin)) return pendingQueryResult(refetch);
      return {
        ...pendingQueryResult(refetch), data: undefined, error: querySessionError(error), status: 'error',
        isError: true, isPending: false, isLoading: false, isLoadingError: true,
        isRefetchError: false, isSuccess: false, isPlaceholderData: false,
      };
    }
  }
  session.observe(origin => project(origin, query));
  return createQueryResultView(() => project(session.options, query));
}
