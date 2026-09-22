<script lang="ts">
  import { captureAdminContext } from './context.svelte';

  const context = captureAdminContext();
  const resourceNames = context.resources.map((resource) => resource.name).join(',');
</script>

<output data-testid="provider-url">{context.getDataProvider().getApiUrl()}</output>
<output data-testid="resources">{resourceNames}</output>