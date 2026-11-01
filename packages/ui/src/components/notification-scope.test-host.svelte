<script lang="ts">
  import type { DataProvider, ResourceDefinition } from '@svadmin/core';
  import AdminApp from './AdminApp.svelte';
  import Probe from './notification-scope-probe.svelte';

  let { label, dataProvider, resources }: {
    label: string;
    dataProvider: DataProvider;
    resources: ResourceDefinition[];
  } = $props();
</script>

<section aria-label={label}>
  <AdminApp title={label} {dataProvider} {resources}>
    {#snippet dashboard()}
      <Probe {label} />
    {/snippet}
  </AdminApp>
</section>
