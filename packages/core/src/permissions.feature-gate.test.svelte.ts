import { describe, expect, it } from 'vitest';
import { createFeatureGate } from './permissions.svelte';

describe('createFeatureGate', () => {
  it('requires exact permissions', () => {
    const canEditPosts = createFeatureGate({
      permissions: ['posts:edit'],
    });

    expect(canEditPosts({ role: 'admin', permissions: ['posts:edit'] })).toBe(true);
    expect(canEditPosts({ role: 'admin', permissions: ['posts:*'] })).toBe(false);
    expect(canEditPosts({ role: 'admin', permissions: ['*'] })).toBe(false);
  });

  it('enforces role hierarchy when provided', () => {
    const canModerate = createFeatureGate({
      minRole: 'editor',
      roleHierarchy: ['admin', 'editor', 'viewer'],
    });

    expect(canModerate({ role: 'admin', permissions: [] })).toBe(true);
    expect(canModerate({ role: 'editor', permissions: [] })).toBe(true);
    expect(canModerate({ role: 'viewer', permissions: [] })).toBe(false);
  });
});
