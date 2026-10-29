<script lang="ts">
  import type { Snippet } from 'svelte';
  import TemplatePageShell from './TemplatePageShell.svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    form: Snippet;
    summary?: Snippet;
    footer?: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
  }

  let { title, description, actions, form, summary, footer, pageId = 'group-form', width = 'default' }: Props = $props();
</script>

<TemplatePageShell
  {title}
  {...(description ? { description } : {})}
  {...(actions ? { actions } : {})}
  primary={form}
  {...(summary ? { secondary: summary } : {})}
  {...(footer ? { footer } : {})}
  {pageId}
  {width}
  primaryLabel="Form"
  secondaryLabel="Guidance"
/>