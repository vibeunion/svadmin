<script lang="ts">
  /**
   * LiteBreadcrumbs — SSR-compatible breadcrumb navigation.
   * Pure HTML <nav> with <a> links. No client-side JS required.
   */

  interface BreadcrumbItem {
    label: string;
    href?: string;
  }

  interface Props {
    items: BreadcrumbItem[];
    /** Separator character between items */
    separator?: string;
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let {
    items,
    separator = '/',
    class: className = '',
  }: Props = $props();
</script>

<nav class="lite-breadcrumbs {className}" aria-label="Breadcrumb">
  <ol>
    {#each items as item, i (i)}
      <li>
        {#if item.href && i < items.length - 1}
          <a href={item.href}>{item.label}</a>
        {:else}
          <span class="current">{item.label}</span>
        {/if}
        {#if i < items.length - 1}
          <span class="lite-breadcrumb-sep" aria-hidden="true">{separator}</span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
