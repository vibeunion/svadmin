<script lang="ts">
  import { provideAdminContext, type DataProvider } from '@svadmin/core';
  import type { ComponentProps } from 'svelte';
  import DashboardView from './DashboardView.svelte';
  let { provider, settings }: { provider: DataProvider; settings: ComponentProps<typeof DashboardView> } = $props();
  provideAdminContext({ get dataProvider() { return provider; }, resources: [], tenant: { tenantId: 'tenant-a' } });
</script>
<DashboardView {...settings} />
