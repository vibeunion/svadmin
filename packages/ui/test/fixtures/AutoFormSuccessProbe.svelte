<script lang="ts">
  import { useResourceContract } from '@svadmin/core';
  import { createResourceRenderers } from '../../src/rendering/index.js';
  import AutoForm from '../../src/components/AutoForm.svelte';

  let { resourceName, mode = 'create' } = $props<{
    resourceName: string;
    mode?: 'create' | 'edit' | 'clone' | 'show';
  }>();
  const binding = useResourceContract(() => resourceName);
  const rendering = $derived(createResourceRenderers(binding.resource));
  let successCount = $state(0);
</script>

<AutoForm {rendering} {resourceName} {mode} onSuccess={() => { successCount += 1; }} />
<output data-testid="success-count">{successCount}</output>
