import { describe, expect, test } from 'vitest';
import {
  canonicalPermission,
  createPermissionAccessControlProvider,
  decodePermissionCatalog,
  decodePermissionSnapshot,
} from './permission-catalog';
import { decodePermissionHints, hasPermissionHint } from './permission-hints-contract';
import { snapshotAccessControlOptions } from './access-control-contract';

describe('permission catalog projection', () => {
  // 与 SupAuth 的 applicationId/version/排序后 permissions 的 JSON SHA-256 一致。
  const digest = '116b9942afe6d2a186ee1b18e2eb494d92fa5f14af2723c65654a4d3e46c5019';
  const snapshot = {
    applicationId: 'xigu-fa',
    catalogVersion: '2026-09-18',
    catalogDigest: digest,
    permissions: ['case:read', 'case:edit'],
  };
  const catalog = {
    applicationId: snapshot.applicationId,
    version: snapshot.catalogVersion,
    digest,
    permissions: snapshot.permissions,
  };

  test('canonicalizes resource/action and validates catalogs', () => {
    expect(canonicalPermission('case', 'edit')).toBe('case:edit');
    expect(decodePermissionCatalog({
      applicationId: 'xigu-fa', version: '2026-09-18', permissions: ['case:read'],
    }).permissions).toEqual(['case:read']);
    expect(() => canonicalPermission('Case', 'read')).toThrow();
    expect(() => canonicalPermission('a'.repeat(512), 'read')).toThrow();
    expect(() => decodePermissionSnapshot({ ...snapshot, permissions: ['case:read', 'case:read'] })).toThrow();
  });

  test('projects grants into a fail-closed provider with expected catalog binding', async () => {
    const provider = createPermissionAccessControlProvider(snapshot, {
      buttons: { enableAccessControl: true }, catalog,
    });
    await expect(provider.can({ resource: 'case', action: 'read' })).resolves.toEqual({ can: true });
    await expect(provider.can({ resource: 'case', action: 'delete' })).resolves.toEqual({
      can: false, reason: 'Missing permission: case:delete',
    });
    expect(provider.options?.permissionCatalog).toEqual({
      applicationId: 'xigu-fa', version: '2026-09-18', digest,
    });
    expect(snapshotAccessControlOptions(provider.options).permissionCatalog?.digest).toBe(digest);
  });

  test.each([
    { applicationId: 'other-app' },
    { catalogVersion: 'old-version' },
    { catalogDigest: '0'.repeat(64) },
  ])('rejects a mismatched catalog binding: %j', change => {
    expect(() => createPermissionAccessControlProvider({ ...snapshot, ...change }, { catalog })).toThrow();
  });

  test('requires the expected digest when the snapshot omits it', () => {
    const withoutDigest = {
      applicationId: snapshot.applicationId,
      catalogVersion: snapshot.catalogVersion,
      permissions: snapshot.permissions,
    };
    expect(() => createPermissionAccessControlProvider(withoutDigest, { catalog })).toThrow();
  });

  test('rejects canonical but unknown grants and permits an empty grant set', async () => {
    expect(() => createPermissionAccessControlProvider({ ...snapshot, permissions: ['case:delete'] }, { catalog })).toThrow();
    const provider = createPermissionAccessControlProvider({ ...snapshot, permissions: [] }, { catalog });
    await expect(provider.can({ resource: 'case', action: 'read' })).resolves.toMatchObject({ can: false });
  });

  test.each(['sha256:test', 'g'.repeat(64), '0'.repeat(63), '0'.repeat(65)])('rejects malformed digest %s at all boundaries', catalogDigest => {
    expect(() => decodePermissionSnapshot({ ...snapshot, catalogDigest })).toThrow();
    expect(() => decodePermissionCatalog({ ...catalog, digest: catalogDigest })).toThrow();
    expect(() => decodePermissionHints({ ...snapshot, catalogDigest })).toThrow();
    expect(() => snapshotAccessControlOptions({ permissionCatalog: {
      applicationId: catalog.applicationId, version: catalog.version, digest: catalogDigest,
    } })).toThrow();
  });

  test('normalizes uppercase hexadecimal metadata consistently', () => {
    const uppercase = digest.toUpperCase();
    expect(decodePermissionSnapshot({ ...snapshot, catalogDigest: uppercase }).catalogDigest).toBe(digest);
    expect(decodePermissionCatalog({ ...catalog, digest: uppercase }).digest).toBe(digest);
    expect(() => createPermissionAccessControlProvider({ ...snapshot, catalogDigest: uppercase }, { catalog })).not.toThrow();
    expect(snapshotAccessControlOptions({ permissionCatalog: {
      applicationId: catalog.applicationId, version: catalog.version, digest: uppercase,
    } }).permissionCatalog?.digest).toBe(digest);
  });

  test('rejects malformed application identifiers, versions and permission collections', () => {
    for (const applicationId of ['', 'bad app', 'a'.repeat(513)]) {
      expect(() => decodePermissionSnapshot({ ...snapshot, applicationId })).toThrow();
      expect(() => decodePermissionCatalog({ ...catalog, applicationId })).toThrow();
    }
    expect(() => decodePermissionSnapshot({ ...snapshot, catalogVersion: 'a'.repeat(65) })).toThrow();
    expect(() => decodePermissionSnapshot({ ...snapshot, permissions: 'case:read-all' })).toThrow();
    const sparse: string[] = ['case:read'];
    sparse.length = 2;
    expect(() => decodePermissionSnapshot({ ...snapshot, permissions: sparse })).toThrow();
  });

  test('captures grants independently of later input mutations', async () => {
    const permissions = ['case:read'];
    const provider = createPermissionAccessControlProvider({ ...snapshot, permissions }, { catalog });
    permissions.push('case:edit');
    await expect(provider.can({ resource: 'case', action: 'edit' })).resolves.toMatchObject({ can: false });
  });

  test('keeps backend-verified snapshot projection without an expected catalog available', async () => {
    const provider = createPermissionAccessControlProvider(snapshot);
    await expect(provider.can({ resource: 'case', action: 'read' })).resolves.toEqual({ can: true });
  });

  test('preserves legacy boolean maps with metadata-like permission names', () => {
    const hints = decodePermissionHints({ applicationId: true, catalogVersion: false, permissions: true });
    expect(hasPermissionHint(hints, 'applicationId')).toBe(true);
    expect(hasPermissionHint(hints, 'catalogVersion')).toBe(false);
    expect(hasPermissionHint(hints, 'permissions')).toBe(true);
    expect(hasPermissionHint(decodePermissionHints(['legacy-read']), 'legacy-read')).toBe(true);
    expect(decodePermissionHints(null)).toBeNull();
  });

  test('decodes snapshot hints without treating metadata as a permission', () => {
    const hints = decodePermissionHints(snapshot);
    expect(hasPermissionHint(hints, 'case:read')).toBe(true);
    expect(hasPermissionHint(hints, 'case:delete')).toBe(false);
    expect(hasPermissionHint(hints, 'applicationId')).toBe(false);
  });
});
