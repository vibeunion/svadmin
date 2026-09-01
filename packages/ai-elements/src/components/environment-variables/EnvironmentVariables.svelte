<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; import { provideEnvironmentVariablesContext } from './context.svelte.js';
  let { defaultShowValues = false, showValues = $bindable(defaultShowValues), class: className = '', children, onshowvalueschange, ...rest }: { showValues?: boolean; defaultShowValues?: boolean; class?: string; children?: Snippet; onshowvalueschange?: (show: boolean) => void; [key: string]: unknown } = $props();
  function setShowValues(show: boolean): void { showValues = show; onshowvalueschange?.(show); }
  provideEnvironmentVariablesContext({ get showValues() { return showValues; }, setShowValues });
</script>
<div class={cn('svadmin-ai rounded-lg border border-border bg-background text-foreground', className)} {...rest}>{@render children?.()}</div>
