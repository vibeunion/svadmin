import { createInfiniteQuery, type InfiniteData, type InfiniteQueryObserverBaseResult, type QueryObserverResult,
  type RefetchOptions, type FetchNextPageOptions, type FetchPreviousPageOptions } from '@tanstack/svelte-query';
import { tick } from 'svelte';
import { Type } from '@sinclair/typebox';
import { definedOptions } from './defined-options';
import { getAdminOptions } from './options.svelte';
import { useParsed } from './useParsed.svelte';
import { captureContractContext, type ContractOptions } from './contract-context.svelte';
import { createOvertimeTracker, createLiveSubscription, type NotificationConfig, type OvertimeOptions,
  type LiveSubscriptionParams } from './hook-utils.svelte';
import { HttpError, type BaseRecord, type GetListResult, type Pagination, type Sort, type Filter, type KnownResources } from './types';
import { decodeBaseRecord, decodeListResult, rejectProviderResponse, type RecordDecoder } from './record-decoder';
import { captureQueryProvider, snapshotListParams } from './query-snapshot';
import type { LiveMode, LiveEvent } from './live.svelte';
import type { QueryKey } from './query-keys';
import { snapshotPlainData } from './plain-data';
import { checkExact } from './schema-validation';
import {
  createQuerySession, createQueryResultView, pendingQueryResult, querySessionError, supersededQuerySession,
} from './query-session.svelte';

export interface UseInfiniteListOptions<_TData extends BaseRecord = BaseRecord, _TError = HttpError> extends ContractOptions {
  resource?: KnownResources;
  pagination?: Pagination;
  sorters?: Sort[];
  filters?: Filter[];
  meta?: Record<string, unknown>;
  dataProviderName?: string;
  queryOptions?: { staleTime?: number; enabled?: boolean };
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
  liveMode?: LiveMode;
  onLiveEvent?: (event: LiveEvent) => void;
  overtimeOptions?: OvertimeOptions;
}

const dataSchema = Type.Object({
  pages: Type.Array(Type.Unknown(), { minItems: 1 }),
  pageParams: Type.Array(Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }), { minItems: 1 }),
}, { additionalProperties: false });
const flagsSchema = Type.Object({
  hasNextPage: Type.Boolean(), hasPreviousPage: Type.Boolean(),
  isFetchNextPageError: Type.Boolean(), isFetchingNextPage: Type.Boolean(),
  isFetchPreviousPageError: Type.Boolean(), isFetchingPreviousPage: Type.Boolean(),
}, { additionalProperties: false });

type Pages<T extends BaseRecord> = InfiniteData<GetListResult<T>, number>;
type InfiniteOutcome<T> =
  | { status: 'pending'; data: undefined; error: null; isPending: true; isError: false; isSuccess: false;
      isLoading: boolean; isLoadingError: false; isRefetchError: false; isPlaceholderData: false;
      isFetchNextPageError: false; isFetchPreviousPageError: false }
  | { status: 'success'; data: T; error: null; isPending: false; isError: false; isSuccess: true;
      isLoading: false; isLoadingError: false; isRefetchError: false; isPlaceholderData: boolean;
      isFetchNextPageError: false; isFetchPreviousPageError: false }
  | { status: 'error'; data: undefined; error: unknown; isPending: false; isError: true; isSuccess: false;
      isLoading: false; isLoadingError: true; isRefetchError: false; isPlaceholderData: false;
      isFetchNextPageError: boolean; isFetchPreviousPageError: boolean }
  | ({ status: 'error'; data: T; error: unknown; isPending: false; isError: true; isSuccess: false;
      isLoading: false; isLoadingError: false; isPlaceholderData: false } & (
      | { isRefetchError: true; isFetchNextPageError: false; isFetchPreviousPageError: false }
      | { isRefetchError: false; isFetchNextPageError: true; isFetchPreviousPageError: false }
      | { isRefetchError: false; isFetchNextPageError: false; isFetchPreviousPageError: true }
    ));

/** The installed observer retains data on paging errors without setting isRefetchError. */
export type InfiniteListResult<T extends BaseRecord> =
  Omit<InfiniteQueryObserverBaseResult<Pages<T>, unknown>, keyof InfiniteOutcome<Pages<T>> | 'refetch' | 'fetchNextPage' | 'fetchPreviousPage'>
  & InfiniteOutcome<Pages<T>> & {
    refetch: (settings?: RefetchOptions) => Promise<InfiniteListResult<T>>;
    fetchNextPage: (settings?: FetchNextPageOptions) => Promise<InfiniteListResult<T>>;
    fetchPreviousPage: (settings?: FetchPreviousPageOptions) => Promise<InfiniteListResult<T>>;
  };

export function decodeInfiniteResult<T extends BaseRecord>(input: unknown, decode: RecordDecoder<T>): InfiniteData<GetListResult<T>, number> {
  try {
    const candidate = snapshotPlainData(input);
    if (checkExact(dataSchema, candidate) && candidate.pages.length === candidate.pageParams.length &&
      candidate.pageParams.every((page, index) => page === index + 1)) {
      return { pages: candidate.pages.map(page => decodeListResult(page, decode)), pageParams: [...candidate.pageParams] };
    }
  } catch {
    // Malformed pages and reflection errors cannot become a typed page collection.
  }
  return rejectProviderResponse();
}

export function useInfiniteList(options: UseInfiniteListOptions = {}) {
  return createInfiniteListQuery(options, () => decodeBaseRecord);
}

export function createInfiniteListQuery<TData extends BaseRecord>(
  options: UseInfiniteListOptions, getDecoder: () => RecordDecoder<TData>,
) {
  const context = captureContractContext(options);
  const parsed = useParsed();
  const adminOptions = getAdminOptions();
  type Data = Pages<TData>;
  type Result = InfiniteListResult<TData>;
  const session = createQuerySession(context, () => {
    const resource = options.resource ?? parsed.resource ?? '';
    const captured = captureQueryProvider(context, {
      resource, ...definedOptions({ dataProviderName: options.dataProviderName, contract: options.contract, meta: options.meta }),
    });
    const params = snapshotListParams({
      resource, ...definedOptions({
        pagination: { ...options.pagination, current: 1, pageSize: options.pagination?.pageSize ?? 10 },
        sorters: options.sorters, filters: options.filters, meta: captured.meta,
      }),
    });
    return {
      resource, captured, params, decode: getDecoder(),
      queryKey: context.queryKeys(resource, options.dataProviderName).data.infiniteList(resource, { ...params, source: captured.source }),
      enabled: options.queryOptions?.enabled ?? true,
      staleTime: options.queryOptions?.staleTime ?? adminOptions.reactQuery?.staleTime,
      successNotification: options.successNotification, errorNotification: options.errorNotification,
    };
  });
  type Origin = typeof session.options;
  const raw = createInfiniteQuery<GetListResult<TData>, unknown, Data, QueryKey, number>(() => {
    const origin = session.options;
    return {
      queryKey: origin.queryKey, initialPageParam: 1,
      queryFn: ({ pageParam, signal }) => session.run(origin, async () => {
        if (typeof pageParam !== 'number' || !Number.isSafeInteger(pageParam) || pageParam < 1) {
          throw new HttpError('Invalid page number', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
        }
        const result = await origin.captured.provider.getList(snapshotListParams({
          ...origin.params, pagination: { ...origin.params.pagination, current: pageParam },
          ...definedOptions({ signal }),
        }));
        return decodeListResult(result, origin.decode);
      }),
      getNextPageParam: (_last, pages, _lastParam, pageParams) => {
        if (!session.sessionCurrent(origin)) return undefined;
        try {
          const checked = decodeInfiniteResult({ pages, pageParams }, origin.decode);
          const last = checked.pages.at(-1);
          if (!last || last.data.length === 0 || checked.pages.reduce((total, page) => total + page.data.length, 0) >= last.total) return undefined;
          const next = checked.pages.length + 1;
          return Number.isSafeInteger(next) ? next : undefined;
        } catch {
          return undefined;
        }
      },
      enabled: origin.enabled && origin.auth.available,
      ...definedOptions({ staleTime: origin.staleTime }),
    };
  });

  type Operations = {
    refetch: (settings?: RefetchOptions) => Promise<Result>;
    fetchNextPage: (settings?: FetchNextPageOptions) => Promise<Result>;
    fetchPreviousPage: (settings?: FetchPreviousPageOptions) => Promise<Result>;
  };
  function pending(operations: Operations): Result {
    return {
      ...pendingQueryResult<Data, Operations['refetch']>(operations.refetch), ...operations,
      hasNextPage: false, hasPreviousPage: false,
      isFetchNextPageError: false, isFetchingNextPage: false,
      isFetchPreviousPageError: false, isFetchingPreviousPage: false,
    };
  }
  function project(origin: Origin, result: QueryObserverResult<Data, unknown>): Result {
    async function run(request: () => Promise<QueryObserverResult<Data, unknown>>): Promise<Result> {
      if (!session.current(origin)) return pending(operations);
      await tick();
      if (!session.current(origin)) return pending(operations);
      try {
        return project(origin, await request());
      } catch (error) {
        throw session.current(origin) ? querySessionError(error) : supersededQuerySession();
      }
    }
    const operations: Operations = {
      refetch: settings => run(() => raw.refetch(settings)),
      fetchNextPage: settings => run(() => raw.fetchNextPage(settings)),
      fetchPreviousPage: settings => run(() => raw.fetchPreviousPage(settings)),
    };
    if (!session.current(origin)) return pending(operations);
    const state = session.client.getQueryState(origin.queryKey);
    if (!state || state.data !== result.data || state.error !== result.error) return pending(operations);
    try {
      // Refetch's base type omits pagination fields that the installed observer returns.
      const flags: unknown = Object.fromEntries(Object.keys(flagsSchema.properties).map(key => [key, Reflect.get(result, key)]));
      if (!checkExact(flagsSchema, flags)) return rejectProviderResponse();
      const failureReason = result.failureReason === null ? null : querySessionError(result.failureReason);
      const rawData: unknown = result.data;
      if (result.status === 'success') {
        const data = decodeInfiniteResult(rawData, origin.decode);
        if (!session.current(origin)) return pending(operations);
        return { ...result, ...flags, ...operations, data, failureReason, isFetchNextPageError: false, isFetchPreviousPageError: false };
      }
      if (result.status === 'error') {
        const base = { ...result, ...flags, ...operations, error: querySessionError(result.error), failureReason };
        if (rawData === undefined) return { ...base, data: undefined, isLoadingError: true, isRefetchError: false };
        const data = decodeInfiniteResult(rawData, origin.decode);
        if (!session.current(origin)) return pending(operations);
        if (flags.isFetchNextPageError) return {
          ...base, data, isLoadingError: false, isRefetchError: false, isFetchNextPageError: true, isFetchPreviousPageError: false,
        };
        if (flags.isFetchPreviousPageError) return {
          ...base, data, isLoadingError: false, isRefetchError: false, isFetchNextPageError: false, isFetchPreviousPageError: true,
        };
        return { ...base, data, isLoadingError: false, isRefetchError: true, isFetchNextPageError: false, isFetchPreviousPageError: false };
      }
      return { ...result, ...flags, ...operations, failureReason, isFetchNextPageError: false, isFetchPreviousPageError: false };
    } catch (error) {
      if (!session.current(origin)) return pending(operations);
      return {
        ...pending(operations), status: 'error', data: undefined, error: querySessionError(error),
        isError: true, isPending: false, isLoading: false, isLoadingError: true, isRefetchError: false,
        isSuccess: false, isPlaceholderData: false, isFetchNextPageError: false, isFetchPreviousPageError: false,
      };
    }
  }
  session.observe(origin => project(origin, raw));
  const query = createQueryResultView(() => project(session.options, raw));
  const overtime = createOvertimeTracker(() => query.isLoading, options.overtimeOptions ?? adminOptions.overtime);
  createLiveSubscription((): LiveSubscriptionParams => ({
    resource: options.resource ?? parsed.resource ?? '',
    ...definedOptions({
      liveProvider: context.liveProvider, liveMode: options.liveMode ?? adminOptions.liveMode,
      contract: options.contract, onLiveEvent: options.onLiveEvent, onGlobalLiveEvent: adminOptions.onLiveEvent,
      dataProviderName: options.dataProviderName,
    }),
    enabled: options.queryOptions?.enabled ?? true,
  }));
  return { query, get overtime() { return overtime; } };
}
