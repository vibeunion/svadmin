<script lang="ts">
  import { demoRendering } from '../../resource-rendering';
  import { AutoTable } from '@svadmin/ui';
  import type { ResourcesForFeature } from '../resource-registry';

  let { resourceName = 'calendar_events' } = $props<{ resourceName?: ResourcesForFeature<'calendar'> }>();
</script>

<AutoTable {resourceName} rendering={demoRendering(resourceName)} />
