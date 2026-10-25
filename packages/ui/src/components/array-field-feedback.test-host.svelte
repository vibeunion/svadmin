<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import { untrack } from 'svelte';
  import FieldRenderer from './FieldRenderer.svelte';

  let { field, initial }: { field: FieldDefinition; initial: unknown } = $props();
  let value = $state<unknown>(untrack(() => initial));
  let changes = $state(0);
</script>

<form>
  <FieldRenderer {field} {value} onchange={next => { changes += 1; value = next; }} />
  <output data-testid="changes">{changes}</output>
</form>
