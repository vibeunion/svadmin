<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    spinning?: boolean;
    size?: 'sm' | 'md' | 'lg';
    label?: string;
    children?: Snippet;
  }

  let { spinning = true, size = 'md', label = 'Loading', children }: Props = $props();
  const px = $derived(size === 'sm' ? 16 : size === 'lg' ? 36 : 24);
</script>

<div class="lite-spin" aria-busy={spinning || undefined}>
  {#if spinning}
    <span class="lite-spin__indicator" style={`width:${px}px;height:${px}px`} role="status" aria-label={label}></span>
  {/if}
  {#if children}{@render children()}{/if}
</div>

<style>
  .lite-spin { display: inline-flex; align-items: center; }
  .lite-spin__indicator { display: inline-block; border: 2px solid #E5E6EB; border-top-color: #165DFF; border-radius: 999px; animation: lite-spin 0.8s linear infinite; }
  @keyframes lite-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .lite-spin__indicator { animation: none; } }
</style>
