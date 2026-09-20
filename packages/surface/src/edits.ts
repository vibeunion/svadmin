import { Type } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { createSurfaceCatalogManifest, SURFACE_AGENT_LIMITS, surfaceSchemaToJson } from './agent-contract.js';
import type { SurfaceAgentMessage } from './agent.js';
import {
  surfaceIdSchema, surfaceLayoutSchema, surfaceListSourceSchema,
  surfaceOneSourceSchema, surfaceSpecSchema, surfaceWidgetSchema,
} from './schema.js';
import type {
  JsonObject, SurfaceCatalog, SurfaceDataSource, SurfaceGridLayout, SurfacePolicy,
  SurfaceSpec, SurfaceValidationIssue, SurfaceWidget,
} from './types.js';
import { SURFACE_LIMITS } from './types.js';
import { validateSurfaceSpec } from './validation.js';
import { parseSurfaceJson } from './wire.js';

export const SURFACE_EDIT_SCHEMA_VERSION = 'surface-edit/v1' as const;
export const SURFACE_EDIT_LIMITS = { maxOperations: 64 } as const;

export type SurfaceEditOperation =
  | { readonly op: 'set-title'; readonly value: string }
  | { readonly op: 'set-layout'; readonly value: SurfaceGridLayout }
  | { readonly op: 'upsert-widget'; readonly widget: SurfaceWidget }
  | { readonly op: 'remove-widget'; readonly id: string }
  | { readonly op: 'upsert-source'; readonly source: SurfaceDataSource }
  | { readonly op: 'remove-source'; readonly id: string }
  | { readonly op: 'reorder-widgets'; readonly ids: readonly string[] };

export interface SurfaceEditProposal {
  readonly schemaVersion: typeof SURFACE_EDIT_SCHEMA_VERSION;
  readonly catalogVersion: string;
  readonly surfaceId: string;
  readonly baseRevision: number;
  readonly operations: readonly SurfaceEditOperation[];
}
export interface SurfaceRevision {
  readonly revision: number;
  readonly spec: SurfaceSpec;
}
export interface SurfaceEditIssue extends Omit<SurfaceValidationIssue, 'code'> {
  readonly code: SurfaceValidationIssue['code'] | 'revision_conflict' | 'invalid_edit';
}
export type SurfaceRevisionResult =
  | { readonly ok: true; readonly value: SurfaceRevision }
  | { readonly ok: false; readonly issues: readonly SurfaceEditIssue[] };

const revisionSchema = Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER });
const editSchema = Type.Object({
  schemaVersion: Type.Literal(SURFACE_EDIT_SCHEMA_VERSION),
  catalogVersion: Type.String({ minLength: 1 }),
  surfaceId: surfaceIdSchema,
  baseRevision: revisionSchema,
  operations: Type.Array(Type.Union([
    Type.Object({ op: Type.Literal('set-title'), value: Type.String({ minLength: 1, maxLength: SURFACE_LIMITS.maxTitleLength }) }, { additionalProperties: false }),
    Type.Object({ op: Type.Literal('set-layout'), value: surfaceLayoutSchema }, { additionalProperties: false }),
    Type.Object({ op: Type.Literal('upsert-widget'), widget: surfaceWidgetSchema }, { additionalProperties: false }),
    Type.Object({ op: Type.Literal('remove-widget'), id: surfaceIdSchema }, { additionalProperties: false }),
    Type.Object({ op: Type.Literal('upsert-source'), source: Type.Union([surfaceListSourceSchema, surfaceOneSourceSchema]) }, { additionalProperties: false }),
    Type.Object({ op: Type.Literal('remove-source'), id: surfaceIdSchema }, { additionalProperties: false }),
    Type.Object({ op: Type.Literal('reorder-widgets'), ids: Type.Array(surfaceIdSchema, { maxItems: SURFACE_LIMITS.maxWidgets, uniqueItems: true }) }, { additionalProperties: false }),
  ]), { minItems: 1, maxItems: SURFACE_EDIT_LIMITS.maxOperations }),
}, { additionalProperties: false });
const compiledEdit = TypeCompiler.Compile(editSchema);
const compiledRevision = TypeCompiler.Compile(Type.Object({ revision: revisionSchema, spec: surfaceSpecSchema }, { additionalProperties: false }));

function editError(code: SurfaceEditIssue['code'], path: string, message: string): Extract<SurfaceRevisionResult, { ok: false }> {
  return { ok: false, issues: [{ code, path, message }] };
}

// 输入已通过 JSON 检查。新快照独立于调用方对象，也不会冻结调用方原有状态。
function immutableCopy<T>(input: T): T {
  const copy: unknown = JSON.parse(JSON.stringify(input));
  const pending: unknown[] = [copy];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current !== null && typeof current === 'object') {
      pending.push(...Object.values(current));
      Object.freeze(current);
    }
  }
  return copy as T;
}

export function createSurfaceRevision(spec: unknown, catalog: SurfaceCatalog, policy: SurfacePolicy, revision = 0): SurfaceRevisionResult {
  if (!Number.isSafeInteger(revision) || revision < 0) return editError('invalid_edit', '/revision', 'Revision must be a non-negative safe integer');
  const parsed = parseSurfaceJson(spec);
  if (!parsed.ok) return parsed;
  const result = validateSurfaceSpec(parsed.value, catalog, policy);
  if (!result.ok) return result;
  return { ok: true, value: immutableCopy({ revision, spec: result.value }) };
}

/**
 * 只生成下一版候选快照，不保存、不渲染、不访问 DataProvider。
 * 服务端保存时仍必须对 revision 做原子 compare-and-swap，并重新授权。
 */
export function applySurfaceEditProposal(current: SurfaceRevision, input: unknown, catalog: SurfaceCatalog, policy: SurfacePolicy): SurfaceRevisionResult {
  const parsedCurrent = parseSurfaceJson(current);
  if (!parsedCurrent.ok) return parsedCurrent;
  if (!compiledRevision.Check(parsedCurrent.value)) return editError('invalid_edit', '', 'Invalid current surface revision');
  const original = validateSurfaceSpec(parsedCurrent.value.spec, catalog, policy);
  if (!original.ok) return original;
  const parsed = parseSurfaceJson(input);
  if (!parsed.ok) return parsed;
  if (!compiledEdit.Check(parsed.value)) return editError('invalid_edit', '', 'Edit does not match the surface-edit/v1 schema');
  const edit = parsed.value as SurfaceEditProposal;
  if (edit.catalogVersion !== catalog.version || edit.catalogVersion !== original.value.catalogVersion) {
    return editError('catalog_version_mismatch', '/catalogVersion', 'Edit catalog version does not match the active catalog');
  }
  if (edit.surfaceId !== original.value.surfaceId) return editError('invalid_edit', '/surfaceId', 'Edit targets a different surface');
  if (edit.baseRevision !== parsedCurrent.value.revision) return editError('revision_conflict', '/baseRevision', 'Edit is based on a stale surface revision');
  if (edit.baseRevision === Number.MAX_SAFE_INTEGER) return editError('invalid_edit', '/baseRevision', 'Revision counter is exhausted');

  let title = original.value.title;
  let layout = original.value.layout;
  const sources = [...original.value.dataSources];
  let widgets = [...original.value.widgets];
  for (const [index, operation] of edit.operations.entries()) {
    const path = `/operations/${index}`;
    switch (operation.op) {
      case 'set-title': title = operation.value; break;
      case 'set-layout': layout = operation.value; break;
      case 'upsert-widget': {
        const target = widgets.findIndex((widget) => widget.id === operation.widget.id);
        if (target === -1) widgets.push(operation.widget);
        else widgets[target] = operation.widget;
        break;
      }
      case 'remove-widget': {
        const target = widgets.findIndex((widget) => widget.id === operation.id);
        if (target === -1) return editError('invalid_edit', path, 'Cannot remove an unknown widget');
        widgets.splice(target, 1);
        break;
      }
      case 'upsert-source': {
        const target = sources.findIndex((source) => source.id === operation.source.id);
        if (target === -1) sources.push(operation.source);
        else sources[target] = operation.source;
        break;
      }
      case 'remove-source': {
        const target = sources.findIndex((source) => source.id === operation.id);
        if (target === -1) return editError('invalid_edit', path, 'Cannot remove an unknown source');
        sources.splice(target, 1);
        break;
      }
      case 'reorder-widgets': {
        if (operation.ids.length !== widgets.length || new Set(operation.ids).size !== widgets.length) {
          return editError('invalid_edit', path, 'Reordering must list every widget exactly once');
        }
        const ordered: SurfaceWidget[] = [];
        for (const id of operation.ids) {
          const widget = widgets.find((candidate) => candidate.id === id);
          if (!widget) return editError('invalid_edit', path, 'Cannot reorder an unknown widget');
          ordered.push(widget);
        }
        widgets = ordered;
        break;
      }
    }
  }
  // 整个事务合并后再验证关联；任何失败都不改变上一版快照。
  const result = validateSurfaceSpec({ ...original.value, title, layout, dataSources: sources, widgets }, catalog, policy);
  if (!result.ok) return result;
  const bounded = parseSurfaceJson(result.value);
  if (!bounded.ok) return bounded;
  return { ok: true, value: immutableCopy({ revision: edit.baseRevision + 1, spec: result.value }) };
}

export function createSurfaceEditSchema(): JsonObject {
  return surfaceSchemaToJson(editSchema);
}

export function buildSurfaceEditMessages(request: string, current: SurfaceRevision, catalog: SurfaceCatalog, policy: SurfacePolicy): readonly SurfaceAgentMessage[] {
  if (typeof request !== 'string' || !request.trim() || request.length > SURFACE_AGENT_LIMITS.maxRequestCharacters) {
    throw new Error('Surface edit request must be non-empty and within the request character limit');
  }
  const parsed = parseSurfaceJson(current);
  if (!parsed.ok || !compiledRevision.Check(parsed.value) || !validateSurfaceSpec(parsed.value.spec, catalog, policy).ok) {
    throw new Error('Cannot generate edits for an invalid current revision');
  }
  const content = `Return one JSON surface-edit/v1 proposal, not code, markdown, or a full replacement surface. Preserve IDs and all unrequested widgets, sources, filters, and layout. Use the current surfaceId, catalogVersion and baseRevision exactly. Only the listed operations and catalog widgets are allowed. Do not generate CSS, JavaScript, SQL, URLs, event handlers, or mutations. Edits are proposals requiring whole-document validation and host approval, never permission grants.\nCatalog: ${JSON.stringify(createSurfaceCatalogManifest(catalog))}\nPolicy: ${JSON.stringify(policy)}\nEdit JSON Schema: ${JSON.stringify(createSurfaceEditSchema())}\nCurrent revision: ${JSON.stringify(parsed.value)}`;
  if (content.length > SURFACE_AGENT_LIMITS.maxContractCharacters) throw new Error('Surface edit context exceeds the contract character limit');
  return [{ role: 'system', content }, { role: 'user', content: request }];
}
