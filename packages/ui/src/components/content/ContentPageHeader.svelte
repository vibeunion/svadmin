<script lang="ts">
  import type { Snippet } from 'svelte';
  import { contentHeaderRecipe as contentHeader } from '../../recipes.js';

  interface Props {
    title: string;
    eyebrow?: string;
    description?: string;
    breadcrumbs?: string[];
    actions?: Snippet;
    density?: 'compact' | 'comfortable';
    class?: string;
  }
  let {
    title,
    eyebrow,
    description,
    breadcrumbs = [],
    actions,
    density = 'comfortable',
    class: className = '',
  }: Props = $props();
  const styles = $derived(contentHeader({ density }));
</script>

<header
  class={styles.root + ' ' + className}
  data-svadmin-page-header
  data-svadmin-content-header
  data-density={density}
>
  {#if breadcrumbs.length > 0}
    <nav aria-label="Breadcrumb" class={styles.breadcrumbs}>
      {#each breadcrumbs as crumb, index (crumb)}
        {#if index > 0}<span aria-hidden="true">/</span>{/if}
        <span class={index === breadcrumbs.length - 1 ? styles.currentCrumb : ''}>{crumb}</span>
      {/each}
    </nav>
  {/if}
  <div class={styles.row}>
    <div class={styles.heading}>
      {#if eyebrow}<p class={styles.eyebrow}>{eyebrow}</p>{/if}
      <h1 class={styles.title}>{title}</h1>
      {#if description}<p class={styles.description}>{description}</p>{/if}
    </div>
    {#if actions}<div class={styles.actions}>{@render actions()}</div>{/if}
  </div>
</header>
