import { Type } from 'typebox';
import { createExactSchemaValidator } from '@svadmin/core/schema';

/** TypeBox 1.x Record validation accepts class instances; keep JSON objects plain. */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export const jsonValueSchema = Type.Cyclic({
  JsonValue: Type.Union([
    Type.Null(), Type.Boolean(), Type.Number(), Type.String(),
    Type.Array(Type.Ref('JsonValue')),
    Type.Refine(Type.Record(Type.String(), Type.Ref('JsonValue')), isPlainRecord, () => 'Expected plain object'),
  ]),
}, 'JsonValue');
const validator = createExactSchemaValidator(jsonValueSchema);

export type JsonDisplay =
  | { status: 'empty' }
  | { status: 'invalid' }
  | { status: 'valid'; formatted: string; preview: string };

export function formatJsonValue(value: unknown): JsonDisplay {
  if (value == null) return { status: 'empty' };
  try {
    // Serialization rejects circular graphs before recursive schema traversal.
    const compact: unknown = JSON.stringify(value);
    if (typeof compact !== 'string' || !validator.Check(value)) return { status: 'invalid' };
    const formatted: unknown = JSON.stringify(value, null, 2);
    if (typeof formatted !== 'string') return { status: 'invalid' };
    return {
      status: 'valid',
      formatted,
      preview: compact.slice(0, 80) + (compact.length > 80 ? '...' : ''),
    };
  } catch {
    return { status: 'invalid' };
  }
}
