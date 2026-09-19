import { Type, type TSchema } from '@sinclair/typebox';
import { surfaceDesignContract } from '../styled-system/design-contract.js';
import type { SurfaceCatalog, SurfaceWidgetDefinition, JsonObject } from '../types.js';
import type { SurfaceActionDescriptor } from './types.js';
import { validateSurfaceActionDescriptor } from './action-contracts.js';

export const surfaceAppearanceSchema = Type.Object({
  tone: Type.Optional(Type.Union(surfaceDesignContract.metric.tone.map((tone) => Type.Literal(tone)))),
  density: Type.Optional(Type.Union(surfaceDesignContract.metric.density.map((density) => Type.Literal(density)))),
}, { additionalProperties: false });

export function withoutSurfaceAppearance(props: JsonObject): JsonObject {
  return Object.fromEntries(Object.entries(props).filter(([key]) => key !== 'appearance'));
}

function withAppearance(schema: TSchema): TSchema {
  if (Array.isArray(schema.anyOf)) return { ...schema, anyOf: schema.anyOf.map((part: TSchema) => withAppearance(part)) };
  if (schema.type !== 'object' || schema.additionalProperties !== false || !schema.properties || 'appearance' in schema.properties) {
    throw new Error('Surface appearance requires closed object schemas without a reserved appearance property');
  }
  return { ...schema, properties: { ...schema.properties, appearance: Type.Optional(surfaceAppearanceSchema) } };
}

/** Adds frame-level semantic appearance to every registered widget without
 * leaking presentation props into its existing component implementation.
 * Internal table cell density remains the table's own semantic prop.
 */
export function withSurfaceAppearance<T extends SurfaceWidgetDefinition>(catalog: { version: string; widgets: readonly T[] }) {
  return { version: `${catalog.version}+appearance/v1`, widgets: catalog.widgets.map((widget): T => ({
    ...widget, presentation: 'surface-appearance/v1', propsSchema: withAppearance(widget.propsSchema),
    ...(widget.getReferencedFields ? { getReferencedFields: (props: JsonObject) => widget.getReferencedFields?.(withoutSurfaceAppearance(props)) ?? [] } : {}),
  })) };
}

/** DOM-free definitions reused by server validation, prompts and Svelte catalog. */
export function createInteractiveSurfaceDefinitions(actions: readonly SurfaceActionDescriptor[], base: SurfaceCatalog): SurfaceCatalog {
  if (!actions.length || actions.length > 32) throw new Error('Register between one and 32 Surface actions');
  if (new Set(actions.map((action) => action.id)).size !== actions.length) throw new Error('Duplicate Surface action');
  if (base.widgets.some((widget) => widget.type === 'resource-form')) throw new Error('resource-form is reserved by the interactive catalog');
  for (const action of actions) validateSurfaceActionDescriptor(action);
  const actionIds = actions.map((action) => Type.Literal(action.id, { description: `${action.label}; version ${action.version}; approval ${action.approval}` }));
  return withSurfaceAppearance({ version: `${base.version}+forms/v1`, widgets: [...base.widgets, {
    type: 'resource-form', dataKind: 'none' as const,
    description: 'Nested resource form backed by a trusted action input schema. Only a user submission can create a proposal. Approval and execution are separate server-authorized steps.',
    propsSchema: Type.Object({
      actionId: Type.Union(actionIds),
      title: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
    }, { additionalProperties: false }),
    examples: [{ actionId: actions[0].id }],
  }] });
}
