<script lang="ts">
  import { demoRendering } from '../../resource-rendering';
  import { AutoTable } from '@svadmin/ui';

  let { resourceName } = $props<{ resourceName: 'purchase_orders' | 'sales_orders' }>();
</script>

<AutoTable {resourceName} rendering={demoRendering(resourceName)} />
