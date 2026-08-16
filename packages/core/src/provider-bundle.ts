import type {
  AgentProvider,
  ChatProvider,
} from './chatProvider.svelte';
import type { AuditLogProvider } from './audit';
import type { AccessControlProvider } from './permissions.svelte';
import type { LiveProvider } from './live.svelte';
import type { RouterProvider } from './router-provider';
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

export type DataProviderInput = DataProvider | Record<string, DataProvider>;

/**
 * 一等 Provider 配置对象。字段名与现有独立 provider API 保持一致，
 * 因此调用方可以渐进地从多个 props 迁移为一个 typed bundle。
 */
export interface ProviderBundle {
  readonly dataProvider: DataProviderInput;
  readonly authProvider?: AuthProvider | null;
  readonly accessControlProvider?: AccessControlProvider | null;
  readonly liveProvider?: LiveProvider;
  readonly auditLogProvider?: AuditLogProvider | null;
  readonly notificationProvider?: NotificationProvider | null;
  readonly chatProvider?: ChatProvider | null;
  readonly agentProvider?: AgentProvider | null;
  readonly taskProvider?: TaskProvider;
  readonly routerProvider?: RouterProvider;
  readonly tenantAdapter?: TenantAdapter;
}

/** 保留传入对象的精确类型，同时执行 ProviderBundle 的编译期校验。 */
export function createProviderBundle<const TBundle extends ProviderBundle>(bundle: TBundle): TBundle {
  return bundle;
}

export type TenantId = string | number;
export type TenantCacheIdentity = string | number;

/** 请求树内的租户状态；不得通过模块级变量在 SSR 请求之间共享。 */
export interface TenantContext {
  readonly tenantId: TenantId;
  readonly meta?: Readonly<Record<string, unknown>>;
}

/**
 * 将标准 TenantContext 投影到具体后端所需的 provider meta 与 cache identity。
 * Core 始终额外写入标准 `tenantId`，adapter 不能覆盖该字段。
 */
export interface TenantAdapter {
  readonly getProviderMeta?: (tenant: TenantContext) => Readonly<Record<string, unknown>>;
  readonly getCacheIdentity?: (tenant: TenantContext) => TenantCacheIdentity;
}

export interface TenantCacheKey {
  readonly __svadminTenant: TenantCacheIdentity;
}

export const defaultTenantAdapter: Required<TenantAdapter> = {
  getProviderMeta: (tenant) => tenant.meta ?? {},
  getCacheIdentity: (tenant) => tenant.tenantId,
};

export function resolveTenantProviderMeta(
  tenant: TenantContext,
  adapter: TenantAdapter = defaultTenantAdapter,
): Record<string, unknown> {
  return {
    ...(tenant.meta ?? {}),
    ...(adapter.getProviderMeta?.(tenant) ?? {}),
    tenantId: tenant.tenantId,
  };
}

export function createTenantCacheKey(
  tenant: TenantContext,
  adapter: TenantAdapter = defaultTenantAdapter,
): TenantCacheKey {
  return {
    __svadminTenant: adapter.getCacheIdentity?.(tenant) ?? tenant.tenantId,
  };
}

export function isTenantCacheKey(value: unknown): value is TenantCacheKey {
  return Boolean(
    value
      && typeof value === 'object'
      && Object.keys(value).length === 1
      && '__svadminTenant' in value
      && (typeof value.__svadminTenant === 'string' || typeof value.__svadminTenant === 'number'),
  );
}

/**
 * @deprecated 0.36 — Query Key v2 replaces positional tenant cache-key appending.
 * Use `keys({ tenant })` instead. Removed in 0.39.
 */
export function appendTenantCacheKey(
  queryKey: readonly unknown[],
  tenantCacheKey: TenantCacheKey | undefined,
): readonly unknown[] {
  return tenantCacheKey ? [...queryKey, tenantCacheKey] : queryKey;
}

/**
 * @deprecated 0.36 — Query Key v2 replaces positional tenant cache-key matching.
 * Use `queryKeyMatches(queryKey, { tenant })` instead. Removed in 0.39.
 */
export function queryKeyMatchesTenant(
  queryKey: readonly unknown[],
  tenantCacheKey: TenantCacheKey | undefined,
): boolean {
  const candidate = queryKey.at(-1);
  const keyTenant = isTenantCacheKey(candidate) ? candidate : undefined;
  if (!tenantCacheKey) return keyTenant === undefined;
  return keyTenant?.__svadminTenant === tenantCacheKey.__svadminTenant;
}

export interface ProviderMetaInput {
  readonly resource?: string;
  readonly meta?: Record<string, unknown>;
}

export type ProviderMetaResolver = (input: ProviderMetaInput) => Record<string, unknown> | undefined;

/**
 * 为 DataProvider 的所有标准操作增量注入 meta；未声明的扩展字段仍由原 provider 保留。
 */
export function withProviderMeta(provider: DataProvider, resolveMeta: ProviderMetaResolver): DataProvider {
  const adapted: DataProvider = {
    ...provider,
    getList: <TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResult<TData>> =>
      provider.getList<TData>({ ...params, meta: resolveMeta(params) }),
    getOne: <TData extends BaseRecord = BaseRecord>(params: GetOneParams): Promise<GetOneResult<TData>> =>
      provider.getOne<TData>({ ...params, meta: resolveMeta(params) }),
    create: <TData extends BaseRecord = BaseRecord, TVariables = unknown>(params: CreateParams<TVariables>): Promise<CreateResult<TData>> =>
      provider.create<TData, TVariables>({ ...params, meta: resolveMeta(params) }),
    update: <TData extends BaseRecord = BaseRecord, TVariables = unknown>(params: UpdateParams<TVariables>): Promise<UpdateResult<TData>> =>
      provider.update<TData, TVariables>({ ...params, meta: resolveMeta(params) }),
    deleteOne: <TData extends BaseRecord = BaseRecord, TVariables = unknown>(params: DeleteParams<TVariables>): Promise<DeleteResult<TData>> =>
      provider.deleteOne<TData, TVariables>({ ...params, meta: resolveMeta(params) }),
    getApiUrl: () => provider.getApiUrl(),
  };

  const getMany = provider.getMany?.bind(provider);
  if (getMany) {
    adapted.getMany = <TData extends BaseRecord = BaseRecord>(params: GetManyParams): Promise<GetManyResult<TData>> =>
      getMany<TData>({ ...params, meta: resolveMeta(params) });
  }
  const createMany = provider.createMany?.bind(provider);
  if (createMany) {
    adapted.createMany = <TData extends BaseRecord = BaseRecord, TVariables = unknown>(params: CreateManyParams<TVariables>): Promise<CreateManyResult<TData>> =>
      createMany<TData, TVariables>({ ...params, meta: resolveMeta(params) });
  }
  const updateMany = provider.updateMany?.bind(provider);
  if (updateMany) {
    adapted.updateMany = <TData extends BaseRecord = BaseRecord, TVariables = unknown>(params: UpdateManyParams<TVariables>): Promise<UpdateManyResult<TData>> =>
      updateMany<TData, TVariables>({ ...params, meta: resolveMeta(params) });
  }
  const deleteMany = provider.deleteMany?.bind(provider);
  if (deleteMany) {
    adapted.deleteMany = <TData extends BaseRecord = BaseRecord, TVariables = unknown>(params: DeleteManyParams<TVariables>): Promise<DeleteManyResult<TData>> =>
      deleteMany<TData, TVariables>({ ...params, meta: resolveMeta(params) });
  }
  const custom = provider.custom?.bind(provider);
  if (custom) {
    adapted.custom = <TData = unknown, TVariables = unknown>(params: CustomParams<TVariables>): Promise<CustomResult<TData>> =>
      custom<TData, TVariables>({ ...params, meta: resolveMeta(params) });
  }

  return adapted;
}

export function withTenantDataProvider(
  provider: DataProvider,
  tenant: TenantContext,
  adapter: TenantAdapter = defaultTenantAdapter,
): DataProvider {
  return withProviderMeta(provider, ({ meta }) => ({
    ...(meta ?? {}),
    ...resolveTenantProviderMeta(tenant, adapter),
  }));
}
