<script lang="ts">
  import type { Snippet } from 'svelte';
  import TemplatePageShell from './TemplatePageShell.svelte';

  interface Props {
    title: string;
    eyebrow?: string;
    description?: string;
    actions?: Snippet;
    steps?: Snippet;
    details: Snippet;
    summary?: Snippet;
    history?: Snippet;
    footer?: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
  }

  let { title, eyebrow, description, actions, steps, details, summary, history, footer, pageId = 'detail', width = 'default' }: Props = $props();
</script>

{#snippet primary()}
  {@render details()}
  {#if history}
    <section class="svadmin-basic-detail-template__history" aria-label="Adjustment history">
      {@render history()}
    </section>
  {/if}
{/snippet}

<TemplatePageShell
  {title}
  {...(eyebrow ? { eyebrow } : {})}
  {...(description ? { description } : {})}
  {...(actions ? { actions } : {})}
  {...(steps ? { toolbar: steps } : {})}
  primary={primary}
  {...(summary ? { secondary: summary } : {})}
  {...(footer ? { footer } : {})}
  {pageId}
  {width}
  primaryLabel="Record details"
  secondaryLabel="Summary"
/>

<style>
  .svadmin-basic-detail-template__history { display: grid; gap: var(--svadmin-space-4); min-width: 0; }
</style>
