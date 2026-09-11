import { definedOptions } from './defined-options';
import { createSessionQuery } from './session-query.svelte';
import { getAdminOptions } from './options.svelte';
import { captureAdminContext } from './context.svelte';
import { captureContractContext,type ContractOptions } from './contract-context.svelte';
import { useParsed } from './useParsed.svelte';
import {
  createOvertimeTracker,
  createLiveSubscription,
} from './hook-utils.svelte';
import type { NotificationConfig,OvertimeOptions,LiveSubscriptionParams } from './hook-utils.svelte';
import type {
  GetListResult,Pagination,Sort,Filter,BaseRecord,
  GetOneResult,GetManyResult,
  KnownResources,
} from './types';
import type { LiveMode,LiveEvent } from './live.svelte';
import { decodeBaseRecord, decodeListResult, decodeOneResult, decodeManyResult, rejectProviderResponse, type RecordDecoder } from './record-decoder';
import { HttpError } from './types';
import { extendReactiveMembers } from './reactive-projection';
import { captureQueryProvider, snapshotListParams, snapshotOneParams, snapshotManyParams } from './query-snapshot';

// ─── useList ───────────────────────────────────────────────────

export type MaybeGetter<T>=T|(() => T);

export interface UseListOptions<_TData extends BaseRecord=BaseRecord,_TError=HttpError> extends ContractOptions {
  resource?: KnownResources;
  pagination?: Pagination;
  sorters?: Sort[];
  filters?: Filter[];
  meta?: Record<string,unknown>;
  dataProviderName?: string;
  queryOptions?: { staleTime?: number; enabled?: boolean; gcTime?: number; refetchOnWindowFocus?: boolean };
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
  liveMode?: LiveMode;
  onLiveEvent?: (event: LiveEvent) => void;
  liveParams?: Record<string,unknown>;
  overtimeOptions?: OvertimeOptions;
}

export function useList(optionsOrGetter: MaybeGetter<UseListOptions>={}) {
  return createListQuery(optionsOrGetter, () => decodeBaseRecord);
}

export function createListQuery<TData extends BaseRecord>(
  optionsOrGetter: MaybeGetter<UseListOptions>, getDecoder: () => RecordDecoder<TData>,
) {
  const adminContext=captureContractContext(optionsOrGetter);
  const parsed=useParsed();
  const adminOptions=getAdminOptions();

  const getOptions=() => typeof optionsOrGetter==='function'? optionsOrGetter():optionsOrGetter;
  const getResource=() => getOptions().resource??parsed.resource??'';

  const query=createSessionQuery<GetListResult<TData>>(adminContext,() => {
    const decode=getDecoder();
    const opts=getOptions();
    const checkId=opts.contract!==undefined;
    const resource=opts.resource??parsed.resource??'';
    const captured=captureQueryProvider(adminContext,{
      resource,...definedOptions({ dataProviderName: opts.dataProviderName,contract: opts.contract,meta: opts.meta }),
    });
    const queryOptions=opts.queryOptions;

    // Inject a parent filter for nested resources.
    // Consume only parentParams parsed from the path, such as teamId in /teams/123/users,
    // instead of query params such as ?tenantId=1 being silently converted into filters.
    //
    // Security boundary: inject only when useList falls back to parsed.resource,
    // or when the explicit resource matches the current route resource.
    const parentFilters: Filter[]=[];
    const injectParent=!opts.resource||opts.resource===parsed.resource;
    if(injectParent&&parsed.parentParams) {
      for(const [paramKey,paramVal] of Object.entries(parsed.parentParams)) {
        if(paramKey.endsWith('Id')&&paramVal) {
          parentFilters.push({ field: paramKey,operator: 'eq',value: paramVal });
        }
      }
    }
    const params=snapshotListParams({
      resource,
      ...definedOptions({
        pagination: opts.pagination,sorters: opts.sorters,
        filters: [...parentFilters,...(opts.filters??[])],meta: captured.meta,
      }),
    });
    const decodeResult=(value: unknown): GetListResult<TData> => {
      const result=decodeListResult(value,decode);
      if(checkId && new Set(result.data.map(row => row['id'])).size!==result.data.length) return rejectProviderResponse();
      return result;
    };

    return {
      resource, successNotification: opts.successNotification, errorNotification: opts.errorNotification,
      decode: decodeResult,
      queryKey: adminContext.queryKeys(resource,opts.dataProviderName).data.list(resource,{
        ...definedOptions({
          pagination: params.pagination,sorters: params.sorters,filters: params.filters,meta: params.meta,
        }),
        source: captured.source,
      }),
      queryFn: async (signal) => decodeResult(await captured.provider.getList(snapshotListParams({ ...params, ...definedOptions({ signal }) }))),
      enabled: queryOptions?.enabled??true,
      ...definedOptions({
        staleTime: queryOptions?.staleTime??adminOptions.reactQuery?.staleTime,
        gcTime: queryOptions?.gcTime??adminOptions.reactQuery?.gcTime,
        refetchOnWindowFocus: queryOptions?.refetchOnWindowFocus??adminOptions.reactQuery?.refetchOnWindowFocus,      }),
    };
  });

  const overtime=createOvertimeTracker(() => query.isLoading,typeof optionsOrGetter==='function'? optionsOrGetter().overtimeOptions:optionsOrGetter.overtimeOptions??adminOptions.overtime);

  createLiveSubscription((): LiveSubscriptionParams => {
    const opts=getOptions();
    return {
      resource: getResource(),
      ...definedOptions({
        liveProvider: adminContext.liveProvider,
        liveMode: opts.liveMode??adminOptions.liveMode,
        contract: opts.contract,
        onLiveEvent: opts.onLiveEvent,
        onGlobalLiveEvent: adminOptions.onLiveEvent,
      }),
      ...definedOptions({ liveParams: opts.liveParams }),
      enabled: opts.queryOptions?.enabled??true,
      ...definedOptions({ dataProviderName: opts.dataProviderName }),
    };
  });

  return extendReactiveMembers(query,{ overtime });
}

// ─── useOne ────────────────────────────────────────────────────

export interface UseOneOptions<_TData extends BaseRecord=BaseRecord,_TError=HttpError> extends ContractOptions {
  resource?: KnownResources;
  id?: string|number;
  meta?: Record<string,unknown>;
  dataProviderName?: string;
  queryOptions?: { staleTime?: number; enabled?: boolean; gcTime?: number; refetchOnWindowFocus?: boolean };
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
  liveMode?: LiveMode;
  onLiveEvent?: (event: LiveEvent) => void;
  liveParams?: Record<string,unknown>;
  overtimeOptions?: OvertimeOptions;
}

export function useOne(optionsOrGetter: MaybeGetter<UseOneOptions>={}) {
  return createOneQuery(optionsOrGetter, () => decodeBaseRecord);
}

export function createOneQuery<TData extends BaseRecord>(
  optionsOrGetter: MaybeGetter<UseOneOptions>, getDecoder: () => RecordDecoder<TData>,
) {
  const adminContext=captureContractContext(optionsOrGetter);
  const parsed=useParsed();
  const adminOptions=getAdminOptions();

  const getOptions=() => typeof optionsOrGetter==='function'? optionsOrGetter():optionsOrGetter;
  const getResource=() => getOptions().resource??parsed.resource??'';
  const getId=() => getOptions().id??parsed.id;

  const query=createSessionQuery<GetOneResult<TData>>(adminContext,() => {
    const decode=getDecoder();
    const opts=getOptions();
    const resource=opts.resource??parsed.resource??'';
    const id=opts.id??parsed.id;
    const checkId=opts.contract!==undefined;
    const captured=captureQueryProvider(adminContext,{
      resource,...definedOptions({ dataProviderName: opts.dataProviderName,contract: opts.contract,meta: opts.meta }),
    });
    const params=id==null? undefined:snapshotOneParams({
      resource,id,...definedOptions({ meta: captured.meta }),
    });
    const queryOptions=opts.queryOptions;

    return {
      resource, successNotification: opts.successNotification, errorNotification: opts.errorNotification,
      decode: value => {
        const decoded=decodeOneResult(value,decode);
        if(checkId && params && decoded.data['id']!==params.id) return rejectProviderResponse();
        return decoded;
      },
      queryKey: adminContext.queryKeys(resource,opts.dataProviderName).data.one(resource,id??'',{
        ...definedOptions({ meta: captured.meta }),
        source: captured.source,
      }),
      queryFn: async (signal) => {
        if(!params) throw new HttpError('Reading a record requires an id',422,undefined,{ code: 'INVALID_RESOURCE_INPUT' });
        const result=await captured.provider.getOne(snapshotOneParams({ ...params, ...definedOptions({ signal }) }));
        const decoded=decodeOneResult(result, decode);
        if(checkId && decoded.data['id']!==params.id) return rejectProviderResponse();
        return decoded;      },
      enabled: (queryOptions?.enabled??true)&&id!=null,
      ...definedOptions({
        staleTime: queryOptions?.staleTime??adminOptions.reactQuery?.staleTime,
        gcTime: queryOptions?.gcTime??adminOptions.reactQuery?.gcTime,
        refetchOnWindowFocus: queryOptions?.refetchOnWindowFocus??adminOptions.reactQuery?.refetchOnWindowFocus,
      }),
    };
  });

  const overtime=createOvertimeTracker(() => query.isLoading,typeof optionsOrGetter==='function'? optionsOrGetter().overtimeOptions:optionsOrGetter.overtimeOptions??adminOptions.overtime);

  createLiveSubscription((): LiveSubscriptionParams => {
    const opts=getOptions();
    const resource=getResource();
    return {
      resource,
      ...definedOptions({
        liveProvider: adminContext.liveProvider,
        liveMode: opts.liveMode??adminOptions.liveMode,
        contract: opts.contract,
        onLiveEvent: opts.onLiveEvent,
        onGlobalLiveEvent: adminOptions.onLiveEvent,
      }),
      ...definedOptions({ liveParams: opts.liveParams }),
      enabled: (opts.queryOptions?.enabled??true)&&getId()!=null,
      ...definedOptions({ dataProviderName: opts.dataProviderName }),
    };
  });

  return extendReactiveMembers(query,{ overtime });
}

// ─── useShow ──────────────────────────────────────────────────
export function createShowQuery<TData extends BaseRecord>(
  optionsOrGetter: MaybeGetter<UseOneOptions>, getDecoder: () => RecordDecoder<TData>,
) {
  const parsed=useParsed();
  const getOptions=() => typeof optionsOrGetter==='function'? optionsOrGetter():optionsOrGetter;

  let _showId=$state<string|number|undefined>(undefined);

  // showId prioritizes explicit setShowId, then options.id, then URL id.
  const showId=$derived(_showId??getOptions().id??parsed.id);

  function setShowId(id: string|number) { _showId=id; }

  // We wrap it in a getter so useOne evaluates it dynamically.
  const result=createOneQuery(() => ({
    ...getOptions(),
    ...definedOptions({ id: showId }),
  }), getDecoder);

  return extendReactiveMembers(result,{ get showId() { return showId; },setShowId });
}

// ─── useMany ───────────────────────────────────────────────────

export interface UseManyOptions<_TData extends BaseRecord=BaseRecord,_TError=HttpError> extends ContractOptions {
  resource: KnownResources;
  ids: (string|number)[];
  meta?: Record<string,unknown>;
  dataProviderName?: string;
  queryOptions?: { staleTime?: number; enabled?: boolean; gcTime?: number; refetchOnWindowFocus?: boolean };
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
  liveMode?: LiveMode;
  onLiveEvent?: (event: LiveEvent) => void;
  liveParams?: Record<string,unknown>;
  overtimeOptions?: OvertimeOptions;
}

export function useMany(optionsOrGetter: MaybeGetter<UseManyOptions>) {
  return createManyQuery(optionsOrGetter, () => decodeBaseRecord);
}

export function createManyQuery<TData extends BaseRecord>(
  optionsOrGetter: MaybeGetter<UseManyOptions>, getDecoder: () => RecordDecoder<TData>,
) {
  const adminContext=captureContractContext(optionsOrGetter);
  const adminOptions=getAdminOptions();
  const getOptions=() => typeof optionsOrGetter==='function'? optionsOrGetter():optionsOrGetter;

  const query=createSessionQuery<GetManyResult<TData>>(adminContext,() => {
    const decode=getDecoder();
    const opts=getOptions();
    const checkId=opts.contract!==undefined;
    const { resource,ids,meta,dataProviderName,queryOptions }=opts;
    const captured=captureQueryProvider(adminContext,{
      resource,...definedOptions({ dataProviderName,contract: opts.contract,meta }),
    });
    const params=snapshotManyParams({
      resource,ids,...definedOptions({ meta: captured.meta }),
    });
    const expected=new Set<unknown>(params.ids);
    const decodeResult=(value: unknown): GetManyResult<TData> => {
      const result=decodeManyResult(value,decode);
      if(checkId && (expected.size!==params.ids.length || result.data.length!==expected.size ||
        new Set(result.data.map(row => row['id'])).size!==result.data.length ||
        result.data.some(row => !expected.has(row['id'])))) return rejectProviderResponse();
      return result;
    };

    return {
      resource, successNotification: opts.successNotification, errorNotification: opts.errorNotification,
      decode: decodeResult,
      queryKey: adminContext.queryKeys(resource,dataProviderName).data.many(resource,{
        ids: params.ids,
        ...definedOptions({ meta: params.meta }),
        source: captured.source,
      }),
      queryFn: async (signal) => {
        if(!params.ids.length) return { data: [] };
        if(captured.provider.getMany) {
          return decodeResult(await captured.provider.getMany(snapshotManyParams({ ...params, ...definedOptions({ signal }) })));
        }
        const results=await Promise.all(params.ids.map(async id => decodeOneResult(await captured.provider.getOne(snapshotOneParams({
          resource,...definedOptions({
            id,meta: params.meta,signal
          })
        })),decode)));
        return decodeResult({ data: results.map(r => r.data) });      },
      enabled: (queryOptions?.enabled??true)&&params.ids.length>0,
      ...definedOptions({
        staleTime: queryOptions?.staleTime??adminOptions.reactQuery?.staleTime,
        gcTime: queryOptions?.gcTime??adminOptions.reactQuery?.gcTime,
        refetchOnWindowFocus: queryOptions?.refetchOnWindowFocus??adminOptions.reactQuery?.refetchOnWindowFocus,
      }),
    };
  });

  const overtime=createOvertimeTracker(() => query.isLoading,typeof optionsOrGetter==='function'? optionsOrGetter().overtimeOptions:optionsOrGetter.overtimeOptions??adminOptions.overtime);

  createLiveSubscription((): LiveSubscriptionParams => {
    const opts=getOptions();
    return {
      resource: opts.resource,
      ...definedOptions({
        liveProvider: adminContext.liveProvider,
        liveMode: opts.liveMode??adminOptions.liveMode,
        contract: opts.contract,
        onLiveEvent: opts.onLiveEvent,
        onGlobalLiveEvent: adminOptions.onLiveEvent,
      }),
      ...definedOptions({ liveParams: opts.liveParams }),
      enabled: (opts.queryOptions?.enabled??true)&&opts.ids.length>0,
      ...definedOptions({ dataProviderName: opts.dataProviderName }),
    };
  });

  return extendReactiveMembers(query,{ overtime });
}

export function useApiUrl(dataProviderName?: string): string {
  return captureAdminContext().getDataProvider(dataProviderName).getApiUrl();
}
