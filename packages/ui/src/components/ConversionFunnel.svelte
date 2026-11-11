<script lang="ts">
  import { Filter, ArrowDown } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';

  export interface FunnelStageItem {
    id: string;
    label: string;
    value: number;
    description?: string | undefined;
    color?: string | undefined;
  }

  export interface ConversionFunnelProps {
    stages: FunnelStageItem[];
    title?: string | undefined;
    description?: string | undefined;
    showPercentages?: boolean | undefined;
    showDropoff?: boolean | undefined;
    valuePrefix?: string | undefined;
    valueSuffix?: string | undefined;
    height?: number | undefined;
    class?: string | undefined;
    onSelectStage?: ((stage: FunnelStageItem) => void) | undefined;
  }

  let {
    stages = [],
    title,
    description,
    showPercentages = true,
    showDropoff = true,
    valuePrefix = '',
    valueSuffix = '',
    height = 360,
    class: className = '',
    onSelectStage,
  }: ConversionFunnelProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let hoveredStageId = $state<string | null>(null);

  const maxValue = $derived(
    stages.length > 0 ? Math.max(...stages.map((s) => s.value), 1) : 1,
  );

  const computedStages = $derived.by(() => {
    return stages.map((stage, idx) => {
      const prev = stages[idx - 1];
      const rateFromTop = Math.round((stage.value / maxValue) * 100);
      const dropoff = prev && prev.value > 0 ? Math.round(((prev.value - stage.value) / prev.value) * 100) : 0;
      return {
        ...stage,
        rateFromTop,
        dropoff: Math.max(0, dropoff),
      };
    });
  });

  const resolvedTitle = $derived(title ?? (chinese ? '业务链路转化漏斗' : 'Conversion Funnel'));
  const resolvedDesc = $derived(
    description ?? (chinese ? '各阶段用户留存、流失率与端到端绝对转化分析' : 'Stage-by-stage retention and drop-off rate metrics'),
  );
</script>

<div
  data-svadmin-component="ConversionFunnel"
  style="min-height: {height}px;"
  class={cn(
    'w-full rounded-2xl border border-border bg-card text-card-foreground shadow-xs p-6 space-y-4',
    className,
  )}
>
  <div class="flex items-center justify-between border-b border-border/60 pb-3">
    <div class="flex items-center gap-2.5">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
        <Filter class="h-4 w-4" />
      </div>
      <div>
        <h3 class="text-sm font-semibold text-foreground">{resolvedTitle}</h3>
        <p class="text-xs text-muted-foreground">{resolvedDesc}</p>
      </div>
    </div>
  </div>

  <!-- Funnel Visual Stack -->
  <div class="space-y-2 py-2">
    {#each computedStages as stage, idx (stage.id)}
      {@const isHovered = hoveredStageId === stage.id}
      {@const widthPct = Math.max(15, Math.min(100, (stage.value / maxValue) * 100))}
      <div
        class="group relative flex flex-col items-center"
        onmouseenter={() => (hoveredStageId = stage.id)}
        onmouseleave={() => (hoveredStageId = null)}
        role="button"
        tabindex="0"
        onclick={() => onSelectStage?.(stage)}
        onkeydown={(e) => e.key === 'Enter' && onSelectStage?.(stage)}
      >
        <!-- Funnel Bar Segment -->
        <div
          class={cn(
            'relative flex h-14 items-center justify-between px-4 rounded-xl transition-all duration-200 cursor-pointer shadow-xs border',
            isHovered ? 'ring-2 ring-primary border-primary scale-[1.01]' : 'border-border/80 hover:border-primary/50',
          )}
          style="width: {widthPct}%; background: {stage.color ?? 'var(--card)'};"
        >
          <div class="flex items-center gap-2 truncate">
            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold">
              {idx + 1}
            </span>
            <span class="text-xs font-semibold text-foreground truncate">{stage.label}</span>
          </div>

          <div class="flex items-center gap-3 shrink-0 font-mono text-xs">
            <span class="font-bold text-foreground">
              {valuePrefix}{stage.value.toLocaleString()}{valueSuffix}
            </span>
            {#if showPercentages}
              <span class="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                {stage.rateFromTop}%
              </span>
            {/if}
          </div>
        </div>

        <!-- Drop-off Transition Pill between stages -->
        {#if idx < computedStages.length - 1 && showDropoff}
          {@const nextStage = computedStages[idx + 1]}
          {#if nextStage}
            <div class="my-1 flex items-center gap-1.5 text-[10px] text-muted-foreground/80 font-mono">
              <ArrowDown class="h-3 w-3 text-muted-foreground/60" />
              <span class="text-destructive font-medium">-{nextStage.dropoff}% 流失</span>
              <span>({valuePrefix}{(stage.value - nextStage.value).toLocaleString()})</span>
            </div>
          {/if}
        {/if}
      </div>
    {/each}
  </div>

  <!-- Overall Summary Metrics Footer -->
  {#if computedStages.length >= 2}
    {@const firstVal = computedStages[0]?.value ?? 1}
    {@const lastVal = computedStages[computedStages.length - 1]?.value ?? 0}
    {@const endToEndRate = Math.round((lastVal / firstVal) * 100)}
    <div class="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground bg-muted/20 px-3 py-2 rounded-lg">
      <span>{chinese ? '端到端综合留存转化率:' : 'End-to-End Overall Conversion:'}</span>
      <span class="font-bold font-mono text-foreground">{endToEndRate}%</span>
    </div>
  {/if}
</div>
