<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { providePromptInputCommand, type PromptInputCommandContext, type PromptInputCommandItemRegistration } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; value?: string; onvaluechange?: (value: string) => void; }
  let { class: className = '', children, value = $bindable(''), onvaluechange, onkeydown, ...rest }: Props = $props();
  let items = $state<PromptInputCommandItemRegistration[]>([]); let activeId = $state<string | undefined>();
  const visibleItems = $derived(items.filter((item) => !item.disabled && (!value.trim() || item.value.toLowerCase().includes(value.trim().toLowerCase()))));
  function register(item: PromptInputCommandItemRegistration): () => void { items = [...items.filter((current) => current.id !== item.id), item]; if (!activeId) activeId = item.id; return () => { items = items.filter((current) => current.id !== item.id); if (activeId === item.id) activeId = items[0]?.id; }; }
  function move(step: 1 | -1): void { const index = visibleItems.findIndex((item) => item.id === activeId); const next = visibleItems[(index + step + visibleItems.length) % visibleItems.length]; if (next) activeId = next.id; }
  function selectActive(): void { visibleItems.find((item) => item.id === activeId)?.select(); }
  function setQuery(next: string): void { value = next; onvaluechange?.(next); }
  const context: PromptInputCommandContext = { get query() { return value; }, get activeId() { return activeId; }, get visibleCount() { return visibleItems.length; }, setQuery, register, isVisible: (itemValue) => !value.trim() || itemValue.toLowerCase().includes(value.trim().toLowerCase()), move, selectActive };
  providePromptInputCommand(context);
  function keydown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement }): void { onkeydown?.(event); if (event.defaultPrevented) return; if (event.key === 'ArrowDown') { event.preventDefault(); move(1); } else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); } else if (event.key === 'Enter') { event.preventDefault(); selectActive(); } }
</script>
<div {...rest} class={cn('grid max-h-72 min-w-48 overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground', className)} role="listbox" aria-label="Command menu" data-slot="prompt-input-command" onkeydown={keydown}>{@render children?.()}</div>
