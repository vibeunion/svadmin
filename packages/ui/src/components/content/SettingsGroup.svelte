<script lang="ts">
  import type { Snippet } from 'svelte';
  import { productSettingsRecipe as productSettings } from '../../recipes.js';
  interface Props { title: string; description?: string; actions?: Snippet; children: Snippet; headingLevel?: 'h2' | 'h3'; class?: string; bodyClass?: string; }
  let { title, description, actions, children, headingLevel = 'h2', class: className = '', bodyClass = '' }: Props = $props();
  const styles = productSettings();
</script>
<section class={styles.root + ' ' + className} data-svadmin-settings-group>
  <header class={styles.header}>
    <div class={styles.heading}>
      <svelte:element this={headingLevel} class={styles.title}>{title}</svelte:element>
      {#if description}<p class={styles.description}>{description}</p>{/if}
    </div>
    {#if actions}<div class={styles.actions}>{@render actions()}</div>{/if}
  </header>
  <div class={styles.body + ' ' + bodyClass}>{@render children()}</div>
</section>
