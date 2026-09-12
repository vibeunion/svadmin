<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

  import LayoutAuthScopeHost from './layout-auth-scope.test-host.svelte';
</script>

<div data-testid="layout-skip-host">
  <LayoutAuthScopeHost {...definedOptions({ "authProvider": undefined })} tenant={{ tenantId: 'tenant-layout-skip-first' }} />
</div>

<div data-testid="layout-skip-host">
  <LayoutAuthScopeHost {...definedOptions({ "authProvider": undefined })} tenant={{ tenantId: 'tenant-layout-skip-second' }} />
</div>
