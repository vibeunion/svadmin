<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import AutoForm from '@svadmin/ui/components/AutoForm.svelte';
  import { demoRendering } from '../resource-rendering';

  let { resourceName, ...props }: Omit<ComponentProps<typeof AutoForm>, 'rendering'> = $props();
</script>

<AutoForm {resourceName} {...props} rendering={demoRendering(resourceName)} />
