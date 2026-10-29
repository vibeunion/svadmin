<script lang="ts">
  import type { Snippet } from 'svelte';
  import TemplatePageShell from './TemplatePageShell.svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    filters?: Snippet;
    metrics?: Snippet;
    charts: Snippet;
    records?: Snippet;
    footer?: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
  }

  let { title, description, actions, filters, metrics, charts, records, footer, pageId = 'analysis', width = 'wide' }: Props = $props();
</script>

<TemplatePageShell
  {title}
  {...(description ? { description } : {})}
  {...(actions ? { actions } : {})}
  {...(filters ? { toolbar: filters } : {})}
  {...(metrics ? { metrics } : {})}
  primary={charts}
  {...(records ? { secondary: records } : {})}
  {...(footer ? { footer } : {})}
  {pageId}
  {width}
  primaryLabel="Analysis"
  secondaryLabel="Supporting records"
/>