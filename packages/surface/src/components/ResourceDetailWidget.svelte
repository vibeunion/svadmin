<script lang="ts">
  import { Value } from '@sinclair/typebox/value';
  import Card from '@svadmin/ui/components/ui/card/card.svelte';
  import CardHeader from '@svadmin/ui/components/ui/card/card-header.svelte';
  import CardTitle from '@svadmin/ui/components/ui/card/card-title.svelte';
  import CardContent from '@svadmin/ui/components/ui/card/card-content.svelte';
  import { resourceDetailPropsSchema } from '../business-definitions.js';
  import type { SurfaceWidgetRendererProps } from '../catalog.js';
  import type { JsonObject } from '../types.js';
  import { surfaceMetric } from '../styled-system/recipes/index.js';
  import { resolveSurfaceMessages } from '../localization.js';
  import { displayTableValue } from '../widget-data.js';

  let { props, data, locale = 'en-US', messages }: SurfaceWidgetRendererProps = $props();
  const p = $derived(Value.Decode(resourceDetailPropsSchema, props));
  const classes = $derived(surfaceMetric({ tone: p.tone ?? 'neutral', density: p.density ?? 'comfortable' }));
  const text = $derived(resolveSurfaceMessages(locale, messages));
  const record = $derived(data.status === 'ready' && data.value !== null && typeof data.value === 'object' && !Array.isArray(data.value)
    ? data.value as JsonObject : null);
</script>

<Card class={classes.root + ' ' + classes.card} data-surface-business="resource-detail" data-surface-density={p.density ?? 'comfortable'}>
  <CardHeader><CardTitle>{p.title}</CardTitle></CardHeader>
  <CardContent>
    {#if data.status === 'loading'}
      <p role="status">{text.detailLoading}</p>
    {:else if data.status === 'empty'}
      <p role="status">{text.detailEmpty}</p>
    {:else if data.status === 'error'}
      <p role="alert">{text.detailUnavailable}</p>
    {:else if record}
      <dl aria-label={p.title} data-density={p.density ?? 'comfortable'}>
        {#each p.fields as item, index (`${index}:${item.field}`)}
          <div>
            <dt>{item.label}</dt>
            <dd>{displayTableValue(record[item.field], { format: item.format, locale, messages: text })}</dd>
          </div>
        {/each}
      </dl>
    {:else}
      <p role="alert">{text.detailInvalidData}</p>
    {/if}
  </CardContent>
</Card>

<style>
  dl { display: grid; gap: 1rem; margin: 0; grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); }
  dl > div { min-width: 0; }
  dt { color: var(--muted-foreground); font-size: .8125rem; }
  dd { margin: .25rem 0 0; color: var(--foreground); overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
  dl[data-density='compact'] { gap: .5rem; }
</style>
