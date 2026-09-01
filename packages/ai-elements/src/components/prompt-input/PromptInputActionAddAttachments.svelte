<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements'; import { Image } from '@lucide/svelte'; import { cn } from '../../utils.js'; import { usePromptInputAttachments } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'class'> { class?: string; label?: string; accept?: string; multiple?: boolean; }
  let { class: className = '', label = 'Add photos or files', accept, multiple = true, onclick, ...rest }: Props = $props(); const attachments = usePromptInputAttachments(); let input = $state<HTMLInputElement | null>(null);
  function open(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void { onclick?.(event); if (!event.defaultPrevented) { if (input) input.value = ''; input?.click(); } }
</script>
<input bind:this={input} class="svadmin-ai__sr-only" type="file" {accept} {multiple} aria-label={label} onchange={(event) => { const files = event.currentTarget.files; if (files) attachments.add(files); event.currentTarget.value = ''; }} />
<button {...rest} type="button" role="menuitem" class={cn('flex min-h-9 w-full items-center gap-2 rounded px-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring', className)} data-slot="prompt-input-action-add-attachments" onclick={open}><Image size={16} aria-hidden="true" />{label}</button>
