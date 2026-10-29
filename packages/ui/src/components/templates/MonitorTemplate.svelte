<script lang="ts">
  import type { Snippet } from 'svelte';
  import TemplatePageShell from './TemplatePageShell.svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    metrics: Snippet;
    alerts?: Snippet;
    activity?: Snippet;
    chart?: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
  }

  let { title, description, actions, metrics, alerts, activity, chart, pageId = 'monitor', width = 'wide' }: Props = $props();
</script>

<TemplatePageShell
  {title}
  {...(description ? { description } : {})}
  {...(actions ? { actions } : {})}
  {metrics}
  primary={chart ?? alerts ?? fallback}
  {...(activity ? { secondary: activity } : {})}
  {pageId}
  {width}
  primaryLabel="Live monitor"
  secondaryLabel="Recent activity"
/>

{#snippet fallback()}
  <p class="svadmin-monitor-template__empty">No live monitor content.</p>
{/snippet}

<style>
  .svadmin-monitor-template__empty { margin: 0; padding: var(--svadmin-space-5); border: 1px dashed var(--border); border-radius: var(--radius-md); color: var(--muted-foreground); text-align: center; }
</style>