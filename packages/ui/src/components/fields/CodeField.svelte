<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Copy, Check } from '@lucide/svelte';
  import { Badge } from '../ui/badge/index.js';
  import { cn } from '../../utils.js';

  interface Props {
    value?: string | number | Record<string, unknown> | unknown[] | null | undefined;
    language?: string;
    copyable?: boolean;
    title?: string;
    copiedTitle?: string;
    nullLabel?: string;
    maxHeight?: string;
    class?: string;
  }

  let {
    value,
    language,
    copyable = true,
    title = 'Copy code',
    copiedTitle = 'Copied!',
    nullLabel = '—',
    maxHeight = 'max-h-48',
    class: className = '',
  }: Props = $props();

  let copied = $state(false);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  onDestroy(() => {
    destroyed = true;
    if (timeoutId) clearTimeout(timeoutId);
  });

  const formattedCode = $derived.by(() => {
    if (value == null || value === '') return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  });

  async function handleCopy(event: MouseEvent) {
    event.stopPropagation();
    if (!formattedCode || !copyable) return;

    const writeText = globalThis.navigator?.clipboard?.writeText;
    if (!writeText) return;

    try {
      await writeText.call(globalThis.navigator.clipboard, formattedCode);
    } catch {
      return;
    }

    if (destroyed) return;
    copied = true;
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      copied = false;
      timeoutId = null;
    }, 1500);
  }
</script>

{#if !formattedCode}
  <span class={cn('field-code text-muted-foreground text-sm', className)}>{nullLabel}</span>
{:else}
  <div class={cn('field-code relative group rounded-md border border-border/80 bg-muted/40 text-xs font-mono', className)}>
    {#if language || copyable}
      <div class="flex items-center justify-between border-b border-border/60 bg-muted/60 px-2.5 py-1 text-[11px] text-muted-foreground">
        {#if language}
          <Badge variant="outline" class="h-4 px-1 text-[10px] font-mono">
            {language.toUpperCase()}
          </Badge>
        {:else}
          <span></span>
        {/if}

        {#if copyable}
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
            onclick={handleCopy}
            title={copied ? copiedTitle : title}
            aria-label={copied ? copiedTitle : title}
          >
            {#if copied}
              <Check class="h-3 w-3 text-success animate-in zoom-in-50" />
              <span class="text-[10px] text-success">{copiedTitle}</span>
            {:else}
              <Copy class="h-3 w-3" />
              <span class="text-[10px]">{title}</span>
            {/if}
          </button>
        {/if}
      </div>
    {/if}

    <pre class={cn('p-2.5 overflow-x-auto overflow-y-auto leading-relaxed select-all', maxHeight)}><code>{formattedCode}</code></pre>
  </div>
{/if}
