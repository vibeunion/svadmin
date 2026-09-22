<script lang="ts">
  import { demoRendering } from '../../resource-rendering';
  import { AutoTable } from '@svadmin/ui';
  import type { DemoResource } from '../../resource-schemas';

  let { resourceName } = $props<{ resourceName: DemoResource }>();
</script>

<AutoTable {resourceName} rendering={demoRendering(resourceName)} />
