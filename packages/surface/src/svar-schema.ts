import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import type { JsonObject, SurfaceWidgetDefinition } from './types.js';

const field = Type.String({ minLength: 1, maxLength: 64, pattern: '^[A-Za-z][A-Za-z0-9_-]*$' });
/** JSON-only 契约；宿主引擎、回调、URL 和写操作不属于 AI 可以生成的属性。 */
export const svarGridPropsSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 80 }),
  rowKey: Type.Optional(field),
  height: Type.Optional(Type.Integer({ minimum: 160, maximum: 1200 })),
  density: Type.Optional(Type.Union([Type.Literal('compact'), Type.Literal('comfortable')])),
  freezeLeft: Type.Optional(Type.Integer({ minimum: 0, maximum: 8 })),
  freezeRight: Type.Optional(Type.Integer({ minimum: 0, maximum: 8 })),
  emptyLabel: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
  columns: Type.Array(Type.Object({
    field, label: Type.String({ minLength: 1, maxLength: 60 }),
    width: Type.Optional(Type.Integer({ minimum: 60, maximum: 640 })),
    format: Type.Optional(Type.Union([Type.Literal('plain'), Type.Literal('number'), Type.Literal('percent'), Type.Literal('date'), Type.Literal('datetime'), Type.Literal('boolean')])),
  }, { additionalProperties: false }), { minItems: 1, maxItems: 16 }),
}, { additionalProperties: false });
export type SvarGridProps = Static<typeof svarGridPropsSchema>;

export function decodeSvarGridProps(props: JsonObject): SvarGridProps {
  const value = Value.Decode(svarGridPropsSchema, props);
  const keys = value.columns.map(column => column.field);
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate grid columns');
  if ((value.freezeLeft ?? 0) + (value.freezeRight ?? 0) > keys.length || (value.freezeRight ?? 0) >= keys.length) {
    throw new Error('Frozen columns must leave a scrollable grid');
  }
  return value;
}

export const svarGridDefinition: SurfaceWidgetDefinition = {
  type: 'data-grid', dataKind: 'items', propsSchema: svarGridPropsSchema,
  getReferencedFields(props) {
    const value = decodeSvarGridProps(props);
    // 行标识也是一次字段读取，必须与显示列一样经过宿主白名单检查。
    return [...new Set([value.rowKey ?? 'id', ...value.columns.map(column => column.field)])];
  },
};
