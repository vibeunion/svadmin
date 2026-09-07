<script lang="ts">
  import { Badge } from '../ui/badge/index.js';

  let { value, options } = $props<{
    value: (string | number)[] | null | undefined;
    options?: { label: string; value: string | number }[];
  }>();

  const items = $derived(Array.isArray(value) ? value : []);
</script>

{#if items.length > 0}
  <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-44ee8ba0a421">
    {#each items as v, _i (_i)}
      {@const label = options?.find((o: { label: string; value: string | number }) => o.value === v)?.label ?? String(v)}
      <Badge variant="secondary" class="svadmin-u-8ecebc9f80e6">{label}</Badge>
    {/each}
  </div>
{:else}
  <span class="svadmin-u-bfa603190748">—</span>
{/if}
