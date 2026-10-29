<script lang="ts">
  import type { Snippet } from 'svelte';
  import TemplatePageShell from './TemplatePageShell.svelte';

  interface Props {
    title: string;
    eyebrow?: string;
    description?: string;
    actions?: Snippet;
    metrics?: Snippet;
    details: Snippet;
    activity?: Snippet;
    related?: Snippet;
    footer?: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
  }

  let { title, eyebrow, description, actions, metrics, details, activity, related, footer, pageId = 'advanced-detail', width = 'wide' }: Props = $props();
  const secondary = $derived(activity ?? related);
</script>

<TemplatePageShell
  {title}
  {...(eyebrow ? { eyebrow } : {})}
  {...(description ? { description } : {})}
  {...(actions ? { actions } : {})}
  {...(metrics ? { metrics } : {})}
  primary={details}
  {...(secondary ? { secondary } : {})}
  {...(footer ? { footer } : {})}
  {pageId}
  {width}
  primaryLabel="Record details"
  secondaryLabel="Activity and related records"
/>