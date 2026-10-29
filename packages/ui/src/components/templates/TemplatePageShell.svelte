<script lang="ts">
  import type { Snippet } from 'svelte';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import { cn } from '../../utils.js';

  interface Props {
    title: string;
    eyebrow?: string;
    description?: string;
    actions?: Snippet;
    metrics?: Snippet;
    toolbar?: Snippet;
    primary: Snippet;
    secondary?: Snippet;
    footer?: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
    primaryLabel?: string;
    secondaryLabel?: string;
    class?: string;
  }

  let {
    title,
    eyebrow,
    description,
    actions,
    metrics,
    toolbar,
    primary,
    secondary,
    footer,
    pageId = 'template',
    width = 'default',
    primaryLabel,
    secondaryLabel,
    class: className = '',
  }: Props = $props();
</script>

<ContentPageShell {pageId} {width} class={cn('svadmin-template-page', className)}>
  <ContentPageHeader {title} {...(eyebrow ? { eyebrow } : {})} {...(description ? { description } : {})} {...(actions ? { actions } : {})} />
  {#if metrics}<section class="svadmin-template-page__metrics" aria-label="Summary">{@render metrics()}</section>{/if}
  {#if toolbar}<div class="svadmin-template-page__toolbar">{@render toolbar()}</div>{/if}
  <div class="svadmin-template-page__body" class:has-secondary={Boolean(secondary)}>
    <div class="svadmin-template-page__primary" aria-label={primaryLabel}>{@render primary()}</div>
    {#if secondary}<aside class="svadmin-template-page__secondary" aria-label={secondaryLabel}>{@render secondary()}</aside>{/if}
  </div>
  {#if footer}<footer class="svadmin-template-page__footer">{@render footer()}</footer>{/if}
</ContentPageShell>

<style>
  .svadmin-template-page__metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
    gap: var(--svadmin-space-4);
  }
  .svadmin-template-page__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--svadmin-space-3);
    padding-block: var(--svadmin-space-3);
    border-block: 1px solid var(--border);
  }
  .svadmin-template-page__body {
    display: grid;
    min-width: 0;
    gap: var(--svadmin-space-5);
  }
  .svadmin-template-page__body.has-secondary {
    grid-template-columns: minmax(0, 1fr) minmax(16rem, 22rem);
    align-items: start;
  }
  .svadmin-template-page__primary,
  .svadmin-template-page__secondary {
    display: grid;
    min-width: 0;
    gap: var(--svadmin-space-4);
  }
  .svadmin-template-page__secondary {
    padding: var(--svadmin-space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--card);
  }
  .svadmin-template-page__footer {
    position: sticky;
    inset-block-end: 0;
    z-index: 5;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--svadmin-space-2);
    padding-block: var(--svadmin-space-3);
    border-block-start: 1px solid var(--border);
    background: color-mix(in srgb, var(--card) 96%, var(--background));
  }
  @media (max-width: 48rem) {
    .svadmin-template-page__body.has-secondary {
      grid-template-columns: minmax(0, 1fr);
    }
    .svadmin-template-page__secondary {
      order: 2;
    }
  }
</style>