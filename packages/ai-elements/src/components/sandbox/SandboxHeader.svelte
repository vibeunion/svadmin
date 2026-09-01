<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { ChevronDown, Code2 } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { getStatusBadge, type ToolDisplayState } from '../tool/status.js';
  import { useSandboxContext } from './context.svelte.js';

  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class' | 'title'> { title?: string; state: ToolDisplayState; class?: string; children?: Snippet; }
  let { title = 'Sandbox', state, class: className = '', children, onclick, ...rest }: Props = $props();
  const context = useSandboxContext();
  const badge = $derived(getStatusBadge(state));
  function toggle(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void { onclick?.(event); if (!event.defaultPrevented) context.setOpen(!context.open); }
</script>
<button {...rest} type="button" class={cn('flex w-full items-center justify-between gap-4 border-0 bg-transparent p-3 text-left hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring', className)} aria-expanded={context.open} onclick={toggle}><span class="flex min-w-0 items-center gap-2"><Code2 class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span class="truncate text-sm font-medium">{title}</span><span class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground" data-state={state} data-tone={badge.tone}>{badge.label}</span>{#if children}{@render children()}{/if}</span><ChevronDown class={cn('size-4 shrink-0 text-muted-foreground transition-transform', context.open && 'rotate-180')} aria-hidden="true" /></button>
