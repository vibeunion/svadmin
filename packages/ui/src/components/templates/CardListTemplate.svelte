<script lang="ts">
  import type { Snippet } from 'svelte';
  import TemplatePageShell from './TemplatePageShell.svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    filters?: Snippet;
    items: Snippet;
    footer?: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
  }

  let { title, description, actions, filters, items, footer, pageId = 'card-list', width = 'wide' }: Props = $props();
</script>

<TemplatePageShell
  {title}
  {...(description ? { description } : {})}
  {...(actions ? { actions } : {})}
  {...(filters ? { toolbar: filters } : {})}
  primary={items}
  {...(footer ? { footer } : {})}
  {pageId}
  {width}
  primaryLabel="Cards"
/>