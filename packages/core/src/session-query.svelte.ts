import { createQuery, hashKey, type QueryObserverResult, type RefetchOptions } from '@tanstack/svelte-query';
import { tick, untrack } from 'svelte';
import type { AdminContextAccessor } from './context.svelte';
import { definedOptions } from './defined-options';
import {
  createQuerySession, createQueryResultView, pendingQueryResult, supersededQuerySession,
  type QuerySessionOptions,
} from './query-session.svelte';

interface SessionQueryOptions<TQuery, T> extends QuerySessionOptions {
  queryFn: (signal?: AbortSignal) => Promise<TQuery>;
  decode: (value: unknown, dataUpdateCount: number) => T;
  enabled: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number | false;
  refetchIntervalInBackground?: boolean;
}

// 只有显式提供错误归一化器的内部领域查询才承诺 Error；普通查询保留 unknown 契约。
export function createSessionQuery<TQuery, T = TQuery>(
  context: AdminContextAccessor,
  getOptions: () => SessionQueryOptions<TQuery, T> & { normalizeError: (error: unknown) => Error },
): QueryObserverResult<T, Error>;
export function createSessionQuery<TQuery, T = TQuery>(
  context: AdminContextAccessor,
  getOptions: () => SessionQueryOptions<TQuery, T>,
): QueryObserverResult<T, unknown>;
/** Ordinary reads keep their public result shape while cache and effects own an auth revision. */
export function createSessionQuery<TQuery, T = TQuery>(
  context: AdminContextAccessor,
  getOptions: () => SessionQueryOptions<TQuery, T>,
): QueryObserverResult<T, Error> {
  const session = createQuerySession(context, getOptions);
  const inFlight = new Map<string, { origin: typeof session.options; request: Promise<TQuery> }>();
  type Origin = typeof session.options;
  const query = createQuery<TQuery, Error>(() => {
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
        refetchInterval: origin.refetchInterval, refetchIntervalInBackground: origin.refetchIntervalInBackground,
      }),
    };
  });

  function project(origin: Origin, result: QueryObserverResult<TQuery, Error>): QueryObserverResult<T, Error> {
    const refetch = async (settings?: RefetchOptions): Promise<QueryObserverResult<T, Error>> => {
      if (!session.current(origin)) return pendingQueryResult(refetch);
      await tick();
      if (!session.current(origin)) return pendingQueryResult(refetch);
      try {
        return project(origin, await query.refetch(settings));
      } catch (error) {
        throw session.current(origin) ? session.errorFor(origin, error) : supersededQuerySession();
      }
    };
    if (!session.current(origin)) return pendingQueryResult(refetch);
    // 新查询键尚未入缓存时也要订阅结果，否则请求完成后视图不会重新计算。
    const observedData = result.data;
    const observedError = result.error;
    const state = session.client.getQueryState(origin.queryKey);
    // The observer may still expose its previous key until Svelte flushes its effects.
    if (!state || state.data !== observedData || state.error !== observedError) return pendingQueryResult(refetch);
    const failureReason = result.failureReason === null ? null : session.errorFor(origin, result.failureReason);
    try {
      if (result.isSuccess || result.isRefetchError) {
        const data = untrack(() => origin.decode(result.data, state.dataUpdateCount));
        if (!session.current(origin)) return pendingQueryResult(refetch);
        if (result.isSuccess) return { ...result, data, failureReason, refetch };
        return { ...result, data, error: session.errorFor(origin, result.error), failureReason, refetch };
      }
      if (result.isError) return { ...result, error: session.errorFor(origin, result.error), failureReason, refetch };
      return { ...result, failureReason, refetch };
    } catch (error) {
      if (!session.current(origin)) return pendingQueryResult(refetch);
      return {
        ...pendingQueryResult(refetch), data: undefined, error: session.errorFor(origin, error), status: 'error',
        isError: true, isPending: false, isLoading: false, isLoadingError: true,
        isRefetchError: false, isSuccess: false, isPlaceholderData: false,
      };
    }
  }
  session.observe(origin => project(origin, query));
  return createQueryResultView(() => project(session.options, query));
}
