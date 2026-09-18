import { Type, type Static } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData } from './plain-data';
import type { AccessControlOptions, AccessControlProvider, CanParams } from './permissions.svelte';

const permission = Type.String({ minLength: 3, pattern: '^[a-z][a-z0-9._-]*:[a-z][a-z0-9._-]*$' });
const binding = Type.Object({
  applicationId: Type.String({ minLength: 1, pattern: '\\S' }),
  version: Type.String({ minLength: 1, pattern: '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$' }),
  digest: Type.Optional(Type.String({ minLength: 1, pattern: '\\S' })),
}, { additionalProperties: false });
const catalog = Type.Object({
  applicationId: Type.String({ minLength: 1, pattern: '\\S' }),
  version: Type.String({ minLength: 1, pattern: '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$' }),
  digest: Type.Optional(Type.String({ minLength: 1, pattern: '\\S' })),
  permissions: Type.Array(permission, { minItems: 1 }),
}, { additionalProperties: false });
const snapshot = Type.Object({
  applicationId: Type.String({ minLength: 1, pattern: '\\S' }),
  catalogVersion: Type.String({ minLength: 1, pattern: '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$' }),
  catalogDigest: Type.Optional(Type.String({ minLength: 1, pattern: '\\S' })),
  permissions: Type.Array(permission),
}, { additionalProperties: false });

export type PermissionCatalogBinding = Readonly<Static<typeof binding>>;
export type PermissionCatalog = Readonly<{
  applicationId: string;
  version: string;
  digest?: string;
  permissions: readonly string[];
}>;
export type PermissionSnapshot = Readonly<{
  applicationId: string;
  catalogVersion: string;
  catalogDigest?: string;
  permissions: readonly string[];
}>;

function freezeUnique(values: readonly string[], label: string): readonly string[] {
  if (new Set(values).size !== values.length) throw new TypeError(`${label} contains duplicate permissions`);
  return Object.freeze([...values]);
}

export function canonicalPermission(resource: string, action: string): string {
  if (typeof resource !== 'string' || typeof action !== 'string') throw new TypeError('Permission resource and action must be strings');
  const value = `${resource}:${action}`;
  if (!/^[a-z][a-z0-9._-]*:[a-z][a-z0-9._-]*$/.test(value)) {
    throw new TypeError('Permission must use canonical resource:action syntax');
  }
  return value;
}

export function decodePermissionCatalog(value: unknown): PermissionCatalog {
  const candidate = snapshotPlainData(value);
  if (!checkExact(catalog, candidate)) throw new TypeError('Invalid permission catalog');
  return Object.freeze({ ...candidate, permissions: freezeUnique(candidate.permissions, 'Permission catalog') });
}

export function decodePermissionSnapshot(value: unknown): PermissionSnapshot {
  const candidate = snapshotPlainData(value);
  if (!checkExact(snapshot, candidate)) throw new TypeError('Invalid permission snapshot');
  return Object.freeze({ ...candidate, permissions: freezeUnique(candidate.permissions, 'Permission snapshot') });
}

export interface PermissionProjectionOptions {
  readonly buttons?: AccessControlOptions['buttons'];
}

/** Projects a verified backend snapshot into a UI-only provider. */
export function createPermissionAccessControlProvider(
  value: unknown,
  options: PermissionProjectionOptions = {},
): AccessControlProvider {
  const permissions = decodePermissionSnapshot(value);
  const granted = new Set(permissions.permissions);
  const permissionCatalog = Object.freeze({
    applicationId: permissions.applicationId,
    version: permissions.catalogVersion,
    ...(permissions.catalogDigest === undefined ? {} : { digest: permissions.catalogDigest }),
  });
  return {
    async can(params: CanParams) {
      const required = canonicalPermission(params.resource, params.action);
      return granted.has(required) ? { can: true } : { can: false, reason: `Missing permission: ${required}` };
    },
    options: Object.freeze({
      ...(options.buttons === undefined ? {} : { buttons: Object.freeze({ ...options.buttons }) }),
      permissionCatalog,
    }),
  };
}
