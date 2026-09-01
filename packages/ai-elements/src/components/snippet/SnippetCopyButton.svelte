<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  export type SnippetCopyButtonProps = Omit<HTMLButtonAttributes, 'class' | 'children' | 'oncopy' | 'onerror'> & {
    class?: string;
    timeout?: number;
    children?: Snippet;
    oncopy?: () => void;
    onerror?: (error: Error) => void;
  };
</script>

<script lang="ts">
  import { Check, Copy } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { useSnippetContext } from './context.svelte.js';

  let {
    class: className = '',
    timeout = 2000,
    children,
    oncopy,
    onerror,
    type = 'button',
    title = 'Copy',
    disabled = false,
    ...rest
  }: SnippetCopyButtonProps = $props();

  const context = useSnippetContext('SnippetCopyButton');
  let copied = $state(false);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  async function copyToClipboard(): Promise<void> {
    if (disabled || copied) return;
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      onerror?.(new Error('Clipboard API not available'));
      return;
    }

    try {
      await navigator.clipboard.writeText(context.code);
      copied = true;
      oncopy?.();
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => { copied = false; }, timeout);
    } catch (error) {
      onerror?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  $effect(() => () => {
    if (timeoutId) clearTimeout(timeoutId);
  });
</script>

<button
  {...rest}
  {type}
  {disabled}
  class={cn('svadmin-ai-snippet-copy', className)}
  data-slot="snippet-copy-button"
  data-copied={copied}
  aria-label={copied ? 'Copied' : 'Copy'}
  {title}
  onclick={copyToClipboard}
>
  {#if children}{@render children()}{:else if copied}<Check size={14} aria-hidden="true" />{:else}<Copy size={14} aria-hidden="true" />{/if}
</button>

<style>
  .svadmin-ai-snippet-copy { display: inline-flex; width: 2rem; height: 2rem; flex: none; align-items: center; justify-content: center; border: 0; border-radius: min(var(--radius, 0.5rem), 0.375rem); background: transparent; color: var(--muted-foreground, currentColor); cursor: pointer; }
  .svadmin-ai-snippet-copy:hover:not(:disabled) { background: var(--muted, transparent); color: var(--foreground, currentColor); }
  .svadmin-ai-snippet-copy:disabled { cursor: not-allowed; opacity: 0.5; }
  .svadmin-ai-snippet-copy:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 1px; }
</style>
