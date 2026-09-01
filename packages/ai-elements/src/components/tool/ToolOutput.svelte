<script module lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  export type ToolOutputProps = Omit<HTMLAttributes<HTMLDivElement>, 'class'> & { output?: unknown; errorText?: string; class?: string };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import { useToolContext } from './context.svelte.js';
  import { formatToolValue } from './status.js';

  let { output, errorText, class: className = '', ...rest }: ToolOutputProps = $props();
  const tool = useToolContext('ToolOutput');
  const resolvedOutput = $derived(output ?? tool.output);
  const resolvedError = $derived(errorText ?? tool.errorText);
</script>

{#if resolvedOutput !== undefined || resolvedError}
  <div {...rest} class={cn('svadmin-ai-tool-output', className)} data-slot="tool-output" data-error={resolvedError ? 'true' : undefined}>
    <h4>{resolvedError ? 'Error' : 'Result'}</h4>
    <pre>{resolvedError ?? formatToolValue(resolvedOutput)}</pre>
  </div>
{/if}

<style>
  .svadmin-ai-tool-output { display: grid; gap: 0.5rem; }
  h4 { margin: 0; color: var(--muted-foreground, currentColor); font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; }
  pre { max-height: 12rem; overflow: auto; margin: 0; border-radius: min(var(--radius, 0.5rem), 0.375rem); padding: 0.625rem; background: var(--muted, transparent); color: var(--foreground, currentColor); font-size: 0.75rem; white-space: pre-wrap; }
  .svadmin-ai-tool-output[data-error='true'] pre { background: color-mix(in oklch, var(--destructive, currentColor) 10%, transparent); color: var(--destructive, currentColor); }
</style>
