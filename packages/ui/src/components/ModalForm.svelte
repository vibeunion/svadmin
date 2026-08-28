<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as Dialog from './ui/dialog/index.js';
  import { Button } from './ui/button/index.js';
  import { Loader2 } from '@lucide/svelte';
  import { cn } from '../utils.js';

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
    widthClass = 'sm:max-w-lg',
    isSubmitting = false,
    disabled = false,
    onsubmit,
    oncancel,
    class: className = '',
    triggerSnippet,
    children,
  }: Props = $props();

  let loading = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    loading = true;
    try {
      await onsubmit?.();
      open = false;
    } finally {
      loading = false;
    }
  }

  function handleCancel() {
    oncancel?.();
    open = false;
  }
</script>

<Dialog.Root bind:open>
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

  <Dialog.Content class={cn(widthClass, 'max-h-[90vh] overflow-y-auto', className)}>
    <form onsubmit={handleSubmit} class="space-y-4">
      <Dialog.Header>
        <Dialog.Title>{title}</Dialog.Title>
        {#if description}
          <Dialog.Description>{description}</Dialog.Description>
        {/if}
      </Dialog.Header>

      <div class="py-2 text-sm text-foreground">
        {#if children}
          {@render children()}
        {/if}
      </div>

      <Dialog.Footer class="gap-2 pt-2 border-t border-border/50">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || isSubmitting}
          onclick={handleCancel}
        >
          {cancelText}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={loading || isSubmitting || disabled}
          class="gap-1.5 min-w-20"
        >
          {#if loading || isSubmitting}
            <Loader2 class="h-4 w-4 animate-spin" />
          {/if}
          {submitText}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
