<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class'> { label?: string; class?: string; children?: Snippet; }
  let { label, class: className = '', children, type = 'button', ...rest }: Props = $props();
</script>
<button {...rest} {type} class={cn('svadmin-ai-queue-part__action', className)} aria-label={label} title={label} data-slot="queue-item-action">{@render children?.()}{#if label}<span class="svadmin-ai__sr-only">{label}</span>{/if}</button>
<style>.svadmin-ai-queue-part__action { display: inline-flex; width: 1.8rem; height: 1.8rem; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: min(var(--radius, .5rem), .4rem); background: transparent; color: var(--muted-foreground, currentColor); cursor: pointer; }.svadmin-ai-queue-part__action:hover:not(:disabled) { border-color: var(--border, currentColor); color: var(--foreground, currentColor); }.svadmin-ai-queue-part__action:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }</style>
