<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { ChatMessagePart } from '../contracts.js';
  import { cn } from '../utils.js';
  import { provideToolContext } from './tool/context.svelte.js';
  import type { ToolDisplayState } from './tool/status.js';
  import ToolHeader from './tool/ToolHeader.svelte';
  import ToolContent from './tool/ToolContent.svelte';
  import ToolInput from './tool/ToolInput.svelte';
  import ToolOutput from './tool/ToolOutput.svelte';
  type ToolPart = Extract<ChatMessagePart, { type: 'tool-call' }>;
  type Props = Omit<HTMLAttributes<HTMLDetailsElement>, 'children' | 'class' | 'open' | 'ontoggle' | 'part'> & { part?: ToolPart; name?: string; input?: unknown; output?: unknown; errorText?: string; state?: ToolDisplayState; open?: boolean; onapprove?: () => void; onreject?: () => void; class?: string; children?: Snippet; onOpenChange?: (open: boolean) => void };
  let { part, name, input, output, errorText, state: stateProp, open = $bindable(false), onapprove, onreject, class: className = '', children, onOpenChange, ...rest }: Props = $props();
  const toolName = $derived(part?.tool ?? name ?? 'Tool');
  const toolInput = $derived(part?.input ?? input);
  const toolState = $derived<ToolDisplayState>(part?.state ?? stateProp ?? 'input-available');
  const needsApproval = $derived(toolState === 'approval-requested');

  function setOpen(nextOpen: boolean): void {
    if (open === nextOpen) return;
    open = nextOpen;
    onOpenChange?.(nextOpen);
  }

  provideToolContext({
    get name() { return toolName; },
    get input() { return toolInput; },
    get output() { return output; },
    get errorText() { return errorText; },
    get state() { return toolState; },
    get open() { return open; },
    setOpen,
  });
</script>

<details {...rest} class={cn('svadmin-ai__surface my-2 min-w-0 max-w-full text-sm', className)} {open} data-slot="tool" data-state={toolState} ontoggle={(event) => setOpen(event.currentTarget.open)}>
  {#if children}
    {@render children()}
  {:else}
    <ToolHeader />
    <ToolContent>
      <ToolInput />
      {#if needsApproval}<div role="alert" class="flex flex-wrap items-center gap-2 rounded border border-warning/40 bg-warning/10 p-2"><span>Approval required</span><button type="button" class="svadmin-ai__button min-h-8 px-2" disabled={!onapprove} onclick={() => onapprove?.()}>Approve</button><button type="button" class="svadmin-ai__button svadmin-ai__button--ghost min-h-8 px-2" disabled={!onreject} onclick={() => onreject?.()}>Reject</button></div>{/if}
      <ToolOutput />
    </ToolContent>
  {/if}
</details>
