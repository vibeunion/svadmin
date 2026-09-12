<script lang="ts">
  import { usePermissions, useLogout } from './auth-hooks.svelte';
  import type { PermissionHintsState } from './permission-hints.test.types';
  let { onReady }: { onReady: (value: PermissionHintsState) => void } = $props();
  const permissions = usePermissions();
  const logout = useLogout();
  $effect(() => onReady({ permissions, logout }));
</script>
