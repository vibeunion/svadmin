<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Check, CircleAlert, Copy } from '@lucide/svelte';
  import { cn } from '../utils.js';

  interface Props {
    value?: string | number | null | undefined;
    /** Human-readable name used in the accessible label and feedback. */
    description?: string;
    label?: string | undefined;
    copiedLabel?: string | undefined;
    errorLabel?: string | undefined;
    title?: string | undefined;
    copiedTitle?: string | undefined;
    errorTitle?: string | undefined;
    disabled?: boolean;
    /** How long the copied/error state stays visible. */
    resetDelayMs?: number;
    oncopy?: ((value: string) => void) | undefined;
    class?: string | undefined;
  }

  let {
    value,
    description = '内容',
    label = undefined,
    copiedLabel = undefined,
    errorLabel = '复制失败，请检查剪贴板权限。',
    title = undefined,
    copiedTitle = undefined,
    errorTitle = undefined,
    disabled = false,
    resetDelayMs = 1500,
    oncopy,
    class: className = '',
  }: Props = $props();

  let copied = $state(false);
  let copying = $state(false);
  let error = $state('');
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  const rawValue = $derived(value != null && value !== '' ? String(value) : '');
  const accessibleLabel = $derived(label ?? `复制${description}`);
  const copiedFeedback = $derived(copiedLabel ?? `已复制${description}`);
  const buttonTitle = $derived(error ? (errorTitle ?? error)
    : copied ? (copiedTitle ?? copiedFeedback)
      : rawValue ? (title ?? accessibleLabel) : '没有可复制的内容');
  const isDisabled = $derived(Boolean(disabled || !rawValue || copying));
  const statusText = $derived(error || (copied ? copiedFeedback : ''));

  function clearTimer(): void {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
  }

  function scheduleReset(): void {
    clearTimer();
    timeoutId = setTimeout(() => {
      if (!destroyed) {
        copied = false;
        error = '';
      }
      timeoutId = null;
    }, resetDelayMs);
  }

  async function copyValue(): Promise<void> {
    if (isDisabled || !rawValue) return;
    const target = rawValue;
    copying = true;
    copied = false;
    error = '';
    clearTimer();
    try {
      const writeText = globalThis.navigator?.clipboard?.writeText;
      if (!writeText) throw new Error('Clipboard unavailable');
      await writeText.call(globalThis.navigator.clipboard, target);
      if (destroyed) return;
      copied = true;
      oncopy?.(target);
    } catch {
      if (!destroyed) error = errorLabel;
    } finally {
      if (!destroyed) {
        copying = false;
        scheduleReset();
      }
    }
  }

  onDestroy(() => {
    destroyed = true;
    clearTimer();
  });
</script>

<button
  type="button"
  class={cn('svadmin-copy-button', className)}
  data-svadmin-copy-button
  data-state={error ? 'error' : copied ? 'copied' : 'idle'}
  disabled={isDisabled}
  aria-label={accessibleLabel}
  title={buttonTitle}
  onclick={() => void copyValue()}
>
  {#if error}
    <CircleAlert size={14} aria-hidden="true" />
  {:else if copied}
    <Check size={14} aria-hidden="true" />
  {:else}
    <Copy size={14} aria-hidden="true" />
  {/if}
</button>
<span class="svadmin-sr-only" role="status" aria-live="polite">{statusText}</span>

<style>
  .svadmin-copy-button {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    border: 0;
    border-radius: 0.25rem;
    background: transparent;
    color: var(--muted-foreground);
    cursor: pointer;
  }
  .svadmin-copy-button:hover:not(:disabled),
  .svadmin-copy-button:focus-visible {
    background: var(--muted);
    color: var(--foreground);
  }
  .svadmin-copy-button:disabled { opacity: 0.5; cursor: not-allowed; }
  .svadmin-copy-button[data-state='copied'] { color: var(--primary); }
  .svadmin-copy-button[data-state='error'] { color: var(--destructive, #dc2626); }
</style>
