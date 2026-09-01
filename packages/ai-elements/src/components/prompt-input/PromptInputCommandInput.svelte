<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'; import { Search } from '@lucide/svelte'; import { cn } from '../../utils.js'; import { usePromptInputCommand } from './context.svelte.js';
  interface Props extends Omit<HTMLInputAttributes, 'class' | 'value'> { class?: string; value?: string; }
  let { class: className = '', value, placeholder = 'Search…', oninput, ...rest }: Props = $props(); const command = usePromptInputCommand(); const resolved = $derived(value ?? command.query);
  function input(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void { command.setQuery(event.currentTarget.value); oninput?.(event); }
</script>
<label class={cn('flex min-h-9 items-center gap-2 border-b border-border px-2 text-sm', className)} data-slot="prompt-input-command-input"><Search size={14} aria-hidden="true" /><input {...rest} class="min-w-0 flex-1 border-0 bg-transparent outline-none" value={resolved} {placeholder} aria-label={rest['aria-label'] ?? 'Search'} oninput={input} /></label>
