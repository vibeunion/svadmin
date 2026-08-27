<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Copy, Check } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  interface Props {
    value?: string | number | null | undefined;
    displayValue?: string;
    masked?: boolean;
    monospace?: boolean;
    copyable?: boolean;
    title?: string;
    copiedTitle?: string;
    nullLabel?: string;
    oncopy?: (value: string) => void;
    class?: string;
  }

  let {
    value,
    displayValue,
    masked = false,
    monospace = true,
    copyable = true,
    title = 'Copy',
    copiedTitle = 'Copied!',
    nullLabel = '—',
    oncopy,
    class: className = '',
  }: Props = $props();

  let copied = $state(false);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  onDestroy(() => {
    destroyed = true;
    if (timeoutId) clearTimeout(timeoutId);
  });

  function maskText(str: string): string {
    if (str.length <= 8) return '****';
    return `${str.slice(0, 4)}...${str.slice(-4)}`;
  }

  const rawString = $derived(value != null && value !== '' ? String(value) : '');
  const displayText = $derived.by(() => {
    if (!rawString) return nullLabel;
    if (displayValue) return displayValue;
    if (masked) return maskText(rawString);
    return rawString;
  });

  async function handleCopy(event: MouseEvent) {
    event.stopPropagation();
    if (!rawString || !copyable) return;

    const writeText = globalThis.navigator?.clipboard?.writeText;
    if (!writeText) return;

    try {
      await writeText.call(globalThis.navigator.clipboard, rawString);
    } catch {
      return;
    }

    if (destroyed) return;
    copied = true;
    oncopy?.(rawString);

    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      copied = false;
      timeoutId = null;
    }, 1500);
  }
</script>

{#if !rawString}
  <span class={cn('field-copy text-muted-foreground text-sm', className)}>{nullLabel}</span>
{:else}
  <span class={cn('field-copy inline-flex items-center gap-1.5 text-sm group', className)}>
    <span class={cn(monospace ? 'font-mono text-xs' : '', 'truncate select-all')}>
      {displayText}
    </span>
    {#if copyable}
      <button
        type="button"
        class="inline-flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
        onclick={handleCopy}
        title={copied ? copiedTitle : title}
        aria-label={copied ? copiedTitle : title}
      >
        {#if copied}
          <Check class="h-3 w-3 text-success animate-in zoom-in-50 duration-150" />
        {:else}
          <Copy class="h-3 w-3 opacity-70 group-hover:opacity-100 transition-opacity" />
        {/if}
      </button>
    {/if}
  </span>
{/if}
