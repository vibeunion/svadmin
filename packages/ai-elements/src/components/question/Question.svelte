<script lang="ts">
  import type { Snippet } from 'svelte'; import type { QuestionResponse, QuestionSelectionMode, QuestionValue } from './context.svelte.js'; import { cn } from '../../utils.js'; import { provideQuestionContext } from './context.svelte.js';
  let { defaultValue = { selectedValues: [], text: '' }, value = $bindable<QuestionValue>(defaultValue), disabled = false, selectionMode = 'single', class: className = '', children, onsubmit, onvaluechange, ...rest }: { value?: QuestionValue; defaultValue?: QuestionValue; disabled?: boolean; selectionMode?: QuestionSelectionMode; class?: string; children?: Snippet; onsubmit?: (response: QuestionResponse, event: SubmitEvent) => void | Promise<void>; onvaluechange?: (value: QuestionValue) => void; [key: string]: unknown } = $props();
  let busy = $state(false);
  function setValue(next: QuestionValue): void { value = next; onvaluechange?.(next); }
  function setText(text: string): void { setValue({ ...value, text }); }
  function toggleValue(option: string): void { const selected = value.selectedValues.includes(option); const selectedValues = selectionMode === 'single' ? (selected ? [] : [option]) : (selected ? value.selectedValues.filter((item) => item !== option) : [...value.selectedValues, option]); setValue({ ...value, selectedValues }); }
  async function handleSubmit(event: SubmitEvent): Promise<void> { event.preventDefault(); if (disabled || busy) return; const text = value.text.trim(); if (value.selectedValues.length === 0 && text.length === 0) return; busy = true; try { await onsubmit?.({ selectedValues: value.selectedValues, text: text || undefined }, event); } finally { busy = false; } }
  provideQuestionContext({ get value() { return value; }, get disabled() { return disabled; }, get busy() { return busy; }, get selectionMode() { return selectionMode; }, setText, toggleValue });
</script>
<form class={cn('svadmin-ai space-y-4 rounded-lg border border-border bg-background p-4 text-foreground', className)} aria-busy={busy} onsubmit={handleSubmit} {...rest}>{@render children?.()}</form>
