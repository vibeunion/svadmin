<script lang="ts">
  import LayoutAuthScopeHost from './layout-auth-scope.test-host.svelte';
</script>

<div data-testid="layout-skip-host">
  <LayoutAuthScopeHost authProvider={undefined} tenant={{ tenantId: 'tenant-layout-skip-first' }} />
</div>

<div data-testid="layout-skip-host">
  <LayoutAuthScopeHost authProvider={undefined} tenant={{ tenantId: 'tenant-layout-skip-second' }} />
</div>
