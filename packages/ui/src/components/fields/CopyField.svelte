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
  <span class={cn('field-copy svadmin-u-bfa603190748 svadmin-u-fc7473ca09eb', className)}>{nullLabel}</span>
{:else}
  <span class={cn('field-copy svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568 svadmin-u-fc7473ca09eb group', className)}>
    <span class={cn(monospace ? 'svadmin-u-0e65706bcccd svadmin-u-359090c2d529' : '', 'svadmin-u-f283ea9bea0e svadmin-u-8078c71d23ee')}>
      {displayText}
    </span>
    {#if copyable}
      <button
        type="button"
        class="svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-07389a777c1f svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e svadmin-u-68646cdcc246 svadmin-u-ceb69a6b0e5f svadmin-u-55d048ebfb1c svadmin-u-0f3af40e92e8 svadmin-u-80b9d0ae125f"
        onclick={handleCopy}
        title={copied ? copiedTitle : title}
        aria-label={copied ? copiedTitle : title}
      >
        {#if copied}
          <Check class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-76747e5e02ff svadmin-u-40137e897961 zoom-in-50 svadmin-u-233c0494b485" />
        {:else}
          <Copy class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-0c67ca474a69 svadmin-u-181f3d6c9821 svadmin-u-67d6184a0024" />
        {/if}
      </button>
    {/if}
  </span>
{/if}
