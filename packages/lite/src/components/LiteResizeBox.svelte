<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    width?: string;
    height?: string;
    minWidth?: string;
    minHeight?: string;
    label?: string;
    children: Snippet;
  }

  let {
    width = '100%',
    height = '240px',
    minWidth = '12rem',
    minHeight = '8rem',
    label = 'Resizable panel',
    children,
  }: Props = $props();
</script>

<div
  class="lite-resize-box"
  role="group"
  aria-label={label}
  style={`width:${width};height:${height};min-width:${minWidth};min-height:${minHeight}`}
>
  {@render children()}
</div>

<style>
  .lite-resize-box { overflow: auto; padding: 12px; border: 1px solid #E5E6EB; border-radius: 8px; background: #fff; resize: both; }
</style>
