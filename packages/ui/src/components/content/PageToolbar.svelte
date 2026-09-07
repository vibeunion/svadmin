<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props {
    leading?: Snippet;
    trailing?: Snippet;
    children?: Snippet;
    class?: string;
  }
  let { leading, trailing, children, class: className = '' }: Props = $props();
</script>

<div data-svadmin-table-toolbar class={'svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-eb6e8b881acd svadmin-u-438b2237b8d6 svadmin-u-020ba687fa12 svadmin-u-9f76a62f4f44 svadmin-u-3b9871a0bf93 ' + className}>
  <div class="svadmin-u-60fbb7713999 svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
    {#if leading}{@render leading()}{/if}
    {#if children}{@render children()}{/if}
  </div>
  {#if trailing}<div class="svadmin-u-60fbb7713999 svadmin-u-012fbd121f37 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">{@render trailing()}</div>{/if}
</div>
