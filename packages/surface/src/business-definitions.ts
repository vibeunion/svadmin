import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { styledSurfaceDefinitions } from './builtin-definitions.js';
import { surfaceDesignContract } from './design-contract.js';
import type { JsonObject, SurfaceCatalog, SurfaceWidgetDefinition } from './types.js';

const field = Type.String({ minLength: 1, maxLength: 64, pattern: '^[A-Za-z][A-Za-z0-9_-]*$' });
const presentation = {
  title: Type.String({ minLength: 1, maxLength: 80 }),
  tone: Type.Optional(Type.Union(surfaceDesignContract.metric.tone.map((value) => Type.Literal(value)))),
  density: Type.Optional(Type.Union(surfaceDesignContract.metric.density.map((value) => Type.Literal(value)))),
};
export const resourceDetailPropsSchema = Type.Object({
  ...presentation,
  fields: Type.Array(Type.Object({
    field, label: Type.String({ minLength: 1, maxLength: 60 }),
    format: Type.Optional(Type.Union(['text', 'number', 'date', 'boolean'].map((value) => Type.Literal(value)))),
  }, { additionalProperties: false }), { minItems: 1, maxItems: 16 }),
}, { additionalProperties: false });
export const activityFeedPropsSchema = Type.Object({
  ...presentation,
  idField: field, actionField: field, timestampField: field,
  actorField: Type.Optional(field), targetField: Type.Optional(field),
  commentField: Type.Optional(field), statusField: Type.Optional(field),
}, { additionalProperties: false });
export type ResourceDetailProps = Static<typeof resourceDetailPropsSchema>;
export type ActivityFeedProps = Static<typeof activityFeedPropsSchema>;

const definitions: readonly SurfaceWidgetDefinition[] = [
  {
    type: 'resource-detail', dataKind: 'record', propsSchema: resourceDetailPropsSchema,
    description: 'Read-only detail of one authorized record. Bind a permitted resource-one source with pointer "". Select up to sixteen distinct readable fields; never provide record values in props.',
    examples: [{ title: 'Contact details', fields: [{ field: 'name', label: 'Name' }], density: 'compact' }],
    getReferencedFields: (props: JsonObject) => {
      const fields = Value.Decode(resourceDetailPropsSchema, props).fields.map((item) => item.field);
      if (new Set(fields).size !== fields.length) throw new Error('Detail fields must be distinct');
      return fields;
    },
  },
  {
    type: 'activity-feed', dataKind: 'items', propsSchema: activityFeedPropsSchema,
    description: 'Read-only activity timeline from an authorized resource-list /items binding. Explicitly map readable ID, action and timestamp fields; optional actor/target/comment/status fields also require read permission. No comment composer or mutations. Backend owns ordering and event authenticity; this is not proof of an audit trail.',
    examples: [{ title: 'Recent activity', idField: 'id', actionField: 'action', timestampField: 'at', tone: 'info' }],
    getReferencedFields: (props: JsonObject) => {
      const p = Value.Decode(activityFeedPropsSchema, props);
      return [p.idField, p.actionField, p.timestampField, p.actorField, p.targetField, p.commentField, p.statusField]
        .filter((name): name is string => typeof name === 'string');
    },
  },
];

/** 显式升级目录；旧目录、表单操作及默认权限不变。 */
export function createBusinessSurfaceDefinitions(base: SurfaceCatalog = styledSurfaceDefinitions): SurfaceCatalog {
  const reserved = new Set(definitions.map((widget) => widget.type));
  if (base.widgets.some((widget) => reserved.has(widget.type))) throw new Error('Business widget type is already registered');
  return { version: `${base.version}+business/v1`, widgets: [...base.widgets, ...definitions] };
}
