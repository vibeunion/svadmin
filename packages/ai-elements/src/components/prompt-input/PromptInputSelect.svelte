<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { providePromptInputSelect } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { value?: string; defaultValue?: string; open?: boolean; defaultOpen?: boolean; class?: string; children?: Snippet; onvaluechange?: (value: string) => void; onopenchange?: (open: boolean) => void; }
  let { value = $bindable(''), defaultValue = '', open = $bindable(false), defaultOpen = false, class: className = '', children, onvaluechange, onopenchange, ...rest }: Props = $props();
  let initialized = false;
  $effect.pre(() => { if (!initialized) { initialized = true; if (!value && defaultValue) value = defaultValue; if (defaultOpen) open = true; } });
  function setValue(next: string): void { value = next; onvaluechange?.(next); setOpen(false); }
  function setOpen(next: boolean): void { open = next; onopenchange?.(next); }
  providePromptInputSelect({ get value() { return value; }, get open() { return open; }, setValue, setOpen });
</script>
<div {...rest} class={cn('relative inline-flex min-w-24', className)} data-slot="prompt-input-select" data-state={open ? 'open' : 'closed'}>{@render children?.()}</div>
