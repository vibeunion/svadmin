<script lang="ts">
  import FilterToolbar from '../../src/components/content/FilterToolbar.svelte';
  import { Input } from '../../src/components/ui/input/index.js';

  let query = $state('Pending orders');
  let people = $state('Morgan');
  let advancedOpen = $state(true);
  let owner = $state('Casey');
</script>

<main>
  <h1>Orders</h1>
  <FilterToolbar bind:query placeholder="Search orders" clearLabel="Clear orders" bind:advancedOpen>
    {#snippet advanced()}
      <label for="owner">Owner</label>
      <Input id="owner" bind:value={owner} />
    {/snippet}
  </FilterToolbar>
  <output aria-label="Orders query">{query}</output>
  <section>
    <h2>People</h2>
    <FilterToolbar bind:query={people} placeholder="Search people" clearLabel="Clear people" />
  </section>
  <section>
    <h2>Reference input</h2>
    <label for="reference">Name</label>
    <Input id="reference" value="Unchanged primitive" />
  </section>
</main>

<style>
  :global(body) { margin: 0; color: var(--foreground); background: var(--background); }
  main { display: grid; gap: var(--svadmin-space-4); max-width: 1120px; margin-inline: auto; padding: var(--svadmin-space-6); }
  section { display: grid; gap: var(--svadmin-space-2); min-width: 0; }
  h1 { margin: 0; font-size: var(--svadmin-text-title); line-height: var(--svadmin-leading-tight); }
  h2 { margin: 0; font-size: var(--svadmin-text-section); line-height: var(--svadmin-leading-tight); }
</style>
