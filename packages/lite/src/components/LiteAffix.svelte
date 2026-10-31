<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    top?: number;
    bottom?: number;
    zIndex?: number;
    label?: string;
    /** Caller class merged with the built-in class list. */
    class?: string;
    children: Snippet;
  }

  let { top = 16, bottom, zIndex = 10, label = 'Affixed content', class: className = '', children }: Props = $props();

  // The reference applies `top` always and `bottom` when provided; dropping `top`
  // whenever `bottom` was set made the offset silently wrong.
  const style = $derived(
    `top:${top}px;${bottom === undefined ? '' : `bottom:${bottom}px;`}z-index:${zIndex}`,
  );
</script>

<div class={`lite-affix ${className}`.trim()} style={style} aria-label={label}>
  {@render children()}
</div>

<style>
  .lite-affix { position: sticky; }
</style>
