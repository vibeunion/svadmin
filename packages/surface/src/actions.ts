import { z } from 'zod';
import { jsonValueIssue } from './json.js';
import {
  type SurfaceActionContext,
  type SurfaceActionDefinition,
  type SurfaceActionErrorCode,
  type SurfaceActionRegistry,
  type SurfaceActionResult,
} from './actions-types.js';
import { SURFACE_LIMITS, type JsonObject, type SurfaceFilter } from './types.js';
import { validateSurfaceSpec } from './validation.js';

export * from './actions-types.js';

const actionTypeSchema = z.string().min(1).max(SURFACE_LIMITS.maxIdLength).regex(/^[A-Za-z][A-Za-z0-9_-]*$/u);
const fieldSchema = z.string().min(1).max(SURFACE_LIMITS.maxIdLength);
const primitiveSchema = z.union([z.string(), z.number().finite(), z.boolean(), z.null()]);
const filterSchema = z.discriminatedUnion('operator', [
  z.object({
    field: fieldSchema,
    operator: z.enum(['eq', 'ne', 'lt', 'lte', 'gt', 'gte', 'contains', 'startswith', 'endswith']),
    value: primitiveSchema,
  }).strict(),
  z.object({
    field: fieldSchema,
    operator: z.enum(['in', 'nin']),
    value: z.array(primitiveSchema),
  }).strict(),
  z.object({ field: fieldSchema, operator: z.enum(['null', 'nnull']) }).strict(),
]);

const refreshSourceSchema = z.object({
  type: z.literal('refreshSource'),
  sourceId: actionTypeSchema.optional(),
}).strict();
const setFilterSchema = z.object({
  type: z.literal('setFilter'),
  sourceId: actionTypeSchema,
  filter: filterSchema,
}).strict();
const clearFilterSchema = z.object({
  type: z.literal('clearFilter'),
  sourceId: actionTypeSchema,
}).strict();
const navigateResourceSchema = z.object({
  type: z.literal('navigateResource'),
  resource: actionTypeSchema,
  recordId: z.union([z.string(), z.number().finite()]).optional(),
}).strict();
const strictSchemaProbeKey = '__surface_action_unknown_property_probe__';

function actionFailure(code: SurfaceActionErrorCode, message: string): SurfaceActionResult {
  return { ok: false, error: { code, message } };
}

function sourceFor(context: SurfaceActionContext, sourceId: string) {
  return context.spec.dataSources.find((source) => source.id === sourceId);
}

function listSourceFor(context: SurfaceActionContext, sourceId: string) {
  const source = sourceFor(context, sourceId);
  return source?.type === 'resource-list' ? source : undefined;
}

function resourcePolicyFor(context: SurfaceActionContext, resource: string) {
  return Object.hasOwn(context.policy.resources, resource)
    ? context.policy.resources[resource]
    : undefined;
}

async function refreshSource(action: JsonObject, context: SurfaceActionContext): Promise<void> {
  const parsed = refreshSourceSchema.parse(action);
  if (parsed.sourceId && !sourceFor(context, parsed.sourceId)) throw new SurfaceActionDeniedError();
  await context.refresh(parsed.sourceId);
}

function nextTransientFilters(
  current: readonly SurfaceFilter[],
  filter: SurfaceFilter,
): readonly SurfaceFilter[] {
  return [...current.filter((candidate) => candidate.field !== filter.field), filter];
}

function candidateSpec(
  context: SurfaceActionContext,
  sourceId: string,
  transientFilters: readonly SurfaceFilter[],
) {
  return {
    ...context.spec,
    dataSources: context.spec.dataSources.map((source) => source.id === sourceId && source.type === 'resource-list'
      ? { ...source, filters: [...(source.filters ?? []), ...transientFilters] }
      : source),
  };
}

async function setFilter(action: JsonObject, context: SurfaceActionContext): Promise<void> {
  const parsed = setFilterSchema.parse(action);
  const source = listSourceFor(context, parsed.sourceId);
  if (!source) throw new SurfaceActionDeniedError();
  const resourcePolicy = resourcePolicyFor(context, source.resource);
  if (!resourcePolicy?.filterFields?.includes(parsed.filter.field)) throw new SurfaceActionDeniedError();
  const transientFilters = nextTransientFilters(
    context.getTransientFilters(parsed.sourceId),
    parsed.filter as SurfaceFilter,
  );
  const validation = validateSurfaceSpec(
    candidateSpec(context, parsed.sourceId, transientFilters),
    context.catalog,
    context.policy,
  );
  if (!validation.ok) throw new SurfaceActionDeniedError();
  await context.applyTransientFilters(parsed.sourceId, transientFilters);
  await context.refresh(parsed.sourceId);
}

async function clearFilter(action: JsonObject, context: SurfaceActionContext): Promise<void> {
  const parsed = clearFilterSchema.parse(action);
  if (!listSourceFor(context, parsed.sourceId)) throw new SurfaceActionDeniedError();
  await context.applyTransientFilters(parsed.sourceId, []);
  await context.refresh(parsed.sourceId);
}

async function navigateResource(action: JsonObject, context: SurfaceActionContext): Promise<void> {
  const parsed = navigateResourceSchema.parse(action);
  const resourcePolicy = resourcePolicyFor(context, parsed.resource);
  const resourceIsBound = context.spec.dataSources.some((source) => source.resource === parsed.resource);
  if (!resourcePolicy || !resourceIsBound || (parsed.recordId !== undefined && !resourcePolicy.allowGetOne)) {
    throw new SurfaceActionDeniedError();
  }
  if (!context.navigateResource) throw new SurfaceActionUnavailableError();
  await context.navigateResource({
    resource: parsed.resource,
    ...(parsed.recordId === undefined ? {} : { recordId: parsed.recordId }),
  });
}

class SurfaceActionDeniedError extends Error {}
class SurfaceActionUnavailableError extends Error {}

export function defineSurfaceActionRegistry<const TRegistry extends SurfaceActionRegistry>(
  registry: TRegistry,
): TRegistry {
  const actionTypes = new Set<string>();
  for (const action of registry.actions) {
    if (!actionTypeSchema.safeParse(action.type).success) throw new Error('Surface action type is invalid');
    if (actionTypes.has(action.type)) throw new Error(`Duplicate surface action type "${action.type}"`);
    actionTypes.add(action.type);
  }
  return Object.freeze({ ...registry, actions: Object.freeze([...registry.actions]) }) as TRegistry;
}

export const defaultSurfaceActionRegistry = defineSurfaceActionRegistry({
  actions: [
    { type: 'refreshSource', schema: refreshSourceSchema, handler: refreshSource },
    { type: 'setFilter', schema: setFilterSchema, handler: setFilter },
    { type: 'clearFilter', schema: clearFilterSchema, handler: clearFilter },
    { type: 'navigateResource', schema: navigateResourceSchema, handler: navigateResource },
  ],
});

function actionType(input: JsonObject): string | null {
  const descriptor = Object.getOwnPropertyDescriptor(input, 'type');
  return descriptor && 'value' in descriptor && typeof descriptor.value === 'string'
    ? descriptor.value
    : null;
}

function strictSchemaAccepts(
  definition: SurfaceActionDefinition,
  input: JsonObject,
): { readonly success: true; readonly action: JsonObject } | { readonly success: false } {
  const parsed = definition.schema.safeParse(input);
  const strictProbe = definition.schema.safeParse({ ...input, [strictSchemaProbeKey]: null });
  if (!parsed.success || strictProbe.success || jsonValueIssue(parsed.data)) return { success: false };
  if (parsed.data === null || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) return { success: false };
  return { success: true, action: parsed.data as JsonObject };
}

export async function executeSurfaceAction(
  input: unknown,
  registry: SurfaceActionRegistry,
  context: SurfaceActionContext,
): Promise<SurfaceActionResult> {
  if (jsonValueIssue(input) || input === null || typeof input !== 'object' || Array.isArray(input)) {
    return actionFailure('invalid_action', 'Surface action must be a JSON object');
  }
  const inputObject = input as JsonObject;
  const type = actionType(inputObject);
  if (!type) return actionFailure('invalid_action', 'Surface action type is invalid');
  const definition = registry.actions.find((candidate) => candidate.type === type);
  if (!definition) return actionFailure('unknown_action', 'Surface action type is not registered');
  const parsed = strictSchemaAccepts(definition, inputObject);
  if (!parsed.success) return actionFailure('invalid_action', 'Surface action structure is invalid');

  try {
    await definition.handler(parsed.action, context);
    return { ok: true, actionType: type };
  } catch (error) {
    if (error instanceof SurfaceActionDeniedError) {
      return actionFailure('action_denied', 'Surface action is not allowed');
    }
    if (error instanceof SurfaceActionUnavailableError) {
      return actionFailure('action_unavailable', 'Surface action is unavailable');
    }
    return actionFailure('action_failed', 'Surface action failed');
  }
}
