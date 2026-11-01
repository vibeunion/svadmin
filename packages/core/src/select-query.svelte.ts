import { untrack } from 'svelte';
import { useQueryClient } from '@tanstack/svelte-query';
import { createSessionQuery } from './session-query.svelte';
import { captureAuthLiveScope } from './auth-hooks.svelte';
import { definedOptions } from './defined-options';
import { captureContractContext, type ContractOptions } from './contract-context.svelte';
import { getAdminOptions } from './options.svelte';
import { captureQueryProvider, snapshotListParams, snapshotManyParams } from './query-snapshot';
import { decodeListResult, decodeManyResult, decodeBaseRecord, rejectProviderResponse, type RecordDecoder } from './record-decoder';
import { createOvertimeTracker } from './hook-utils.svelte';
import type { NotificationConfig, OvertimeOptions } from './hook-utils.svelte';
import { createSelectProjection, normalizeSelectDefaultValue, orderSelectOptions, selectQueryFilters, type SelectOption, type SelectedOptionsOrder } from './select-options';
import { HttpError, type BaseRecord, type KnownResources, type Pagination, type Sort, type Filter } from './types';
import type { QueryKey } from './query-keys';

function withAuthSession(key: QueryKey, authSession: string): QueryKey {
  const descriptor = key[0];
  return [{ ...descriptor, params: { ...decodeBaseRecord(descriptor.params), authSession } }];
}

export interface UseSelectOptions<TData extends BaseRecord = BaseRecord> extends ContractOptions {
  resource: KnownResources;
  /** @internal Distinguishes consumers that use different projection semantics. */
  projectionKey?: string;
  optionLabel?: string | ((item: TData) => string);
  optionValue?: string | ((item: TData) => string | number);
  sorters?: Sort[];
  filters?: Filter[];
  defaultValue?: string | number | readonly (string | number)[];
  /** 未提供 onSearch 时，用该字段生成 contains 过滤。 */
  searchField?: string;
  /** selected-first 把已选记录放在选项前面；默认保持列表原顺序。 */
  selectedOptionsOrder?: SelectedOptionsOrder;
  fetchSize?: number;
  pagination?: Pagination;
  debounce?: number;
  /** Optional timeout in milliseconds for list and selected-record reads. */
  requestTimeout?: number;
  queryOptions?: { staleTime?: number; enabled?: boolean };
  defaultValueQueryOptions?: { staleTime?: number; enabled?: boolean };
  meta?: Record<string, unknown>;
  dataProviderName?: string;
  onSearch?: (value: string) => Filter[];
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
  overtimeOptions?: OvertimeOptions;
}

export function createSelectQuery<TData extends BaseRecord>(
  options: UseSelectOptions<TData>, getDecoder: () => RecordDecoder<TData>,
) {
  const context = captureContractContext(options);
  const adminOptions = getAdminOptions();
  const queryClient = useQueryClient();
  let disposed = false;
  interface ActiveRequest { controller: AbortController; key: QueryKey; active: boolean }
  const listRequests = new Set<ActiveRequest>();
  const defaultsRequests = new Set<ActiveRequest>();
  // 当前观察者仍挂载的查询 key；用于区分“同 key 显式取消”和“已切到新搜索/作用域”。
  let currentListKey: QueryKey | undefined;
  let currentDefaultsKey: QueryKey | undefined;
  // 请求由共享的 TanStack query 持有；单个消费者离开时不能中止仍有其他 observer 的请求。
  function cancelOwnedRequests(requests: Set<ActiveRequest>, getCurrentKey: () => QueryKey | undefined): void {
    const snapshot = [...requests];
    // 延后到 Svelte 完成 observer key 切换后再判定，避免把仍在使用的共享请求误判为本消费者独占。
    setTimeout(() => {
      for (const entry of snapshot) {
        if (!entry.active || entry.controller.signal.aborted) continue;
        const cached = queryClient.getQueryCache().find({ queryKey: entry.key, exact: true });
        const observers = cached?.getObserversCount() ?? 0;
        const stillOnKey = getCurrentKey() === entry.key;
        // 已卸载或已切到新 key 时，本消费者不再使用旧请求，仅在没有其他 observer 时中止。
        // 同 key 显式 cancel 时本 observer 仍计入数量，因此最多保留一个 observer。
        if (disposed || !stillOnKey ? observers === 0 : observers <= 1) entry.controller.abort();
      }
    }, 0);
  }
  function cancelListRequests(): void { cancelOwnedRequests(listRequests, () => currentListKey); }
  function cancelRequests(): void {
    cancelOwnedRequests(listRequests, () => currentListKey);
    cancelOwnedRequests(defaultsRequests, () => currentDefaultsKey);
  }
  function selectRequest<T>(
    requests: Set<ActiveRequest>, key: QueryKey, signal: AbortSignal | undefined,
    run: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const timeout = options.requestTimeout;
    if (timeout !== undefined && (!Number.isSafeInteger(timeout) || timeout <= 0 || timeout > 2_147_483_647)) {
      return Promise.reject(new HttpError('Invalid select request timeout', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' }));
    }
    const controller = new AbortController();
    const entry: ActiveRequest = { controller, key, active: true };
    requests.add(entry);
    const forwardAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener('abort', forwardAbort, { once: true });
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const finish = (): boolean => {
        if (settled) return false;
        settled = true;
        entry.active = false;
        requests.delete(entry);
        if (timer !== undefined) clearTimeout(timer);
        signal?.removeEventListener('abort', forwardAbort);
        return true;
      };
      const fail = (error: Error): void => {
        if (finish()) reject(error);
      };
      if (controller.signal.aborted) {
        fail(new HttpError('Select request cancelled', 409, undefined, { code: 'SELECT_REQUEST_CANCELLED' }));
        return;
      }
      if (timeout !== undefined) {
        timer = setTimeout(() => {
          fail(new HttpError('Select request timed out', 504, undefined, { code: 'SELECT_REQUEST_TIMEOUT' }));
          controller.abort();
        }, timeout);
      }
      let request: Promise<T>;
      try {
        request = run(controller.signal);
      } catch (error) {
        fail(error instanceof Error ? error : new Error('Select request failed'));
        return;
      }
      request.then(value => {
        if (!finish()) return;
        resolve(value);
      }, (error: unknown) => {
        fail(error instanceof Error ? error : new Error('Select request failed'));
      });
    });
  }
  const scope = $derived.by(() => {
    const resource = options.resource;
    const contract = options.contract;
    const captured = captureQueryProvider(context, {
      resource, ...definedOptions({
        dataProviderName: options.dataProviderName, contract, meta: options.meta,
      }),
    });
    const params = snapshotListParams({
      resource, ...definedOptions({
        pagination: { ...options.pagination, current: options.pagination?.current ?? 1,
          pageSize: options.fetchSize ?? options.pagination?.pageSize ?? 999 },
        filters: options.filters, sorters: options.sorters, meta: captured.meta,
      }),
    });
    const authProvider = context.authProvider;
    return {
      captured,
      params,
      decode: getDecoder(),
      keys: context.queryKeys(resource, options.dataProviderName),
      optionLabel: options.optionLabel,
      optionValue: options.optionValue,
      projectionKey: options.projectionKey ?? [
        typeof options.optionLabel === 'string' ? options.optionLabel : 'callback',
        typeof options.optionValue === 'string' ? options.optionValue : 'callback',
      ].join(':'),
      onSearch: options.onSearch,
      searchField: options.searchField,
      checkIds: contract !== undefined,
      authProvider,
      auth: captureAuthLiveScope(authProvider),
    };
  });
  const sessionCurrent = (origin: typeof scope) => !disposed &&
    origin.authProvider === context.authProvider && origin.auth.isCurrent();
  let search = $state.raw<{ scope: typeof scope; value: string } | undefined>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const request = $derived.by(() => {
    const current = scope;
    const text = search?.scope === current && sessionCurrent(current) ? search.value : '';
    try {
      // Validate callback output before spreading it or giving it to the provider.
      const searched = text && current.onSearch ? untrack(() => current.onSearch?.(text)) ?? [] : undefined;
      const extra = snapshotListParams({
        resource: current.params.resource,
        filters: selectQueryFilters({
          text,
          ...definedOptions({ searchField: current.searchField, searched }),
        }),
      });
      return { params: snapshotListParams({
        ...current.params, filters: [...(current.params.filters ?? []), ...(extra.filters ?? [])],
      }), text, error: undefined };
    } catch {
      return { params: current.params, text,
        error: new HttpError('Invalid select search', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' }) };
    }
  });
  const query = createSessionQuery<
    { data: TData[]; total: number },
    { data: TData[]; total: number; options: SelectOption[] }
  >(context, () => {
    const origin = scope;
    const { captured, decode, keys } = origin;
    const { params, text, error } = request;
    const label = origin.optionLabel ?? 'title';
    const value = origin.optionValue ?? 'id';
    const decodeResult = (input: unknown) => {
      const result = decodeListResult(input, decode);
      if (origin.checkIds && new Set(result.data.map(record => record['id'])).size !== result.data.length) return rejectProviderResponse();
      return result;
    };
    const queryKey = keys.data.select(params.resource, {
      ...params, source: captured.source, search: text, invalid: !!error, projection: origin.projectionKey,
    });
    const requestKey = withAuthSession(queryKey, origin.auth.cacheKey);
    currentListKey = requestKey;
    return {
      resource: params.resource, successNotification: options.successNotification, errorNotification: options.errorNotification,
      decode: createSelectProjection(decodeResult, label, value, decode, () => sessionCurrent(origin)),
      queryKey,
      // 同一 key 的请求可由其他 observer 共享，不能因本实例卸载或切换搜索而丢弃共享结果。
      allowRetiredQueryFn: true,
      queryFn: async (signal) => {
        if (error) throw error;
        return selectRequest(listRequests, requestKey, signal, requestSignal =>
          captured.provider.getList(snapshotListParams({ ...params, ...definedOptions({ signal: requestSignal }) })),
        ).then(decodeResult);
      },
      enabled: options.queryOptions?.enabled ?? true,
      ...definedOptions({ staleTime: options.queryOptions?.staleTime ?? adminOptions.reactQuery?.staleTime }),
    };
  });
  const defaultValueQuery = createSessionQuery<
    { data: TData[] }, { data: TData[]; options: SelectOption[] }
  >(context, () => {
    const origin = scope;
    const { captured, decode, keys, params: base } = origin;
    const params = snapshotManyParams({
      resource: base.resource, ids: normalizeSelectDefaultValue(options.defaultValue), ...definedOptions({ meta: base.meta }),
    });
    const label = origin.optionLabel ?? 'title';
    const value = origin.optionValue ?? 'id';
    const expected = new Set<unknown>(params.ids);
    const decodeResult = (input: unknown) => {
      const result = decodeManyResult(input, decode);
      if (origin.checkIds && (expected.size !== params.ids.length || result.data.length !== expected.size ||
        new Set(result.data.map(record => record['id'])).size !== result.data.length ||
        result.data.some(record => !expected.has(record['id'])))) return rejectProviderResponse();
      return result;
    };
    const queryKey = keys.data.selectDefaults(params.resource, { ...params, source: captured.source, projection: origin.projectionKey });
    const requestKey = withAuthSession(queryKey, origin.auth.cacheKey);
    currentDefaultsKey = requestKey;
    return {
      resource: params.resource, successNotification: false, errorNotification: options.errorNotification,
      decode: createSelectProjection(decodeResult, label, value, decode, () => sessionCurrent(origin)),
      queryKey,
      allowRetiredQueryFn: true,
      queryFn: async (signal) => {
        if (!params.ids.length) return { data: [] };
        const getMany = captured.provider.getMany;
        if (!getMany) throw new Error('Captured query provider must support getMany');
        return selectRequest(defaultsRequests, requestKey, signal, requestSignal =>
          getMany.call(captured.provider, snapshotManyParams({ ...params, ...definedOptions({ signal: requestSignal }) })),
        ).then(decodeResult);
      },
      enabled: (options.queryOptions?.enabled ?? true) &&
        (options.defaultValueQueryOptions?.enabled ?? true) && params.ids.length > 0,
      staleTime: options.defaultValueQueryOptions?.staleTime ?? Infinity,
    };
  });
  const overtime = createOvertimeTracker(
    () => query.isLoading || defaultValueQuery.isLoading, options.overtimeOptions ?? adminOptions.overtime,
  );

  function onSearchChange(value: string) {
    if (typeof value !== 'string') throw new TypeError('Select search must be a string');
    const delay = options.debounce ?? 300;
    if (!Number.isFinite(delay) || delay < 0) throw new TypeError('Select debounce must be a finite nonnegative number');
    clearTimeout(timer);
    const current = scope;
    if (!sessionCurrent(current)) return;
    if (!value || delay === 0) {
      cancelListRequests();
      search = { scope: current, value };
      return;
    }
    timer = setTimeout(() => {
      if (scope === current && sessionCurrent(current)) {
        cancelListRequests();
        search = { scope: current, value };
      }
    }, delay);
  }
  $effect(() => {
    void scope;
    return () => clearTimeout(timer);
  });
  $effect(() => () => { disposed = true; cancelRequests(); });

  return {
    query, defaultValueQuery, onSearchChange, cancel: cancelRequests,
    get options() {
      return orderSelectOptions(
        query.data?.options ?? [],
        defaultValueQuery.data?.options ?? [],
        options.selectedOptionsOrder ?? 'in-place',
      );
    },
    get overtime() { return overtime; },
    get isLoading() { return query.isLoading || defaultValueQuery.isLoading; },
    get isFetching() { return query.isFetching || defaultValueQuery.isFetching; },
    get isError() { return query.isError || defaultValueQuery.isError; },
    async refetch() { await Promise.all([query.refetch(), defaultValueQuery.refetch()]); },
  };
}
