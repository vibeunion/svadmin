<script lang="ts">
  import { cn } from '../../../utils.js';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  let { class: className, children, ...restProps }: HTMLAttributes<HTMLUListElement> & { children?: Snippet } = $props();
</script>

<ul data-slot="pagination-content" class={cn("svadmin-pagination-content", className)} {...restProps}>
  {@render children?.()}
</ul>
