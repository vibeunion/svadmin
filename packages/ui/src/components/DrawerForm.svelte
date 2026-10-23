<script lang="ts">
  import { onDestroy, type Snippet } from 'svelte';
  import * as Sheet from './ui/sheet/index.js';
  import { Button } from './ui/button/index.js';
  import { Loader2 } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core/i18n';
  import FeedbackNotice from './content/FeedbackNotice.svelte';

  interface Props {
    open?: boolean;
    title: string;
    description?: string;
    triggerText?: string;
    triggerVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
    triggerSize?: 'default' | 'sm' | 'lg' | 'icon';
    submitText?: string;
    cancelText?: string;
    side?: 'left' | 'right';
    widthClass?: string;
    isSubmitting?: boolean;
    disabled?: boolean;
    onsubmit?: (() => void | Promise<void>) | undefined;
    oncancel?: (() => void) | undefined;
    class?: string;
    triggerSnippet?: Snippet;
    children?: Snippet;
  }

  let {
    open = $bindable(false),
    title,
    description,
    triggerText = 'Open Drawer',
    triggerVariant = 'default',
    triggerSize = 'sm',
    submitText = 'Save',
    cancelText = 'Cancel',
    side = 'right',
    widthClass = 'svadmin-u-c0bedbbc0c34 svadmin-u-6da6a3c3f741',
    isSubmitting = false,
    disabled = false,
    onsubmit,
    oncancel,
    class: className = '',
    triggerSnippet,
    children,
  }: Props = $props();

  const i18n = useTranslation();
  let loading = $state(false);
  let submitError = $state('');
  let round = 0;
  let nextRequestId = 0;
  let activeRequest: { id: number; round: number; onsubmit?: Props['onsubmit'] } | undefined;
  let formElement: HTMLFormElement | undefined;
  let destroyed = false;
  const busy = $derived(loading || isSubmitting);

  let lastOpen = open;
  let lastOnsubmit: Props['onsubmit'];
  let hasLastOnsubmit = false;
  function resetRequestState() {
    round += 1;
    activeRequest = undefined;
    loading = false;
    submitError = '';
  }

  $effect(() => {
    if (open === lastOpen) return;
    lastOpen = open;
    resetRequestState();
  });

  $effect(() => {
    const handler = onsubmit;
    if (!hasLastOnsubmit) {
      hasLastOnsubmit = true;
      lastOnsubmit = handler;
      return;
    }
    if (handler === lastOnsubmit) return;
    lastOnsubmit = handler;
    resetRequestState();
  });

  onDestroy(() => {
    destroyed = true;
    formElement = undefined;
    resetRequestState();
  });

  function isCurrentRequest(token: { id: number; round: number; onsubmit?: Props['onsubmit'] }) {
    return !destroyed && activeRequest === token && token.round === round && token.onsubmit === onsubmit;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!open || destroyed || e.currentTarget !== formElement || disabled || busy) return;
    const token = { id: ++nextRequestId, round, onsubmit };
    activeRequest = token;
    loading = true;
    submitError = '';
    try {
      await onsubmit?.();
      if (!isCurrentRequest(token)) return;
      open = false;
    } catch {
      if (!isCurrentRequest(token)) return;
      submitError = i18n.t('common.operationFailed');
    } finally {
      if (activeRequest === token) {
        activeRequest = undefined;
        loading = false;
      }
    }
  }

  function handleCancel() {
    if (busy) return;
    oncancel?.();
    open = false;
  }

  function handleCloseRequest(close: () => void) {
    if (busy) return;
    close();
  }
</script>

{#if triggerSnippet}
  <button
    type="button"
    class="svadmin-u-52083e7da442 svadmin-u-34516836730d svadmin-u-7f19cdf4c5bb svadmin-u-119b2aa0b8f6 svadmin-u-8a539c7fe216 svadmin-u-2eba0d65d059"
    onclick={() => { open = true; }}
    {disabled}
  >
    {@render triggerSnippet()}
  </button>
{:else if triggerText}
  <Button variant={triggerVariant} size={triggerSize} {disabled} onclick={() => { open = true; }}>
    {triggerText}
  </Button>
{/if}

<Sheet.Root bind:open {side} onClose={handleCancel} onCloseRequest={handleCloseRequest} class={cn(widthClass, 'svadmin-u-8a539c7fe216 svadmin-u-2cd02d11d1af', className)}>
  <Sheet.Content class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-668b21aa5409 svadmin-u-63a285be6490 svadmin-u-8a539c7fe216">
    <form bind:this={formElement} onsubmit={handleSubmit} aria-busy={busy} class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-668b21aa5409">
      <Sheet.Header class="svadmin-u-f92d02360b8f svadmin-u-cb11fec3bb46 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
        <Sheet.Title>{title}</Sheet.Title>
        {#if description}
          <Sheet.Description>{description}</Sheet.Description>
        {/if}
      </Sheet.Header>

      {#if submitError}
        <FeedbackNotice tone="danger" message={submitError} />
      {/if}

      <div class="svadmin-u-36e579c0b41c svadmin-u-92bf82f493b1 svadmin-u-0478c89a150f svadmin-u-fc7473ca09eb svadmin-u-d4108abe6359 svadmin-u-3e7ce58d64fa">
        {#if children}
          {@render children()}
        {/if}
      </div>

      <Sheet.Footer class="svadmin-u-77a2a20e90d4 svadmin-u-f92d02360b8f svadmin-u-cb11fec3bb46 svadmin-u-b950dda299d3 svadmin-u-05faf5c801ff svadmin-u-9953408a8ef3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onclick={handleCancel}
        >
          {cancelText}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={busy || disabled}
          class="svadmin-u-58284b4ea568 svadmin-u-2e7a6d18a20d"
        >
          {#if busy}
            <Loader2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-afbdd13a380e" />
          {/if}
          {submitText}
        </Button>
      </Sheet.Footer>
    </form>
  </Sheet.Content>
</Sheet.Root>
