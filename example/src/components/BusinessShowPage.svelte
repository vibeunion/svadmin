<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import ShowPage from '@svadmin/ui/components/ShowPage.svelte';
  import { demoRendering } from '../resource-rendering';

  let { resourceName, id, ...props }: Omit<ComponentProps<typeof ShowPage>, 'rendering' | 'id'> & { id?: string | number } = $props();
  const recordId = $derived.by(() => {
    if (id === undefined) throw new TypeError('A detail route requires a record ID');
    return id;
  });
</script>

<ShowPage id={recordId} {resourceName} {...props} rendering={demoRendering(resourceName)} />
