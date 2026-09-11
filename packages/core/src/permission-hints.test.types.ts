import type { usePermissions, useLogout } from './auth-hooks.svelte';

export interface PermissionHintsState {
  permissions: ReturnType<typeof usePermissions>;
  logout: ReturnType<typeof useLogout>;
}
