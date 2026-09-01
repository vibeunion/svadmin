<script module lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  export type ToolInputProps = Omit<HTMLAttributes<HTMLDivElement>, 'class'> & { input?: unknown; class?: string };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import { useToolContext } from './context.svelte.js';
  import { formatToolValue } from './status.js';

  let { input, class: className = '', ...rest }: ToolInputProps = $props();
  const tool = useToolContext('ToolInput');
  const resolvedInput = $derived(input ?? tool.input);
</script>

{#if resolvedInput !== undefined}
  <div {...rest} class={cn('svadmin-ai-tool-input', className)} data-slot="tool-input">
    <h4>Parameters</h4>
    <pre>{formatToolValue(resolvedInput)}</pre>
  </div>
{/if}

<style>
  .svadmin-ai-tool-input { display: grid; gap: 0.5rem; overflow: hidden; }
  h4 { margin: 0; color: var(--muted-foreground, currentColor); font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; }
  pre { max-height: 12rem; overflow: auto; margin: 0; border-radius: min(var(--radius, 0.5rem), 0.375rem); padding: 0.625rem; background: var(--muted, transparent); font-size: 0.75rem; white-space: pre-wrap; }
</style>
