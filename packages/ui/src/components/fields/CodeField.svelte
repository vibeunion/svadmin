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
  <span class={cn('field-code svadmin-u-bfa603190748 svadmin-u-fc7473ca09eb', className)}>{nullLabel}</span>
{:else}
  <div class={cn('field-code svadmin-u-d89972fe17d6 group svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-c9ed8c5f79ae svadmin-u-b00f43c30c2b svadmin-u-359090c2d529 svadmin-u-0e65706bcccd', className)}>
    {#if language || copyable}
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-706701550477 svadmin-u-0b91436debbd svadmin-u-660d2effb880 svadmin-u-d058ca6de60f svadmin-u-bfa603190748">
        {#if language}
          <Badge variant="outline" class="svadmin-u-11e59c6d5f6b svadmin-u-d8e0e382c67b svadmin-u-1dc571a3609f svadmin-u-0e65706bcccd">
            {language.toUpperCase()}
          </Badge>
        {:else}
          <span></span>
        {/if}

        {#if copyable}
          <button
            type="button"
            class="svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-07389a777c1f svadmin-u-45d828117213 svadmin-u-465609a240a8 svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e svadmin-u-783c2dcc5172 svadmin-u-ceb69a6b0e5f svadmin-u-55d048ebfb1c svadmin-u-0f3af40e92e8 svadmin-u-80b9d0ae125f"
            onclick={handleCopy}
            title={copied ? copiedTitle : title}
            aria-label={copied ? copiedTitle : title}
          >
            {#if copied}
              <Check class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-76747e5e02ff svadmin-u-40137e897961 zoom-in-50" />
              <span class="svadmin-u-1dc571a3609f svadmin-u-76747e5e02ff">{copiedTitle}</span>
            {:else}
              <Copy class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
              <span class="svadmin-u-1dc571a3609f">{title}</span>
            {/if}
          </button>
        {/if}
      </div>
    {/if}

    <pre class={cn('svadmin-u-9fe52d5d506c svadmin-u-1384f66f41d0 svadmin-u-92bf82f493b1 svadmin-u-6b189c6edadb svadmin-u-8078c71d23ee', maxHeight)}><code>{formattedCode}</code></pre>
  </div>
{/if}
