<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  export type CopyStatus = 'idle' | 'success' | 'failure';
  export type CopyButtonProps = Omit<HTMLButtonAttributes, 'children' | 'class' | 'oncopy' | 'onerror'> & {
    text: string;
    timeout?: number;
    class?: string;
    icon?: Snippet;
    children?: Snippet;
    oncopy?: (status: Exclude<CopyStatus, 'idle'>) => void;
    onerror?: (error: Error) => void;
  };
</script>

<script lang="ts">
  import { Check, Copy, X } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  let {
    text,
    timeout = 2000,
    class: className = '',
    icon,
    children,
    oncopy,
    onerror,
    type = 'button',
    disabled = false,
    ...rest
  }: CopyButtonProps = $props();

  let status = $state<CopyStatus>('idle');
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  function resetLater(): void {
    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { status = 'idle'; }, timeout);
  }

  async function copy(): Promise<void> {
    if (disabled || status === 'success') return;
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      const error = new Error('Clipboard API not available');
      status = 'failure';
      onerror?.(error);
      oncopy?.('failure');
      resetLater();
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      status = 'success';
      oncopy?.('success');
    } catch (error) {
      status = 'failure';
      onerror?.(error instanceof Error ? error : new Error(String(error)));
      oncopy?.('failure');
    }
    resetLater();
  }

  $effect(() => () => {
    if (resetTimer) clearTimeout(resetTimer);
  });
</script>

<button
  {...rest}
  {type}
  {disabled}
  class={cn('svadmin-ai-copy-button', className)}
  data-status={status}
  data-slot="copy-button"
  aria-label={status === 'success' ? 'Copied' : status === 'failure' ? 'Failed to copy' : 'Copy'}
  onclick={copy}
>
  {#if status === 'success'}<Check size={14} aria-hidden="true" />
  {:else if status === 'failure'}<X size={14} aria-hidden="true" />
  {:else if icon}{@render icon()}
  {:else}<Copy size={14} aria-hidden="true" />{/if}
  {@render children?.()}
</button>

<style>
  .svadmin-ai-copy-button { display: inline-flex; min-height: 2rem; align-items: center; justify-content: center; gap: .5rem; border: 0; border-radius: min(var(--radius, .5rem), .375rem); padding: .375rem .625rem; background: transparent; color: var(--muted-foreground, currentColor); font: inherit; cursor: pointer; }
  .svadmin-ai-copy-button:hover:not(:disabled) { background: var(--muted, transparent); color: var(--foreground, currentColor); }
  .svadmin-ai-copy-button:disabled { cursor: not-allowed; opacity: .5; }
  .svadmin-ai-copy-button:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 1px; }
  .svadmin-ai-copy-button[data-status='success'] { color: var(--success, currentColor); }
  .svadmin-ai-copy-button[data-status='failure'] { color: var(--destructive, currentColor); }
</style>
