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
    chat?: Snippet;
    status?: Snippet;
    quickOperations?: Snippet;
    information?: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
  }

  let {
    title,
    description,
    actions,
    metrics,
    alerts,
    activity,
    chart,
    chat,
    status,
    quickOperations,
    information,
    pageId = 'monitor',
    width = 'wide',
  }: Props = $props();

  const hasContext = $derived(Boolean(chat || activity || status || quickOperations || information));
</script>

{#snippet context()}
  <div class="svadmin-monitor-template__context">
    {#if chat}{@render chat()}{/if}
    {#if activity}{@render activity()}{/if}
    {#if status}{@render status()}{/if}
    {#if quickOperations}{@render quickOperations()}{/if}
    {#if information}{@render information()}{/if}
  </div>
{/snippet}

<TemplatePageShell
  {title}
  {...(description ? { description } : {})}
  {...(actions ? { actions } : {})}
  {metrics}
  primary={chart ?? alerts ?? fallback}
  {...(hasContext ? { secondary: context } : {})}
  {pageId}
  {width}
  primaryLabel="Live monitor"
  secondaryLabel="Recent activity"
/>

{#snippet fallback()}
  <p class="svadmin-monitor-template__empty">No live monitor content.</p>
{/snippet}

<style>
  .svadmin-monitor-template__context { display: grid; gap: var(--svadmin-space-4); min-width: 0; }
  .svadmin-monitor-template__empty { margin: 0; padding: var(--svadmin-space-5); border: 1px dashed var(--border); border-radius: var(--radius-md); color: var(--muted-foreground); text-align: center; }
</style>
