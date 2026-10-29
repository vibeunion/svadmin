<script lang="ts">
  import type { Snippet } from 'svelte';
  import TemplatePageShell from './TemplatePageShell.svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    form: Snippet;
    summary?: Snippet;
    activity?: Snippet;
    footer?: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
  }

  let { title, description, actions, form, summary, activity, footer, pageId = 'advanced-form', width = 'wide' }: Props = $props();
  const secondary = $derived(summary ?? activity);
</script>

<TemplatePageShell
  {title}
  {...(description ? { description } : {})}
  {...(actions ? { actions } : {})}
  primary={form}
  {...(secondary ? { secondary } : {})}
  {...(footer ? { footer } : {})}
  {pageId}
  {width}
  primaryLabel="Form"
  secondaryLabel="Summary"
/>