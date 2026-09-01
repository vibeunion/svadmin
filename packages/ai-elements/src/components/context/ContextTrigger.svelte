<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import { useContextContext } from './context-state.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class'> { class?: string; children?: Snippet<[number]>; }
  let { class: className = '', children, type = 'button', onclick, ...rest }: Props = $props();
  const context = useContextContext('ContextTrigger');
  const percent = $derived(context.maxTokens > 0 ? Math.min(100, Math.max(0, context.usedTokens / context.maxTokens * 100)) : 0);
  function toggle(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void { onclick?.(event); if (!event.defaultPrevented) context.setOpen(!context.open); }
</script>
<button {...rest} {type} class={cn('svadmin-ai-context-part__trigger', className)} aria-expanded={context.open} data-slot="context-trigger" onclick={toggle}>
  {#if children}{@render children(percent)}{:else}<span>{percent.toFixed(1)}%</span><span class="svadmin-ai-context-part__ring" style={`--context-percent: ${percent * 3.6}deg`} aria-hidden="true"></span>{/if}
</button>
<style>
  .svadmin-ai-context-part__trigger { display: inline-flex; min-height: 2rem; align-items: center; gap: .45rem; padding: .3rem .55rem; border: 0; border-radius: min(var(--radius, .5rem), .5rem); background: transparent; color: var(--muted-foreground, currentColor); font: inherit; font-size: .75rem; cursor: pointer; }
  .svadmin-ai-context-part__trigger:hover { background: var(--muted, transparent); color: var(--foreground, currentColor); }
  .svadmin-ai-context-part__trigger:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-context-part__ring { width: 1.15rem; height: 1.15rem; border-radius: 50%; background: conic-gradient(var(--primary, currentColor) var(--context-percent), var(--muted, transparent) 0); mask: radial-gradient(circle, transparent 52%, currentColor 55%); }
</style>
