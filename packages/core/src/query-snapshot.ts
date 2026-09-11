import { Type, type Static, type TSchema } from '@sinclair/typebox';
import type { AdminContextAccessor } from './context.svelte';
import type { DataProvider, GetListParams, GetOneParams, GetManyParams } from './types';
import { HttpError } from './types';
import { contractProvider, type ResourceContract } from './resource-contract';
import { definedOptions } from './defined-options';
import { attachAbortSignal, detachAbortSignal, snapshotPlainData } from './plain-data';
import { checkExact } from './schema-validation';
import { decodeBaseRecord, decodeListResult, decodeOneResult, decodeManyResult, rejectProviderResponse } from './record-decoder';

const filters = Type.Recursive(self => Type.Union([
  Type.Object({
    field: Type.String(),
    operator: Type.Union(([
      'eq', 'ne', 'lt', 'gt', 'lte', 'gte', 'in', 'nin', 'contains', 'ncontains',
      'startswith', 'endswith', 'null', 'nnull', 'between', 'nbetween',
    ] as const).map(value => Type.Literal(value))),
    value: Type.Unknown(),
  }, { additionalProperties: false }),
  Type.Object({
    operator: Type.Union([Type.Literal('and'), Type.Literal('or')]),
    value: Type.Array(self),
  }, { additionalProperties: false }),
]));
const base = {
  resource: Type.String({ minLength: 1 }),
  meta: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
};
const listSchema = Type.Object({
  ...base,
  pagination: Type.Optional(Type.Object({
    current: Type.Optional(Type.Integer({ minimum: 1 })),
    pageSize: Type.Optional(Type.Integer({ minimum: 1 })),
    mode: Type.Optional(Type.Union([Type.Literal('server'), Type.Literal('client'), Type.Literal('off')])),
  }, { additionalProperties: false })),
  sorters: Type.Optional(Type.Array(Type.Object({
    field: Type.String(), order: Type.Union([Type.Literal('asc'), Type.Literal('desc')]),
  }, { additionalProperties: false }))),
  filters: Type.Optional(Type.Array(filters)),
}, { additionalProperties: false });
const id = Type.Union([Type.String(), Type.Number()]);
const oneSchema = Type.Object({ ...base, id }, { additionalProperties: false });
const manySchema = Type.Object({ ...base, ids: Type.Array(id) }, { additionalProperties: false });

function invalid(): never {
  throw new HttpError('Invalid resource query', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
}

function snapshotQueryParams<S extends TSchema>(schema: S, value: unknown): Static<S> {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(schema, candidate)) return candidate;
  } catch {
    // Query input errors must not disclose values or execute serialization hooks.
  }
  return invalid();
}

function snapshotParamsWithSignal<S extends TSchema>(schema: S, value: unknown): Static<S> {
  const { signal, rest } = detachAbortSignal(value);
  const params = snapshotQueryParams(schema, rest);
  if (typeof params !== 'object' || params === null) return invalid();
  return attachAbortSignal(params, signal);
}

export function snapshotListParams(value: unknown): GetListParams {
  return snapshotParamsWithSignal(listSchema, value);
}

export function snapshotOneParams(value: unknown): GetOneParams {
  return snapshotParamsWithSignal(oneSchema, value);
}

export function snapshotManyParams(value: unknown): GetManyParams {
  return snapshotParamsWithSignal(manySchema, value);
}

const sourceIds = new WeakMap<DataProvider, string>();
const runtime = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
let nextSource = 0;

/** Capture a contract query's transport and metadata before any deferred query work. */
export function captureQueryProvider(
  context: AdminContextAccessor,
  options: { resource: string; dataProviderName?: string; contract?: ResourceContract; meta?: Record<string, unknown> },
) {
  const resource = context.resources.find(item => item.identifier === options.resource || item.name === options.resource);
  const name = options.dataProviderName ?? resource?.provider?.dataProviderName ?? resource?.meta?.dataProviderName ?? 'default';
  const raw = context.providers?.[name];
  if (!raw) throw new HttpError('Data provider is unavailable', 400, undefined, { code: 'DATA_PROVIDER_REQUIRED' });
  let source = sourceIds.get(raw);
  if (source === undefined) {
    source = `${runtime}:${++nextSource}`;
    sourceIds.set(raw, source);
  }
  const explicit = snapshotListParams(definedOptions({ resource: options.resource, meta: options.meta }));
  const metadata = context.getProviderMeta(options.resource, explicit.meta);
  const params = snapshotListParams(definedOptions({ resource: options.resource, meta: metadata }));
  if (options.contract) {
    return { provider: contractProvider(raw, options.contract), source, meta: params.meta };
  }
  const provider: DataProvider = {
    ...raw,
    getApiUrl: () => raw.getApiUrl(),
    create: input => raw.create(input),
    update: input => raw.update(input),
    deleteOne: input => raw.deleteOne(input),
    getList: async input => {
      const result = await raw.getList(input);
      try {
        return decodeListResult(snapshotPlainData(result), decodeBaseRecord);
      } catch {
        return rejectProviderResponse();
      }
    },
    getOne: async input => {
      const result = await raw.getOne(input);
      try {
        return decodeOneResult(snapshotPlainData(result), decodeBaseRecord);
      } catch {
        return rejectProviderResponse();
      }
    },
    getMany: async input => {
      if (!raw.getMany) {
        const results = await Promise.all(input.ids.map(id => provider.getOne(snapshotOneParams({
          resource: input.resource, id, ...definedOptions({ meta: input.meta, signal: input.signal }),
        }))));
        return { data: results.map(result => result.data) };
      }
      const result = await raw.getMany(input);
      try {
        return decodeManyResult(snapshotPlainData(result), decodeBaseRecord);
      } catch {
        return rejectProviderResponse();
      }
    },
  };
  return {
    provider,
    source,
    meta: params.meta,
  };
}
