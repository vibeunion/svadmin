import { Type, type Static } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData } from './plain-data';

const permissionName = Type.String({ minLength: 1, pattern: '\\S' });
const permissionHintsSchema = Type.Union([
  Type.Null(),
  Type.Array(permissionName),
  Type.Record(Type.String({ pattern: '\\S' }), Type.Boolean(), { additionalProperties: false }),
]);

export type PermissionHints = Readonly<Static<typeof permissionHintsSchema>>;

export class PermissionHintsError extends Error {
  constructor(readonly code: 'INVALID_PERMISSION_HINTS' | 'PERMISSION_HINTS_FAILED') {
    super(code === 'INVALID_PERMISSION_HINTS' ? 'Invalid permission hints.' : 'Permission hints request failed.');
    this.name = 'PermissionHintsError';
  }
}

export function decodePermissionHints(value: unknown): PermissionHints {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(permissionHintsSchema, candidate)) {
      return candidate === null ? null : Object.freeze(candidate);
    }
  } catch {
    // Do not expose provider data or reflection errors.
  }
  throw new PermissionHintsError('INVALID_PERMISSION_HINTS');
}

export function hasPermissionHint(hints: PermissionHints, permission: string): boolean {
  if (hints === null) return false;
  if (Array.isArray(hints)) return hints.includes(permission);
  const descriptor = Object.getOwnPropertyDescriptor(hints, permission);
  const value: unknown = descriptor && 'value' in descriptor ? descriptor.value : undefined;
  return value === true;
}
