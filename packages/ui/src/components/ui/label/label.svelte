<script lang="ts">
  import { cn, type WithElementRef } from '../../../utils.js';
  import type { HTMLLabelAttributes } from 'svelte/elements';

  let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<HTMLLabelAttributes, HTMLLabelElement> = $props();
</script>

<label
  bind:this={ref}
  data-slot="label"
  class={cn("svadmin-label", className)}
  {...restProps}
>
  {@render children?.()}
</label>
