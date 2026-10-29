<script lang="ts">
  import type { Snippet } from 'svelte';
  import TemplatePageShell from './TemplatePageShell.svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    filters?: Snippet;
    metrics?: Snippet;
    table: Snippet;
    footer?: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
  }

  let { title, description, actions, filters, metrics, table, footer, pageId = 'search-table', width = 'wide' }: Props = $props();
</script>

<TemplatePageShell
  {title}
  {...(description ? { description } : {})}
  {...(actions ? { actions } : {})}
  {...(filters ? { toolbar: filters } : {})}
  {...(metrics ? { metrics } : {})}
  primary={table}
  {...(footer ? { footer } : {})}
  {pageId}
  {width}
  primaryLabel="Search results"
/>