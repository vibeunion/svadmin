import { Type } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData } from './plain-data';
import { decodePermissionSnapshot, permissionSnapshotSchema, type PermissionSnapshot } from './permission-catalog';

const permissionName = Type.String({ minLength: 1, pattern: '\\S' });
const permissionHintsSchema = Type.Union([
  Type.Null(),
  Type.Array(permissionName),
  Type.Record(Type.String({ pattern: '\\S' }), Type.Boolean(), { additionalProperties: false }),
  permissionSnapshotSchema,
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
      // 旧式布尔映射允许 applicationId 作为权限名称，不能仅凭键名识别快照。
      if (!Array.isArray(candidate) && typeof candidate === 'object'
          && 'applicationId' in candidate && typeof candidate.applicationId === 'string') {
        return decodePermissionSnapshot(candidate);
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
