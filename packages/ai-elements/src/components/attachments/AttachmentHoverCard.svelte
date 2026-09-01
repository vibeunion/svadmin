<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  export type AttachmentHoverCardProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & {
    open?: boolean;
    defaultOpen?: boolean;
    openDelay?: number;
    closeDelay?: number;
    class?: string;
    children?: Snippet;
    onopenchange?: (open: boolean) => void;
  };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import { provideAttachmentHoverCardContext } from './context.svelte.js';

  let {
    defaultOpen = false,
    open = $bindable(defaultOpen),
    openDelay = 0,
    closeDelay = 0,
    class: className = '',
    children,
    onopenchange,
    ...rest
  }: AttachmentHoverCardProps = $props();

  const id = $props.id();
  let openTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  const currentOpen = $derived(open);

  function setOpen(next: boolean): void {
    if (next === currentOpen) return;
    open = next;
    onopenchange?.(next);
  }

  function clearTimers(): void {
    if (openTimer !== undefined) clearTimeout(openTimer);
    if (closeTimer !== undefined) clearTimeout(closeTimer);
    openTimer = undefined;
    closeTimer = undefined;
  }

  function scheduleOpen(): void {
    if (closeTimer !== undefined) clearTimeout(closeTimer);
    if (currentOpen) return;
    if (openDelay <= 0) {
      setOpen(true);
      return;
    }
    if (openTimer !== undefined) clearTimeout(openTimer);
    openTimer = setTimeout(() => { openTimer = undefined; setOpen(true); }, openDelay);
  }

  function scheduleClose(): void {
    if (openTimer !== undefined) clearTimeout(openTimer);
    if (closeDelay <= 0) {
      setOpen(false);
      return;
    }
    if (closeTimer !== undefined) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => { closeTimer = undefined; setOpen(false); }, closeDelay);
  }

  function cancelClose(): void {
    if (closeTimer !== undefined) clearTimeout(closeTimer);
    closeTimer = undefined;
  }

  provideAttachmentHoverCardContext({
    get open() { return currentOpen; },
    contentId: `${id}-content`,
    setOpen,
    scheduleOpen,
    scheduleClose,
    cancelClose,
  });

  $effect(() => () => clearTimers());
</script>

<div {...rest} class={cn('svadmin-ai-attachment-hover-card', className)} data-slot="attachment-hover-card" data-state={currentOpen ? 'open' : 'closed'}>
  {@render children?.()}
</div>

<style>
  .svadmin-ai-attachment-hover-card { position: relative; display: inline-flex; }
</style>
