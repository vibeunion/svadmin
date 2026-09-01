<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLButtonAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { useSandboxTabsContext } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class' | 'value'> { value: string; class?: string; children?: Snippet; }
  let { value, class: className = '', children, disabled = false, onclick, onkeydown, ...rest }: Props = $props(); const context = useSandboxTabsContext(); const active = $derived(context.value === value);
  function select(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void { onclick?.(event); if (!event.defaultPrevented) context.setValue(value); }
  function moveFocus(event: KeyboardEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
    onkeydown?.(event); if (event.defaultPrevented || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const tabs = Array.from(event.currentTarget.closest('[role="tablist"]')?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)') ?? []); const current = tabs.indexOf(event.currentTarget); if (current < 0 || tabs.length === 0) return;
    event.preventDefault(); const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1; const target = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : tabs[(current + delta + tabs.length) % tabs.length]; target?.focus(); target?.click();
  }
</script>
<button {...rest} id={context.tabId(value)} type="button" role="tab" aria-controls={context.panelId(value)} aria-selected={active} data-state={active ? 'active' : 'inactive'} tabindex={active ? 0 : -1} class={cn('rounded-none border-0 border-b-2 border-transparent bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring', active && 'border-primary text-foreground', className)} {disabled} onclick={select} onkeydown={moveFocus}>{@render children?.()}</button>
