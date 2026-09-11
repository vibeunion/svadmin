import { Type } from '@sinclair/typebox';
import { createExactSchemaValidator } from '@svadmin/core/schema';

export const jsonValueSchema = Type.Recursive(Self => Type.Union([
  Type.Null(), Type.Boolean(), Type.Number(), Type.String(),
  Type.Array(Self), Type.Record(Type.String(), Self),
]));
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
