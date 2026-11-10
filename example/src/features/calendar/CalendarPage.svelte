<script lang="ts">
  import { demoRendering } from '../../resource-rendering';
  import { AutoTable } from '@svadmin/ui';

  let { resourceName = 'calendar_events' }: { resourceName?: string } = $props();
</script>

<AutoTable {resourceName} rendering={demoRendering(resourceName)} />
