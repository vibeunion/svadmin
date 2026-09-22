<script lang="ts">
  import { demoRendering } from '../../resource-rendering';
  import { AutoTable } from '@svadmin/ui';
  import type { ResourcesForFeature } from '../resource-registry';

  let { resourceName } = $props<{ resourceName: ResourcesForFeature<'domain'> }>();
</script>

<AutoTable {resourceName} rendering={demoRendering(resourceName)} />
