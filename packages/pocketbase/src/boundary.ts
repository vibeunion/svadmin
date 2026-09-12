import { Type, type Static, type TSchema } from '@sinclair/typebox';
import { checkExact, snapshotPlainData } from '@svadmin/core/schema';

export const nonempty = Type.String({ minLength: 1 });
export const collectionName = Type.String({ minLength: 1, pattern: '^[A-Za-z0-9_]+$' });
export const authRecord = Type.Object({
  id: nonempty,
  name: Type.Optional(Type.String()),
  email: Type.Optional(Type.String()),
  avatar: Type.Optional(Type.String()),
});

export class PocketBaseBoundaryError extends Error {
  constructor(readonly phase: 'input' | 'response' | 'session' | 'event') {
    super(`Invalid PocketBase ${phase}`);
    this.name = 'PocketBaseBoundaryError';
  }
}

export function decode<S extends TSchema>(
  schema: S, value: unknown, phase: PocketBaseBoundaryError['phase'],
): Static<S> {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(schema, candidate)) return candidate;
  } catch {
    // Never expose submitted credentials, SDK payloads, or accessor exceptions.
  }
  throw new PocketBaseBoundaryError(phase);
}
