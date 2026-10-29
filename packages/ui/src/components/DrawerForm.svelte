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
    widthClass = 'sm:max-w-md w-full',
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
    class="inline-flex cursor-pointer bg-transparent border-0 p-0 text-left"
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

<Sheet.Root bind:open {side} onClose={handleCancel} onCloseRequest={handleCloseRequest} class={cn(widthClass, 'p-0 overflow-hidden', className)}>
  <Sheet.Content class="flex flex-col h-full gap-0 p-0">
    <form bind:this={formElement} onsubmit={handleSubmit} aria-busy={busy} class="flex flex-col h-full">
      <Sheet.Header class="px-6 py-4 border-b border-border/60">
        <Sheet.Title>{title}</Sheet.Title>
        {#if description}
          <Sheet.Description>{description}</Sheet.Description>
        {/if}
      </Sheet.Header>

      {#if submitError}
        <FeedbackNotice tone="danger" message={submitError} />
      {/if}

      <div class="flex-1 overflow-y-auto p-6 text-sm text-foreground space-y-4">
        {#if children}
          {@render children()}
        {/if}
      </div>

      <Sheet.Footer class="gap-2 px-6 py-4 border-t border-border/60 mt-auto">
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
          class="gap-1.5 min-w-20"
        >
          {#if busy}
            <Loader2 class="h-4 w-4 animate-spin" />
          {/if}
          {submitText}
        </Button>
      </Sheet.Footer>
    </form>
  </Sheet.Content>
</Sheet.Root>
