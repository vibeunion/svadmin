<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  interface Props {
    label: string;
    description?: string;
    control: Snippet;
    separated?: boolean;
    class?: string;
  }

  let {
    label,
    description,
    control,
    separated = false,
    class: className = '',
  }: Props = $props();
</script>

<div class={cn('svadmin-u-60fbb7713999 svadmin-u-0e5b245b4ed1 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-0c3bc98565dd svadmin-u-1b2d54a3fd12', separated && 'svadmin-u-b950dda299d3 svadmin-u-18049387f0af', className)} data-svadmin-settings-field-row>
  <div class="svadmin-u-7e0b7cdf1a94">
    <p class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{label}</p>
    {#if description}<p class="svadmin-u-b6b02c0ebef6 svadmin-u-2cc8041eca99 svadmin-u-fc7473ca09eb svadmin-u-7054e2767710 svadmin-u-bfa603190748">{description}</p>{/if}
  </div>
  <div class="svadmin-u-012fbd121f37">{@render control()}</div>
</div>
