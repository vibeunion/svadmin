<script lang="ts">
  import { cn } from '../../../utils.js';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  let { class: className, children, ...restProps }: HTMLAttributes<HTMLElement> & { children?: Snippet } = $props();
</script>

<nav aria-label="pagination" data-slot="pagination" class={cn("svadmin-pagination", className)} {...restProps}>
  {@render children?.()}
</nav>
