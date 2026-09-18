import { describe, expect, test } from 'vitest';
import {
  canonicalPermission,
  createPermissionAccessControlProvider,
  decodePermissionCatalog,
  decodePermissionSnapshot,
} from './permission-catalog';

describe('permission catalog projection', () => {
  const snapshot = {
    applicationId: 'xigu-fa',
    catalogVersion: '2026-09-18',
    catalogDigest: 'sha256:test',
    permissions: ['case:read', 'case:edit'],
  };

  test('canonicalizes resource/action and validates catalogs', () => {
    expect(canonicalPermission('case', 'edit')).toBe('case:edit');
    expect(decodePermissionCatalog({
      applicationId: 'xigu-fa', version: '2026-09-18', permissions: ['case:read'],
    }).permissions).toEqual(['case:read']);
    expect(() => canonicalPermission('Case', 'read')).toThrow();
    expect(() => decodePermissionSnapshot({ ...snapshot, permissions: ['case:read', 'case:read'] })).toThrow();
  });

  test('projects grants into a fail-closed provider with catalog binding', async () => {
    const provider = createPermissionAccessControlProvider(snapshot, { buttons: { enableAccessControl: true } });
    await expect(provider.can({ resource: 'case', action: 'read' })).resolves.toEqual({ can: true });
    await expect(provider.can({ resource: 'case', action: 'delete' })).resolves.toEqual({
      can: false, reason: 'Missing permission: case:delete',
    });
    expect(provider.options?.permissionCatalog).toEqual({
      applicationId: 'xigu-fa', version: '2026-09-18', digest: 'sha256:test',
    });
  });
});
