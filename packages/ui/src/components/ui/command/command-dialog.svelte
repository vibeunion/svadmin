<script lang="ts">
  import { Command as CommandPrimitive, Dialog as DialogPrimitive } from 'bits-ui';
  import Root from './command.svelte';
  import * as Dialog from '../dialog/index.js';
  import { cn } from '../../../utils.js';
  import type { Snippet } from 'svelte';

  type Props = Omit<CommandPrimitive.RootProps, 'children' | 'value'> &
    Omit<DialogPrimitive.RootProps, 'children' | 'open'> & {
      open?: boolean;
      value?: string;
      class?: string;
      children?: Snippet;
    };

  let {
    open = $bindable(false),
    value = $bindable(''),
    onOpenChange,
    onOpenChangeComplete,
    class: className,
    children,
    ...commandProps
  }: Props = $props();
</script>

<Dialog.Dialog bind:open {onOpenChange} {onOpenChangeComplete}>
  <Dialog.DialogContent
    data-cmdk-dialog=""
    class="svadmin-command-dialog-content"
  >
    <Dialog.DialogHeader class="svadmin-sr-only">
      <Dialog.DialogTitle>{commandProps.label || 'Command menu'}</Dialog.DialogTitle>
      <Dialog.DialogDescription>Search for a command to run.</Dialog.DialogDescription>
    </Dialog.DialogHeader>
    <Root
      bind:value
      {...commandProps}
      class={cn(
        "svadmin-command-dialog-root",
        className
      )}
    >
      {@render children?.()}
    </Root>
  </Dialog.DialogContent>
</Dialog.Dialog>
