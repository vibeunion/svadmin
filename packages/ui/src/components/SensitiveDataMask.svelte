<script lang="ts">
  import { untrack } from 'svelte';
  import { Eye, EyeOff, Copy, Check } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import { cn } from '../utils.js';

  export type MaskType =
    | 'phone'
    | 'mobile'
    | 'id-card'
    | 'idCard'
    | 'email'
    | 'bank-card'
    | 'bankCard'
    | 'name'
    | 'secret'
    | 'custom';

  export type CopyMode = 'raw' | 'masked' | 'auto';

  export interface SensitiveDataMaskProps {
    value?: string | number | null | undefined;
    type?: MaskType | undefined;
    maskPattern?: ((val: string) => string) | undefined;
    allowUnmask?: boolean | undefined;
    defaultMasked?: boolean | undefined;
    allowCopy?: boolean | undefined;
    copyMode?: CopyMode | undefined;
    onReveal?: (() => boolean | undefined | Promise<boolean | undefined>) | undefined;
    onUnmask?: (() => void | Promise<void>) | undefined;
    onCopy?: ((copiedText: string) => void) | undefined;
    class?: string | undefined;
  }

  let {
    value = '',
    type = 'phone',
    maskPattern,
    allowUnmask = true,
    defaultMasked = true,
    allowCopy = true,
    copyMode = 'raw',
    onReveal,
    onUnmask,
    onCopy,
    class: className = '',
  }: SensitiveDataMaskProps = $props();

  let isMasked = $state(untrack(() => defaultMasked));
  let isCopied = $state(false);

  const rawString = $derived(String(value ?? ''));

  function maskName(val: string): string {
    const trimmed = val.trim();
    if (!trimmed) return '—';
    if (trimmed.includes(' ')) {
      return trimmed
        .split(/\s+/)
        .map((part) => (part.length <= 1 ? '*' : `${part[0]}${'*'.repeat(Math.max(1, part.length - 2))}${part.length > 2 ? part.slice(-1) : '*'}`))
        .join(' ');
    }
    const len = trimmed.length;
    if (len <= 1) return '*';
    if (len === 2) return `${trimmed[0]}*`;
    if (len === 3) return `${trimmed[0]}*${trimmed[2]}`;
    return `${trimmed[0]}${'*'.repeat(len - 2)}${trimmed.slice(-1)}`;
  }

  function maskValue(val: string, maskType: MaskType): string {
    if (!val) return '—';
    if (maskPattern) return maskPattern(val);

    switch (maskType) {
      case 'phone':
      case 'mobile':
        return val.length >= 7
          ? `${val.slice(0, 3)}****${val.slice(-4)}`
          : '****';
      case 'id-card':
      case 'idCard':
        return val.length >= 10
          ? `${val.slice(0, 6)}********${val.slice(-4)}`
          : '********';
      case 'email': {
        const parts = val.split('@');
        const [namePart, domain] = parts;
        if (parts.length === 2 && namePart && domain) {
          const maskedName = namePart.length > 2 ? `${namePart[0]}***${namePart.slice(-1)}` : `${namePart[0]}***`;
          return `${maskedName}@${domain}`;
        }
        return '***@***.***';
      }
      case 'bank-card':
      case 'bankCard':
        return val.length >= 8
          ? `${val.slice(0, 4)} **** **** ${val.slice(-4)}`
          : '**** ****';
      case 'name':
        return maskName(val);
      case 'secret':
        return val.length >= 8
          ? `${val.slice(0, 3)}••••••••••••${val.slice(-4)}`
          : '••••••••';
      default:
        return '••••••••';
    }
  }

  const displayedText = $derived(isMasked ? maskValue(rawString, type) : rawString);

  async function toggleMask() {
    if (isMasked) {
      if (onReveal) {
        const allowed = await onReveal();
        if (allowed === false) return;
      }
      if (onUnmask) {
        await onUnmask();
      }
      isMasked = false;
    } else {
      isMasked = true;
    }
  }

  async function handleCopy() {
    let textToCopy = rawString;
    if (copyMode === 'masked') {
      textToCopy = maskValue(rawString, type);
    } else if (copyMode === 'auto') {
      textToCopy = isMasked ? maskValue(rawString, type) : rawString;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(textToCopy);
      isCopied = true;
      onCopy?.(textToCopy);
      setTimeout(() => {
        isCopied = false;
      }, 1500);
    }
  }
</script>

<div
  data-svadmin-component="SensitiveDataMask"
  data-masked={isMasked ? 'true' : 'false'}
  class={cn('inline-flex items-center gap-1.5 font-mono text-xs text-foreground', className)}
>
  <span class="truncate select-all">{displayedText}</span>

  {#if allowUnmask && rawString}
    <Button
      variant="ghost"
      size="icon"
      class="h-5 w-5 text-muted-foreground hover:text-foreground"
      onclick={toggleMask}
      aria-label={isMasked ? 'Reveal sensitive data' : 'Mask sensitive data'}
    >
      {#if isMasked}
        <Eye class="h-3 w-3" />
      {:else}
        <EyeOff class="h-3 w-3" />
      {/if}
    </Button>
  {/if}

  {#if allowCopy && rawString}
    <Button
      variant="ghost"
      size="icon"
      class="h-5 w-5 text-muted-foreground hover:text-foreground"
      onclick={handleCopy}
      aria-label="Copy to clipboard"
    >
      {#if isCopied}
        <Check class="h-3 w-3 text-success" />
      {:else}
        <Copy class="h-3 w-3" />
      {/if}
    </Button>
  {/if}
</div>
