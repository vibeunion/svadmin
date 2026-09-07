<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Phone, Copy, Check } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  interface Props {
    value?: string | number | null | undefined;
    href?: string;
    showIcon?: boolean;
    clickable?: boolean;
    copyable?: boolean;
    nullLabel?: string;
    oncopy?: (value: string) => void;
    class?: string;
  }

  let {
    value,
    href,
    showIcon = true,
    clickable = true,
    copyable = false,
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
    if (!stringValue || !copyable) return;

    const writeText = globalThis.navigator?.clipboard?.writeText;
    if (!writeText) return;

    try {
      await writeText.call(globalThis.navigator.clipboard, stringValue);
    } catch {
      return;
    }

    if (destroyed) return;
    copied = true;
    oncopy?.(stringValue);

    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      copied = false;
      timeoutId = null;
    }, 2000);
  }
</script>

{#if !stringValue}
  <span class={cn('field-phone svadmin-u-bfa603190748 svadmin-u-fc7473ca09eb', className)}>{nullLabel}</span>
{:else}
  <div class={cn('field-phone svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568 svadmin-u-fc7473ca09eb', className)}>
    {#if showIcon}
      <Phone class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-012fbd121f37 svadmin-u-bfa603190748" />
    {/if}
    {#if clickable && telHref}
      <a
        href={telHref}
        class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-1a78fc7ab897 svadmin-u-ceb69a6b0e5f svadmin-u-02af9e5da98e svadmin-u-f673f4a7d061"
      >
        {stringValue}
      </a>
    {:else}
      <span class="svadmin-u-d4108abe6359">{stringValue}</span>
    {/if}
    {#if copyable}
      <button
        type="button"
        onclick={handleCopy}
        class="svadmin-u-52083e7da442 svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-07389a777c1f svadmin-u-bfa603190748 svadmin-u-8e551981c8d7 svadmin-u-ea7b2e9e070e svadmin-u-ceb69a6b0e5f"
        aria-label={copied ? 'Copied' : 'Copy phone number'}
        title={copied ? 'Copied' : 'Copy phone number'}
      >
        {#if copied}
          <Check class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-76747e5e02ff" />
        {:else}
          <Copy class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
        {/if}
      </button>
    {/if}
  </div>
{/if}
