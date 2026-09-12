import { definedOptions } from './defined-options';
import * as query from './query-hooks.svelte';
import * as bulk from './hooks.svelte';
import { createTableQuery,type UseTableOptions } from './table-hooks.svelte';
import type { ContractOptions } from './contract-context.svelte';
import { captureAdminContext } from './context.svelte';
import { contractKey,validateContractId,parseContractId,parseContractRecord,type ResourceContract,type ContractSchemas,type ContractRecord,type ContractId,type ContractFormAction } from './resource-contract';
import type { RecordDecoder } from './record-decoder';
import type { KnownResources,Filter } from './types';
import { useQueryClient } from '@tanstack/svelte-query';
import { replaceReactiveMembers } from './reactive-projection';
import { snapshotInvalidationParams } from './invalidation-contract';
import { captureQueryProvider } from './query-snapshot';
import { captureAuthLiveScope } from './auth-hooks.svelte';
import { invalidateOwnedQueries, refreshSuperseded, type RefreshScope } from './query-invalidation';
import { useContractDelete, type ContractDeleteOptions } from './delete-hooks.svelte';
import { useContractUpdate, type ContractUpdateOptions } from './update-hooks.svelte';
import { useContractForm, type ContractFormOptions } from './contract-form.svelte';
import { useContractDeleteMany, type ContractDeleteManyOptions } from './delete-many-hooks.svelte';
import { useContractUpdateMany, type ContractUpdateManyOptions } from './update-many-hooks.svelte';
import type { ContractUpdateManyParams } from './update-many-contract';
import type { ContractDeleteManyParams } from './delete-many-contract';
import { useContractCreateMany, type ContractCreateManyOptions } from './create-many-hooks.svelte';
import { useContractCreate, type ContractCreateOptions } from './create-hooks.svelte';

type Field<T>=Extract<keyof T,string>;
type ValueField<T>={ [K in Field<T>]-?: T[K] extends string|number? K:never }[Field<T>];
type FieldPredicate<T>=
  |{ operator: 'eq'|'ne'; value: Exclude<T,undefined> }
  |{ operator: 'in'|'nin'; value: Exclude<T,undefined>[] }
  |{ operator: 'null'|'nnull'; value: null }
  |(NonNullable<T> extends string? { operator: 'contains'|'ncontains'|'startswith'|'endswith'; value: NonNullable<T> }:never)
  |(NonNullable<T> extends string|number? (
    |{ operator: 'lt'|'lte'|'gt'|'gte'; value: NonNullable<T> }
    |{ operator: 'between'|'nbetween'; value: [NonNullable<T>,NonNullable<T>] }
  ):never);
export type ContractFilter<T>=string extends keyof T ? Filter : Filter&(
  |{ [K in Field<T>]: { field: K }&FieldPredicate<T[K]> }[Field<T>]
  |{ operator: 'and'|'or'; value: ContractFilter<T>[] });
export type ContractSort<T>={ field: Field<T>; order: 'asc'|'desc' };
type Bound<S extends ContractSchemas>={ resource: ResourceContract<S> };
type QueryOptions<O,S extends ContractSchemas>=
  Omit<O,'resource'|'contract'|'id'|'ids'|'filters'|'sorters'>&Bound<S>;
type ListOptions<O,S extends ContractSchemas>=QueryOptions<O,S>&{
  filters?: ContractFilter<NoInfer<ContractRecord<S>>>[];
  sorters?: ContractSort<NoInfer<ContractRecord<S>>>[];
};
type Id<S extends ContractSchemas>=NoInfer<ContractId<S>>;
type Row<S extends ContractSchemas>=ContractRecord<S>;

function bind<O extends Bound<ContractSchemas>>(options: O): Omit<O,'resource'|'contract'>&{ resource: KnownResources }&ContractOptions {
  contractKey(options.resource);
  return replaceReactiveMembers(options,{
    get resource() {
      contractKey(options.resource);
      return options.resource.name;
    },
    get contract() {
      contractKey(options.resource);
      return options.resource;
    },
  });
}
function getter<O extends Bound<ContractSchemas>>(options: query.MaybeGetter<O>) {
  return () => bind(typeof options==='function'? options():options);
}

function recordDecoder<S extends ContractSchemas>(options: query.MaybeGetter<Bound<S>>): () => RecordDecoder<Row<S>> {
  return () => {
    const contract=(typeof options==='function'? options():options).resource;
    return value => parseContractRecord(contract,value);
  };
}

export function useList<S extends ContractSchemas>(options: query.MaybeGetter<ListOptions<query.UseListOptions,S>>) {
  return query.createListQuery(getter(options),recordDecoder(options));
}
export function useOne<S extends ContractSchemas>(options: query.MaybeGetter<QueryOptions<query.UseOneOptions,S>&{ id: Id<S> }>) {
  return query.createOneQuery(getter(options),recordDecoder(options));
}
export function useMany<S extends ContractSchemas>(options: query.MaybeGetter<QueryOptions<query.UseManyOptions,S>&{ ids: Id<S>[] }>) {
  return query.createManyQuery(getter(options),recordDecoder(options));
}
export function useShow<S extends ContractSchemas>(options: query.MaybeGetter<QueryOptions<query.UseOneOptions,S>&{ id: Id<S> }>) {
  const result=query.createShowQuery(getter(options),recordDecoder(options));
  return replaceReactiveMembers(result,{
    get showId(): Id<S> {
      return parseContractId((typeof options==='function'? options():options).resource,result.showId);
    },
    setShowId(id: Id<S>) {
      validateContractId((typeof options==='function'? options():options).resource,id);
      result.setShowId(id);
    },
  });
}
export function useInfiniteList<S extends ContractSchemas>(options: ListOptions<bulk.UseInfiniteListOptions,S>) {
  return bulk.createInfiniteListQuery(bind(options),recordDecoder(options));
}
export function useSelect<S extends ContractSchemas>(
  options: ListOptions<Omit<bulk.UseSelectOptions<Row<S>>,'optionLabel'|'optionValue'|'defaultValue'|'onSearch'>,S>&{
    optionLabel: Field<NoInfer<Row<S>>>|((row: NoInfer<Row<S>>) => string);
    optionValue: ValueField<NoInfer<Row<S>>>|((row: NoInfer<Row<S>>) => string|number);
    defaultValue?: Id<S>[];
    onSearch?: (value: string) => ContractFilter<NoInfer<Row<S>>>[];
  },
) {
  return bulk.createSelectQuery(bind(options),recordDecoder(options));
}
export function useTable<S extends ContractSchemas>(
  options: query.MaybeGetter<QueryOptions<UseTableOptions,S>&{
    sorters?: { initial?: ContractSort<NoInfer<Row<S>>>[]; permanent?: ContractSort<NoInfer<Row<S>>>[]; mode?: 'off'|'server' };
    filters?: { initial?: ContractFilter<NoInfer<Row<S>>>[]; permanent?: ContractFilter<NoInfer<Row<S>>>[]; mode?: 'off'|'server'; defaultBehavior?: 'merge'|'replace' };
  }>,
) {
  const result=createTableQuery(getter(options),recordDecoder(options));
  return replaceReactiveMembers(result,{
    setSorters(value: ContractSort<Row<S>>[]) { result.setSorters(value); },
    setFilters(value: ContractFilter<Row<S>>[],mode?: 'merge'|'replace') { result.setFilters(value,mode); },
  });
}

export function useCreate<S extends ContractSchemas>(options: ContractCreateOptions<S>) {
  return useContractCreate(options);
}
export function useUpdate<S extends ContractSchemas>(options: ContractUpdateOptions<S>) {
  return useContractUpdate(options);
}
export function useDelete<S extends ContractSchemas>(options: ContractDeleteOptions<S>) {
  return useContractDelete(options);
}
export function useCreateMany<S extends ContractSchemas>(options: ContractCreateManyOptions<S>) {
  return useContractCreateMany(options);
}
export function useUpdateMany<S extends ContractSchemas>(options: ContractUpdateManyOptions<S>) {
  return useContractUpdateMany(options);
}
export function useDeleteMany<S extends ContractSchemas>(options: ContractDeleteManyOptions<S>) {
  return useContractDeleteMany(options);
}

export function useInvalidate<S extends ContractSchemas>(options: Bound<S>&{ dataProviderName?: string }) {
  contractKey(options.resource);
  const context=captureAdminContext();
  const client=useQueryClient();
  let disposed=false;
  $effect(() => () => { disposed=true; });
  return async (params: { id?: Id<S>; invalidates?: ('list'|'many'|'detail'|'resourceAll')[]|'all'|false }={}): Promise<void> => {
    const input=snapshotInvalidationParams(params);
    const contract=options.resource;
    const key=contractKey(contract);
    if(input.id!==undefined) validateContractId(contract,input.id);
    if(input.invalidates===false||(Array.isArray(input.invalidates)&&input.invalidates.length===0)) return;
    const auth=context.authProvider;
    const authScope=captureAuthLiveScope(auth);
    if(disposed || !authScope.isCurrent()) throw refreshSuperseded();
    const resource=contract.name;
    const providerName=options.dataProviderName;
    // Validate the selected route before context's legacy provider fallback can run.
    const captured=captureQueryProvider(context,{
      resource,contract,...definedOptions({ dataProviderName: providerName }),
    });
    const matcher={ ...context.queryKeyMatcher(resource,providerName),contract: key };
    const tenant=context.tenantCacheKey?.__svadminTenant;
    const current=() => {
      try {
        return !disposed && auth===context.authProvider && authScope.isCurrent() &&
          tenant===context.tenantCacheKey?.__svadminTenant && key===contractKey(options.resource) &&
          matcher.provider===context.queryKeyMatcher(resource,providerName).provider &&
          providerName===options.dataProviderName && captured.source===captureQueryProvider(context,{
            resource,contract: options.resource,...definedOptions({ dataProviderName: providerName }),
          }).source;
      } catch { return false; }
    };
    const scopes: readonly RefreshScope[]=input.invalidates===undefined || input.invalidates==='all'
      ? ['resourceAll'] : input.invalidates;
    await invalidateOwnedQueries({
      client, matcher: { ...matcher,resource }, owner: { source: captured.source,authSession: authScope.cacheKey },
      scopes, current, ...definedOptions({ id: input.id }),
    });
  };
}

export function useForm<S extends ContractSchemas,A extends ContractFormAction>(options: ContractFormOptions<S,A>) {
  return useContractForm(options);
}

export type StrictUseListOptions<S extends ContractSchemas>=ListOptions<query.UseListOptions,S>;
export type StrictUseOneOptions<S extends ContractSchemas>=QueryOptions<query.UseOneOptions,S>&{ id: Id<S> };
export type StrictUseManyOptions<S extends ContractSchemas>=QueryOptions<query.UseManyOptions,S>&{ ids: Id<S>[] };
export type StrictUseInfiniteListOptions<S extends ContractSchemas>=Parameters<typeof useInfiniteList<S>>[0];
export type StrictUseSelectOptions<S extends ContractSchemas>=Parameters<typeof useSelect<S>>[0];
export type StrictUseDeleteManyOptions<S extends ContractSchemas>=ContractDeleteManyOptions<S>;
export type StrictUseDeleteManyMutateParams<S extends ContractSchemas>=ContractDeleteManyParams<S>;
export type StrictUseUpdateManyMutateParams<S extends ContractSchemas>=ContractUpdateManyParams<S>;
export type StrictUseCreateManyMutateParams<S extends ContractSchemas>=
  Parameters<ReturnType<typeof useCreateMany<S>>['mutation']['mutateAsync']>[0];
export type StrictUseFormOptions<S extends ContractSchemas,A extends ContractFormAction>=Parameters<typeof useForm<S,A>>[0];
export type StrictUseFormReturn<S extends ContractSchemas,A extends ContractFormAction>=ReturnType<typeof useForm<S,A>>;
