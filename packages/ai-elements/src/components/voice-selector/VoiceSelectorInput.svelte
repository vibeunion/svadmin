<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'; import { Search } from '@lucide/svelte'; import { cn } from '../../utils.js'; import { useVoiceSelector } from './context.svelte.js';
  interface Props extends Omit<HTMLInputAttributes, 'class' | 'value'> { class?: string; value?: string; }
  let { class: className = '', value, placeholder = 'Search voices…', oninput, ...rest }: Props = $props(); const selector = useVoiceSelector(); const resolved = $derived(value ?? selector.query);
  function input(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void { selector.setQuery(event.currentTarget.value); oninput?.(event); }
</script>
<label class={cn('flex min-h-11 items-center gap-2 border-b border-border px-3', className)} data-slot="voice-selector-input"><Search size={15} aria-hidden="true" /><input {...rest} class="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" value={resolved} {placeholder} aria-label={rest['aria-label'] ?? 'Search voices'} oninput={input} /></label>
