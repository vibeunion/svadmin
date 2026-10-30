<script lang="ts">
  import type { Snippet } from 'svelte';
  import LiteBadge, { type LiteBadgeVariant } from './LiteBadge.svelte';

  interface Props {
    variant?: LiteBadgeVariant;
    label?: string;
    closable?: boolean;
    removeHref?: string;
    removeLabel?: string;
    children?: Snippet;
  }

  let {
    variant = 'secondary',
    label = '',
    closable = false,
    removeHref,
    removeLabel = 'Remove tag',
    children,
  }: Props = $props();
</script>

<span class="lite-tag">
  <LiteBadge {variant}>
    {#if children}{@render children()}{:else}{label}{/if}
  </LiteBadge>
  {#if closable && removeHref}
    <a class="lite-tag-close" href={removeHref} aria-label={removeLabel}>×</a>
  {/if}
</span>
