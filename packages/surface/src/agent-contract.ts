import { Kind, OptionalKind, ReadonlyKind, Type, type TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { escapedJsonPointerToken, jsonValueIssue } from './json.js';
import {
  surfaceFilterSchema, surfaceIdSchema, surfaceListSourceSchema,
  surfaceOneSourceSchema, surfaceSpecSchema, surfaceWidgetSchema,
} from './schema.js';
import {
  SURFACE_LIMITS, SURFACE_SCHEMA_VERSION,
  type JsonObject, type JsonValue, type SurfaceCatalog, type SurfacePolicy,
} from './types.js';

export const SURFACE_CATALOG_SCHEMA_VERSION = 'surface-catalog/v1' as const;
export const SURFACE_AGENT_SCHEMA_VERSION = 'surface-agent/v1' as const;
export const SURFACE_AGENT_RESPONSE_SCHEMA_VERSION = 'surface-agent/v2' as const;
export const SURFACE_AGENT_LIMITS = {
  maxInputCharacters: 262_144,
  maxRequestCharacters: 16_384,
  maxContractCharacters: 131_072,
} as const;

export interface SurfaceCatalogManifest {
  readonly schemaVersion: typeof SURFACE_CATALOG_SCHEMA_VERSION;
  readonly catalogVersion: string;
  readonly widgets: readonly {
    readonly type: string;
    readonly dataKind: 'none' | 'scalar' | 'items';
    readonly description?: string;
    readonly propsSchema: JsonObject;
    readonly examples?: readonly JsonObject[];
  }[];
}

/** 不把 Transform、函数或引用 schema 静默降级为宽松的 JSON schema。 */
export function surfaceSchemaToJson(schema: TSchema): JsonObject {
  const ancestors = new Set<object>();
  let nodes = 0;
  function visit(value: unknown, depth: number): JsonValue {
    nodes += 1;
    if (nodes > SURFACE_LIMITS.maxJsonNodes || depth > SURFACE_LIMITS.maxJsonDepth) {
      throw new Error('Surface schema exceeds the supported size');
    }
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'object' || value === null || ancestors.has(value)) {
      throw new Error('Surface schema must be serializable without transforms or cycles');
    }
    const prototype = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
      throw new Error('Surface schema must contain only plain objects');
    }
    ancestors.add(value);
    const result: Record<string, JsonValue> = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (Array.isArray(value) && key === 'length') continue;
      if (typeof key === 'symbol') {
        if (key === Kind || key === OptionalKind || key === ReadonlyKind) continue;
        throw new Error('Surface schema contains unsupported symbol metadata or a transform');
      }
      if (['__proto__', 'constructor', 'prototype', '$ref', '$dynamicRef', '$recursiveRef'].includes(key)) {
        throw new Error(`Surface schema key "${key}" is not supported; use an inline schema`);
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !('value' in descriptor)) {
        throw new Error('Surface schema accessors and hidden properties are not supported');
      }
      result[key] = visit(descriptor.value, depth + 1);
    }
    ancestors.delete(value);
    if (Array.isArray(value)) {
      if (Object.keys(result).length !== value.length || Object.keys(result).some((key) => !/^(0|[1-9][0-9]*)$/u.test(key) || Number(key) >= value.length)) {
        throw new Error('Surface schema arrays must be dense JSON arrays');
      }
      return Array.from({ length: value.length }, (_, index) => {
        const item = result[String(index)];
        if (item === undefined) throw new Error('Surface schema arrays must be dense JSON arrays');
        return item;
      });
    }
    return result;
  }
  const result = visit(schema, 0);
  if (result === null || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Expected an object JSON schema');
  }
  if (JSON.stringify(result).length > SURFACE_AGENT_LIMITS.maxContractCharacters) {
    throw new Error('Surface schema exceeds the supported character count');
  }
  return result as JsonObject;
}

function isClosedObject(schema: JsonObject): boolean {
  if (schema['type'] === 'object' && schema['additionalProperties'] === false) return true;
  const branches = schema['anyOf'] ?? schema['oneOf'] ?? schema['allOf'];
  return Array.isArray(branches) && branches.length > 0 && branches.every((branch) => (
    branch !== null && typeof branch === 'object' && !Array.isArray(branch) && isClosedObject(branch as JsonObject)
  ));
}

/** 同一目录可用于提示、运行时校验及渲染；任务筛选不会仅在提示词中生效。 */
export function selectSurfaceCatalog<T extends SurfaceCatalog>(
  catalog: T,
  widgetTypes: readonly string[],
): Omit<T, 'widgets'> & { readonly widgets: readonly T['widgets'][number][] } {
  const requested = new Set(widgetTypes);
  if (requested.size !== widgetTypes.length) throw new Error('Duplicate requested surface widget type');
  const known = new Set(catalog.widgets.map((widget) => widget.type));
  for (const type of requested) {
    if (!known.has(type)) throw new Error(`Unknown surface widget type "${type}"`);
  }
  return { ...catalog, widgets: catalog.widgets.filter((widget) => requested.has(widget.type)) };
}

export function createSurfaceCatalogManifest(catalog: SurfaceCatalog): SurfaceCatalogManifest {
  if (!catalog.version) throw new Error('Surface catalog version must not be empty');
  const known = new Set<string>();
  const widgets = catalog.widgets.map((widget) => {
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/u.test(widget.type) || widget.type.length > SURFACE_LIMITS.maxIdLength || known.has(widget.type)) {
      throw new Error(`Invalid or duplicate surface widget type "${widget.type}"`);
    }
    known.add(widget.type);
    if (!['none', 'scalar', 'items'].includes(widget.dataKind)) throw new Error('Invalid surface widget data kind');
    const propsSchema = surfaceSchemaToJson(widget.propsSchema);
    if (!isClosedObject(propsSchema)) throw new Error(`Widget "${widget.type}" must use a closed object props schema`);
    const examples = widget.examples?.map((props) => {
      if (jsonValueIssue(props) || !Value.Check(widget.propsSchema, props)) {
        throw new Error(`Invalid props example for widget "${widget.type}"`);
      }
      return JSON.parse(JSON.stringify(props)) as JsonObject;
    });
    return {
      type: widget.type,
      dataKind: widget.dataKind,
      ...(widget.description === undefined ? {} : { description: widget.description }),
      propsSchema,
      ...(examples === undefined ? {} : { examples }),
    };
  });
  const manifest: SurfaceCatalogManifest = {
    schemaVersion: SURFACE_CATALOG_SCHEMA_VERSION,
    catalogVersion: catalog.version,
    widgets,
  };
  if (jsonValueIssue(manifest) || JSON.stringify(manifest).length > SURFACE_AGENT_LIMITS.maxContractCharacters) {
    throw new Error('Surface catalog manifest exceeds the JSON contract limits');
  }
  return manifest;
}

function literals(values: readonly string[]): TSchema {
  return values.length === 0 ? Type.Never() : Type.Union([...new Set(values)].map((value) => Type.Literal(value)));
}

/** 生成约束缩小候选空间，不能代替绑定/字段关联校验，更不能代替后端授权。 */
export function createSurfaceGenerationSpecSchema(catalog: SurfaceCatalog, policy: SurfacePolicy): TSchema {
  createSurfaceCatalogManifest(catalog);
  const sources: TSchema[] = [];
  const scalarPointers = new Set(['/total']);
  for (const [resource, rule] of Object.entries(policy.resources)) {
    const limit = Math.min(rule.maxPageSize ?? SURFACE_LIMITS.maxPageSize, SURFACE_LIMITS.maxPageSize);
    if (!Number.isSafeInteger(limit) || limit < 1) throw new Error(`Invalid page limit for resource "${resource}"`);
    const filters = Type.Union(surfaceFilterSchema.anyOf.map((branch) => Type.Object({
      ...branch.properties,
      field: literals(rule.filterFields ?? []),
    }, { additionalProperties: false })));
    sources.push(Type.Object({
      ...surfaceListSourceSchema.properties,
      resource: Type.Literal(resource),
      // 显式页大小避免宿主默认值 10 超过小于 10 的策略上限。
      pageSize: Type.Integer({ minimum: 1, maximum: limit }),
      sorters: Type.Optional(Type.Array(Type.Object({
        field: literals(rule.sortFields ?? []),
        order: Type.Union([Type.Literal('asc'), Type.Literal('desc')]),
      }, { additionalProperties: false }), { maxItems: (rule.sortFields?.length ?? 0) > 0 ? SURFACE_LIMITS.maxSorters : 0 })),
      filters: Type.Optional(Type.Array(filters, { maxItems: (rule.filterFields?.length ?? 0) > 0 ? SURFACE_LIMITS.maxFilters : 0 })),
    }, { additionalProperties: false }));
    if (rule.allowGetOne === true) {
      sources.push(Type.Object({ ...surfaceOneSourceSchema.properties, resource: Type.Literal(resource) }, { additionalProperties: false }));
      for (const field of rule.readFields) scalarPointers.add(`/${escapedJsonPointerToken(field)}`);
    }
  }
  const widgets = catalog.widgets.map((widget) => {
    const { binding: _binding, ...properties } = surfaceWidgetSchema.properties;
    return Type.Object({
      ...properties,
      type: Type.Literal(widget.type),
      props: widget.propsSchema,
      ...(widget.dataKind === 'none' ? {} : {
        binding: Type.Object({
          sourceId: surfaceIdSchema,
          pointer: widget.dataKind === 'items' ? Type.Literal('/items') : literals([...scalarPointers]),
        }, { additionalProperties: false }),
      }),
    }, { additionalProperties: false, ...(widget.description ? { description: widget.description } : {}) });
  });
  return Type.Object({
    ...surfaceSpecSchema.properties,
    schemaVersion: Type.Literal(SURFACE_SCHEMA_VERSION),
    catalogVersion: Type.Literal(catalog.version),
    dataSources: Type.Array(sources.length ? Type.Union(sources) : Type.Never(), { maxItems: sources.length ? SURFACE_LIMITS.maxDataSources : 0 }),
    widgets: Type.Array(widgets.length ? Type.Union(widgets) : Type.Never(), { maxItems: widgets.length ? SURFACE_LIMITS.maxWidgets : 0 }),
  }, { additionalProperties: false });
}

export function createSurfaceAgentResponseSchema(catalog: SurfaceCatalog, policy: SurfacePolicy): JsonObject {
  const proposal = Type.Object({
    schemaVersion: Type.Literal(SURFACE_AGENT_RESPONSE_SCHEMA_VERSION),
    action: Type.Literal('propose'),
    summary: Type.Optional(Type.String({ minLength: 1, maxLength: 240 })),
    spec: createSurfaceGenerationSpecSchema(catalog, policy),
  }, { additionalProperties: false });
  return surfaceSchemaToJson(Type.Union([proposal, surfaceCannotFulfillSchema]));
}

export const surfaceCannotFulfillSchema = Type.Object({
  schemaVersion: Type.Literal(SURFACE_AGENT_RESPONSE_SCHEMA_VERSION),
  action: Type.Literal('cannot-fulfill'),
  reason: Type.Union([
    Type.Literal('unsupported_request'), Type.Literal('insufficient_permissions'), Type.Literal('insufficient_context'),
  ]),
  message: Type.String({ minLength: 1, maxLength: 480 }),
}, { additionalProperties: false });
