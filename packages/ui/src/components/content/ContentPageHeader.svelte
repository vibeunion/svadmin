<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props {
    title: string;
    eyebrow?: string;
    description?: string;
    breadcrumbs?: string[];
    actions?: Snippet;
    class?: string;
  }
  let { title, eyebrow, description, breadcrumbs = [], actions, class: className = '' }: Props = $props();
</script>

<header class={'svadmin-u-6ed543e2fbbb ' + className} data-svadmin-page-header>
  {#if breadcrumbs.length > 0}
    <nav aria-label="Breadcrumb" class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-359090c2d529 svadmin-u-bfa603190748">
      {#each breadcrumbs as crumb, index (crumb)}
        {#if index > 0}<span aria-hidden="true">/</span>{/if}
        <span class={index === breadcrumbs.length - 1 ? 'svadmin-u-d4108abe6359' : ''}>{crumb}</span>
      {/each}
    </nav>
  {/if}
  <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-0c3bc98565dd svadmin-u-020ba687fa12 svadmin-u-64cac80d2e9a svadmin-u-3b9871a0bf93">
    <div class="svadmin-u-7e0b7cdf1a94 svadmin-u-da7c36cd8867">
      {#if eyebrow}<p class="svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-bfa603190748">{eyebrow}</p>{/if}
      <h1 class="svadmin-u-d5c9b0001e7e svadmin-u-e83a7042bc91 svadmin-u-e9fadafbd4a2 svadmin-u-d9256981a032 svadmin-u-d4108abe6359">{title}</h1>
      {#if description}<p class="svadmin-u-2cc8041eca99 svadmin-u-fc7473ca09eb svadmin-u-18550d5945ae svadmin-u-bfa603190748">{description}</p>{/if}
    </div>
    {#if actions}<div class="svadmin-u-60fbb7713999 svadmin-u-012fbd121f37 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">{@render actions()}</div>{/if}
  </div>
</header>
