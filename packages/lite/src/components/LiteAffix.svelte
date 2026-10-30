<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    top?: number;
    bottom?: number;
    zIndex?: number;
    label?: string;
    children: Snippet;
  }

  let { top = 16, bottom, zIndex = 10, label = 'Affixed content', children }: Props = $props();
  const style = $derived(`${bottom === undefined ? `top:${top}px` : `bottom:${bottom}px`};z-index:${zIndex}`);
</script>

<div class="lite-affix" style={style} aria-label={label}>
  {@render children()}
</div>

<style>
  .lite-affix { position: sticky; }
</style>
