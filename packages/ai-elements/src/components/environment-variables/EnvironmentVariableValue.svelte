<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; import { useEnvironmentVariableContext, useEnvironmentVariablesContext } from './context.svelte.js';
  let { class: className = '', children, ...rest }: { class?: string; children?: Snippet<[string, boolean]>; [key: string]: unknown } = $props(); const variable = useEnvironmentVariableContext(); const variables = useEnvironmentVariablesContext(); const displayValue = $derived(variables.showValues ? variable.value : '*'.repeat(Math.min(variable.value.length, 20)));
</script>
<span class={cn('max-w-full truncate font-mono text-sm text-muted-foreground', !variables.showValues && 'select-none', className)} aria-label={variables.showValues ? undefined : 'Hidden value'} {...rest}>{#if children}{@render children(displayValue, variables.showValues)}{:else}{displayValue}{/if}</span>
