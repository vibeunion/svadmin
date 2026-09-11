<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
  import SelectField from './SelectField.svelte';
  import MultiSelectField from './MultiSelectField.svelte';

  let { value, options }: {
    value: string | number | (string | number)[] | null | undefined;
    options?: { label: string; value: string | number }[];
  } = $props();
</script>

{#if Array.isArray(value)}
  <MultiSelectField {value} {...definedOptions({ options })} />
{:else}
  <SelectField {value} {...definedOptions({ options })} />
{/if}
