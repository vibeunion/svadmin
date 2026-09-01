<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';
  import { useMicSelectorContext } from './context.svelte.js';
  type Props = { class?: string; children?: Snippet };
  let { class: className = '', children }: Props = $props();
  const selector = useMicSelectorContext();
</script>

{#if selector.open}
  <div class={cn('svadmin-ai-mic-selector__content', className)} role="dialog" aria-label="Microphone selector">
    {@render children?.()}
  </div>
{/if}

<style>
  .svadmin-ai-mic-selector__content { position: absolute; z-index: 20; top: calc(100% + .35rem); left: 0; display: grid; width: min(22rem, calc(100vw - 2rem)); gap: .5rem; padding: .6rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--popover, var(--card, transparent)); color: var(--popover-foreground, var(--foreground, currentColor)); box-shadow: 0 .5rem 1.5rem color-mix(in oklch, var(--foreground, currentColor) 15%, transparent); }
</style>
