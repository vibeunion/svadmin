<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    children: Snippet;
    class?: string;
    bodyClass?: string;
  }

  let {
    title,
    description,
    actions,
    children,
    class: className = '',
    bodyClass = '',
  }: Props = $props();
</script>

<section class={cn('svadmin-u-2cd02d11d1af svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-438b2237b8d6', className)} data-svadmin-settings-group>
  <header class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c svadmin-u-65fdbade2025 svadmin-u-18049387f0af svadmin-u-d139dd09e38d svadmin-u-cb11fec3bb46 svadmin-u-020ba687fa12 svadmin-u-64cac80d2e9a svadmin-u-3b9871a0bf93">
    <div class="svadmin-u-7e0b7cdf1a94 svadmin-u-da7c36cd8867">
      <h2 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{title}</h2>
      {#if description}<p class="svadmin-u-2cc8041eca99 svadmin-u-fc7473ca09eb svadmin-u-18550d5945ae svadmin-u-bfa603190748">{description}</p>{/if}
    </div>
    {#if actions}<div class="svadmin-u-60fbb7713999 svadmin-u-012fbd121f37 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">{@render actions()}</div>{/if}
  </header>
  <div class={cn('svadmin-u-c07e54fd1439', bodyClass)}>{@render children()}</div>
</section>
