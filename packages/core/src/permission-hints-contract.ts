import { Type, type Static } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData } from './plain-data';
import { decodePermissionSnapshot, type PermissionSnapshot } from './permission-catalog';

const permissionName = Type.String({ minLength: 1, pattern: '\\S' });
const permissionHintsSchema = Type.Union([
  Type.Null(),
  Type.Array(permissionName),
  Type.Record(Type.String({ pattern: '\\S' }), Type.Boolean(), { additionalProperties: false }),
  Type.Object({
    applicationId: Type.String({ minLength: 1, pattern: '\\S' }),
    catalogVersion: Type.String({ minLength: 1, pattern: '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$' }),
    catalogDigest: Type.Optional(Type.String({ minLength: 1, pattern: '\\S' })),
    permissions: Type.Array(permissionName),
  }, { additionalProperties: false }),
]);

export type PermissionHints = null | readonly string[] | Readonly<Record<string, boolean>> | PermissionSnapshot;

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
      if (candidate === null) return null;
      if (!Array.isArray(candidate) && typeof candidate === 'object' && 'applicationId' in candidate) {
        return decodePermissionSnapshot(candidate) as PermissionSnapshot;
      }
      return Object.freeze(candidate);
    }
  } catch {
    // Do not expose provider data or reflection errors.
  }
  throw new PermissionHintsError('INVALID_PERMISSION_HINTS');
}

export function hasPermissionHint(hints: PermissionHints, permission: string): boolean {
  if (hints === null) return false;
  if (Array.isArray(hints)) return hints.includes(permission);
  if ('permissions' in hints && Array.isArray(hints.permissions)) return hints.permissions.includes(permission);
  const descriptor = Object.getOwnPropertyDescriptor(hints, permission);
  const value: unknown = descriptor && 'value' in descriptor ? descriptor.value : undefined;
  return value === true;
}
