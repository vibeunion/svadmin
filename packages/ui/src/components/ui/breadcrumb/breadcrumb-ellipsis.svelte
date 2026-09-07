<script lang="ts">
  import { cn } from '../../../utils.js';
  import type { HTMLAttributes } from 'svelte/elements';
  import { Ellipsis } from '@lucide/svelte';

  let { class: className, ...restProps }: HTMLAttributes<HTMLSpanElement> = $props();
</script>

<span
  role="presentation"
  aria-hidden="true"
  data-slot="breadcrumb-ellipsis"
  class={cn("svadmin-breadcrumb-ellipsis", className)}
  {...restProps}
>
  <Ellipsis class="svadmin-breadcrumb-icon" />
  <span class="svadmin-sr-only">More</span>
</span>
