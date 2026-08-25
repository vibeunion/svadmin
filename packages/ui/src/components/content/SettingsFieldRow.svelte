<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  interface Props {
    label: string;
    description?: string;
    control: Snippet;
    separated?: boolean;
    class?: string;
  }

  let {
    label,
    description,
    control,
    separated = false,
    class: className = '',
  }: Props = $props();
</script>

<div class={cn('flex min-h-11 items-center justify-between gap-4 py-3', separated && 'border-t border-border', className)} data-svadmin-settings-field-row>
  <div class="min-w-0">
    <p class="text-sm font-medium text-foreground">{label}</p>
    {#if description}<p class="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">{description}</p>{/if}
  </div>
  <div class="shrink-0">{@render control()}</div>
</div>
