<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; import { provideEnvironmentVariableContext } from './context.svelte.js'; import EnvironmentVariableName from './EnvironmentVariableName.svelte'; import EnvironmentVariableValue from './EnvironmentVariableValue.svelte';
  let { name, value, class: className = '', children, ...rest }: { name: string; value: string; class?: string; children?: Snippet; [key: string]: unknown } = $props(); provideEnvironmentVariableContext({ get name() { return name; }, get value() { return value; } });
</script>
<div class={cn('flex items-center justify-between gap-4 px-4 py-3', className)} {...rest}>{#if children}{@render children()}{:else}<EnvironmentVariableName /><EnvironmentVariableValue />{/if}</div>
