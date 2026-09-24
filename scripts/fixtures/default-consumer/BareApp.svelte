<script lang="ts">
  import { AdminApp } from '@svadmin/ui';
  import { resolveAdminConfig } from '@svadmin/app';
  import config from './svadmin.config';

  const resolved = resolveAdminConfig(config);
</script>

<AdminApp providerBundle={resolved.providers} resources={[...resolved.resources]} locale="en" title="Default consumer" />
