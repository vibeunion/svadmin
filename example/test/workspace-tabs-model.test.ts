import { describe, expect, it } from 'vitest';
import {
  workspaceSessionScope,
  workspaceTenantScope,
  workspaceUserScope,
} from '../src/features/workspace/workspace-tabs-model';

describe('workspace scope identity', () => {
  const identity = { id: 'user-1', email: 'user@example.test' };

  it('keeps the legacy no-tenant scope stable', () => {
    expect(workspaceSessionScope(identity, undefined)).toBe(workspaceUserScope(identity));
  });

  it('isolates the same user across tenant values and types', () => {
    expect(workspaceSessionScope(identity, 'tenant-a')).not.toBe(workspaceSessionScope(identity, 'tenant-b'));
    expect(workspaceTenantScope('1')).not.toBe(workspaceTenantScope(1));
  });

  it('does not create a scope without an authenticated identity', () => {
    expect(workspaceUserScope(undefined)).toBeUndefined();
    expect(workspaceSessionScope(undefined, 'tenant-a')).toBeUndefined();
  });
});
