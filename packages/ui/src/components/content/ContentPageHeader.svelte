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

<header class={'space-y-3 ' + className} data-svadmin-page-header>
  {#if breadcrumbs.length > 0}
    <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-xs text-muted-foreground">
      {#each breadcrumbs as crumb, index (crumb)}
        {#if index > 0}<span aria-hidden="true">/</span>{/if}
        <span class={index === breadcrumbs.length - 1 ? 'text-foreground' : ''}>{crumb}</span>
      {/each}
    </nav>
  {/if}
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div class="min-w-0 space-y-1">
      {#if eyebrow}<p class="text-xs font-medium text-muted-foreground">{eyebrow}</p>{/if}
      <h1 class="text-xl font-semibold leading-tight tracking-normal text-foreground">{title}</h1>
      {#if description}<p class="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>{/if}
    </div>
    {#if actions}<div class="flex shrink-0 flex-wrap items-center gap-2">{@render actions()}</div>{/if}
  </div>
</header>
