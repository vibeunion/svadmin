<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    direction?: 'horizontal' | 'vertical';
    size?: 'sm' | 'md' | 'lg';
    wrap?: boolean;
    children: Snippet;
  }

  let { direction = 'horizontal', size = 'md', wrap = false, children }: Props = $props();
</script>

<div class="lite-space" data-direction={direction} data-size={size} data-wrap={wrap || undefined}>
  {@render children()}
</div>

<style>
  .lite-space { display: flex; }
  .lite-space[data-direction='horizontal'] { flex-direction: row; }
  .lite-space[data-direction='vertical'] { flex-direction: column; }
  .lite-space[data-wrap] { flex-wrap: wrap; }
  .lite-space[data-direction='horizontal'] > * + * { margin-left: 8px; }
  .lite-space[data-direction='vertical'] > * + * { margin-top: 8px; }
  .lite-space[data-size='sm'][data-direction='horizontal'] > * + * { margin-left: 4px; }
  .lite-space[data-size='sm'][data-direction='vertical'] > * + * { margin-top: 4px; }
  .lite-space[data-size='lg'][data-direction='horizontal'] > * + * { margin-left: 16px; }
  .lite-space[data-size='lg'][data-direction='vertical'] > * + * { margin-top: 16px; }
</style>
