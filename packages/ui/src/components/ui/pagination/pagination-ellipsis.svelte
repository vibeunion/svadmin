<script lang="ts">
  import { cn } from '../../../utils.js';
  import type { HTMLAttributes } from 'svelte/elements';
  import { Ellipsis } from '@lucide/svelte';

  let { class: className, label = 'More pages', ...restProps }: HTMLAttributes<HTMLSpanElement> & { label?: string } = $props();
</script>

<span aria-hidden="true" data-slot="pagination-ellipsis" class={cn("flex size-8 items-center justify-center", className)} {...restProps}>
  <Ellipsis class="size-4" />
  <span class="sr-only">{label}</span>
</span>
