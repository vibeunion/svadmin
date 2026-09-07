<script lang="ts">
  import { cn } from '../../../utils.js';
  import type { HTMLAttributes } from 'svelte/elements';
  import { Ellipsis } from '@lucide/svelte';

  let { class: className, ...restProps }: HTMLAttributes<HTMLSpanElement> = $props();
</script>

<span aria-hidden="true" data-slot="pagination-ellipsis" class={cn("svadmin-pagination-ellipsis", className)} {...restProps}>
  <Ellipsis class="svadmin-pagination-icon" />
  <span class="svadmin-sr-only">More pages</span>
</span>
