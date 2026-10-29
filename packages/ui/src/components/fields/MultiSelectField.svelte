<script lang="ts">
  import { Badge } from '../ui/badge/index.js';

  let { value, options } = $props<{
    value: (string | number)[] | null | undefined;
    options?: { label: string; value: string | number }[];
  }>();

  const items = $derived(Array.isArray(value) ? value : []);
</script>

{#if items.length > 0}
  <div class="flex flex-wrap gap-1">
    {#each items as v, _i (_i)}
      {@const label = options?.find((o: { label: string; value: string | number }) => o.value === v)?.label ?? String(v)}
      <Badge variant="secondary" class="font-normal">{label}</Badge>
    {/each}
  </div>
{:else}
  <span class="text-muted-foreground">—</span>
{/if}
