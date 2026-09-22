<script lang="ts">
  import { demoRendering } from '../../resource-rendering';
  import { AutoTable } from '@svadmin/ui';

  let { resourceName = 'products' } = $props<{ resourceName?: string }>();
</script>

<AutoTable {resourceName} rendering={demoRendering(resourceName)} />
