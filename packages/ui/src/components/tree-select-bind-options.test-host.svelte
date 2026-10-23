<script lang="ts">
  import TreeSelect, { type TreeSelectOption } from './TreeSelect.svelte';

  let options = $state<TreeSelectOption[]>([
    { value: 'root', label: 'Root', hasChildren: true },
  ]);

  async function loadChildren() {
    return [{ value: 'child', label: 'Child' }];
  }
</script>

<TreeSelect
  ariaLabel="Departments"
  bind:options
  loadChildren={loadChildren}
  multiple
/>

<output data-testid="bound-options">{JSON.stringify(options)}</output>
