<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    id?: string;
    class?: string;
  }
  let { title, description, actions, id, class: className = '' }: Props = $props();
</script>

<div class={'svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c svadmin-u-020ba687fa12 svadmin-u-64cac80d2e9a svadmin-u-3b9871a0bf93 ' + className}>
  <div class="svadmin-u-7e0b7cdf1a94 svadmin-u-da7c36cd8867">
    <h2 {id} class="svadmin-u-4ee734926ff6 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{title}</h2>
    {#if description}<p class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{description}</p>{/if}
  </div>
  {#if actions}<div class="svadmin-u-60fbb7713999 svadmin-u-012fbd121f37 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">{@render actions()}</div>{/if}
</div>
