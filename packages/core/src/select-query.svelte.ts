import { untrack } from 'svelte';
import { createSessionQuery } from './session-query.svelte';
import { captureAuthLiveScope } from './auth-hooks.svelte';
import { definedOptions } from './defined-options';
import { captureContractContext, type ContractOptions } from './contract-context.svelte';
import { getAdminOptions } from './options.svelte';
import { captureQueryProvider, snapshotListParams, snapshotManyParams } from './query-snapshot';
import { decodeListResult, decodeManyResult, rejectProviderResponse, type RecordDecoder } from './record-decoder';
import { createOvertimeTracker } from './hook-utils.svelte';
import type { NotificationConfig, OvertimeOptions } from './hook-utils.svelte';
import { createSelectProjection, mergeSelectOptions, type SelectOption } from './select-options';
import { HttpError, type BaseRecord, type KnownResources, type Pagination, type Sort, type Filter } from './types';

export interface UseSelectOptions<TData extends BaseRecord = BaseRecord> extends ContractOptions {
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

export function createSelectQuery<TData extends BaseRecord>(
  options: UseSelectOptions<TData>, getDecoder: () => RecordDecoder<TData>,
) {
  const context = captureContractContext(options);
  const adminOptions = getAdminOptions();
  let disposed = false;
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
    return { captured, params, decode: getDecoder(), keys: context.queryKeys(resource, options.dataProviderName),
      onSearch: options.onSearch, checkIds: contract !== undefined, authProvider, auth: captureAuthLiveScope(authProvider) };
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
      const extra = snapshotListParams({
        resource: current.params.resource,
        filters: text && current.onSearch ? untrack(() => current.onSearch?.(text)) : [],
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
    const label = options.optionLabel ?? 'title';
    const value = options.optionValue ?? 'id';
    const decodeResult = (input: unknown) => {
      const result = decodeListResult(input, decode);
      if (origin.checkIds && new Set(result.data.map(record => record['id'])).size !== result.data.length) return rejectProviderResponse();
      return result;
    };
    return {
      resource: params.resource, successNotification: options.successNotification, errorNotification: options.errorNotification,
      decode: createSelectProjection(decodeResult, label, value, decode, () => sessionCurrent(origin)),
      queryKey: keys.data.select(params.resource, { ...params, source: captured.source, search: text, invalid: !!error }),
      queryFn: async (signal) => {
        if (error) throw error;
        return decodeResult(await captured.provider.getList(snapshotListParams({ ...params, ...definedOptions({ signal }) })));
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
      resource: base.resource, ids: options.defaultValue ?? [], ...definedOptions({ meta: base.meta }),
    });
    const label = options.optionLabel ?? 'title';
    const value = options.optionValue ?? 'id';
    const expected = new Set<unknown>(params.ids);
    const decodeResult = (input: unknown) => {
      const result = decodeManyResult(input, decode);
      if (origin.checkIds && (expected.size !== params.ids.length || result.data.length !== expected.size ||
        new Set(result.data.map(record => record['id'])).size !== result.data.length ||
        result.data.some(record => !expected.has(record['id'])))) return rejectProviderResponse();
      return result;
    };
    return {
      resource: params.resource, successNotification: false, errorNotification: options.errorNotification,
      decode: createSelectProjection(decodeResult, label, value, decode, () => sessionCurrent(origin)),
      queryKey: keys.data.selectDefaults(params.resource, { ...params, source: captured.source }),
      queryFn: async (signal) => {
        if (!params.ids.length) return { data: [] };
        const getMany = captured.provider.getMany;
        if (!getMany) throw new Error('Captured query provider must support getMany');
        return decodeResult(await getMany.call(captured.provider, snapshotManyParams({ ...params, ...definedOptions({ signal }) })));
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
      search = { scope: current, value };
      return;
    }
    timer = setTimeout(() => {
      if (scope === current && sessionCurrent(current)) search = { scope: current, value };
    }, delay);
  }
  $effect(() => {
    void scope;
    return () => clearTimeout(timer);
  });
  $effect(() => () => { disposed = true; });

  return {
    query, defaultValueQuery, onSearchChange,
    get options() { return mergeSelectOptions(query.data?.options ?? [], defaultValueQuery.data?.options ?? []); },
    get overtime() { return overtime; },
    get isLoading() { return query.isLoading || defaultValueQuery.isLoading; },
    get isFetching() { return query.isFetching || defaultValueQuery.isFetching; },
    get isError() { return query.isError || defaultValueQuery.isError; },
    async refetch() { await Promise.all([query.refetch(), defaultValueQuery.refetch()]); },
  };
}
