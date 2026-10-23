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
    title: string;
    description?: string;
    triggerText?: string;
    triggerVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
    triggerSize?: 'default' | 'sm' | 'lg' | 'icon';
    submitText?: string;
    cancelText?: string;
    widthClass?: string;
    isSubmitting?: boolean;
    disabled?: boolean;
    onsubmit?: () => void | Promise<void>;
    oncancel?: () => void;
    class?: string;
    triggerSnippet?: Snippet;
    children?: Snippet;
  }

  let {
    open = $bindable(false),
    title,
    description,
    triggerText = 'Open Form',
    triggerVariant = 'default',
    triggerSize = 'sm',
    submitText = 'Confirm',
    cancelText = 'Cancel',
    widthClass = 'svadmin-u-a09a722d3ce4',
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

  function handleOpenChange(next: boolean) {
    if (next) {
      open = true;
      return;
    }
    if (busy) {
      open = true;
      return;
    }
    open = false;
  }
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  {#if triggerSnippet}
    <Dialog.Trigger>
      {#snippet child({ props })}
        <div {...props} class="svadmin-u-52083e7da442">
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

  <Dialog.Content class={cn(widthClass, 'svadmin-u-b4168890eac6 svadmin-u-92bf82f493b1', className)}>
    <form bind:this={formElement} onsubmit={handleSubmit} aria-busy={busy} class="svadmin-u-3e7ce58d64fa">
      <Dialog.Header>
        <Dialog.Title>{title}</Dialog.Title>
        {#if description}
          <Dialog.Description>{description}</Dialog.Description>
        {/if}
      </Dialog.Header>

      {#if submitError}
        <FeedbackNotice tone="danger" message={submitError} />
      {/if}

      <div class="svadmin-u-03b4dd7f172b svadmin-u-fc7473ca09eb svadmin-u-d4108abe6359">
        {#if children}
          {@render children()}
        {/if}
      </div>

      <Dialog.Footer class="svadmin-u-77a2a20e90d4 svadmin-u-f46b61a9b310 svadmin-u-b950dda299d3 svadmin-u-591f378e24a1">
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
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
