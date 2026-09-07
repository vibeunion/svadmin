<script lang="ts">
  import { cn } from '../../../utils.js';
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { buttonVariants } from '../button/index.js';

  let {
    class: className,
    isActive = false,
    children,
    ...restProps
  }: HTMLButtonAttributes & { isActive?: boolean; children?: Snippet } = $props();
</script>

<button
  aria-current={isActive ? 'page' : undefined}
  data-svadmin-button
  data-variant={isActive ? 'outline' : 'ghost'}
  data-size="icon-sm"
  data-slot="pagination-link"
  data-active={isActive}
  class={cn(
    buttonVariants({ variant: isActive ? 'outline' : 'ghost', size: 'icon-sm' }),
    className
  )}
  {...restProps}
>
  {@render children?.()}
</button>
