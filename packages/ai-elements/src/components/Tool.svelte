<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { ChatMessagePart } from '../contracts.js';
  import { cn } from '../utils.js';
  import { provideToolContext } from './tool/context.svelte.js';
  import { formatToolValue, getStatusBadge, type ToolDisplayState } from './tool/status.js';
  type ToolPart = Extract<ChatMessagePart, { type: 'tool-call' }>;
  type Props = Omit<HTMLAttributes<HTMLDetailsElement>, 'children' | 'class' | 'open' | 'ontoggle' | 'part'> & { part?: ToolPart; name?: string; input?: unknown; output?: unknown; errorText?: string; state?: ToolDisplayState; open?: boolean; onapprove?: () => void; onreject?: () => void; class?: string; children?: Snippet; onOpenChange?: (open: boolean) => void };
  let { part, name, input, output, errorText, state: stateProp, open = $bindable(false), onapprove, onreject, class: className = '', children, onOpenChange, ...rest }: Props = $props();
  const toolName = $derived(part?.tool ?? name ?? 'Tool');
  const toolInput = $derived(part?.input ?? input);
  const toolState = $derived<ToolDisplayState>(part?.state ?? stateProp ?? 'input-available');
  const needsApproval = $derived(toolState === 'approval-requested');
  const statusBadge = $derived(getStatusBadge(toolState));

  function setOpen(nextOpen: boolean): void {
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

<details {...rest} class={cn('svadmin-ai__surface my-2 text-sm', className)} {open} data-slot="tool" ontoggle={(event) => setOpen(event.currentTarget.open)}>
  {#if children}
    {@render children()}
  {:else}
    <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2">
      <span>{toolName}</span><span class="svadmin-ai__muted text-xs">{statusBadge.label}</span>
    </summary>
  {#if open}
    <div class="space-y-3 border-t border-border/70 p-3">
      {#if toolInput !== undefined}<pre class="max-h-48 overflow-auto rounded bg-muted p-2 text-xs">{formatToolValue(toolInput)}</pre>{/if}
      {#if needsApproval}<div role="alert" class="flex flex-wrap items-center gap-2 rounded border border-warning/40 bg-warning/10 p-2"><span>Approval required</span><button type="button" class="svadmin-ai__button min-h-8 px-2" onclick={() => onapprove?.()}>Approve</button><button type="button" class="svadmin-ai__button svadmin-ai__button--ghost min-h-8 px-2" onclick={() => onreject?.()}>Reject</button></div>{/if}
      {#if output !== undefined || errorText}<pre class="max-h-48 overflow-auto rounded bg-muted p-2 text-xs">{errorText ?? formatToolValue(output)}</pre>{/if}
    </div>
  {/if}
  {/if}
</details>
