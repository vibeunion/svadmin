<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { ChevronDown, Search } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { useTaskContext } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class' | 'onclick'> { title?: string; class?: string; children?: Snippet; onclick?: (event: MouseEvent) => void; }
  let { title = 'Task details', class: className = '', children, type = 'button', onclick, ...rest }: Props = $props();
  const task = useTaskContext('TaskTrigger');
  function toggle(event: MouseEvent): void {
    onclick?.(event);
    if (!event.defaultPrevented) task.setOpen(!task.open);
  }
</script>
<button {...rest} {type} class={cn('svadmin-ai-task-part__trigger', className)} data-slot="task-trigger" aria-expanded={task.open} onclick={toggle}>{#if children}{@render children()}{:else}<Search size={15} aria-hidden="true" /><span>{title}</span><ChevronDown class={task.open ? 'svadmin-ai-task-part__trigger-icon--open' : ''} size={15} aria-hidden="true" />{/if}</button>
<style>.svadmin-ai-task-part__trigger { display: flex; width: 100%; align-items: center; gap: .4rem; border: 0; background: transparent; color: var(--muted-foreground, currentColor); font: inherit; font-size: .8rem; cursor: pointer; }.svadmin-ai-task-part__trigger :global(svg:last-child) { margin-left: auto; transition: transform 150ms ease; }.svadmin-ai-task-part__trigger :global(.svadmin-ai-task-part__trigger-icon--open) { transform: rotate(180deg); }.svadmin-ai-task-part__trigger:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }@media (prefers-reduced-motion: reduce) { .svadmin-ai-task-part__trigger :global(svg:last-child) { transition: none; } }</style>
