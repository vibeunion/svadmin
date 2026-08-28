import { Type, type Static, type TSchema } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { Value } from "@sinclair/typebox/value";
import { decodedJsonPointerToken, jsonPointer, jsonValueIssue } from "./json.js";
import {
  SURFACE_LIMITS,
  SURFACE_SCHEMA_VERSION,
  type JsonObject,
  type JsonValue,
  type SurfaceCatalog,
  type SurfaceDataSource,
  type SurfacePolicy,
  type SurfaceResourcePolicy,
  type SurfaceSpec,
  type SurfaceValidationIssue,
  type SurfaceValidationResult,
  type SurfaceWidget,
  type SurfaceWidgetDefinition,
} from "./types.js";

const idSchema = Type.String({
  minLength: 1,
  maxLength: SURFACE_LIMITS.maxIdLength,
  pattern: "^[A-Za-z][A-Za-z0-9_-]*$",
});

const fieldSchema = Type.String({
  minLength: 1,
  maxLength: SURFACE_LIMITS.maxIdLength,
});

const jsonPrimitiveSchema = Type.Union([
  Type.String(),
  Type.Number(),
  Type.Boolean(),
  Type.Null(),
]);

const surfaceFilterSchema = Type.Union([
  Type.Object({
    field: fieldSchema,
    operator: Type.Union([
      Type.Literal("eq"),
      Type.Literal("ne"),
      Type.Literal("lt"),
      Type.Literal("lte"),
      Type.Literal("gt"),
      Type.Literal("gte"),
      Type.Literal("contains"),
      Type.Literal("startswith"),
      Type.Literal("endswith"),
    ]),
    value: jsonPrimitiveSchema,
  }, { additionalProperties: false }),
  Type.Object({
    field: fieldSchema,
    operator: Type.Union([
      Type.Literal("in"),
      Type.Literal("nin"),
    ]),
    value: Type.Array(jsonPrimitiveSchema),
  }, { additionalProperties: false }),
  Type.Object({
    field: fieldSchema,
    operator: Type.Union([
      Type.Literal("null"),
      Type.Literal("nnull"),
    ]),
  }, { additionalProperties: false }),
]);

const resourceListSchema = Type.Object({
  id: idSchema,
  type: Type.Literal("resource-list"),
  resource: idSchema,
  pageSize: Type.Optional(Type.Integer({ minimum: 1 })),
  sorters: Type.Optional(Type.Array(
    Type.Object({
      field: fieldSchema,
      order: Type.Union([Type.Literal("asc"), Type.Literal("desc")]),
    }, { additionalProperties: false })
  )),
  filters: Type.Optional(Type.Array(surfaceFilterSchema)),
}, { additionalProperties: false });

const resourceOneSchema = Type.Object({
  id: idSchema,
  type: Type.Literal("resource-one"),
  resource: idSchema,
  recordId: Type.Union([Type.String(), Type.Number()]),
}, { additionalProperties: false });

const surfaceSpecSchema = Type.Object({
  schemaVersion: Type.String(),
  catalogVersion: Type.String({ minLength: 1 }),
  surfaceId: idSchema,
  title: Type.String({ minLength: 1, maxLength: SURFACE_LIMITS.maxTitleLength }),
  layout: Type.Object({
    type: Type.Literal("grid"),
    columns: Type.Literal(12),
    gap: Type.Optional(Type.Union([
      Type.Literal("sm"),
      Type.Literal("md"),
      Type.Literal("lg"),
    ])),
  }, { additionalProperties: false }),
  dataSources: Type.Array(Type.Union([resourceListSchema, resourceOneSchema])),
  widgets: Type.Array(Type.Object({
    id: idSchema,
    type: idSchema,
    props: Type.Record(Type.String(), Type.Unknown()),
    binding: Type.Optional(Type.Object({
      sourceId: idSchema,
      pointer: Type.Optional(Type.String()),
    }, { additionalProperties: false })),
    placement: Type.Optional(Type.Object({
      columnSpan: Type.Optional(Type.Integer({ minimum: 1, maximum: 12 })),
    }, { additionalProperties: false })),
  }, { additionalProperties: false })),
}, { additionalProperties: false });

const compiledSurfaceSpec = TypeCompiler.Compile(surfaceSpecSchema);

const forbiddenPropertyNames = new Set([
  "class",
  "className",
  "color",
  "href",
  "html",
  "innerHTML",
  "src",
  "style",
  "url",
]);
const strictSchemaProbeKey = "__surface_unknown_property_probe__";

function invalidJsonIssue(pathSegments: readonly (string | number)[], message: string): SurfaceValidationIssue {
  return { code: "invalid_json", path: jsonPointer(pathSegments), message };
}

function schemaErrors(errors: Iterable<{ path: string; message: string }>): SurfaceValidationIssue[] {
  const issues: SurfaceValidationIssue[] = [];
  for (const err of errors) {
    issues.push({
      code: "invalid_json",
      path: err.path || "",
      message: err.message,
    });
  }
  return issues;
}

function catalogDefinitions(catalog: SurfaceCatalog): Map<string, SurfaceWidgetDefinition> {
  return new Map(catalog.widgets.map((widgetDefinition) => [widgetDefinition.type, widgetDefinition]));
}

function resourcePolicyFor(policy: SurfacePolicy, resource: string): SurfaceResourcePolicy | undefined {
  return Object.hasOwn(policy.resources, resource) ? policy.resources[resource] : undefined;
}

function sourcePolicyIssue(source: SurfaceDataSource, policy: SurfacePolicy, index: number): SurfaceValidationIssue | null {
  const resourcePolicy = resourcePolicyFor(policy, source.resource);
  if (!resourcePolicy) {
    return {
      code: "resource_denied",
      path: `/dataSources/${index}/resource`,
      message: `Resource "${source.resource}" is not allowed`,
      sourceId: source.id,
    };
  }

  if (source.type === "resource-one" && resourcePolicy.allowGetOne !== true) {
    return {
      code: "resource_denied",
      path: `/dataSources/${index}`,
      message: `Resource "${source.resource}" does not allow getOne`,
      sourceId: source.id,
    };
  }

  if (source.type === "resource-list") {
    const pageSizeLimit = Math.min(resourcePolicy.maxPageSize ?? SURFACE_LIMITS.maxPageSize, SURFACE_LIMITS.maxPageSize);
    if ((source.pageSize ?? 10) > pageSizeLimit) {
      return {
        code: "limit_exceeded",
        path: `/dataSources/${index}/pageSize`,
        message: `Page size exceeds ${pageSizeLimit}`,
        sourceId: source.id,
      };
    }
    const disallowedSorter = source.sorters?.find((sorter) => !resourcePolicy.sortFields?.includes(sorter.field));
    if (disallowedSorter) {
      return {
        code: "field_denied",
        path: `/dataSources/${index}/sorters`,
        message: `Sorting by "${disallowedSorter.field}" is not allowed`,
        sourceId: source.id,
      };
    }
    const disallowedFilter = source.filters?.find((filter) => !resourcePolicy.filterFields?.includes(filter.field));
    if (disallowedFilter) {
      return {
        code: "field_denied",
        path: `/dataSources/${index}/filters`,
        message: `Filtering by "${disallowedFilter.field}" is not allowed`,
        sourceId: source.id,
      };
    }
  }

  return null;
}

function propsContainForbiddenKey(props: JsonObject): string | null {
  const pending: JsonValue[] = [props];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || current === null || typeof current !== "object") continue;
    if (Array.isArray(current)) {
      pending.push(...current);
      continue;
    }
    for (const [key, entry] of Object.entries(current)) {
      if (forbiddenPropertyNames.has(key) || key.startsWith("on")) return key;
      pending.push(entry);
    }
  }
  return null;
}

function referencedFieldIssue(
  widget: SurfaceWidget,
  widgetIndex: number,
  definition: SurfaceWidgetDefinition,
  source: SurfaceDataSource,
  policy: SurfacePolicy,
): SurfaceValidationIssue | null {
  if (!definition.getReferencedFields) return null;

  let referencedFields: readonly string[];
  try {
    referencedFields = definition.getReferencedFields(widget.props);
  } catch {
    return {
      code: "invalid_widget_props",
      path: `/widgets/${widgetIndex}/props`,
      message: "Widget field references could not be resolved",
      widgetId: widget.id,
    };
  }

  const readableFields = resourcePolicyFor(policy, source.resource)?.readFields ?? [];
  const deniedField = referencedFields.find((field) => (
    typeof field !== "string" || !readableFields.includes(field)
  ));
  return deniedField === undefined
    ? null
    : {
        code: "field_denied",
        path: `/widgets/${widgetIndex}/props`,
        message: `Field "${String(deniedField)}" is not readable`,
        widgetId: widget.id,
        sourceId: source.id,
      };
}

function resourceOnePointerField(pointer: string): string | null {
  if (!pointer.startsWith("/") || pointer.slice(1).includes("/")) return null;
  const field = decodedJsonPointerToken(pointer.slice(1));
  return field && field.length <= SURFACE_LIMITS.maxIdLength ? field : null;
}

function checkPropsSchema(schema: unknown, data: unknown): boolean {
  if (!schema || typeof schema !== "object") return false;
  if ("Check" in schema && typeof (schema as { Check: (d: unknown) => boolean }).Check === "function") {
    return (schema as { Check: (d: unknown) => boolean }).Check(data);
  }
  if ("safeParse" in schema && typeof (schema as { safeParse: (d: unknown) => { success: boolean } }).safeParse === "function") {
    return (schema as { safeParse: (d: unknown) => { success: boolean } }).safeParse(data).success;
  }
  return Value.Check(schema as TSchema, data);
}

function widgetIssue(
  widget: SurfaceWidget,
  widgetIndex: number,
  definition: SurfaceWidgetDefinition | undefined,
  sources: ReadonlyMap<string, SurfaceDataSource>,
  policy: SurfacePolicy,
): SurfaceValidationIssue | null {
  if (!definition) {
    return {
      code: "unknown_widget_type",
      path: `/widgets/${widgetIndex}/type`,
      message: `Widget type "${widget.type}" is not registered`,
      widgetId: widget.id,
    };
  }

  const forbiddenKey = propsContainForbiddenKey(widget.props);
  const propsValid = checkPropsSchema(definition.propsSchema, widget.props);
  const strictSchemaProbe = checkPropsSchema(definition.propsSchema, {
    ...widget.props,
    [strictSchemaProbeKey]: null,
  });
  if (forbiddenKey || !propsValid || strictSchemaProbe) {
    return {
      code: "invalid_widget_props",
      path: `/widgets/${widgetIndex}/props`,
      message: forbiddenKey
        ? `Property "${forbiddenKey}" is not allowed`
        : strictSchemaProbe
          ? "Catalog props schema must reject unknown properties"
          : "Widget props do not match the catalog schema",
      widgetId: widget.id,
    };
  }

  if (definition.dataKind === "none") {
    return widget.binding
      ? {
          code: "invalid_binding_pointer",
          path: `/widgets/${widgetIndex}/binding`,
          message: "This widget does not accept a data binding",
          widgetId: widget.id,
        }
      : null;
  }

  const source = widget.binding ? sources.get(widget.binding.sourceId) : undefined;
  if (!source) {
    return {
      code: "unknown_data_source",
      path: `/widgets/${widgetIndex}/binding/sourceId`,
      message: "Widget binding must reference an existing data source",
      widgetId: widget.id,
    };
  }

  const pointer = widget.binding?.pointer ?? "";
  const resourceOneField = source.type === "resource-one" ? resourceOnePointerField(pointer) : null;
  const pointerIsValid = definition.dataKind === "items"
    ? source.type === "resource-list" && pointer === "/items"
    : (source.type === "resource-list" && pointer === "/total")
      || resourceOneField !== null;
  if (!pointerIsValid) {
    return {
      code: "invalid_binding_pointer",
      path: `/widgets/${widgetIndex}/binding/pointer`,
      message: "Binding pointer is not valid for this widget and data source",
      widgetId: widget.id,
      sourceId: source.id,
    };
  }

  const deniedReferencedField = referencedFieldIssue(widget, widgetIndex, definition, source, policy);
  if (deniedReferencedField) return deniedReferencedField;

  if (source.type === "resource-one" && resourceOneField !== null) {
    if (!resourcePolicyFor(policy, source.resource)?.readFields.includes(resourceOneField)) {
      return {
        code: "field_denied",
        path: `/widgets/${widgetIndex}/binding/pointer`,
        message: `Field "${resourceOneField}" is not readable`,
        widgetId: widget.id,
        sourceId: source.id,
      };
    }
  }

  return null;
}

function duplicateIdIssue(spec: SurfaceSpec): SurfaceValidationIssue | null {
  const ids = new Set<string>();
  const entries = [
    ...spec.dataSources.map((source, index) => ({ id: source.id, path: `/dataSources/${index}/id` })),
    ...spec.widgets.map((widget, index) => ({ id: widget.id, path: `/widgets/${index}/id` })),
  ];
  for (const entry of entries) {
    if (ids.has(entry.id)) return { code: "duplicate_id", path: entry.path, message: `Duplicate id "${entry.id}"` };
    ids.add(entry.id);
  }
  return null;
}

export function validateSurfaceSpec(
  input: unknown,
  catalog: SurfaceCatalog,
  policy: SurfacePolicy,
): SurfaceValidationResult {
  const unsafeJson = jsonValueIssue(input);
  if (unsafeJson) return { ok: false, issues: [invalidJsonIssue(unsafeJson.path, unsafeJson.message)] };

  if (!compiledSurfaceSpec.Check(input)) {
    return { ok: false, issues: schemaErrors(compiledSurfaceSpec.Errors(input)) };
  }
  const spec = input as SurfaceSpec;

  if (spec.schemaVersion !== SURFACE_SCHEMA_VERSION) {
    return { ok: false, issues: [{ code: "unsupported_schema_version", path: "/schemaVersion", message: `Expected ${SURFACE_SCHEMA_VERSION}` }] };
  }
  if (spec.catalogVersion !== catalog.version) {
    return { ok: false, issues: [{ code: "catalog_version_mismatch", path: "/catalogVersion", message: `Expected ${catalog.version}` }] };
  }
  if (spec.dataSources.length > SURFACE_LIMITS.maxDataSources || spec.widgets.length > SURFACE_LIMITS.maxWidgets) {
    return { ok: false, issues: [{ code: "limit_exceeded", path: "", message: "Surface exceeds the source or widget limit" }] };
  }
  const duplicateIssue = duplicateIdIssue(spec);
  if (duplicateIssue) return { ok: false, issues: [duplicateIssue] };

  for (const [sourceIndex, source] of spec.dataSources.entries()) {
    const issue = sourcePolicyIssue(source, policy, sourceIndex);
    if (issue) return { ok: false, issues: [issue] };
    if ((source.type === "resource-list" && (source.filters?.length ?? 0) > SURFACE_LIMITS.maxFilters)
      || (source.type === "resource-list" && (source.sorters?.length ?? 0) > SURFACE_LIMITS.maxSorters)) {
      return { ok: false, issues: [{ code: "limit_exceeded", path: `/dataSources/${sourceIndex}`, message: "Source exceeds the filter or sorter limit", sourceId: source.id }] };
    }
  }

  const sources = new Map(spec.dataSources.map((source) => [source.id, source]));
  const definitions = catalogDefinitions(catalog);
  for (const [widgetIndex, widget] of spec.widgets.entries()) {
    const issue = widgetIssue(widget, widgetIndex, definitions.get(widget.type), sources, policy);
    if (issue) return { ok: false, issues: [issue] };
  }

  return { ok: true, value: spec };
}
