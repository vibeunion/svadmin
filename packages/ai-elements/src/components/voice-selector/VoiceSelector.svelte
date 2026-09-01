<script module lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements';
  export interface VoiceSelectorProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { value?: string; defaultValue?: string; open?: boolean; defaultOpen?: boolean; class?: string; children?: Snippet; onvaluechange?: (value: string | undefined) => void; onopenchange?: (open: boolean) => void; }
</script>
<script lang="ts">
  import { cn } from '../../utils.js'; import { provideVoiceSelector, type VoiceSelectorItemRegistration } from './context.svelte.js';
  let { value = $bindable<string | undefined>(), defaultValue, open = $bindable(false), defaultOpen = false, class: className = '', children, onvaluechange, onopenchange, onkeydown, ...rest }: VoiceSelectorProps = $props();
  let initialized = false;
  $effect.pre(() => { if (!initialized) { initialized = true; if (value === undefined && defaultValue !== undefined) value = defaultValue; if (defaultOpen) open = true; } });
  let query = $state(''); let items = $state<VoiceSelectorItemRegistration[]>([]); let activeId = $state<string | undefined>();
  const visible = $derived(items.filter((item) => !item.disabled && isVisible(item.searchValue)));
  function setOpen(next: boolean): void { if (open === next) return; open = next; onopenchange?.(next); if (!next) query = ''; }
  function setValue(next: string | undefined): void { value = next; onvaluechange?.(next); setOpen(false); }
  function setQuery(next: string): void { query = next; const first = items.find((item) => !item.disabled && isVisible(item.searchValue)); activeId = first?.id; }
  function isVisible(searchValue: string): boolean { return !query.trim() || searchValue.toLowerCase().includes(query.trim().toLowerCase()); }
  function register(item: VoiceSelectorItemRegistration): () => void { items = [...items.filter((entry) => entry.id !== item.id), item]; if (!activeId && !item.disabled) activeId = item.id; return () => { items = items.filter((entry) => entry.id !== item.id); if (activeId === item.id) activeId = items.find((entry) => !entry.disabled)?.id; }; }
  function move(step: 1 | -1): void { if (!visible.length) return; const index = visible.findIndex((item) => item.id === activeId); activeId = visible[(index + step + visible.length) % visible.length]?.id; }
  function selectActive(): void { visible.find((item) => item.id === activeId)?.select(); }
  provideVoiceSelector({ get value() { return value; }, get open() { return open; }, get query() { return query; }, get activeId() { return activeId; }, get visibleCount() { return visible.length; }, setValue, setOpen, setQuery, register, isVisible, move, selectActive });
  function keydown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement }): void { onkeydown?.(event); if (event.defaultPrevented) return; if (event.key === 'Escape') { setOpen(false); } else if (event.key === 'ArrowDown') { event.preventDefault(); move(1); } else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); } else if (event.key === 'Enter' && open && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); selectActive(); } }
</script>
<div {...rest} class={cn('svadmin-ai relative inline-flex', className)} data-slot="voice-selector" data-state={open ? 'open' : 'closed'} onkeydown={keydown}>{@render children?.()}</div>
