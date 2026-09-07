<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import { usePromptInputAttachments, usePromptInputController } from './context.svelte.js';
  interface Props extends Omit<HTMLTextareaAttributes, 'class' | 'value'> { class?: string; value?: string; }
  let { class: className = '', value, name, disabled, placeholder = 'What would you like to know?', oninput, onkeydown, onpaste, oncompositionstart, oncompositionend, ...rest }: Props = $props();
  const controller = usePromptInputController();
  const attachments = usePromptInputAttachments();
  let composing = $state(false);
  const resolvedValue = $derived(value ?? controller.textInput.value);
  const resolvedName = $derived(name ?? (controller.syncHiddenInput ? undefined : 'message'));
  const resolvedDisabled = $derived(disabled ?? controller.form?.disabled ?? false);
  function input(event: Event & { currentTarget: EventTarget & HTMLTextAreaElement }): void { if (resolvedDisabled) return; controller.textInput.setInput(event.currentTarget.value); oninput?.(event); }
  function keydown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLTextAreaElement }): void {
    onkeydown?.(event); if (event.defaultPrevented || resolvedDisabled || composing || event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const button = event.currentTarget.form?.querySelector<HTMLButtonElement>('[data-slot="prompt-input-submit"], button[type="submit"]');
      if (controller.form?.canSubmit !== false && (!button || (button.type === 'submit' && !button.disabled))) event.currentTarget.form?.requestSubmit();
    }
    if (event.key === 'Backspace' && event.currentTarget.value === '' && attachments.files.length > 0) { event.preventDefault(); const last = attachments.files.at(-1); if (last) attachments.remove(last.id); }
  }
  function paste(event: ClipboardEvent & { currentTarget: EventTarget & HTMLTextAreaElement }): void { onpaste?.(event); if (event.defaultPrevented || resolvedDisabled || composing) return; const files = Array.from(event.clipboardData?.files ?? []); if (files.length) { event.preventDefault(); attachments.add(files); } }
  function start(event: CompositionEvent & { currentTarget: EventTarget & HTMLTextAreaElement }): void { composing = true; oncompositionstart?.(event); }
  function end(event: CompositionEvent & { currentTarget: EventTarget & HTMLTextAreaElement }): void { composing = false; oncompositionend?.(event); }
</script>
<textarea {...rest} name={resolvedName} {placeholder} value={resolvedValue} disabled={resolvedDisabled} class={cn('svadmin-ai__textarea field-sizing-content max-h-48 min-h-16 border-0 bg-transparent outline-none', className)} data-slot="prompt-input-textarea" oninput={input} onkeydown={keydown} onpaste={paste} oncompositionstart={start} oncompositionend={end}></textarea>
