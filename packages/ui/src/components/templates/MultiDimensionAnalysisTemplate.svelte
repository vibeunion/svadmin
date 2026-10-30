<script lang="ts">
  import type { Snippet } from 'svelte';
  import TemplatePageShell from './TemplatePageShell.svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    dimensions?: Snippet;
    metrics?: Snippet;
    chart: Snippet;
    breakdown?: Snippet;
    insights?: Snippet;
    footer?: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
  }

  let {
    title,
    description,
    actions,
    dimensions,
    metrics,
    chart,
    breakdown,
    insights,
    footer,
    pageId = 'multi-dimension-analysis',
    width = 'wide',
  }: Props = $props();
</script>

{#snippet primary()}
  {@render chart()}
  {#if breakdown}
    <section class="svadmin-multi-dimension__breakdown" aria-label="Dimension breakdown">
      {@render breakdown()}
    </section>
  {/if}
{/snippet}

<TemplatePageShell
  {title}
  {...(description ? { description } : {})}
  {...(actions ? { actions } : {})}
  {...(dimensions ? { toolbar: dimensions } : {})}
  {...(metrics ? { metrics } : {})}
  primary={primary}
  {...(insights ? { secondary: insights } : {})}
  {...(footer ? { footer } : {})}
  {pageId}
  {width}
  primaryLabel="Dimension analysis"
  secondaryLabel="Insights"
/>

<style>
  .svadmin-multi-dimension__breakdown {
    display: grid;
    min-width: 0;
    gap: var(--svadmin-space-4);
  }
</style>
