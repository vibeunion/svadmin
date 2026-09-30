<script lang="ts">
  import type { Snippet } from 'svelte';
  import { definedOptions } from '@svadmin/core/options';
  import ContentPageShell from './content/ContentPageShell.svelte';

  interface Props {
    title: string;
    description?: string;
    eyebrow?: string;
    actions?: Snippet;
    footer?: Snippet;
    children: Snippet;
    width?: 'narrow' | 'default' | 'wide';
    density?: 'compact' | 'comfortable';
    class?: string;
  }

  let {
    title,
    description,
    eyebrow,
    actions,
    footer,
    children,
    width = 'default',
    density = 'comfortable',
    class: className = '',
  }: Props = $props();
</script>

<ContentPageShell
  {title}
  {...definedOptions({ description, eyebrow, actions })}
  {width}
  {density}
  class={className}
>
  <div class="configuration-page__content">
    {@render children()}
  </div>
  {#if footer}
    <footer class="configuration-page__footer">
      {@render footer()}
    </footer>
  {/if}
</ContentPageShell>

<style>
  .configuration-page__content {
    display: grid;
    gap: 24px;
  }

  .configuration-page__footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 24px;
    padding: 12px 0;
    border-top: 1px solid var(--border);
    background: var(--background);
  }

  @media (max-width: 640px) {
    .configuration-page__footer {
      justify-content: stretch;
    }

    .configuration-page__footer :global(button) {
      flex: 1;
    }
  }
</style>
