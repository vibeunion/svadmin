<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    href: string;
    external?: boolean;
    underline?: boolean;
    disabled?: boolean;
    children: Snippet;
  }

  let { href, external = false, underline = false, disabled = false, children }: Props = $props();
</script>

{#if disabled}
  <span class="lite-link" aria-disabled="true">{@render children()}</span>
{:else}
  <a
    class="lite-link"
    class:lite-link-underline={underline}
    {href}
    target={external ? '_blank' : undefined}
    rel={external ? 'noreferrer' : undefined}
  >{@render children()}</a>
{/if}

<style>
  .lite-link { color: #165DFF; text-decoration: none; }
  .lite-link:hover { text-decoration: underline; }
  .lite-link-underline { text-decoration: underline; }
  .lite-link[aria-disabled='true'] { color: #C9CDD4; cursor: not-allowed; }
</style>
