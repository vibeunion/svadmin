<script module lang="ts">
  export interface AgentToolDefinition {
    description?: string;
    inputSchema?: unknown;
    jsonSchema?: unknown;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronDown } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  let {
    tool,
    value,
    open = $bindable(false),
    class: className = '',
    children,
    onopenchange,
    ...rest
  }: {
    tool: AgentToolDefinition;
    value: string;
    open?: boolean;
    class?: string;
    children?: Snippet;
    onopenchange?: (open: boolean) => void;
    [key: string]: unknown;
  } = $props();

  const schema = $derived(tool.jsonSchema ?? tool.inputSchema);
  const schemaText = $derived(JSON.stringify(schema ?? {}, null, 2));
</script>

<details
  class={cn('group border-b border-border last:border-b-0', className)}
  data-value={value}
  {open}
  ontoggle={(event) => {
    const next = (event.currentTarget as HTMLDetailsElement).open;
    open = next;
    onopenchange?.(next);
  }}
  {...rest}
>
  <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring">
    <span>{tool.description ?? 'No description'}</span>
    <ChevronDown class="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
  </summary>
  <div class="px-3 pb-3">
    {#if children}{@render children()}{:else}<pre class="m-0 overflow-auto rounded-md bg-muted/50 p-3 text-xs"><code>{schemaText}</code></pre>{/if}
  </div>
</details>
