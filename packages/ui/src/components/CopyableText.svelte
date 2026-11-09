<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Copy, Check } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core';

  const i18n = useTranslation();

  export interface CopyableTextProps {
    text: string;
    copyValue?: string;
    tooltip?: string;
    copiedTooltip?: string;
    masked?: boolean;
    maskVisibleLength?: number;
    oncopied?: (value: string) => void;
    class?: string;
  }

  let {
    text,
    copyValue,
    tooltip,
    copiedTooltip,
    masked = false,
    maskVisibleLength = 4,
    oncopied,
    class: className = '',
  }: CopyableTextProps = $props();

  let copied = $state(false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  onDestroy(() => {
    if (resetTimer) clearTimeout(resetTimer);
  });

  const displayText = $derived.by(() => {
    if (!masked || !text) return text;
    if (text.length <= maskVisibleLength * 2) {
      return '••••••••';
    }
    const head = text.slice(0, maskVisibleLength);
    const tail = text.slice(-maskVisibleLength);
    return `${head}••••••••${tail}`;
  });

  const actualTooltip = $derived(tooltip ?? i18n.t('common.copy'));
  const actualCopiedTooltip = $derived(copiedTooltip ?? i18n.t('common.copied'));

  async function handleCopy() {
    const valueToCopy = copyValue ?? text;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(valueToCopy);
      }
      copied = true;
      oncopied?.(valueToCopy);
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        copied = false;
      }, 1500);
    } catch {
      // Graceful fallback
    }
  }
</script>

<span
  class={cn('inline-flex items-center gap-1.5 font-mono text-sm text-foreground', className)}
  data-svadmin-component="CopyableText"
  data-copied={copied}
>
  <span class="truncate">{displayText}</span>
  <button
    type="button"
    class={cn(
      'inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      copied && 'text-success hover:text-success'
    )}
    onclick={handleCopy}
    title={copied ? actualCopiedTooltip : actualTooltip}
    aria-label={copied ? actualCopiedTooltip : actualTooltip}
  >
    {#if copied}
      <Check class="h-3.5 w-3.5 text-success animate-in zoom-in-50" />
    {:else}
      <Copy class="h-3.5 w-3.5" />
    {/if}
  </button>
</span>
