<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn, type WithElementRef } from '../utils.js';
  import * as Sheet from './ui/sheet/index.js';

  type Props = WithElementRef<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
    open?: boolean;
    title?: string;
    titleId?: string;
    description?: string;
    descriptionId?: string;
    closeLabel?: string;
    side?: 'left' | 'right';
    width?: string;
    onClose?: () => void;
    children?: Snippet;
    footer?: Snippet;
  };

  let {
    open = $bindable(false),
    title = '',
    description = '',
    side = 'right',
    width = 'max-w-md w-full sm:max-w-lg',
    ref = $bindable(null),
    class: className,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    'aria-describedby': ariaDescribedby,
    titleId,
    descriptionId,
    closeLabel = 'Close',
    onClose,
    children,
    footer,
    ...restProps
  }: Props = $props();

  function handleClose() {
    open = false;
    onClose?.();
  }
</script>

<Sheet.Root
  bind:ref
  bind:open
  {side}
  onClose={handleClose}
  {closeLabel}
  class={cn('overflow-y-auto', width, className)}
  role="dialog"
  aria-modal="true"
  aria-label={(ariaLabelledby || titleId) ? ariaLabel : (ariaLabel || title || 'Details')}
  aria-labelledby={ariaLabelledby || (titleId ? titleId : undefined)}
  aria-describedby={ariaDescribedby || (descriptionId ? descriptionId : undefined)}
  {...restProps}
>
  <Sheet.Content class="flex h-full flex-col">
    {#if title || description}
      <Sheet.Header>
        {#if title}
          <Sheet.Title id={titleId}>{title}</Sheet.Title>
        {/if}
        {#if description}
          <Sheet.Description id={descriptionId}>{description}</Sheet.Description>
        {/if}
      </Sheet.Header>
    {/if}

    <div class="flex-1 overflow-y-auto py-2">
      {#if children}
        {@render children()}
      {/if}
    </div>

    {#if footer}
      <Sheet.Footer>
        {@render footer()}
      </Sheet.Footer>
    {/if}
  </Sheet.Content>
</Sheet.Root>
