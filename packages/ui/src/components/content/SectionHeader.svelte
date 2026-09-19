<script lang="ts">
  import type { Snippet } from 'svelte';
  import { productSection } from '../../styled-system/recipes/index.js';
  interface Props { title: string; description?: string; actions?: Snippet; id?: string; class?: string; }
  let { title, description, actions, id, class: className = '' }: Props = $props();
  const styles = productSection();
</script>
<div class={styles.root + ' ' + className} data-svadmin-section-header>
  <div class={styles.heading}>
    <h2 {id} class={styles.title}>{title}</h2>
    {#if description}<p class={styles.description}>{description}</p>{/if}
  </div>
  {#if actions}<div class={styles.actions}>{@render actions()}</div>{/if}
</div>
