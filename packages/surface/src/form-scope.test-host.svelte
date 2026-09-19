<script lang="ts">
  import ResourceFormBody from './components/ResourceFormBody.svelte';
  import type { SurfaceActionDescriptor } from './workflows/types.js';
  import type { SurfaceWorkflowClientScope } from './workflows/client.js';
  let { action, scope, title = 'Scope form' }: {
    action: SurfaceActionDescriptor; scope: SurfaceWorkflowClientScope; title?: string;
  } = $props();
  const host = { getScope: () => scope, getAction: () => action, committed: () => {} };
</script>
<ResourceFormBody widgetId="shared" {host} {action} {title} locale="en-US" />
