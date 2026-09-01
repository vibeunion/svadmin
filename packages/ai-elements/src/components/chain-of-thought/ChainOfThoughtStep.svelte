<script module lang="ts">
  export type ChainOfThoughtStepStatus = 'complete' | 'active' | 'pending';
</script>
<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  import { Dot } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  let { icon = Dot, label, description, status = 'complete', class: className = '', children, ...rest }: { icon?: Component<Record<string, unknown>>; label: string; description?: string; status?: ChainOfThoughtStepStatus; class?: string; children?: Snippet; [key: string]: unknown } = $props();
  const Icon = $derived(icon);
</script>
<div class={cn('flex gap-2 text-sm', status === 'active' && 'text-foreground', status === 'complete' && 'text-muted-foreground', status === 'pending' && 'text-muted-foreground opacity-60', className)} data-status={status} {...rest}>
  <div class="relative mt-0.5 shrink-0">
    <Icon size={16} aria-hidden="true" />
    <div class="absolute bottom-0 left-1/2 top-7 w-px bg-border" aria-hidden="true"></div>
  </div>
  <div class="min-w-0 flex-1 space-y-2 overflow-hidden">
    <div>{label}</div>
    {#if description}<div class="text-xs text-muted-foreground">{description}</div>{/if}
    {@render children?.()}
  </div>
</div>
