<script lang="ts">
  import { cn } from '../../../utils.js';
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  let {
    class: className,
    isActive = false,
    children,
    ...restProps
  }: HTMLButtonAttributes & { isActive?: boolean; children?: Snippet } = $props();
</script>

<button
  type="button"
  aria-current={isActive ? 'page' : undefined}
  data-slot="pagination-link"
  data-active={isActive}
  class={cn('svadmin-pagination-item', className)}
  {...restProps}
>
  {@render children?.()}
</button>
