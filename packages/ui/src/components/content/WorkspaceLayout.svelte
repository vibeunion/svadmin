<script lang="ts">
  import type { Snippet } from 'svelte';
  import { productWorkspaceRecipe as productWorkspace } from '../../recipes.js';

  interface Props {
    primary: Snippet;
    secondary?: Snippet;
    summary?: Snippet;
    secondaryWidth?: string;
    secondaryCollapsed?: boolean;
    secondaryCollapsedWidth?: string;
    mobileOrder?: 'primary-first' | 'secondary-first';
    label?: string;
    class?: string;
  }

  let {
    primary,
    secondary,
    summary,
    secondaryWidth = '22rem',
    secondaryCollapsed = false,
    secondaryCollapsedWidth = '3rem',
    mobileOrder = 'primary-first',
    label,
    class: className = '',
  }: Props = $props();

  const styles = $derived(productWorkspace({ hasSecondary: Boolean(secondary) }));
  const resolvedSecondaryWidth = $derived(secondaryCollapsed ? secondaryCollapsedWidth : secondaryWidth);
</script>

<div class={styles.root + ' ' + className} data-svadmin-workspace-layout data-workspace-order={mobileOrder} data-secondary-collapsed={secondaryCollapsed} {...(label ? { 'aria-label': label, role: 'region' } : {})} style:--workspace-secondary-width={resolvedSecondaryWidth}>
  {#if summary}<div class={styles.summary} data-svadmin-workspace-summary>{@render summary()}</div>{/if}
  <div class={styles.columns} data-svadmin-workspace-columns>
    {#if mobileOrder === 'secondary-first' && secondary}<aside class={styles.secondary} data-svadmin-workspace-secondary>{@render secondary()}</aside>{/if}
    <div class={styles.primary} data-svadmin-workspace-primary>{@render primary()}</div>
    {#if mobileOrder !== 'secondary-first' && secondary}<aside class={styles.secondary} data-svadmin-workspace-secondary>{@render secondary()}</aside>{/if}
  </div>
</div>
