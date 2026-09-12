import { definedOptions } from './defined-options';
import type {
  AgentProvider,
  ChatProvider,
} from './chatProvider.svelte';
import type { AuditLogProvider } from './audit';
import type { AccessControlProvider } from './permissions.svelte';
import type { LiveProvider } from './live.svelte';
import type { RouterProvider } from './router-provider';
import type {
  CredentialProvider,
  IdentityGovernanceProvider,
  OrganizationProvider,
  SessionProvider,
} from './enterprise';
import type {
  AuthProvider,
  BaseRecord,
  CreateManyParams,
  CreateManyResult,
  CreateParams,
  CreateResult,
  CustomParams,
  CustomResult,
  DataProvider,
  DeleteManyParams,
  DeleteManyResult,
  DeleteParams,
  DeleteResult,
  GetListParams,
  GetListResult,
  GetManyParams,
  GetManyResult,
  GetOneParams,
  GetOneResult,
  NotificationProvider,
  TaskProvider,
  UpdateManyParams,
  UpdateManyResult,
  UpdateParams,
  UpdateResult,
} from './types';

export type DataProviderInput=DataProvider|Record<string,DataProvider>;

/**
 * First-class provider configuration object. Field names match the existing standalone provider APIs,
 * allowing callers to migrate gradually from multiple props to one typed bundle.
 */
export interface ProviderBundle {
  readonly dataProvider: DataProviderInput;
  readonly authProvider?: AuthProvider|null;
  readonly accessControlProvider?: AccessControlProvider|null;
  readonly liveProvider?: LiveProvider;
  readonly auditLogProvider?: AuditLogProvider|null;
  readonly notificationProvider?: NotificationProvider|null;
  readonly chatProvider?: ChatProvider|null;
  readonly agentProvider?: AgentProvider|null;
  readonly taskProvider?: TaskProvider;
  readonly routerProvider?: RouterProvider;
  readonly tenantAdapter?: TenantAdapter;
  readonly organizationProvider?: OrganizationProvider|null;
  readonly identityGovernanceProvider?: IdentityGovernanceProvider|null;
  readonly sessionProvider?: SessionProvider|null;
  readonly credentialProvider?: CredentialProvider|null;
}

/** Preserves the input object's exact type while applying compile-time ProviderBundle validation. */
export function createProviderBundle<const TBundle extends ProviderBundle>(bundle: TBundle): TBundle {
  return bundle;
}

export type TenantId=string|number;
export type TenantCacheIdentity=string|number;

/** Tenant state within a request tree; never share it between SSR requests through module-level variables. */
export interface TenantContext {
  readonly tenantId: TenantId;
  readonly meta?: Readonly<Record<string,unknown>>;
}

/**
 * Projects the standard TenantContext into provider metadata and cache identity for a concrete backend.
 * Core always writes the standard `tenantId`; adapters cannot override it.
 */
export interface TenantAdapter {
  readonly getProviderMeta?: (tenant: TenantContext) => Readonly<Record<string,unknown>>;
  readonly getCacheIdentity?: (tenant: TenantContext) => TenantCacheIdentity;
}

export interface TenantCacheKey {
  readonly __svadminTenant: TenantCacheIdentity;
}

export const defaultTenantAdapter: Required<TenantAdapter>={
  getProviderMeta: (tenant) => tenant.meta??{},
  getCacheIdentity: (tenant) => tenant.tenantId,
};

export function resolveTenantProviderMeta(
  tenant: TenantContext,
  adapter: TenantAdapter=defaultTenantAdapter,
): Record<string,unknown> {
  return {
    ...(tenant.meta??{}),
    ...(adapter.getProviderMeta?.(tenant)??{}),
    tenantId: tenant.tenantId,
  };
}

export function createTenantCacheKey(
  tenant: TenantContext,
  adapter: TenantAdapter=defaultTenantAdapter,
): TenantCacheKey {
  return {
    __svadminTenant: adapter.getCacheIdentity?.(tenant)??tenant.tenantId,
  };
}

export function isTenantCacheKey(value: unknown): value is TenantCacheKey {
  return Boolean(
    value
    &&typeof value==='object'
    &&Object.keys(value).length===1
    &&'__svadminTenant' in value
    &&(typeof value.__svadminTenant==='string'||typeof value.__svadminTenant==='number'),
  );
}

/**
 * @deprecated 0.36 — Query Key v2 replaces positional tenant cache-key appending.
 * Use `keys({ tenant })` instead. Removed in 0.39.
 */
export function appendTenantCacheKey(
  queryKey: readonly unknown[],
  tenantCacheKey: TenantCacheKey|undefined,
): readonly unknown[] {
  return tenantCacheKey? [...queryKey,tenantCacheKey]:queryKey;
}

/**
 * @deprecated 0.36 — Query Key v2 replaces positional tenant cache-key matching.
 * Use `queryKeyMatches(queryKey, { tenant })` instead. Removed in 0.39.
 */
export function queryKeyMatchesTenant(
  queryKey: readonly unknown[],
  tenantCacheKey: TenantCacheKey|undefined,
): boolean {
  const candidate=queryKey.at(-1);
  const keyTenant=isTenantCacheKey(candidate)? candidate:undefined;
  if(!tenantCacheKey) return keyTenant===undefined;
  return keyTenant?.__svadminTenant===tenantCacheKey.__svadminTenant;
}

export interface ProviderMetaInput {
  readonly resource?: string;
  readonly meta?: Record<string,unknown>;
}

export type ProviderMetaResolver=(input: ProviderMetaInput) => Record<string,unknown>|undefined;

/**
 * Adds metadata to every standard DataProvider operation while preserving undeclared extension fields from the original provider.
 */
export function withProviderMeta(provider: DataProvider,resolveMeta: ProviderMetaResolver): DataProvider {
  function resolvedParams<P extends ProviderMetaInput>(params: P) {
    const { meta: _meta,...rest }=params;
    return { ...rest,...definedOptions({ meta: resolveMeta(params) }) };
  }

  const adapted: DataProvider={
    ...provider,
    getList: (params: GetListParams): Promise<GetListResult<BaseRecord>> =>
      provider.getList(resolvedParams(params)),
    getOne: (params: GetOneParams): Promise<GetOneResult<BaseRecord>> =>
      provider.getOne(resolvedParams(params)),
    create: (params: CreateParams<unknown>): Promise<CreateResult<BaseRecord>> =>
      provider.create(resolvedParams(params)),
    update: (params: UpdateParams<unknown>): Promise<UpdateResult<BaseRecord>> =>
      provider.update(resolvedParams(params)),
    deleteOne: (params: DeleteParams<unknown>): Promise<DeleteResult<BaseRecord>> =>
      provider.deleteOne(resolvedParams(params)),
    getApiUrl: () => provider.getApiUrl(),
  };

  const getMany=provider.getMany?.bind(provider);
  if(getMany) {
    adapted.getMany=(params: GetManyParams): Promise<GetManyResult<BaseRecord>> =>
      getMany(resolvedParams(params));
  }
  const createMany=provider.createMany?.bind(provider);
  if(createMany) {
    adapted.createMany=(params: CreateManyParams<unknown>): Promise<CreateManyResult<BaseRecord>> =>
      createMany(resolvedParams(params));
  }
  const updateMany=provider.updateMany?.bind(provider);
  if(updateMany) {
    adapted.updateMany=(params: UpdateManyParams<unknown>): Promise<UpdateManyResult<BaseRecord>> =>
      updateMany(resolvedParams(params));
  }
  const deleteMany=provider.deleteMany?.bind(provider);
  if(deleteMany) {
    adapted.deleteMany=(params: DeleteManyParams<unknown>): Promise<DeleteManyResult<BaseRecord>> =>
      deleteMany(resolvedParams(params));
  }
  const custom=provider.custom?.bind(provider);
  if(custom) {
    adapted.custom=(params: CustomParams<unknown>): Promise<CustomResult> =>
      custom(resolvedParams(params));
  }

  return adapted;
}

export function withTenantDataProvider(
  provider: DataProvider,
  tenant: TenantContext,
  adapter: TenantAdapter=defaultTenantAdapter,
): DataProvider {
  return withProviderMeta(provider,({ meta }) => ({
    ...(meta??{}),
    ...resolveTenantProviderMeta(tenant,adapter),
  }));
}
