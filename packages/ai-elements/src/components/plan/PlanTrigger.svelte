<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { ChevronsUpDown } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { usePlanContext } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class' | 'onclick'> { class?: string; children?: Snippet; onclick?: (event: MouseEvent) => void; }
  let { class: className = '', children, type = 'button', onclick, ...rest }: Props = $props();
  const plan = usePlanContext('PlanTrigger');
  function toggle(event: MouseEvent): void {
    onclick?.(event);
    if (!event.defaultPrevented) plan.setOpen(!plan.open);
  }
</script>
<button {...rest} {type} class={cn('svadmin-ai-plan-part__trigger', className)} data-slot="plan-trigger" aria-expanded={plan.open} onclick={toggle}>{#if children}{@render children()}{:else}<ChevronsUpDown size={16} aria-hidden="true" /><span class="svadmin-ai__sr-only">Toggle plan</span>{/if}</button>
<style>.svadmin-ai-plan-part__trigger { display: inline-flex; width: 2rem; height: 2rem; align-items: center; justify-content: center; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: transparent; color: var(--muted-foreground, currentColor); cursor: pointer; }.svadmin-ai-plan-part__trigger:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }</style>
