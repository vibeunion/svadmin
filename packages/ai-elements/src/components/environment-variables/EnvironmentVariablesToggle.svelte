<script lang="ts">
  import type { Snippet } from 'svelte'; import { Eye, EyeOff } from '@lucide/svelte'; import { cn } from '../../utils.js'; import { useEnvironmentVariablesContext } from './context.svelte.js';
  let { class: className = '', children, disabled = false, ...rest }: { class?: string; children?: Snippet<[boolean]>; disabled?: boolean; [key: string]: unknown } = $props(); const context = useEnvironmentVariablesContext();
</script>
<div class={cn('flex items-center gap-2', className)}>
  <span class="text-xs text-muted-foreground" aria-hidden="true">{#if context.showValues}<Eye size={14} />{:else}<EyeOff size={14} />{/if}</span>
  <button type="button" role="switch" aria-label="Toggle value visibility" aria-checked={context.showValues} class="relative inline-flex h-5 w-9 items-center rounded-full border border-border bg-muted p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50" {disabled} onclick={() => context.setShowValues(!context.showValues)} {...rest}>
    <span class={cn('size-3.5 rounded-full bg-foreground transition-transform', context.showValues && 'translate-x-4')} aria-hidden="true"></span>
    {#if children}<span class="svadmin-ai__sr-only">{@render children(context.showValues)}</span>{/if}
  </button>
</div>
