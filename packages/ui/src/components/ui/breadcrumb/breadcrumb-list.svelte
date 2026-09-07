<script lang="ts">
  import { cn } from '../../../utils.js';
  import type { Snippet } from 'svelte';
  import type { HTMLOlAttributes } from 'svelte/elements';

  let { class: className, children, ...restProps }: HTMLOlAttributes & { children?: Snippet } = $props();
</script>

<ol
  data-slot="breadcrumb-list"
  class={cn("svadmin-breadcrumb-list", className)}
  {...restProps}
>
  {@render children?.()}
</ol>
