<script lang="ts">
  import { onDestroy, type Snippet } from 'svelte';
  import * as Dialog from './ui/dialog/index.js';
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
    widthClass?: string;
    width?: number | string;
    size?: 'sm' | 'md' | 'lg';
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
    triggerText = 'Open Form',
    triggerVariant = 'default',
    triggerSize = 'sm',
    submitText = 'Confirm',
    okText,
    cancelText = 'Cancel',
    widthClass = '',
    width,
    size = 'md',
    maskClosable = false,
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

  const effectiveSubmit = $derived(onOk ?? onsubmit);
  const effectiveCancel = $derived(onCancel ?? oncancel);
  const effectiveSubmitText = $derived(okText ?? submitText);
  let loading = $state(false);
  const busy = $derived(loading || isSubmitting || confirmLoading);

  const widthStyle = $derived(
    typeof width === 'number'
      ? `width: ${width}px; max-width: calc(100vw - 2rem);`
      : typeof width === 'string' && (width.includes('px') || width.includes('%') || width.includes('rem'))
        ? `width: ${width}; max-width: calc(100vw - 2rem);`
        : undefined
  );
  const i18n = useTranslation();
  let submitError = $state('');
  let round = 0;
  let nextRequestId = 0;
  let activeRequest: { id: number; round: number; onsubmit?: Props['onsubmit'] } | undefined;
  let formElement: HTMLFormElement | undefined;
  let destroyed = false;

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
      // 失败原因用固定文案，不把异常原文写进界面。
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
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  {#if triggerSnippet}
    <Dialog.Trigger>
      {#snippet child({ props })}
        <div {...props} class="inline-flex">
          {@render triggerSnippet()}
        </div>
      {/snippet}
    </Dialog.Trigger>
  {:else if triggerText}
    <Dialog.Trigger>
      {#snippet child({ props })}
        <Button {...props} variant={triggerVariant} size={triggerSize} {disabled}>
          {triggerText}
        </Button>
      {/snippet}
    </Dialog.Trigger>
  {/if}

  <Dialog.Content closeOnOverlayClick={maskClosable} {size} loading={busy} class={cn('svadmin-dialog-form', widthClass, className)} style={widthStyle}>
    <form bind:this={formElement} onsubmit={handleSubmit} aria-busy={busy} class="svadmin-dialog-form__body">
      <Dialog.Header>
        <Dialog.Title>{title}</Dialog.Title>
        {#if description}
          <Dialog.Description>{description}</Dialog.Description>
        {/if}
      </Dialog.Header>

      <div class="svadmin-dialog-body">
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
        <Dialog.Footer class="gap-2 pt-2 border-t border-border/50">
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
        </Dialog.Footer>
      {/if}
    </form>
  </Dialog.Content>
</Dialog.Root>
