// @svadmin/core — Core Data and Hook APIs (Modularized for v0.2.29+)

// ─── Re-exports from modular hook files ─────────────────────────────

export * from './query-hooks.svelte';
export * from './mutation-hooks.svelte';
export * from './form-hooks.svelte';
export * from './table-hooks.svelte';
export * from './routing-hooks.svelte';
export * from './utility-hooks.svelte';

// ─── Re-export types from options ─────────────────────────────────
export type { InvalidateScope, OvertimeConfig } from './options.svelte';

// ─── Export shared utilities ────────────────────────────────────────

export { createOvertimeTracker, createLiveSubscription } from './hook-utils.svelte';
export type { OvertimeResult, OvertimeOptions, NotificationConfig } from './hook-utils.svelte';

// ─── Additional core hooks ─────────────────────────────────────────

import { createQuery, createInfiniteQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { getAdminOptions } from './options.svelte';
import { captureAdminContext } from './context.svelte';
import { dataQueryMatches, queryKeyMatches } from './query-keys';
import type { QueryMatcher } from './query-keys';
import { useParsed } from './useParsed.svelte';
import { createOvertimeTracker, createLiveSubscription, fireSuccessNotification, fireErrorNotification, checkError } from './hook-utils.svelte';
import { invalidateByScopes, publishLiveEvent } from './mutation-hooks.svelte';
import type { NotificationConfig, OvertimeOptions, LiveSubscriptionParams } from './hook-utils.svelte';
import { DeleteManyPartialError, UndoError } from './types';
import type { BaseRecord, HttpError, Pagination, Sort, Filter, DataProvider, KnownResources, MutationMode } from './types';
import type { LiveMode, LiveEvent } from './live.svelte';
import { auditWithProvider } from './audit';
import { useTranslation } from './i18n.svelte';
import { toast } from './toast.svelte';
import type { MutationCallbacks } from './mutation-hooks.svelte';

// ─── useInfiniteList ────────────────────────────────────────────────

export interface UseInfiniteListOptions<_TData extends BaseRecord = BaseRecord, _TError = HttpError> {
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

export function useInfiniteList<TData extends BaseRecord = BaseRecord, TError = HttpError>(options: UseInfiniteListOptions<TData, TError> = {}) {
  const adminContext = captureAdminContext();
  const parsed = useParsed();
  const adminOptions = getAdminOptions();

  const query = createInfiniteQuery<{ data: TData[]; total: number }, TError>(() => {
    const resource = options.resource ?? parsed.resource ?? '';
    const provider = adminContext.getDataProviderForResource(resource, options.dataProviderName);
    return {
    queryKey: adminContext.queryKeys(resource, options.dataProviderName).data.infiniteList(resource, {
      pageSize: options.pagination?.pageSize,
      sorters: options.sorters,
      filters: options.filters,
      meta: options.meta,
    }),
    queryFn: async ({ pageParam = 1 }) => {
      const result = await provider.getList<TData>({
        resource,
        pagination: { current: pageParam as number, pageSize: options.pagination?.pageSize ?? 10 },
        sorters: options.sorters,
        filters: options.filters,
        meta: options.meta,
      });
      return result;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: { data: TData[]; total: number }, allPages: { data: TData[]; total: number }[]) => {
      const totalFetched = allPages.reduce((acc: number, p) => acc + (p.data?.length ?? 0), 0);
      if (totalFetched >= (lastPage.total ?? 0)) return undefined;
      return allPages.length + 1;
    },
    enabled: options.queryOptions?.enabled ?? true,
    staleTime: options.queryOptions?.staleTime ?? adminOptions.reactQuery?.staleTime,
    };
  });

  const overtime = createOvertimeTracker(() => query.isLoading, options.overtimeOptions ?? adminOptions.overtime);

  createLiveSubscription((): LiveSubscriptionParams => ({
    resource: options.resource ?? parsed.resource ?? '',
    liveProvider: adminContext.liveProvider,
    liveMode: options.liveMode ?? adminOptions.liveMode,
    onLiveEvent: (e: LiveEvent) => {
      options.onLiveEvent?.(e);
      adminOptions.onLiveEvent?.(e);
    },
    enabled: options.queryOptions?.enabled ?? true,
    dataProviderName: options.dataProviderName,
  }));

  let lastSuccessAt = 0;
  let lastErrorAt = 0;
  $effect(() => {
    if (query.isSuccess && query.dataUpdatedAt > lastSuccessAt && options.successNotification) {
      lastSuccessAt = query.dataUpdatedAt;
      fireSuccessNotification({
        config: options.successNotification,
        defaultMessage: '',
        data: query.data,
        resource: options.resource ?? parsed.resource ?? '',
        provider: adminContext.notificationProvider,
      });
    } else if (query.isError && query.errorUpdatedAt > lastErrorAt) {
      lastErrorAt = query.errorUpdatedAt;
      checkError(query.error, adminContext);
      fireErrorNotification({
        config: options.errorNotification,
        defaultMessage: 'Fetch failed',
        error: query.error,
        resource: options.resource ?? parsed.resource ?? '',
        provider: adminContext.notificationProvider,
      });
    }
  });

  return { query, get overtime() { return overtime; } };
}

// ─── useSelect ──────────────────────────────────────────────────────

export interface UseSelectOptions<TData extends BaseRecord = BaseRecord, _TOption = { label: string; value: string | number }> {
  resource: KnownResources;
  optionLabel?: string | ((item: TData) => string);
  optionValue?: string | ((item: TData) => string | number);
  sorters?: Sort[];
  filters?: Filter[];
  defaultValue?: (string | number)[];
  fetchSize?: number;
  pagination?: Pagination;
  debounce?: number;
  queryOptions?: { staleTime?: number; enabled?: boolean };
  defaultValueQueryOptions?: { staleTime?: number; enabled?: boolean };
  meta?: Record<string, unknown>;
  dataProviderName?: string;
  onSearch?: (value: string) => Filter[];
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
  overtimeOptions?: OvertimeOptions;
}

export function useSelect<TData extends BaseRecord = BaseRecord, TOption = { label: string; value: string | number }>(options: UseSelectOptions<TData, TOption>) {
  const adminContext = captureAdminContext();
  const { resource, optionLabel = 'title', optionValue = 'id', sorters, filters, pagination, meta, dataProviderName, onSearch, debounce: debounceMs = 300 } = options;
  const adminOptions = getAdminOptions();

  let searchText = $state('');
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const searchFilters = $derived.by<Filter[]>(() => {
    if (!onSearch || !searchText) return [];
    return onSearch(searchText);
  });

  const allFilters = $derived([...(filters ?? []), ...searchFilters]);

  const effectivePageSize = options.fetchSize ?? pagination?.pageSize ?? 999;

  const query = createQuery<{ data: TData[]; total: number }>(() => {
    const provider = adminContext.getDataProviderForResource(resource, dataProviderName);
    return {
    queryKey: adminContext.queryKeys(resource, dataProviderName).data.select(resource, {
      filters: allFilters,
      sorters,
      pagination,
      meta,
    }),
    queryFn: () => provider.getList<TData>({ resource, sorters, filters: allFilters, pagination: { current: 1, pageSize: effectivePageSize }, meta }),
    enabled: options.queryOptions?.enabled ?? true,
    staleTime: options.queryOptions?.staleTime ?? adminOptions.reactQuery?.staleTime,
    };
  });

  // Parallel query to ensure default values are always available in options
  const defaultValueIds = options.defaultValue ?? [];
  const defaultValueQuery = defaultValueIds.length > 0
    ? createQuery<{ data: TData[] }>(() => {
        const provider = adminContext.getDataProviderForResource(resource, dataProviderName);
        return {
          queryKey: adminContext.queryKeys(resource, dataProviderName).data.selectDefaults(resource, {
            ids: defaultValueIds,
            meta,
          }),
          queryFn: async () => {
            if (provider.getMany) return provider.getMany<TData>({ resource, ids: defaultValueIds, meta });
            const results = await Promise.all(defaultValueIds.map(id => provider.getOne<TData>({ resource, id, meta })));
            return { data: results.map(r => r.data) };
          },
          enabled: (options.defaultValueQueryOptions?.enabled ?? true) && defaultValueIds.length > 0,
          staleTime: options.defaultValueQueryOptions?.staleTime ?? Infinity,
        };
      })
    : null;

  const selectOptions = $derived.by(() => {
    const queryResult = query.data as { data: TData[]; total: number } | undefined;
    const data: TData[] = queryResult?.data ?? [];
    // Merge default value items if not already in data
    const defaultQueryResult = defaultValueQuery as { data: { data: TData[] } | undefined } | null;
    const defaultData: TData[] = defaultQueryResult?.data?.data ?? [];
    const allData: TData[] = [...data];
    const resolveValue = (item: TData) => typeof optionValue === 'function' ? optionValue(item) : (item as Record<string, unknown>)[optionValue];
    const existingIds = new Set(data.map((d: TData) => String(resolveValue(d))));
    for (const item of defaultData) {
      if (!existingIds.has(String(resolveValue(item)))) allData.push(item);
    }
    return allData.map((item: TData) => {
      const label = typeof optionLabel === 'function' ? optionLabel(item) : String((item as Record<string, unknown>)[optionLabel] ?? '');
      const value = resolveValue(item);
      return { label, value } as unknown as TOption;
    });
  });

  const overtime = createOvertimeTracker(() => query.isLoading, options.overtimeOptions ?? adminOptions.overtime);

  let lastSuccessAt = 0;
  let lastErrorAt = 0;
  $effect(() => {
    if (query.isSuccess && query.dataUpdatedAt > lastSuccessAt && options.successNotification) {
      lastSuccessAt = query.dataUpdatedAt;
      fireSuccessNotification({
        config: options.successNotification,
        defaultMessage: '',
        data: query.data,
        resource,
        provider: adminContext.notificationProvider,
      });
    } else if (query.isError && query.errorUpdatedAt > lastErrorAt) {
      lastErrorAt = query.errorUpdatedAt;
      checkError(query.error, adminContext);
      fireErrorNotification({
        config: options.errorNotification,
        defaultMessage: 'Fetch failed',
        error: query.error,
        resource,
        provider: adminContext.notificationProvider,
      });
    }
  });

  function onSearchChange(value: string) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { searchText = value; }, debounceMs);
  }

  // Cleanup debounce timer on unmount
  $effect(() => {
    return () => { if (debounceTimer) clearTimeout(debounceTimer); };
  });

  return {
    query,
    get options() { return selectOptions; },
    get overtime() { return overtime; },
    onSearchChange,
  };
}

// ─── useCustom ──────────────────────────────────────────────────────

export interface UseCustomOptions<_TData = unknown, _TError = HttpError> {
  url: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  config?: { payload?: unknown; query?: Record<string, unknown>; headers?: Record<string, string>; sorters?: Sort[]; filters?: Filter[] };
  meta?: Record<string, unknown>;
  dataProviderName?: string;
  queryOptions?: { staleTime?: number; enabled?: boolean };
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
  overtimeOptions?: OvertimeOptions;
}

export function useCustom<TData = unknown, TError = HttpError>(options: UseCustomOptions<TData, TError>) {
  const adminContext = captureAdminContext();
  const adminOptions = getAdminOptions();

  const query = createQuery<{ data: TData }, TError>(() => {
    const provider = adminContext.getDataProvider(options.dataProviderName);
    return {
    queryKey: adminContext.queryKeys(undefined, options.dataProviderName).custom.call(
      options.url,
      options.url,
      options.method,
      { config: options.config, meta: options.meta },
    ),
    queryFn: async () => {
      if (!provider.custom) throw new Error('DataProvider does not support custom method');
      return provider.custom<TData>({
        url: options.url,
        method: options.method,
        payload: options.config?.payload,
        query: options.config?.query,
        headers: options.config?.headers,
        sorters: options.config?.sorters,
        filters: options.config?.filters,
        meta: options.meta,
      });
    },
    enabled: options.queryOptions?.enabled ?? true,
    staleTime: options.queryOptions?.staleTime ?? adminOptions.reactQuery?.staleTime,
    };
  });

  const overtime = createOvertimeTracker(() => query.isLoading, options.overtimeOptions ?? adminOptions.overtime);

  let lastSuccessAt = 0;
  let lastErrorAt = 0;
  $effect(() => {
    if (query.isSuccess && query.dataUpdatedAt > lastSuccessAt && options.successNotification) {
      lastSuccessAt = query.dataUpdatedAt;
      fireSuccessNotification({
        config: options.successNotification,
        defaultMessage: '',
        data: query.data,
        provider: adminContext.notificationProvider,
      });
    } else if (query.isError && query.errorUpdatedAt > lastErrorAt) {
      lastErrorAt = query.errorUpdatedAt;
      checkError(query.error, adminContext);
      fireErrorNotification({
        config: options.errorNotification,
        defaultMessage: 'Custom request failed',
        error: query.error,
        resource: '',
        provider: adminContext.notificationProvider,
      });
    }
  });

  return { query, get overtime() { return overtime; } };
}

// ─── useCustomMutation ──────────────────────────────────────────────

export function useCustomMutation<TData = unknown, TError = HttpError, TVariables = unknown>(dataProviderName?: string) {
  const adminContext = captureAdminContext();
  const queryClient = useQueryClient();

  const mutation = createMutation<{ data: TData }, TError, { url: string; method: 'get' | 'post' | 'put' | 'patch' | 'delete'; values?: TVariables; query?: Record<string, unknown>; headers?: Record<string, string>; sorters?: Sort[]; filters?: Filter[]; meta?: Record<string, unknown>; invalidates?: string[] | false; resource?: string }>(() => ({
    mutationFn: async (params) => {
      const provider = adminContext.getDataProvider(dataProviderName);
      if (!provider.custom) throw new Error('DataProvider does not support custom method');
      return provider.custom<TData>({ url: params.url, method: params.method, payload: params.values, query: params.query, headers: params.headers, sorters: params.sorters, filters: params.filters, meta: params.meta });
    },
    onSuccess: (data, params) => {
      if (params.resource && params.invalidates !== false) {
        invalidateByScopes({
          queryClient,
          resource: params.resource,
          scopes: params.invalidates,
          defaults: ['list', 'many'],
          matcher: adminContext.queryKeyMatcher(params.resource, dataProviderName),
        });
      }
    },
    onError: (error) => {
      checkError(error, adminContext);
    },
  }));

  return { mutation };
}

// ─── useCreateMany / useUpdateMany / useDeleteMany ──────────────────

export function useCreateMany<TData extends BaseRecord = BaseRecord, TError = HttpError, TVariables = Record<string, unknown>>(options: { resource?: KnownResources; overtimeOptions?: OvertimeOptions } = {}) {
  const adminContext = captureAdminContext();
  const parsed = useParsed();
  const resource = options.resource ?? parsed.resource ?? '';
  const adminOptions = getAdminOptions();
  const queryClient = useQueryClient();

  const mutation = createMutation<{ data: TData[] }, TError, { resource?: KnownResources; variables: TVariables[]; meta?: Record<string, unknown>; dataProviderName?: string }>(() => ({
    mutationFn: async (params) => {
      const resName = params.resource ?? resource;
      const provider = adminContext.getDataProviderForResource(resName, params.dataProviderName);
      if (provider.createMany) return await provider.createMany<TData, TVariables>({ resource: resName, variables: params.variables, meta: params.meta });
      const results = await Promise.all(params.variables.map(v => provider.create<TData, TVariables>({ resource: resName, variables: v, meta: params.meta })));
      return { data: results.map(r => r.data) };
    },
    onSuccess: (data, params) => {
      const resName = params.resource ?? resource;
      fireSuccessNotification({
        config: undefined,
        defaultMessage: 'Created successfully',
        data: data.data,
        values: params.variables,
        resource: resName,
        provider: adminContext.notificationProvider,
      });
      auditWithProvider(
        { action: 'create', resource: resName, meta: adminContext.getProviderMeta(resName) },
        adminContext.auditLogProvider,
      );
      publishLiveEvent(resName, 'created', undefined, adminContext);
    },
    onError: (error, params) => {
      checkError(error, adminContext);
      fireErrorNotification({
        config: undefined,
        defaultMessage: 'Create many failed',
        error,
        resource: params.resource ?? resource,
        provider: adminContext.notificationProvider,
      });
    },
    onSettled: (_d, _e, params) => {
      const resName = params.resource ?? resource;
      invalidateByScopes({
        queryClient,
        resource: resName,
        defaults: ['list', 'many'],
        matcher: adminContext.queryKeyMatcher(resName, params.dataProviderName),
      });
    },
  }));

  return { mutation, get overtime() { return createOvertimeTracker(() => mutation.isPending, options.overtimeOptions ?? adminOptions.overtime); } };
}

export function useUpdateMany<TData extends BaseRecord = BaseRecord, TError = HttpError, TVariables = Record<string, unknown>>(options: { resource?: KnownResources; overtimeOptions?: OvertimeOptions } = {}) {
  const adminContext = captureAdminContext();
  const parsed = useParsed();
  const resource = options.resource ?? parsed.resource ?? '';
  const adminOptions = getAdminOptions();
  const queryClient = useQueryClient();

  const mutation = createMutation<{ data: TData[] }, TError, { resource?: KnownResources; ids: (string | number)[]; variables: TVariables; meta?: Record<string, unknown>; dataProviderName?: string }>(() => ({
    mutationFn: async (params) => {
      const resName = params.resource ?? resource;
      const provider = adminContext.getDataProviderForResource(resName, params.dataProviderName);
      if (provider.updateMany) return await provider.updateMany<TData, TVariables>({ resource: resName, ids: params.ids, variables: params.variables, meta: params.meta });
      const results = await Promise.all(params.ids.map(id => provider.update<TData, TVariables>({ resource: resName, id, variables: params.variables, meta: params.meta })));
      return { data: results.map(r => r.data) };
    },
    onSuccess: (data, params) => {
      const resName = params.resource ?? resource;
      fireSuccessNotification({
        config: undefined,
        defaultMessage: 'Updated successfully',
        data: data.data,
        values: params.variables,
        resource: resName,
        provider: adminContext.notificationProvider,
      });
      auditWithProvider(
        { action: 'update', resource: resName, meta: adminContext.getProviderMeta(resName) },
        adminContext.auditLogProvider,
      );
      publishLiveEvent(resName, 'updated', params.ids, adminContext);
    },
    onError: (error, params) => {
      checkError(error, adminContext);
      fireErrorNotification({
        config: undefined,
        defaultMessage: 'Update many failed',
        error,
        resource: params.resource ?? resource,
        provider: adminContext.notificationProvider,
      });
    },
    onSettled: (_d, _e, params) => {
      const resName = params.resource ?? resource;
      invalidateByScopes({
        queryClient,
        resource: resName,
        defaults: ['list', 'many', 'detail'],
        matcher: adminContext.queryKeyMatcher(resName, params.dataProviderName),
      });
      for (const id of params.ids) {
        queryClient.invalidateQueries({
          predicate: (q) => queryKeyMatches(q.queryKey, {
            ...adminContext.queryKeyMatcher(resName, params.dataProviderName),
            kind: 'data',
            resource: resName,
            action: 'one',
            id,
          }),
        });
      }
    },
  }));

  return { mutation, get overtime() { return createOvertimeTracker(() => mutation.isPending, options.overtimeOptions ?? adminOptions.overtime); } };
}

export interface UseDeleteManyOptions {
  resource?: KnownResources;
  mutationMode?: MutationMode;
  undoableTimeout?: number;
  mutationOptions?: MutationCallbacks;
  overtimeOptions?: OvertimeOptions;
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
}

export interface UseDeleteManyMutateParams {
  resource?: KnownResources;
  ids: (string | number)[];
  mutationMode?: MutationMode;
  undoableTimeout?: number;
  meta?: Record<string, unknown>;
  dataProviderName?: string;
  invalidates?: string[] | false;
  onCancel?: () => void;
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
}

interface DeleteManyMutationContext {
  _svadmin_ctx?: boolean;
  userContext?: unknown;
  previousQueries?: [readonly unknown[], unknown][];
}

export function useDeleteMany<TData extends BaseRecord = BaseRecord, TError = HttpError>(options: UseDeleteManyOptions = {}) {
  const adminContext = captureAdminContext();
  const parsed = useParsed();
  const resource = options.resource ?? parsed.resource ?? '';
  const adminOptions = getAdminOptions();
  const queryClient = useQueryClient();
  const i18n = useTranslation();
  const mutationMode = options.mutationMode ?? adminOptions.mutationMode ?? 'pessimistic';
  const undoableTimeout = options.undoableTimeout ?? adminOptions.undoableTimeout ?? 5000;

  const removeIdsFromCache = (
    resName: string,
    ids: (string | number)[],
    dataProviderName?: string,
  ) => {
    const matcher = adminContext.queryKeyMatcher(resName, dataProviderName);
    const dataMatch = (queryKey: readonly unknown[], fields: QueryMatcher = {}) => dataQueryMatches(queryKey, {
      ...matcher,
      resource: resName,
      ...fields,
    });
    const primaryKey = adminContext.getResource(resName).primaryKey ?? 'id';
    const deletedIds = new Set(ids.map(String));
    const removeFromCollection = (old: unknown): unknown => {
      if (!old || typeof old !== 'object' || !('data' in old)) return old;
      const current = old as { data: Record<string, unknown>[]; total?: number };
      if (!Array.isArray(current.data)) return old;
      const filtered = current.data.filter((item) => !deletedIds.has(String(item[primaryKey])));
      const removedCount = current.data.length - filtered.length;
      return {
        ...current,
        data: filtered,
        total: current.total == null ? current.total : Math.max(0, current.total - removedCount),
      };
    };
    const removeFromInfiniteCollection = (old: unknown): unknown => {
      if (!old || typeof old !== 'object' || !('pages' in old)) return old;
      const current = old as {
        pages: { data: Record<string, unknown>[]; total?: number }[];
        pageParams?: unknown[];
      };
      if (!Array.isArray(current.pages)) return old;

      const removedIds = new Set<string>();
      for (const page of current.pages) {
        if (!Array.isArray(page.data)) continue;
        for (const item of page.data) {
          const itemId = String(item[primaryKey]);
          if (deletedIds.has(itemId)) removedIds.add(itemId);
        }
      }

      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          data: Array.isArray(page.data)
            ? page.data.filter((item) => !deletedIds.has(String(item[primaryKey])))
            : page.data,
          total: page.total == null ? page.total : Math.max(0, page.total - removedIds.size),
        })),
      };
    };

    queryClient.setQueriesData({
      predicate: (query) => ['list', 'select', 'selectDefaults'].some((action) => dataMatch(query.queryKey, { action })),
    }, removeFromCollection);
    queryClient.setQueriesData({
      predicate: (query) => dataMatch(query.queryKey, { action: 'infiniteList' }),
    }, removeFromInfiniteCollection);
    queryClient.setQueriesData({
      predicate: (query) => dataMatch(query.queryKey, { action: 'many' }),
    }, removeFromCollection);
  };

  const mutation = createMutation<{ data: TData[] }, TError | DeleteManyPartialError, UseDeleteManyMutateParams, DeleteManyMutationContext>(() => ({
    mutationFn: async (params) => {
      const resName = params.resource ?? resource;
      const effectiveMutationMode = params.mutationMode ?? mutationMode;
      const effectiveUndoableTimeout = params.undoableTimeout ?? undoableTimeout;
      if (effectiveMutationMode === 'undoable') {
        await new Promise<void>((resolve, reject) => {
          toast.undoable(i18n.t('common.actionCanBeUndone'), effectiveUndoableTimeout, () => {
            params.onCancel?.();
            reject(new UndoError());
          }, resolve);
        });
      }
      const provider = adminContext.getDataProviderForResource(resName, params.dataProviderName);
      if (provider.deleteMany) return await provider.deleteMany<TData>({ resource: resName, ids: params.ids, meta: params.meta });
      const settled = await Promise.allSettled(
        params.ids.map(id => provider.deleteOne<TData>({ resource: resName, id, meta: params.meta })),
      );
      const succeededIds: (string | number)[] = [];
      const failedIds: (string | number)[] = [];
      const causes: unknown[] = [];
      const data: TData[] = [];
      settled.forEach((result, index) => {
        const id = params.ids[index];
        if (result.status === 'fulfilled') {
          succeededIds.push(id);
          data.push(result.value.data);
        } else {
          failedIds.push(id);
          causes.push(result.reason);
        }
      });
      if (failedIds.length > 0) {
        if (succeededIds.length > 0) {
          throw new DeleteManyPartialError(succeededIds, failedIds, causes);
        }
        throw causes[0] ?? new Error('Delete many failed');
      }
      return { data };
    },
    onMutate: async (params) => {
      const userContext = typeof options.mutationOptions?.onMutate === 'function'
        ? await options.mutationOptions.onMutate(params)
        : undefined;
      const effectiveMutationMode = params.mutationMode ?? mutationMode;
      if (effectiveMutationMode === 'pessimistic') return { _svadmin_ctx: true, userContext };
      const resName = params.resource ?? resource;
      const matcher = adminContext.queryKeyMatcher(resName, params.dataProviderName);
      const dataMatch = (queryKey: readonly unknown[], fields: QueryMatcher = {}) => dataQueryMatches(queryKey, {
        ...matcher,
        resource: resName,
        ...fields,
      });

      await queryClient.cancelQueries({ predicate: (query) => dataMatch(query.queryKey) });
      const previousQueries = queryClient.getQueriesData({ predicate: (query) => dataMatch(query.queryKey) });
      removeIdsFromCache(resName, params.ids, params.dataProviderName);

      return { _svadmin_ctx: true, userContext, previousQueries };
    },
    onSuccess: (data, params, context) => {
      const resName = params.resource ?? resource;
      const extractedContext = context?._svadmin_ctx ? context.userContext : context;
      fireSuccessNotification({
        config: params.successNotification ?? options.successNotification,
        defaultMessage: 'Deleted successfully',
        data: data.data,
        resource: resName,
        provider: adminContext.notificationProvider,
      });
      auditWithProvider(
        { action: 'delete', resource: resName, meta: adminContext.getProviderMeta(resName) },
        adminContext.auditLogProvider,
      );
      publishLiveEvent(resName, 'deleted', params.ids, adminContext);
      for (const id of params.ids) {
        queryClient.removeQueries({
          predicate: (query) => queryKeyMatches(query.queryKey, {
            ...adminContext.queryKeyMatcher(resName, params.dataProviderName),
            kind: 'data',
            resource: resName,
            action: 'one',
            id,
          }),
        });
      }
      if (typeof options.mutationOptions?.onSuccess === 'function') {
        options.mutationOptions.onSuccess(data, params, extractedContext);
      }
    },
    onError: (error, params, context) => {
      if (context?.previousQueries) {
        for (const [queryKey, data] of context.previousQueries) queryClient.setQueryData(queryKey, data);
      }
      if (error instanceof UndoError) return;
      const resName = params.resource ?? resource;
      if (error instanceof DeleteManyPartialError) {
        removeIdsFromCache(resName, error.succeededIds, params.dataProviderName);
        for (const id of error.succeededIds) {
          queryClient.removeQueries({
            predicate: (query) => queryKeyMatches(query.queryKey, {
              ...adminContext.queryKeyMatcher(resName, params.dataProviderName),
              kind: 'data',
              resource: resName,
              action: 'one',
              id,
            }),
          });
        }
        auditWithProvider(
          {
            action: 'delete',
            resource: resName,
            outcome: 'failure',
            details: { succeededIds: error.succeededIds, failedIds: error.failedIds },
            meta: adminContext.getProviderMeta(resName),
          },
          adminContext.auditLogProvider,
        );
        publishLiveEvent(resName, 'deleted', error.succeededIds, adminContext);
      }
      const authError = error instanceof DeleteManyPartialError
        ? (error.causes[0] ?? error)
        : error;
      checkError(authError, adminContext);
      fireErrorNotification({
        config: params.errorNotification ?? options.errorNotification,
        defaultMessage: 'Delete many failed',
        error,
        resource: resName,
        provider: adminContext.notificationProvider,
      });
      const extractedContext = context?._svadmin_ctx ? context.userContext : context;
      if (typeof options.mutationOptions?.onError === 'function') {
        options.mutationOptions.onError(error, params, extractedContext);
      }
    },
    onSettled: (_data, error, params, context) => {
      if (error instanceof UndoError) return;
      const resName = params.resource ?? resource;
      invalidateByScopes({
        queryClient,
        resource: resName,
        scopes: params.invalidates,
        defaults: ['list', 'many'],
        matcher: adminContext.queryKeyMatcher(resName, params.dataProviderName),
      });
      const extractedContext = context?._svadmin_ctx ? context.userContext : context;
      if (typeof options.mutationOptions?.onSettled === 'function') {
        options.mutationOptions.onSettled(_data, error, params, extractedContext);
      }
    },
  }));

  return { mutation, get overtime() { return createOvertimeTracker(() => mutation.isPending, options.overtimeOptions ?? adminOptions.overtime); } };
}

// ─── useInvalidate ──────────────────────────────────────────────────

export function useInvalidate() {
  const queryClient = useQueryClient();
  const adminContext = captureAdminContext();
  return (params: { resource?: string; invalidates?: string[] | 'all' | false; id?: string | number; dataProviderName?: string }) => {
    if (params.invalidates === false) return;
    if (params.invalidates === 'all' || !params.resource) {
      queryClient.invalidateQueries({
        predicate: (q) => queryKeyMatches(q.queryKey, {
          ...adminContext.queryKeyMatcher(undefined, params.dataProviderName),
          kind: 'data',
        }),
      });
      return;
    }
    const res = params.resource;
    invalidateByScopes({
      queryClient,
      resource: res,
      scopes: params.invalidates || ['resourceAll'],
      defaults: ['resourceAll'],
      id: params.id,
      matcher: adminContext.queryKeyMatcher(res, params.dataProviderName),
    });
  };
}

// ─── useOvertime ────────────────────────────────────────────────────

export function useOvertime(options?: OvertimeOptions) {
  let isLoading = $state(false);
  const overtime = createOvertimeTracker(() => isLoading, options);
  return {
    get elapsedTime() { return overtime.elapsedTime; },
    start() { isLoading = true; },
    stop() { isLoading = false; },
  };
}

// ─── useDataProvider ────────────────────────────────────────────────

export function useDataProvider(): (dataProviderName?: string) => DataProvider {
  const adminContext = captureAdminContext();
  return (name?: string) => adminContext.getDataProvider(name);
}

// ─── useThemedLayoutContext ─────────────────────────────────────────

let _sidebarCollapsed = $state(false);

export function resetSidebarCollapsed() { _sidebarCollapsed = false; }

export function useThemedLayoutContext() {
  return {
    get sidebarCollapsed() { return _sidebarCollapsed; },
    setSidebarCollapsed(v: boolean) { _sidebarCollapsed = v; },
    toggleSidebar() { _sidebarCollapsed = !_sidebarCollapsed; },
  };
}
