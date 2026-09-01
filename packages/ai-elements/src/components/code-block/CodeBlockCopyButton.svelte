<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onDestroy } from 'svelte';
  import { Check, Copy } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { useCodeBlockContext } from './context.svelte.js';

  let { timeout = 2000, class: className = '', children, oncopy, onerror, disabled = false, ...rest }: { timeout?: number; class?: string; children?: Snippet<[boolean]>; oncopy?: () => void; onerror?: (error: Error) => void; disabled?: boolean; [key: string]: unknown } = $props();
  const context = useCodeBlockContext();
  let copied = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function copyCode(): Promise<void> {
    if (disabled || copied) return;
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      onerror?.(new Error('Clipboard API not available'));
      return;
    }
    try {
      await navigator.clipboard.writeText(context.code);
      copied = true;
      oncopy?.();
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { copied = false; }, timeout);
    } catch (error) {
      onerror?.(error instanceof Error ? error : new Error('Copy failed'));
    }
  }
  onDestroy(() => { if (timer) clearTimeout(timer); });
</script>
<button type="button" class={cn('inline-flex size-7 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50', className)} aria-label={copied ? 'Copied' : 'Copy code'} title={copied ? 'Copied' : 'Copy code'} {disabled} onclick={copyCode} {...rest}>
  {#if children}{@render children(copied)}{:else}{#if copied}<Check size={14} aria-hidden="true" />{:else}<Copy size={14} aria-hidden="true" />{/if}{/if}
</button>
