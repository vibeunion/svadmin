<script lang="ts">
  import type { Snippet } from 'svelte';
  import { productSettings } from '../../styled-system/recipes/index.js';
  interface Props { title: string; description?: string; actions?: Snippet; children: Snippet; class?: string; bodyClass?: string; }
  let { title, description, actions, children, class: className = '', bodyClass = '' }: Props = $props();
  const styles = productSettings();
</script>
<section class={styles.root + ' ' + className} data-svadmin-settings-group>
  <header class={styles.header}>
    <div class={styles.heading}>
      <h2 class={styles.title}>{title}</h2>
      {#if description}<p class={styles.description}>{description}</p>{/if}
    </div>
    {#if actions}<div class={styles.actions}>{@render actions()}</div>{/if}
  </header>
  <div class={styles.body + ' ' + bodyClass}>{@render children()}</div>
</section>
