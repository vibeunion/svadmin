import { Type, type Static } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData } from './plain-data';
import type { AccessControlOptions, AccessControlProvider, CanParams } from './permissions.svelte';

const applicationId = Type.String({ minLength: 1, maxLength: 512, pattern: '^\\S+$' });
const version = Type.String({ minLength: 1, maxLength: 64, pattern: '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$' });
const digest = Type.String({ minLength: 64, maxLength: 64, pattern: '^[a-fA-F0-9]{64}$' });
const permission = Type.String({ minLength: 3, maxLength: 512, pattern: '^[a-z][a-z0-9._-]*:[a-z][a-z0-9._-]*$' });

// 内部契约复用同一 schema，避免注册选项、权限提示与适配器校验漂移。
export const permissionCatalogBindingSchema = Type.Object({
  applicationId,
  version,
  digest: Type.Optional(digest),
}, { additionalProperties: false });
const catalog = Type.Object({
  ...permissionCatalogBindingSchema.properties,
  permissions: Type.Array(permission, { minItems: 1 }),
}, { additionalProperties: false });
export const permissionSnapshotSchema = Type.Object({
  applicationId,
  catalogVersion: version,
  catalogDigest: Type.Optional(digest),
  permissions: Type.Array(permission),
}, { additionalProperties: false });

export type PermissionCatalogBinding = Readonly<Static<typeof permissionCatalogBindingSchema>>;
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
  if (value.length > 512 || !/^[a-z][a-z0-9._-]*:[a-z][a-z0-9._-]*$/.test(value)) {
    throw new TypeError('Permission must use canonical resource:action syntax');
  }
  return value;
}

export function decodePermissionCatalog(value: unknown): PermissionCatalog {
  const candidate = snapshotPlainData(value);
  if (!checkExact(catalog, candidate)) throw new TypeError('Invalid permission catalog');
  return Object.freeze({
    ...candidate,
    ...(candidate.digest === undefined ? {} : { digest: candidate.digest.toLowerCase() }),
    permissions: freezeUnique(candidate.permissions, 'Permission catalog'),
  });
}

export function decodePermissionSnapshot(value: unknown): PermissionSnapshot {
  const candidate = snapshotPlainData(value);
  if (!checkExact(permissionSnapshotSchema, candidate)) throw new TypeError('Invalid permission snapshot');
  return Object.freeze({
    ...candidate,
    ...(candidate.catalogDigest === undefined ? {} : { catalogDigest: candidate.catalogDigest.toLowerCase() }),
    permissions: freezeUnique(candidate.permissions, 'Permission snapshot'),
  });
}

export interface PermissionProjectionOptions {
  readonly buttons?: AccessControlOptions['buttons'];
  /** Application-owned expected catalog; mismatches and unknown grants fail closed. */
  readonly catalog?: PermissionCatalog;
}

function assertCatalogBinding(snapshot: PermissionSnapshot, expected: PermissionCatalog): void {
  if (snapshot.applicationId !== expected.applicationId
      || snapshot.catalogVersion !== expected.version
      || (expected.digest !== undefined && snapshot.catalogDigest !== expected.digest)) {
    throw new TypeError('Permission snapshot does not match the expected application catalog');
  }
  const known = new Set(expected.permissions);
  if (snapshot.permissions.some(grant => !known.has(grant))) {
    throw new TypeError('Permission snapshot contains grants outside the expected catalog');
  }
}

/**
 * Projects a backend-verified snapshot into a UI-only provider.
 * Supply catalog to check the application's expected binding. This is not
 * signature verification and never replaces server-side authorization.
 */
export function createPermissionAccessControlProvider(
  value: unknown,
  options: PermissionProjectionOptions = {},
): AccessControlProvider {
  const permissions = decodePermissionSnapshot(value);
  if (options.catalog !== undefined) assertCatalogBinding(permissions, decodePermissionCatalog(options.catalog));
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
