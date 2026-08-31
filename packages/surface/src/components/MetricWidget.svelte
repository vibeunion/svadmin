<script lang="ts">
  import { Value } from '@sinclair/typebox/value';
  import StatsCard from '@svadmin/ui/components/StatsCard.svelte';
  import { metricPropsSchema } from '../builtin-schemas.js';
  import type { SurfaceWidgetRendererProps } from '../catalog.js';
  import { resolveSurfaceMessages } from '../localization.js';

  let { widgetId, props, data, locale = 'en-US', messages }: SurfaceWidgetRendererProps = $props();
  const activeMessages = $derived(resolveSurfaceMessages(locale, messages));

  const metricProps = $derived(Value.Decode(metricPropsSchema, props));
  const formattedValue = $derived.by(() => {
    if (data.status !== 'ready') return '—';
    const value = data.value;
    if (typeof value !== 'number') return '—';
    if (metricProps.format === 'currency') {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: metricProps.currency,
      }).format(value);
    }
    if (metricProps.format === 'percent') {
      return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(value);
    }
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  });
</script>

<article aria-labelledby="{widgetId}-label" aria-busy={data.status === 'loading'}>
  <span id="{widgetId}-label" class="visually-hidden">{metricProps.label}</span>
  {#if data.status === 'loading'}
    <StatsCard label={metricProps.label} value="" loading />
  {:else if data.status === 'ready' && typeof data.value === 'number'}
    <StatsCard label={metricProps.label} value={formattedValue} />
    {#if metricProps.description}
      <p class="metric-description">{metricProps.description}</p>
    {/if}
  {:else}
    <div class="metric-state" role={data.status === 'error' ? 'alert' : 'status'}>
      <strong>{metricProps.label}</strong>
      <span>{data.status === 'error' ? data.error.message : data.status === 'empty' ? activeMessages.metricNoData : activeMessages.metricInvalidData}</span>
    </div>
  {/if}
</article>

<style>
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .metric-description {
    margin: 0.5rem 0 0;
    color: var(--muted-foreground);
    font-size: 0.8125rem;
  }

  .metric-state {
    display: grid;
    gap: 0.35rem;
    min-height: 6rem;
    padding: 1.25rem;
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    background: var(--card);
    color: var(--muted-foreground);
  }
</style>
