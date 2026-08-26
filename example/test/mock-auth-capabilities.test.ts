// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { mockAuthProvider } from '../src/providers/mockAuth.js';

describe('mockAuthProvider enterprise example capabilities', () => {
  beforeEach(() => localStorage.clear());

  it('provides roles and persists permission changes', async () => {
    const roles = await mockAuthProvider.getRoles?.();
    expect(roles?.length).toBeGreaterThan(0);

    const roleId = roles?.[0]?.id;
    expect(roleId).toBeTruthy();
    if (!roleId) return;

    await mockAuthProvider.updateRolePermissions?.(roleId, { products: ['read', 'update'] });
    await expect(mockAuthProvider.getRolePermissions?.(roleId)).resolves.toEqual({
      products: ['read', 'update'],
    });
  });

  it('provides non-empty audit log data', async () => {
    const result = await mockAuthProvider.getAuditLogs?.({ page: 1, pageSize: 20 });

    expect(result?.total).toBeGreaterThan(0);
    expect(result?.data[0]).toMatchObject({ action: expect.any(String) });
  });
});
