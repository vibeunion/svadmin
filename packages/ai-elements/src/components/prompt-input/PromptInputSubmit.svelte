<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLButtonAttributes } from 'svelte/elements';
  import { CornerDownLeft, LoaderCircle, Square, X } from '@lucide/svelte'; import { cn } from '../../utils.js';
  import { getOptionalPromptInputController } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class'> { class?: string; children?: Snippet; status?: 'submitted' | 'streaming' | 'error' | 'ready'; onstop?: () => void; onStop?: () => void; }
  let { class: className = '', children, status, disabled, type = 'submit', onstop, onStop, onclick, ...rest }: Props = $props();
  const controller = getOptionalPromptInputController();
  const resolvedStatus = $derived(status ?? controller?.form?.status ?? 'ready');
  const generating = $derived(Boolean(controller?.form?.busy) || resolvedStatus === 'submitted' || resolvedStatus === 'streaming');
  const resolvedStop = $derived(onstop ?? onStop ?? controller?.form?.onstop);
  // Form-level disabled blocks editing, not stopping; an explicit button prop still wins.
  const resolvedDisabled = $derived(disabled ?? (controller?.form
    ? !generating && !controller.form.canSubmit
    : false));
  function click(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
    if (resolvedDisabled) { event.preventDefault(); return; }
    onclick?.(event);
    if (event.defaultPrevented) return;
    if (generating) { event.preventDefault(); resolvedStop?.(); }
  }
</script>
<button {...rest} type={generating ? 'button' : type} disabled={resolvedDisabled} class={cn('svadmin-ai__button size-8 min-h-8 p-0', className)} aria-label={generating ? 'Stop' : 'Submit'} data-slot="prompt-input-submit" onclick={click}>
  {#if children}{@render children()}{:else if resolvedStatus === 'submitted'}<LoaderCircle class="animate-spin" size={15} aria-hidden="true" />{:else if generating}<Square size={14} fill="currentColor" aria-hidden="true" />{:else if resolvedStatus === 'error'}<X size={15} aria-hidden="true" />{:else}<CornerDownLeft size={15} aria-hidden="true" />{/if}
</button>
