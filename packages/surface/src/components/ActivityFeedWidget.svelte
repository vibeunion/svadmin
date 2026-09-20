<script lang="ts">
  import { Value } from '@sinclair/typebox/value';
  import ActivityFeed from '@svadmin/ui/components/ActivityFeed.svelte';
  import { activityFeedPropsSchema } from '../business-definitions.js';
  import { asSurfaceActivities } from '../business-data.js';
  import type { SurfaceWidgetRendererProps } from '../catalog.js';
  import { surfaceMetric } from '../styled-system/recipes/index.js';
  import { formatSurfaceMessage, resolveSurfaceMessages } from '../localization.js';

  let { props, data, locale = 'en-US', messages }: SurfaceWidgetRendererProps = $props();
  const baseProps = $derived(Object.fromEntries(Object.entries(props).filter(([key]) => key !== 'appearance')));
  const p = $derived(Value.Decode(activityFeedPropsSchema, baseProps));
  const appearance = $derived(typeof props['appearance'] === 'object' && props['appearance'] !== null ? props['appearance'] as { tone?: typeof p.tone; density?: typeof p.density } : undefined);
  const tone = $derived(appearance?.tone ?? p.tone ?? 'neutral');
  const density = $derived(appearance?.density ?? p.density ?? 'comfortable');
  const classes = $derived(surfaceMetric({ tone, density }));
  const text = $derived(resolveSurfaceMessages(locale, messages));
  const activities = $derived(data.status === 'ready' ? asSurfaceActivities(data.value, p, text.activityUnknownActor) : null);
</script>

<section class={classes.root + ' ' + classes.card} aria-label={p.title} data-surface-business="activity-feed" data-surface-density={density}>
  {#if data.status === 'loading'}
    <p role="status">{text.activityLoading}</p>
  {:else if data.status === 'empty'}
    <p role="status">{text.activityEmpty}</p>
  {:else if data.status === 'error'}
    <p role="alert">{text.activityUnavailable}</p>
  {:else if activities?.ok}
    <ActivityFeed activities={activities.value} allowComment={false} title={p.title} emptyLabel={text.activityEmpty}
      countLabel={formatSurfaceMessage(text.activityCount, { count: activities.value.length })} />
  {:else}
    <p role="alert">{text.activityInvalidData}</p>
  {/if}
</section>
