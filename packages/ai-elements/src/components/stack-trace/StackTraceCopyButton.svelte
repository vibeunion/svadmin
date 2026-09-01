<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { Check, Copy } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { useStackTraceContext } from './context.svelte.js';

  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class' | 'onerror'> {
    class?: string;
    children?: Snippet<[boolean]>;
    timeout?: number;
    oncopy?: () => void;
    onerror?: (error: Error) => void;
  }

  let { class: className = '', children, timeout = 2000, oncopy, onerror, onclick, onkeydown, disabled = false, ...rest }: Props = $props();
  const stack = useStackTraceContext('StackTraceCopyButton');
  let copied = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function copyTrace(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): Promise<void> {
    event.stopPropagation();
    onclick?.(event);
    if (disabled || event.defaultPrevented) return;
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      onerror?.(new Error('Clipboard API not available'));
      return;
    }
    try {
      await navigator.clipboard.writeText(stack.raw);
      copied = true;
      oncopy?.();
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { copied = false; }, timeout);
    } catch (error) {
      onerror?.(error instanceof Error ? error : new Error('Copy failed'));
    }
  }

  function stopKeyboardPropagation(event: KeyboardEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
    event.stopPropagation();
    onkeydown?.(event);
  }

  $effect(() => () => { if (timer) clearTimeout(timer); });
</script>

<button {...rest} type="button" class={cn('svadmin-ai-stack-part__button', className)} aria-label={copied ? 'Copied stack trace' : 'Copy stack trace'} title={copied ? 'Copied' : 'Copy stack trace'} {disabled} data-slot="stack-trace-copy-button" onclick={copyTrace} onkeydown={stopKeyboardPropagation}>{#if children}{@render children(copied)}{:else}{#if copied}<Check size={14} aria-hidden="true" />{:else}<Copy size={14} aria-hidden="true" />{/if}{/if}</button>
<style>.svadmin-ai-stack-part__button { display: inline-flex; width: 1.9rem; height: 1.9rem; align-items: center; justify-content: center; border: 0; border-radius: min(var(--radius, .5rem), .5rem); background: transparent; color: var(--muted-foreground, currentColor); cursor: pointer; }.svadmin-ai-stack-part__button:hover:not(:disabled) { background: var(--muted, transparent); color: var(--foreground, currentColor); }.svadmin-ai-stack-part__button:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }</style>
