<script lang="ts">
  import { AdminApp } from '@svadmin/ui';
  import { resolveAdminConfig } from '@svadmin/app';
  import config from './svadmin.config';
  import Dashboard from './pages/Dashboard.svelte';
  import Login from './pages/Login.svelte';

  // svadmin.config.ts resolves its providers (including async ones) before this
  // module is evaluated, so the platform snapshot is available synchronously.
  const resolved = resolveAdminConfig(config);
</script>

<AdminApp
  providerBundle={resolved.providers}
  resources={[...resolved.resources]}
  title="svadmin Demo"
  locale="en"
>
  {#snippet dashboard()}<Dashboard />{/snippet}
  {#snippet loginPage()}<Login />{/snippet}
</AdminApp>
