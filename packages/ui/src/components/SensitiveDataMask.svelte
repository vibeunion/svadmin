<script lang="ts">
  import { untrack } from 'svelte';
  import { Eye, EyeOff, Copy, Check } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import { cn } from '../utils.js';

  export type MaskType = 'phone' | 'id-card' | 'email' | 'bank-card' | 'secret' | 'custom';

  interface Props {
    value?: string | number | null;
    type?: MaskType;
    maskPattern?: (val: string) => string;
    allowUnmask?: boolean;
    defaultMasked?: boolean;
    onUnmask?: () => void | Promise<void>;
    class?: string;
  }

  let {
    value = '',
    type = 'phone',
    maskPattern,
    allowUnmask = true,
    defaultMasked = true,
    onUnmask,
    class: className = '',
  }: Props = $props();

  let isMasked = $state(untrack(() => defaultMasked));
  let isCopied = $state(false);

  const rawString = $derived(String(value ?? ''));

  function maskValue(val: string, maskType: MaskType): string {
    if (!val) return '—';
    if (maskPattern) return maskPattern(val);

    switch (maskType) {
      case 'phone':
        // e.g. 13812345678 -> 138****5678
        return val.length >= 7
          ? `${val.slice(0, 3)}****${val.slice(-4)}`
          : '****';
      case 'id-card':
        // e.g. 110101199001011234 -> 110101********1234
        return val.length >= 10
          ? `${val.slice(0, 6)}********${val.slice(-4)}`
          : '********';
      case 'email': {
        const parts = val.split('@');
        if (parts.length === 2) {
          const name = parts[0];
          const maskedName = name.length > 2 ? `${name[0]}***${name.slice(-1)}` : `${name[0]}***`;
          return `${maskedName}@${parts[1]}`;
        }
        return '***@***.***';
      }
      case 'bank-card':
        return val.length >= 8
          ? `${val.slice(0, 4)} **** **** ${val.slice(-4)}`
          : '**** ****';
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
    if (isMasked && onUnmask) {
      await onUnmask();
    }
    isMasked = !isMasked;
  }

  async function handleCopy() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(rawString);
      isCopied = true;
      setTimeout(() => {
        isCopied = false;
      }, 1500);
    }
  }
</script>

<div class={cn('svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568 svadmin-u-0e65706bcccd svadmin-u-359090c2d529 svadmin-u-d4108abe6359', className)}>
  <span class="svadmin-u-f283ea9bea0e svadmin-u-8078c71d23ee">{displayedText}</span>

  {#if allowUnmask && rawString}
    <Button
      variant="ghost"
      size="icon"
      class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e"
      onclick={toggleMask}
      aria-label={isMasked ? 'Reveal sensitive data' : 'Mask sensitive data'}
    >
      {#if isMasked}
        <Eye class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
      {:else}
        <EyeOff class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
      {/if}
    </Button>
  {/if}

  {#if rawString}
    <Button
      variant="ghost"
      size="icon"
      class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e"
      onclick={handleCopy}
      aria-label="Copy to clipboard"
    >
      {#if isCopied}
        <Check class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-76747e5e02ff" />
      {:else}
        <Copy class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
      {/if}
    </Button>
  {/if}
</div>
