<script lang="ts">
  import JsonSchemaForm from './JsonSchemaForm.svelte';
  let { onsubmit }: { onsubmit: (value: Record<string, unknown>) => void } = $props();
</script>
<fieldset disabled><JsonSchemaForm schema={{ properties: { name: { type: 'string', default: 'Preview' } } }} {onsubmit} /></fieldset>
