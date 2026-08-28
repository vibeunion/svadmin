<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as Sheet from './ui/sheet/index.js';
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
    side?: 'left' | 'right';
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

<Sheet.Root bind:open {side} onClose={handleCancel} class={cn(widthClass, 'p-0 overflow-hidden', className)}>
  <Sheet.Content class="flex flex-col h-full gap-0 p-0">
    <form onsubmit={handleSubmit} class="flex flex-col h-full">
      <Sheet.Header class="px-6 py-4 border-b border-border/60">
        <Sheet.Title>{title}</Sheet.Title>
        {#if description}
          <Sheet.Description>{description}</Sheet.Description>
        {/if}
      </Sheet.Header>

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
      </Sheet.Footer>
    </form>
  </Sheet.Content>
</Sheet.Root>
