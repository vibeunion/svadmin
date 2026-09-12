import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

const jsonValue = Type.Recursive(self => Type.Union([
  Type.Null(), Type.Boolean(), Type.Number(), Type.String(),
  Type.Array(self), Type.Record(Type.String(), self),
]));
const paletteSchema = Type.Object({
  id: Type.String(),
  type: Type.String(),
  label: Type.String(),
  description: Type.Optional(Type.String()),
  data: Type.Record(Type.String(), jsonValue),
  disabled: Type.Optional(Type.Boolean()),
}, { additionalProperties: false });

export type PaletteRecord = Static<typeof paletteSchema>;

/** Snapshot plain data without invoking accessors or serialization hooks. */
function snapshot(value: unknown, ancestors: Set<object>): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (ancestors.has(value)) throw new TypeError('Circular palette data');
  const array = Array.isArray(value);
  const prototype: unknown = Object.getPrototypeOf(value);
  if (!array && prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('Palette data must use plain objects');
  }
  if (Object.getOwnPropertySymbols(value).length > 0) throw new TypeError('Symbol palette keys');
  ancestors.add(value);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    function read(key: string): unknown {
      const descriptor = descriptors[key];
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
        throw new TypeError('Palette data must use enumerable data properties');
      }
      const entry: unknown = descriptor.value;
      if (entry === undefined) throw new TypeError('Undefined palette data');
      return snapshot(entry, ancestors);
    }
    if (array) {
      if (Object.keys(descriptors).length !== value.length + 1) {
        throw new TypeError('Palette arrays must be dense and have no extra properties');
      }
      return Array.from({ length: value.length }, (_, index) => read(String(index)));
    }
    return Object.fromEntries(Object.keys(descriptors).map(key => [key, read(key)]));
  } finally {
    ancestors.delete(value);
  }
}

export function parsePaletteRecord(value: unknown): PaletteRecord | null {
  try {
    const candidate = snapshot(value, new Set());
    return Value.Check(paletteSchema, candidate) ? candidate : null;
  } catch {
    return null;
  }
}
