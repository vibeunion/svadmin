<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  interface Props {
    /** Panel heading. Omit it for an untitled surface. */
    title?: string;
    description?: string;
    actions?: Snippet;
    children: Snippet;
    footer?: Snippet;
    /** `none` removes body padding so a table or list can meet the panel edge. */
    padding?: 'default' | 'compact' | 'none';
    headingLevel?: 'h2' | 'h3';
    class?: string;
  }

  let {
    title,
    description,
    actions,
    children,
    footer,
    padding = 'default',
    headingLevel = 'h2',
    class: className = '',
  }: Props = $props();

  const uid = $props.id();
  const headingId = `svadmin-data-panel-${uid}`;
</script>

<section
  class={cn('svadmin-data-panel', className)}
  data-svadmin-data-panel
  data-padding={padding}
  aria-labelledby={title ? headingId : undefined}
>
  {#if title}
    <header class="svadmin-data-panel__header" data-slot="data-panel-header">
      <div class="svadmin-data-panel__heading">
        <svelte:element this={headingLevel} id={headingId} class="svadmin-data-panel__title">
          {title}
        </svelte:element>
        {#if description}
          <p class="svadmin-data-panel__description">{description}</p>
        {/if}
      </div>
      {#if actions}
        <div class="svadmin-data-panel__actions">{@render actions()}</div>
      {/if}
    </header>
  {/if}
  <div class="svadmin-data-panel__body" data-slot="data-panel-body">{@render children()}</div>
  {#if footer}
    <footer class="svadmin-data-panel__footer" data-slot="data-panel-footer">{@render footer()}</footer>
  {/if}
</section>