<script lang="ts">
  import AutoForm from '../../src/components/AutoForm.svelte';

  let { resourceName, mode = 'create' } = $props<{
    resourceName: string;
    mode?: 'create' | 'edit' | 'clone' | 'show';
  }>();
  let successCount = $state(0);
</script>

<AutoForm {resourceName} {mode} onSuccess={() => { successCount += 1; }} />
<output data-testid="success-count">{successCount}</output>
