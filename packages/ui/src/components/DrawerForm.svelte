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
    visible?: boolean;
    defaultOpen?: boolean;
    defaultVisible?: boolean;
    title: string;
    description?: string;
    triggerText?: string;
    triggerVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
    triggerSize?: 'default' | 'sm' | 'lg' | 'icon';
    submitText?: string;
    okText?: string;
    cancelText?: string;
    side?: 'left' | 'right';
    placement?: 'left' | 'right';
    widthClass?: string;
    width?: number | string;
    maskClosable?: boolean;
    isSubmitting?: boolean;
    confirmLoading?: boolean;
    disabled?: boolean;
    destroyOnClose?: boolean;
    footer?: Snippet | false;
    onsubmit?: (() => void | Promise<void>) | undefined;
    onOk?: (() => void | Promise<void>) | undefined;
    oncancel?: (() => void) | undefined;
    onCancel?: (() => void) | undefined;
    onOpenChange?: ((open: boolean) => void) | undefined;
    onVisibleChange?: ((visible: boolean) => void) | undefined;
    class?: string;
    triggerSnippet?: Snippet;
    children?: Snippet;
  }

  let {
    defaultOpen,
    defaultVisible,
    open = $bindable(defaultVisible ?? defaultOpen ?? false),
    visible = $bindable(undefined),
    title,
    description,
    triggerText = 'Open Drawer',
    triggerVariant = 'default',
    triggerSize = 'sm',
    submitText = 'Save',
    okText,
    cancelText = 'Cancel',
    side = 'right',
    placement,
    widthClass = 'sm:max-w-md w-full',
    width,
    maskClosable = true,
    isSubmitting = false,
    confirmLoading = false,
    disabled = false,
    destroyOnClose = false,
    footer,
    onsubmit,
    onOk,
    oncancel,
    onCancel,
    onOpenChange,
    onVisibleChange,
    class: className = '',
    triggerSnippet,
    children,
  }: Props = $props();

  $effect(() => {
    if (visible !== undefined && visible !== open) {
      open = visible;
    }
  });

  let loading = $state(false);
  let submitError = $state('');
  let round = 0;
  let nextRequestId = 0;
  let activeRequest: { id: number; round: number; onsubmit?: Props['onsubmit'] } | undefined;
  let formElement: HTMLFormElement | undefined;
  let destroyed = false;

  const resolvedSide = $derived(placement ?? side);
  const effectiveSubmit = $derived(onOk ?? onsubmit);
  const effectiveCancel = $derived(onCancel ?? oncancel);
  const effectiveSubmitText = $derived(okText ?? submitText);
  const busy = $derived(loading || isSubmitting || confirmLoading);

  const widthStyle = $derived(
    typeof width === 'number'
      ? `width: ${width}px; max-width: 100vw;`
      : typeof width === 'string' && (width.includes('px') || width.includes('%') || width.includes('rem'))
        ? `width: ${width}; max-width: 100vw;`
        : undefined
  );
  const i18n = useTranslation();

  let lastOpen: boolean | undefined = undefined;
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
    const handler = effectiveSubmit;
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
    return !destroyed && activeRequest === token && token.round === round && token.onsubmit === effectiveSubmit;
  }

  function closeForm() {
    loading = false;
    if (visible !== undefined) {
      visible = false;
    }
    open = false;
    onOpenChange?.(false);
    onVisibleChange?.(false);
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      if (visible !== undefined) visible = true;
      open = true;
      onOpenChange?.(true);
      onVisibleChange?.(true);
      return;
    }
    if (busy) {
      if (visible !== undefined) visible = true;
      open = true;
      return;
    }
    if (visible !== undefined) visible = false;
    open = false;
    onOpenChange?.(false);
    onVisibleChange?.(false);
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!open || destroyed || e.currentTarget !== formElement || disabled || busy) return;
    const handler = effectiveSubmit;
    const token = { id: ++nextRequestId, round, onsubmit: handler };
    activeRequest = token;
    loading = true;
    submitError = '';
    try {
      await handler?.();
      if (!isCurrentRequest(token)) return;
      closeForm();
    } catch {
      if (!isCurrentRequest(token)) return;
      submitError = i18n.t('common.submitRejected');
    } finally {
      if (activeRequest === token) {
        activeRequest = undefined;
        loading = false;
      }
    }
  }

  function handleCancel() {
    if (busy) return;
    effectiveCancel?.();
    closeForm();
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
    onclick={() => { handleOpenChange(true); }}
    {disabled}
  >
    {@render triggerSnippet()}
  </button>
{:else if triggerText}
  <Button variant={triggerVariant} size={triggerSize} {disabled} onclick={() => { handleOpenChange(true); }}>
    {triggerText}
  </Button>
{/if}

<Sheet.Root
  bind:open
  side={resolvedSide}
  closeOnOverlayClick={maskClosable}
  onClose={handleCancel}
  onCloseRequest={handleCloseRequest}
  class={cn(widthClass, 'p-0 overflow-hidden', className)}
  style={widthStyle}
>
  <Sheet.Content class="flex flex-col h-full gap-0 p-0">
    <form bind:this={formElement} onsubmit={handleSubmit} aria-busy={busy} class="flex flex-col h-full">
      <Sheet.Header class="px-6 py-4 border-b border-border/60">
        <Sheet.Title>{title}</Sheet.Title>
        {#if description}
          <Sheet.Description>{description}</Sheet.Description>
        {/if}
      </Sheet.Header>

      <div class="flex-1 px-6 py-4 overflow-y-auto space-y-4">
        {#if submitError}
          <FeedbackNotice tone="danger" message={submitError} />
        {/if}
        {#if !destroyOnClose || open}
          {#if children}
            {@render children()}
          {/if}
        {/if}
      </div>

      {#if footer !== false}
        <Sheet.Footer class="px-6 py-3 border-t border-border/60 flex flex-row items-center justify-end gap-2 bg-muted/20">
          {#if footer}
            {@render footer()}
          {:else}
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
              {effectiveSubmitText}
            </Button>
          {/if}
        </Sheet.Footer>
      {/if}
    </form>
  </Sheet.Content>
</Sheet.Root>
