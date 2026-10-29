<script lang="ts">
  import { Progress } from './ui/progress/index.js';

  let {
    value = 0,
    label = 'Progress',
    showLabel = true,
  } = $props<{
    value?: number;
    label?: string;
    showLabel?: boolean;
  }>();

  const safeValue = $derived(Math.max(0, Math.min(100, Number(value ?? 0))));
</script>

<div class="space-y-1.5">
  {#if showLabel}
    <div class="flex items-center justify-between text-[11px] text-muted-foreground">
      <span>{label}</span>
      <span class="font-mono">{safeValue}%</span>
    </div>
  {/if}
  <Progress value={safeValue} max={100} class="h-1.5" />
</div>
