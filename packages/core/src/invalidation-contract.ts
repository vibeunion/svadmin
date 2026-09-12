import { Type } from '@sinclair/typebox';
import { snapshotPlainData } from './plain-data';
import { checkExact } from './schema-validation';
import { HttpError } from './types';

const schema = Type.Object({
  id: Type.Optional(Type.Union([Type.String(), Type.Number()])),
  invalidates: Type.Optional(Type.Union([
    Type.Literal(false), Type.Literal('all'),
    Type.Array(Type.Union([
      Type.Literal('list'), Type.Literal('many'),
      Type.Literal('detail'), Type.Literal('resourceAll'),
    ])),
  ])),
}, { additionalProperties: false });

/** Invalid input must not broaden the cache scope or execute submitted accessors. */
export function snapshotInvalidationParams(value: unknown) {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(schema, candidate)) return candidate;
  } catch {
    // Do not expose cache input values or reflection failures.
  }
  throw new HttpError('Invalid refresh input', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
}
