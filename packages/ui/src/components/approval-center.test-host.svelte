<script lang="ts">
  import { provideAdminContext, type DataProvider } from '@svadmin/core';
  import type { ComponentProps } from 'svelte';
  import ApprovalCenter from './ApprovalCenter.svelte';

  let {
    provider,
    settings,
  }: {
    provider: DataProvider;
    settings: ComponentProps<typeof ApprovalCenter>;
  } = $props();

  provideAdminContext({
    get dataProvider() { return provider; },
    resources: [],
    tenant: { tenantId: 'tenant-a' },
  });
</script>

<ApprovalCenter {...settings} />
