<script lang="ts">
  import { Phone, Copy, Check } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  interface Props {
    value?: string | number | null | undefined;
    href?: string;
    showIcon?: boolean;
    clickable?: boolean;
    copyable?: boolean;
    nullLabel?: string;
    class?: string;
  }

  let {
    value,
    href,
    showIcon = true,
    clickable = true,
    copyable = false,
    nullLabel = '—',
    class: className = '',
  }: Props = $props();

  let copied = $state(false);

  const stringValue = $derived.by(() => {
    if (value == null || value === '') return null;
    const str = String(value).trim();
    return str.length > 0 ? str : null;
  });

  const telHref = $derived.by(() => {
    if (!stringValue) return undefined;
    const candidate = (href ?? stringValue).replace(/^tel:/i, '');
    const normalized = candidate.replace(/[\s().-]/g, '');
    if (!/^\+?\d+$/.test(normalized)) return undefined;
    return `tel:${normalized}`;
  });

  async function handleCopy(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!stringValue) return;
    try {
      await navigator.clipboard.writeText(stringValue);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch {
      // ignore
    }
  }
</script>

{#if !stringValue}
  <span class={cn('field-phone text-muted-foreground text-sm', className)}>{nullLabel}</span>
{:else}
  <div class={cn('field-phone inline-flex items-center gap-1.5 text-sm', className)}>
    {#if showIcon}
      <Phone class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    {/if}
    {#if clickable && telHref}
      <a
        href={telHref}
        class="font-medium text-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
      >
        {stringValue}
      </a>
    {:else}
      <span class="text-foreground">{stringValue}</span>
    {/if}
    {#if copyable}
      <button
        type="button"
        onclick={handleCopy}
        class="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label={copied ? 'Copied' : 'Copy phone number'}
        title={copied ? 'Copied' : 'Copy phone number'}
      >
        {#if copied}
          <Check class="h-3 w-3 text-success" />
        {:else}
          <Copy class="h-3 w-3" />
        {/if}
      </button>
    {/if}
  </div>
{/if}
