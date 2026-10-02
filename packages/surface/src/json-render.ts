import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import type { SurfaceCatalog, SurfacePolicy, SurfaceSpec } from './types.js';
import { validateSurfaceSpec } from './validation.js';
import { jsonPointer } from './json.js';
import { parseSurfaceJson } from './wire.js';
import { surfaceSpecSchema, surfaceWidgetSchema } from './schema.js';

/** json-render 的标准扁平 Spec 子集；业务字段仍由 Surface 的 TypeBox 契约校验。 */
export const jsonRenderSurfaceRootPropsSchema = Type.Omit(surfaceSpecSchema, ['schemaVersion', 'widgets']);

export const jsonRenderUiElementSchema = Type.Object({
  type: Type.String({ minLength: 1 }),
  props: Type.Record(Type.String(), Type.Unknown()),
  children: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
}, { additionalProperties: false });

export const jsonRenderSpecSchema = Type.Object({
  root: Type.String({ minLength: 1 }),
  elements: Type.Record(Type.String({ minLength: 1 }), jsonRenderUiElementSchema),
}, { additionalProperties: false });

export type JsonRenderSurfaceElement = Static<typeof jsonRenderUiElementSchema>;
export type JsonRenderSurfaceSpec = Static<typeof jsonRenderSpecSchema>;

export type JsonRenderSurfaceResult =
  | { readonly ok: true; readonly value: SurfaceSpec }
  | { readonly ok: false; readonly issues: readonly { readonly path: string; readonly message: string }[] };

function issue(path: string, message: string): { readonly path: string; readonly message: string } {
  return { path, message };
}

/**
 * 将 json-render Spec 转换为受 Surface 权限、目录和 TypeBox 规则保护的 SurfaceSpec。
 * 只接受 root 类型为 surface 的子集，避免把任意 json-render 组件树当作业务页面执行。
 */
function readSurfaceRoot(candidate: JsonRenderSurfaceSpec): JsonRenderSurfaceElement | { readonly error: string } {
  const root = candidate.elements[candidate.root];
  if (!root || root.type !== 'surface') return { error: 'json-render root must reference a surface element' };
  if (!Value.Check(jsonRenderSurfaceRootPropsSchema, root.props)) return { error: 'Invalid surface root properties' };
  return root;
}

function readWidgetElement(element: JsonRenderSurfaceElement, id: string) {
  if (element.type === 'surface') return { error: 'Nested surface elements are not supported' };
  if (element.children?.length) return { error: 'Widget children are not supported' };
  const binding = element.props['binding'];
  const placement = element.props['placement'];
  if (binding !== undefined && !Value.Check(surfaceWidgetSchema.properties.binding, binding)) return { error: 'Invalid widget binding' };
  if (placement !== undefined && !Value.Check(surfaceWidgetSchema.properties.placement, placement)) return { error: 'Invalid widget placement' };
  const props = { ...element.props };
  delete props['binding'];
  delete props['placement'];
  return { id, type: element.type, props,
    ...(binding === undefined ? {} : { binding }),
    ...(placement === undefined ? {} : { placement }),
  };
}

function parseJsonRenderSpec(input: unknown): JsonRenderSurfaceSpec | { readonly error: string; readonly path?: string } {
  const parsed = parseSurfaceJson(input);
  if (!parsed.ok) return { error: parsed.issues[0]?.message ?? 'Invalid JSON', path: parsed.issues[0]?.path ?? '' };
  if (!Value.Check(jsonRenderSpecSchema, parsed.value)) return { error: 'Invalid json-render spec' };
  return parsed.value;
}

export function jsonRenderSpecToSurfaceSpec(input: unknown, catalog: SurfaceCatalog, policy: SurfacePolicy): JsonRenderSurfaceResult {
  const parsed = parseJsonRenderSpec(input);
  if ('error' in parsed) return { ok: false, issues: [issue(parsed.path ?? '', parsed.error)] };
  const root = readSurfaceRoot(parsed);
  if ('error' in root) return { ok: false, issues: [issue('/root', root.error)] };
  const children = root.children ?? [];
  const widgets = [];
  for (const childId of children) {
    const element = parsed.elements[childId];
    if (!element) return { ok: false, issues: [issue(jsonPointer(['elements', childId]), 'Missing child element')] };
    const widget = readWidgetElement(element, childId);
    if ('error' in widget) return { ok: false, issues: [issue(jsonPointer(['elements', childId]), widget.error)] };
    widgets.push(widget);
  }
  if (new Set(children).size !== children.length || Object.keys(parsed.elements).length !== children.length + 1) return { ok: false, issues: [issue('/elements', 'Every element must occur exactly once in the surface tree')] };
  const surface = { schemaVersion: 'surface/v1', ...root.props, widgets };
  const validation = validateSurfaceSpec(surface, catalog, policy);
  return validation.ok ? validation : { ok: false, issues: validation.issues.map(({ path, message }) => ({ path, message })) };
}

/** 将已校验的 SurfaceSpec 编码为 json-render 的标准扁平 Spec。 */
export function surfaceSpecToJsonRenderSpec(spec: SurfaceSpec): JsonRenderSurfaceSpec {
  const root = '__svadmin_surface_root';
  if (spec.widgets.some(widget => widget.id === root)) {
    throw new Error('Surface widget id is reserved by the json-render adapter');
  }
  const elements: Record<string, JsonRenderSurfaceElement> = {
    [root]: {
      type: 'surface',
      props: {
        catalogVersion: spec.catalogVersion,
        surfaceId: spec.surfaceId,
        title: spec.title,
        layout: spec.layout,
        dataSources: spec.dataSources,
      },
      children: spec.widgets.map(widget => widget.id),
    },
  };
  for (const widget of spec.widgets) {
    if (Object.hasOwn(widget.props, 'binding') || Object.hasOwn(widget.props, 'placement')) {
      throw new Error('Widget props binding and placement are reserved by the json-render adapter');
    }
    elements[widget.id] = {
      type: widget.type,
      props: {
        ...widget.props,
        ...(widget.binding ? { binding: widget.binding } : {}),
        ...(widget.placement ? { placement: widget.placement } : {}),
      },
    };
  }
  return { root, elements };
}
