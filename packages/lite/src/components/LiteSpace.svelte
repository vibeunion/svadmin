<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    direction?: 'horizontal' | 'vertical';
    size?: 'sm' | 'md' | 'lg';
    wrap?: boolean;
    /** Caller class merged with the built-in class list. */
    class?: string;
    children: Snippet;
  }

  let { direction = 'horizontal', size = 'md', wrap = false, class: className = '', children }: Props = $props();
</script>

<div class="lite-space {className}" data-direction={direction} data-size={size} data-wrap={wrap || undefined}>
  {@render children()}
</div>

<style>
  .lite-space { display: flex; }
  .lite-space[data-direction='horizontal'] { flex-direction: row; }
  .lite-space[data-direction='vertical'] { flex-direction: column; }
  .lite-space[data-wrap] { flex-wrap: wrap; }
  :global(.lite-space[data-direction='horizontal'] > * + *) { margin-left: 8px; }
  :global(.lite-space[data-direction='vertical'] > * + *) { margin-top: 8px; }
  :global(.lite-space[data-size='sm'][data-direction='horizontal'] > * + *) { margin-left: 4px; }
  :global(.lite-space[data-size='sm'][data-direction='vertical'] > * + *) { margin-top: 4px; }
  :global(.lite-space[data-size='lg'][data-direction='horizontal'] > * + *) { margin-left: 16px; }
  :global(.lite-space[data-size='lg'][data-direction='vertical'] > * + *) { margin-top: 16px; }
</style>
