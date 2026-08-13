import { createQuery } from '@tanstack/svelte-query';
import { getAdminOptions } from './options.svelte';
import { captureAdminContext } from './context.svelte';
import { useParsed } from './useParsed.svelte';
import {
  checkError,
  createOvertimeTracker,
  createLiveSubscription,
  fireSuccessNotification,
  fireErrorNotification,
} from './hook-utils.svelte';
import type { NotificationConfig, OvertimeOptions, LiveSubscriptionParams } from './hook-utils.svelte';
import type {
  GetListResult, Pagination, Sort, Filter, BaseRecord, HttpError,
  GetOneResult, GetManyResult,
  KnownResources,
} from './types';
import type { LiveMode, LiveEvent } from './live.svelte';

/**
 * Extend a Tanstack Query result with additional properties.
 * The query object is returned as-is, with extra properties accessible via Proxy.
 */
function extendQuery<Q extends object, E extends Record<string, unknown>>(
  query: Q,
  extensions: E,
): Q & E {
  return new Proxy(query, {
    get(target, prop) {
      if (typeof prop === 'string' && prop in extensions) {
        return extensions[prop as keyof E];
      }
      return target[prop as keyof Q];
    },
    has(target, prop) {
      if (typeof prop === 'string' && prop in extensions) return true;
      return prop in target;
    },
  }) as Q & E;
}

// ─── useList ───────────────────────────────────────────────────

export type MaybeGetter<T> = T | (() => T);

function cloneQueryKeyPart<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => cloneQueryKeyPart(item)) as T;
  }
  if (value && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, cloneQueryKeyPart(entry)])
    ) as T;
  }
  return value;
}

export interface UseListOptions<_TData extends BaseRecord = BaseRecord, _TError = HttpError> {
  resource?: KnownResources;
  pagination?: Pagination;
  sorters?: Sort[];
  filters?: Filter[];
  meta?: Record<string, unknown>;
  dataProviderName?: string;
  queryOptions?: { staleTime?: number; enabled?: boolean; gcTime?: number; refetchOnWindowFocus?: boolean };
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
  liveMode?: LiveMode;
  onLiveEvent?: (event: LiveEvent) => void;
  liveParams?: Record<string, unknown>;
  overtimeOptions?: OvertimeOptions;
}

export function useList<TData extends BaseRecord = BaseRecord, TError = HttpError>(optionsOrGetter: MaybeGetter<UseListOptions<TData, TError>> = {}) {
  const adminContext = captureAdminContext();
  const parsed = useParsed();
  const adminOptions = getAdminOptions();
  
  const getOptions = () => typeof optionsOrGetter === 'function' ? optionsOrGetter() : optionsOrGetter;
  const getResource = () => getOptions().resource ?? parsed.resource ?? '';

  const query = createQuery<GetListResult<TData>, TError>(() => {
    const opts = getOptions();
    const resource = getResource();
    const provider = adminContext.getDataProviderForResource(resource, opts.dataProviderName);
    const queryOptions = opts.queryOptions;
    const pagination = cloneQueryKeyPart(opts.pagination);
    const sorters = cloneQueryKeyPart(opts.sorters);
    const explicitFilters = cloneQueryKeyPart(opts.filters);
    const meta = cloneQueryKeyPart(opts.meta);

    // 自动注入嵌套资源 parent filter
    // 仅消费路径解析出的 parentParams（如 /teams/123/users 的 teamId），
    // 不再从 query params 中误取，避免 ?tenantId=1 等被静默转成 filter。
    //
    // 安全边界：仅在 useList 未显式指定 resource（回退到 parsed.resource），
    // 或显式 resource 与当前路由资源一致时注入。
    const parentFilters: typeof explicitFilters = [];
    const injectParent = !opts.resource || opts.resource === parsed.resource;
    if (injectParent && parsed.parentParams) {
      for (const [paramKey, paramVal] of Object.entries(parsed.parentParams)) {
        if (paramKey.endsWith('Id') && paramVal) {
          parentFilters.push({ field: paramKey, operator: 'eq' as const, value: paramVal });
        }
      }
    }
    const filters = [...parentFilters, ...(explicitFilters ?? [])];

    return {
      queryKey: adminContext.queryKeys(resource, opts.dataProviderName).data.list(resource, {
        pagination,
        sorters,
        filters,
        meta,
      }),
      queryFn: async () => provider.getList<TData>({
        resource,
        pagination,
        sorters,
        filters,
        meta,
      }),
      enabled: queryOptions?.enabled ?? true,
      staleTime: queryOptions?.staleTime ?? adminOptions.reactQuery?.staleTime,
      gcTime: queryOptions?.gcTime ?? adminOptions.reactQuery?.gcTime,
      refetchOnWindowFocus: queryOptions?.refetchOnWindowFocus ?? adminOptions.reactQuery?.refetchOnWindowFocus,
    };
  });

  const overtime = createOvertimeTracker(() => query.isLoading, typeof optionsOrGetter === 'function' ? optionsOrGetter().overtimeOptions : optionsOrGetter.overtimeOptions ?? adminOptions.overtime);

  createLiveSubscription((): LiveSubscriptionParams => {
    const opts = getOptions();
    return {
      resource: getResource(),
      liveProvider: adminContext.liveProvider,
      liveMode: opts.liveMode ?? adminOptions.liveMode,
      onLiveEvent: (e: LiveEvent) => {
        opts.onLiveEvent?.(e);
        adminOptions.onLiveEvent?.(e);
      },
      liveParams: opts.liveParams,
      enabled: opts.queryOptions?.enabled ?? true,
      dataProviderName: opts.dataProviderName,
    };
  });

  // Track last notification timestamps to prevent duplicate firings on re-render
  let lastSuccessAt = 0;
  let lastErrorAt = 0;
  $effect(() => {
    const opts = getOptions();
    if (query.isSuccess && query.dataUpdatedAt > lastSuccessAt) {
      lastSuccessAt = query.dataUpdatedAt;
      if (opts.successNotification) {
        fireSuccessNotification({
          config: opts.successNotification,
          defaultMessage: '',
          data: query.data,
          resource: getResource(),
          provider: adminContext.notificationProvider,
        });
      }
    } else if (query.isError && query.errorUpdatedAt > lastErrorAt) {
      lastErrorAt = query.errorUpdatedAt;
      checkError(query.error, adminContext);
      fireErrorNotification({
        config: opts.errorNotification,
        defaultMessage: 'Fetch failed',
        error: query.error,
        resource: getResource(),
        provider: adminContext.notificationProvider,
      });
    }
  });

  return extendQuery(query, { overtime });
}

// ─── useOne ────────────────────────────────────────────────────

export interface UseOneOptions<_TData extends BaseRecord = BaseRecord, _TError = HttpError> {
  resource?: KnownResources;
  id?: string | number;
  meta?: Record<string, unknown>;
  dataProviderName?: string;
  queryOptions?: { staleTime?: number; enabled?: boolean; gcTime?: number; refetchOnWindowFocus?: boolean };
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
  liveMode?: LiveMode;
  onLiveEvent?: (event: LiveEvent) => void;
  liveParams?: Record<string, unknown>;
  overtimeOptions?: OvertimeOptions;
}

export function useOne<TData extends BaseRecord = BaseRecord, TError = HttpError>(optionsOrGetter: MaybeGetter<UseOneOptions<TData, TError>> = {}) {
  const adminContext = captureAdminContext();
  const parsed = useParsed();
  const adminOptions = getAdminOptions();
  
  const getOptions = () => typeof optionsOrGetter === 'function' ? optionsOrGetter() : optionsOrGetter;
  const getResource = () => getOptions().resource ?? parsed.resource ?? '';
  const getId = () => getOptions().id ?? parsed.id;

  const query = createQuery<GetOneResult<TData>, TError>(() => {
    const opts = getOptions();
    const resource = getResource();
    const id = getId();
    const provider = adminContext.getDataProviderForResource(resource, opts.dataProviderName);
    const queryOptions = opts.queryOptions;

    return {
      queryKey: adminContext.queryKeys(resource, opts.dataProviderName).data.one(resource, id ?? '', {
        meta: cloneQueryKeyPart(opts.meta),
      }),
      queryFn: async () => {
        if (id == null) throw new Error('useOne requires an id');
        const result = await provider.getOne<TData>({
          resource,
          id,
          meta: opts.meta,
        });
        return result;
      },
      enabled: (queryOptions?.enabled ?? true) && id != null,
      staleTime: queryOptions?.staleTime ?? adminOptions.reactQuery?.staleTime,
      gcTime: queryOptions?.gcTime ?? adminOptions.reactQuery?.gcTime,
      refetchOnWindowFocus: queryOptions?.refetchOnWindowFocus ?? adminOptions.reactQuery?.refetchOnWindowFocus,
    };
  });

  const overtime = createOvertimeTracker(() => query.isLoading, typeof optionsOrGetter === 'function' ? optionsOrGetter().overtimeOptions : optionsOrGetter.overtimeOptions ?? adminOptions.overtime);

  createLiveSubscription((): LiveSubscriptionParams => {
    const opts = getOptions();
    const resource = getResource();
    return {
      resource,
      liveProvider: adminContext.liveProvider,
      liveMode: opts.liveMode ?? adminOptions.liveMode,
      onLiveEvent: (e: LiveEvent) => {
        opts.onLiveEvent?.(e);
        adminOptions.onLiveEvent?.(e);
      },
      liveParams: opts.liveParams,
      enabled: (opts.queryOptions?.enabled ?? true) && getId() != null,
      dataProviderName: opts.dataProviderName,
    };
  });

  let lastSuccessAt = 0;
  let lastErrorAt = 0;
  $effect(() => {
    const opts = getOptions();
    if (query.isSuccess && query.dataUpdatedAt > lastSuccessAt) {
      lastSuccessAt = query.dataUpdatedAt;
      if (opts.successNotification) {
        fireSuccessNotification({
          config: opts.successNotification,
          defaultMessage: '',
          data: query.data,
          resource: getResource(),
          provider: adminContext.notificationProvider,
        });
      }
    } else if (query.isError && query.errorUpdatedAt > lastErrorAt) {
      lastErrorAt = query.errorUpdatedAt;
      checkError(query.error, adminContext);
      fireErrorNotification({
        config: opts.errorNotification,
        defaultMessage: 'Fetch failed',
        error: query.error,
        resource: getResource(),
        provider: adminContext.notificationProvider,
      });
    }
  });

  return extendQuery(query, { overtime });
}

// ─── useShow ──────────────────────────────────────────────────
export function useShow<TData extends BaseRecord = BaseRecord, TError = HttpError>(
  optionsOrGetter: MaybeGetter<UseOneOptions<TData, TError>> = {}
) {
  const parsed = useParsed();
  const getOptions = () => typeof optionsOrGetter === 'function' ? optionsOrGetter() : optionsOrGetter;
  
  let _showId = $state<string | number | undefined>(undefined);
  
  // showId prioritizes explicit setShowId, then options.id, then URL id.
  const showId = $derived(_showId ?? getOptions().id ?? parsed.id);

  function setShowId(id: string | number) { _showId = id; }

  // We wrap it in a getter so useOne evaluates it dynamically.
  const result = useOne<TData, TError>(() => ({
    ...getOptions(),
    id: showId,
  }));

  return extendQuery(result, { get showId() { return showId; }, setShowId });
}

// ─── useMany ───────────────────────────────────────────────────

export interface UseManyOptions<_TData extends BaseRecord = BaseRecord, _TError = HttpError> {
  resource: KnownResources;
  ids: (string | number)[];
  meta?: Record<string, unknown>;
  dataProviderName?: string;
  queryOptions?: { staleTime?: number; enabled?: boolean; gcTime?: number; refetchOnWindowFocus?: boolean };
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
  liveMode?: LiveMode;
  onLiveEvent?: (event: LiveEvent) => void;
  liveParams?: Record<string, unknown>;
  overtimeOptions?: OvertimeOptions;
}

export function useMany<TData extends BaseRecord = BaseRecord, TError = HttpError>(optionsOrGetter: MaybeGetter<UseManyOptions<TData, TError>>) {
  const adminContext = captureAdminContext();
  const adminOptions = getAdminOptions();
  const getOptions = () => typeof optionsOrGetter === 'function' ? optionsOrGetter() : optionsOrGetter;

  const query = createQuery<GetManyResult<TData>, TError>(() => {
    const opts = getOptions();
    const { resource, ids, meta, dataProviderName, queryOptions } = opts;
    const provider = adminContext.getDataProviderForResource(resource, dataProviderName);

    return {
      queryKey: adminContext.queryKeys(resource, dataProviderName).data.many(resource, {
        ids: cloneQueryKeyPart(ids),
        meta: cloneQueryKeyPart(meta),
      }),
      queryFn: async () => {
        if (!ids.length) return { data: [] };
        if (provider.getMany) {
          return provider.getMany<TData>({ resource, ids, meta });
        }
        const results = await Promise.all(ids.map(id => provider.getOne<TData>({ resource, id, meta })));
        return { data: results.map(r => r.data) };
      },
      enabled: (queryOptions?.enabled ?? true) && ids.length > 0,
      staleTime: queryOptions?.staleTime ?? adminOptions.reactQuery?.staleTime,
      gcTime: queryOptions?.gcTime ?? adminOptions.reactQuery?.gcTime,
      refetchOnWindowFocus: queryOptions?.refetchOnWindowFocus ?? adminOptions.reactQuery?.refetchOnWindowFocus,
    };
  });

  const overtime = createOvertimeTracker(() => query.isLoading, typeof optionsOrGetter === 'function' ? optionsOrGetter().overtimeOptions : optionsOrGetter.overtimeOptions ?? adminOptions.overtime);

  createLiveSubscription((): LiveSubscriptionParams => {
    const opts = getOptions();
    return {
      resource: opts.resource,
      liveProvider: adminContext.liveProvider,
      liveMode: opts.liveMode ?? adminOptions.liveMode,
      onLiveEvent: (e: LiveEvent) => {
        opts.onLiveEvent?.(e);
        adminOptions.onLiveEvent?.(e);
      },
      liveParams: opts.liveParams,
      enabled: (opts.queryOptions?.enabled ?? true) && opts.ids.length > 0,
      dataProviderName: opts.dataProviderName,
    };
  });

  let lastSuccessAt = 0;
  let lastErrorAt = 0;
  $effect(() => {
    const opts = getOptions();
    if (query.isSuccess && query.dataUpdatedAt > lastSuccessAt) {
      lastSuccessAt = query.dataUpdatedAt;
      if (opts.successNotification) {
        fireSuccessNotification({
          config: opts.successNotification,
          defaultMessage: '',
          data: query.data,
          resource: opts.resource,
          provider: adminContext.notificationProvider,
        });
      }
    } else if (query.isError && query.errorUpdatedAt > lastErrorAt) {
      lastErrorAt = query.errorUpdatedAt;
      checkError(query.error, adminContext);
      fireErrorNotification({
        config: opts.errorNotification,
        defaultMessage: 'Fetch failed',
        error: query.error,
        resource: opts.resource,
        provider: adminContext.notificationProvider,
      });
    }
  });

  return extendQuery(query, { overtime });
}

export function useApiUrl(dataProviderName?: string): string {
  return captureAdminContext().getDataProvider(dataProviderName).getApiUrl();
}
