import { Type } from '@sinclair/typebox';
import { SURFACE_LIMITS } from './types.js';

// 结构定义只维护一份：运行时校验与 AI 输出 schema 共用，策略校验仍在 validation.ts。
export const surfaceIdSchema = Type.String({
  minLength: 1,
  maxLength: SURFACE_LIMITS.maxIdLength,
  pattern: '^[A-Za-z][A-Za-z0-9_-]*$',
});
const fieldSchema = Type.String({ minLength: 1, maxLength: SURFACE_LIMITS.maxIdLength });
const jsonPrimitiveSchema = Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()]);

export const surfaceFilterSchema = Type.Union([
  Type.Object({
    field: fieldSchema,
    operator: Type.Union([
      Type.Literal('eq'), Type.Literal('ne'), Type.Literal('lt'), Type.Literal('lte'),
      Type.Literal('gt'), Type.Literal('gte'), Type.Literal('contains'),
      Type.Literal('startswith'), Type.Literal('endswith'),
    ]),
    value: jsonPrimitiveSchema,
  }, { additionalProperties: false }),
  Type.Object({
    field: fieldSchema,
    operator: Type.Union([Type.Literal('in'), Type.Literal('nin')]),
    value: Type.Array(jsonPrimitiveSchema),
  }, { additionalProperties: false }),
  Type.Object({
    field: fieldSchema,
    operator: Type.Union([Type.Literal('null'), Type.Literal('nnull')]),
  }, { additionalProperties: false }),
]);

export const surfaceListSourceSchema = Type.Object({
  id: surfaceIdSchema,
  type: Type.Literal('resource-list'),
  resource: surfaceIdSchema,
  pageSize: Type.Optional(Type.Integer({ minimum: 1 })),
  sorters: Type.Optional(Type.Array(Type.Object({
    field: fieldSchema,
    order: Type.Union([Type.Literal('asc'), Type.Literal('desc')]),
  }, { additionalProperties: false }))),
  filters: Type.Optional(Type.Array(surfaceFilterSchema)),
}, { additionalProperties: false });

export const surfaceOneSourceSchema = Type.Object({
  id: surfaceIdSchema,
  type: Type.Literal('resource-one'),
  resource: surfaceIdSchema,
  recordId: Type.Union([Type.String(), Type.Number()]),
}, { additionalProperties: false });

export const surfaceLayoutSchema = Type.Object({
  type: Type.Literal('grid'),
  columns: Type.Literal(12),
  gap: Type.Optional(Type.Union([Type.Literal('sm'), Type.Literal('md'), Type.Literal('lg')])),
}, { additionalProperties: false });

export const surfaceWidgetSchema = Type.Object({
  id: surfaceIdSchema,
  type: surfaceIdSchema,
  props: Type.Record(Type.String(), Type.Unknown()),
  binding: Type.Optional(Type.Object({
    sourceId: surfaceIdSchema,
    pointer: Type.Optional(Type.String()),
  }, { additionalProperties: false })),
  placement: Type.Optional(Type.Object({
    columnSpan: Type.Optional(Type.Integer({ minimum: 1, maximum: 12 })),
  }, { additionalProperties: false })),
}, { additionalProperties: false });

export const surfaceSpecSchema = Type.Object({
  schemaVersion: Type.String(),
  catalogVersion: Type.String({ minLength: 1 }),
  surfaceId: surfaceIdSchema,
  title: Type.String({ minLength: 1, maxLength: SURFACE_LIMITS.maxTitleLength }),
  layout: surfaceLayoutSchema,
  dataSources: Type.Array(Type.Union([surfaceListSourceSchema, surfaceOneSourceSchema])),
  widgets: Type.Array(surfaceWidgetSchema),
}, { additionalProperties: false });
