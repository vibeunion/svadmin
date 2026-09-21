<script lang="ts">
  import type { Snippet } from 'svelte';
  import { productToolbarRecipe as productToolbar } from '../../recipes.js';
  interface Props { leading?: Snippet; trailing?: Snippet; children?: Snippet; class?: string; }
  let { leading, trailing, children, class: className = '' }: Props = $props();
  const styles = productToolbar();
</script>
<div data-svadmin-table-toolbar class={styles.root + ' ' + className}>
  <div class={styles.leading}>
    {#if leading}{@render leading()}{/if}
    {#if children}{@render children()}{/if}
  </div>
  {#if trailing}<div class={styles.trailing}>{@render trailing()}</div>{/if}
</div>
