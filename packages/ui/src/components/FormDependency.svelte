<script lang="ts">
  import type { Snippet } from 'svelte';

  export interface FormDependencyProps {
    /** Field name or list of field names to observe */
    name: string | string[];
    /** Form values dictionary containing monitored field keys */
    values?: Record<string, unknown>;
    /** Render snippet invoked with the watched subset of values */
    children?: Snippet<[Record<string, unknown>]>;
  }

  let {
    name,
    values = {},
    children,
  }: FormDependencyProps = $props();

  let watched = $derived.by(() => {
    const names = Array.isArray(name) ? name : [name];
    const subset: Record<string, unknown> = {};
    for (const key of names) {
      subset[key] = values[key];
    }
    return subset;
  });
</script>

<div
  data-svadmin-component="FormDependency"
  class="svadmin-form-dependency contents"
>
  {#if children}
    {@render children(watched)}
  {/if}
</div>
