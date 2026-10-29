<script lang="ts">
  import type { Snippet } from 'svelte';
  import TemplatePageShell from './TemplatePageShell.svelte';

  interface Props {
    title: string;
    eyebrow?: string;
    description?: string;
    actions?: Snippet;
    metrics?: Snippet;
    primary: Snippet;
    secondary?: Snippet;
    footer?: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
  }

  let { title, eyebrow, description, actions, metrics, primary, secondary, footer, pageId = 'workplace', width = 'default' }: Props = $props();
</script>

<TemplatePageShell
  {title}
  {...(eyebrow ? { eyebrow } : {})}
  {...(description ? { description } : {})}
  {...(actions ? { actions } : {})}
  {...(metrics ? { metrics } : {})}
  {primary}
  {...(secondary ? { secondary } : {})}
  {...(footer ? { footer } : {})}
  {pageId}
  {width}
  primaryLabel="Work area"
  secondaryLabel="Context"
/>