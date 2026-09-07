<script lang="ts">
  import { cn } from '../../../utils.js';
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  let { class: className, children, ...restProps }: HTMLAnchorAttributes & { children?: Snippet } = $props();
</script>

<a
  data-slot="breadcrumb-link"
  class={cn("svadmin-breadcrumb-link", className)}
  {...restProps}
>
  {@render children?.()}
</a>
