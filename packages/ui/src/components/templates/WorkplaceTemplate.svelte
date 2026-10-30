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
    contentPercentage?: Snippet;
    media?: Snippet;
    shortcuts?: Snippet;
    announcements?: Snippet;
    docs?: Snippet;
    footer?: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
  }

  let {
    title,
    eyebrow,
    description,
    actions,
    metrics,
    primary,
    secondary,
    contentPercentage,
    media,
    shortcuts,
    announcements,
    docs,
    footer,
    pageId = 'workplace',
    width = 'default',
  }: Props = $props();

  const hasContext = $derived(Boolean(secondary || contentPercentage || media || shortcuts || announcements || docs));
</script>

{#snippet context()}
  <div class="svadmin-workplace-template__context">
    {#if secondary}{@render secondary()}{/if}
    {#if contentPercentage}{@render contentPercentage()}{/if}
    {#if media}{@render media()}{/if}
    {#if shortcuts}{@render shortcuts()}{/if}
    {#if announcements}{@render announcements()}{/if}
    {#if docs}{@render docs()}{/if}
  </div>
{/snippet}

<TemplatePageShell
  {title}
  {...(eyebrow ? { eyebrow } : {})}
  {...(description ? { description } : {})}
  {...(actions ? { actions } : {})}
  {...(metrics ? { metrics } : {})}
  {primary}
  {...(hasContext ? { secondary: context } : {})}
  {...(footer ? { footer } : {})}
  {pageId}
  {width}
  primaryLabel="Work area"
  secondaryLabel="Context"
/>

<style>
  .svadmin-workplace-template__context { display: grid; gap: var(--svadmin-space-4); min-width: 0; }
</style>
