import type { BaseRecord, Filter, GetListParams, Sort } from '@svadmin/core';
import { isJsonValue, jsonValueIssue } from './json.js';
import type {
  JsonObject,
  JsonValue,
  ResourceListDataSource,
  ResourceOneDataSource,
  SurfaceDataError,
  SurfaceDataProvider,
  SurfaceDataSource,
  SurfaceResourcePolicy,
  SurfaceWidgetDataState,
} from './types.js';

export type SurfaceReadAction = 'list' | 'show';

export interface SurfaceAccessDecision {
  readonly can: boolean;
  readonly reason?: string;
}

export type SurfaceAuthorizer = (
  resource: string,
  action: SurfaceReadAction,
) => Promise<SurfaceAccessDecision>;

export interface LoadSurfaceSourceRequest {
  readonly source: SurfaceDataSource;
  readonly resourcePolicy: SurfaceResourcePolicy;
  readonly provider: SurfaceDataProvider;
  readonly authorize: SurfaceAuthorizer;
}

export type SurfaceLoadedSourceState = Extract<SurfaceWidgetDataState, { status: 'ready' | 'error' }>;

type ProjectionResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string };

function isPlainRecord(value: unknown): value is BaseRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function ownDataProperty(record: BaseRecord, property: string): ProjectionResult<unknown> {
  const descriptor = Object.getOwnPropertyDescriptor(record, property);
  if (!descriptor) return { ok: false, message: `Provider result must define "${property}"` };
  return 'value' in descriptor
    ? { ok: true, value: descriptor.value }
    : { ok: false, message: `Provider result field "${property}" must be a data property` };
}

function projectRecord(record: unknown, readableFields: readonly string[]): ProjectionResult<JsonObject> {
  if (!isPlainRecord(record)) return { ok: false, message: 'Provider records must be plain objects' };
  const projectedRecord = Object.create(null) as Record<string, JsonValue>;
  for (const field of readableFields) {
    const descriptor = Object.getOwnPropertyDescriptor(record, field);
    if (!descriptor) continue;
    if (!('value' in descriptor)) {
      return { ok: false, message: `Field "${field}" must be a data property` };
    }
    const fieldValue = descriptor.value;
    if (!isJsonValue(fieldValue)) {
      const issue = jsonValueIssue(fieldValue);
      return { ok: false, message: `Field "${field}" is not JSON serializable: ${issue?.message ?? 'invalid value'}` };
    }
    projectedRecord[field] = fieldValue;
  }
  return { ok: true, value: projectedRecord };
}

function projectRecords(records: readonly unknown[], readableFields: readonly string[]): ProjectionResult<readonly JsonObject[]> {
  const projectedRecords: JsonObject[] = [];
  for (const record of records) {
    const projection = projectRecord(record, readableFields);
    if (!projection.ok) return projection;
    projectedRecords.push(projection.value);
  }
  return { ok: true, value: projectedRecords };
}

function sourceError(sourceId: string, code: SurfaceDataError['code'], message: string): SurfaceLoadedSourceState {
  return { status: 'error', sourceId, error: { code, sourceId, message } };
}

function listParams(source: ResourceListDataSource): GetListParams {
  const sorters: Sort[] = source.sorters?.map((sorter) => ({ ...sorter })) ?? [];
  const filters: Filter[] = source.filters?.map((filter) => {
    if (!('value' in filter)) return { ...filter, value: null };
    return Array.isArray(filter.value)
      ? { ...filter, value: [...filter.value] }
      : { ...filter };
  }) ?? [];
  return {
    resource: source.resource,
    pagination: { current: 1, pageSize: source.pageSize ?? 10 },
    sorters,
    filters,
  };
}

async function loadListSource(
  source: ResourceListDataSource,
  resourcePolicy: SurfaceResourcePolicy,
  provider: SurfaceDataProvider,
): Promise<SurfaceLoadedSourceState> {
  const providerResponse: unknown = await provider.getList(listParams(source));
  if (!isPlainRecord(providerResponse)) {
    return sourceError(source.id, 'provider_result_not_json', 'List result must be a plain object');
  }
  const recordsProperty = ownDataProperty(providerResponse, 'data');
  if (!recordsProperty.ok) return sourceError(source.id, 'provider_result_not_json', recordsProperty.message);
  const totalProperty = ownDataProperty(providerResponse, 'total');
  if (!totalProperty.ok) return sourceError(source.id, 'provider_result_not_json', totalProperty.message);
  const records = recordsProperty.value;
  const total = totalProperty.value;
  if (!Array.isArray(records)) {
    return sourceError(source.id, 'provider_result_not_json', 'List data must be an array');
  }
  if (typeof total !== 'number' || !Number.isFinite(total) || total < 0) {
    return sourceError(source.id, 'provider_result_not_json', 'List total must be a non-negative finite number');
  }
  const projection = projectRecords(records, resourcePolicy.readFields);
  if (!projection.ok) return sourceError(source.id, 'provider_result_not_json', projection.message);
  return {
    status: 'ready',
    sourceId: source.id,
    value: { items: projection.value, total },
  };
}

async function loadOneSource(
  source: ResourceOneDataSource,
  resourcePolicy: SurfaceResourcePolicy,
  provider: SurfaceDataProvider,
): Promise<SurfaceLoadedSourceState> {
  const providerResponse: unknown = await provider.getOne({ resource: source.resource, id: source.recordId });
  if (!isPlainRecord(providerResponse)) {
    return sourceError(source.id, 'provider_result_not_json', 'Get-one result must be a plain object');
  }
  const dataProperty = ownDataProperty(providerResponse, 'data');
  if (!dataProperty.ok) return sourceError(source.id, 'provider_result_not_json', dataProperty.message);
  const projection = projectRecord(dataProperty.value, resourcePolicy.readFields);
  return projection.ok
    ? { status: 'ready', sourceId: source.id, value: projection.value }
    : sourceError(source.id, 'provider_result_not_json', projection.message);
}

export async function loadSurfaceSource(request: LoadSurfaceSourceRequest): Promise<SurfaceLoadedSourceState> {
  const { source, resourcePolicy, provider, authorize } = request;
  const action = source.type === 'resource-list' ? 'list' : 'show';
  let accessDecision: SurfaceAccessDecision;
  try {
    accessDecision = await authorize(source.resource, action);
  } catch (accessFailure) {
    const message = accessFailure instanceof Error ? accessFailure.message : 'Access check failed';
    return sourceError(source.id, 'access_check_failed', message);
  }
  if (!accessDecision.can) return sourceError(source.id, 'access_denied', accessDecision.reason ?? 'Access denied');

  try {
    return source.type === 'resource-list'
      ? await loadListSource(source, resourcePolicy, provider)
      : await loadOneSource(source, resourcePolicy, provider);
  } catch (providerFailure) {
    const message = providerFailure instanceof Error ? providerFailure.message : 'Data provider request failed';
    return sourceError(source.id, 'provider_failed', message);
  }
}
