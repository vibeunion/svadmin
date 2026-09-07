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
    widthClass = 'svadmin-u-c0bedbbc0c34 svadmin-u-6da6a3c3f741',
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

<Sheet.Root bind:open {side} onClose={handleCancel} class={cn(widthClass, 'svadmin-u-8a539c7fe216 svadmin-u-2cd02d11d1af', className)}>
  <Sheet.Content class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-668b21aa5409 svadmin-u-63a285be6490 svadmin-u-8a539c7fe216">
    <form onsubmit={handleSubmit} class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-668b21aa5409">
      <Sheet.Header class="svadmin-u-f92d02360b8f svadmin-u-cb11fec3bb46 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
        <Sheet.Title>{title}</Sheet.Title>
        {#if description}
          <Sheet.Description>{description}</Sheet.Description>
        {/if}
      </Sheet.Header>

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
          disabled={loading || isSubmitting}
          onclick={handleCancel}
        >
          {cancelText}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={loading || isSubmitting || disabled}
          class="svadmin-u-58284b4ea568 svadmin-u-2e7a6d18a20d"
        >
          {#if loading || isSubmitting}
            <Loader2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-afbdd13a380e" />
          {/if}
          {submitText}
        </Button>
      </Sheet.Footer>
    </form>
  </Sheet.Content>
</Sheet.Root>
