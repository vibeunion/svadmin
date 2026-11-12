<script lang="ts">
  import {
    Flag,
    AlertTriangle,
    Rocket,
    CheckCircle2,
    Tag,
    X,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface ChartAnnotationItem {
    id: string;
    label: string;
    type?: 'event' | 'threshold' | 'incident' | 'release' | undefined;
    positionPct: number; // 0..100 horizontal percentage
    valueLabel?: string | undefined;
    timestamp?: string | undefined;
    colorTone?: 'primary' | 'success' | 'warning' | 'destructive' | 'info' | undefined;
    description?: string | undefined;
  }

  export interface ChartAnnotationOverlayProps {
    annotations?: ChartAnnotationItem[] | undefined;
    activeId?: string | null | undefined;
    showLines?: boolean | undefined;
    title?: string | undefined;
    class?: string | undefined;
    onAnnotationClick?: ((item: ChartAnnotationItem) => void) | undefined;
  }

  let {
    annotations = [
      {
        id: 'ann-1',
        label: 'v2.4.0 核心版本全量发布',
        type: 'release',
        positionPct: 20,
        valueLabel: 'QPS +35%',
        timestamp: '2026-11-10 14:00',
        colorTone: 'primary',
        description: '发布全新微前端状态总线与游标分页引擎，集群负载平稳。',
      },
      {
        id: 'ann-2',
        label: '华东大区机房瞬态抖动',
        type: 'incident',
        positionPct: 48,
        valueLabel: '延迟 120ms',
        timestamp: '2026-11-11 03:15',
        colorTone: 'destructive',
        description: '运营商骨干网络切换导致 45 秒少量丢包，已触发自动熔断并恢复。',
      },
      {
        id: 'ann-3',
        label: '双十一运营大促高峰开幕',
        type: 'event',
        positionPct: 75,
        valueLabel: '成交 ¥18M',
        timestamp: '2026-11-11 20:00',
        colorTone: 'warning',
        description: '晚间秒杀流量峰值到达预期最高水位，核心交易链条 100% 畅通。',
      },
      {
        id: 'ann-4',
        label: '季度 GMV 目标达成线',
        type: 'threshold',
        positionPct: 92,
        valueLabel: '达成率 102%',
        timestamp: '2026-11-12 09:00',
        colorTone: 'success',
        description: '提前 18 天突破第四季度经营收入预期目标。',
      },
    ],
    activeId = $bindable<string | null>('ann-3'),
    showLines = true,
    title = '业务大事件与异常指标标记层 (Annotation Overlay)',
    class: className = '',
    onAnnotationClick,
  }: ChartAnnotationOverlayProps = $props();

  let activeItem = $derived(
    annotations.find((a) => a.id === activeId) ?? null
  );

  function handlePinClick(item: ChartAnnotationItem) {
    activeId = activeId === item.id ? null : item.id;
    onAnnotationClick?.(item);
  }

  function getToneClass(tone?: string) {
    switch (tone) {
      case 'destructive':
        return {
          pin: 'border-destructive bg-destructive/10 text-destructive',
          line: 'border-destructive/40 bg-destructive/20',
          badge: 'bg-destructive/10 text-destructive border-destructive/20',
          icon: AlertTriangle,
        };
      case 'warning':
        return {
          pin: 'border-warning bg-warning/10 text-warning',
          line: 'border-warning/40 bg-warning/20',
          badge: 'bg-warning/10 text-warning border-warning/20',
          icon: Flag,
        };
      case 'success':
        return {
          pin: 'border-success bg-success/10 text-success',
          line: 'border-success/40 bg-success/20',
          badge: 'bg-success/10 text-success border-success/20',
          icon: CheckCircle2,
        };
      default:
        return {
          pin: 'border-primary bg-primary/10 text-primary',
          line: 'border-primary/40 bg-primary/20',
          badge: 'bg-primary/10 text-primary border-primary/20',
          icon: Rocket,
        };
    }
  }
</script>

<div
  class={cn('w-full rounded-2xl border border-border bg-card text-foreground shadow-sm flex flex-col p-4 gap-3', className)}
  data-svadmin-component="chart-annotation-overlay"
>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <Tag class="w-4 h-4 text-primary" />
      <span class="text-xs font-semibold text-foreground tracking-tight">{title}</span>
    </div>
    <span class="text-[10px] text-muted-foreground">
      已标记 {annotations.length} 个事件节点
    </span>
  </div>

  <!-- 模拟时序图表与标注定位覆盖层 -->
  <div class="relative w-full h-32 rounded-xl border border-border bg-muted/20 overflow-hidden flex flex-col justify-end p-2">
    <!-- 背景平滑网格参考线 -->
    <div class="absolute inset-0 flex flex-col justify-between p-3 opacity-20 pointer-events-none">
      <div class="border-b border-dashed border-border w-full"></div>
      <div class="border-b border-dashed border-border w-full"></div>
      <div class="border-b border-dashed border-border w-full"></div>
    </div>

    <!-- 垂直标记事件线与图钉 -->
    {#each annotations as ann (ann.id)}
      {@const tone = getToneClass(ann.colorTone)}
      {@const ToneIcon = tone.icon}
      {@const isSelected = ann.id === activeId}

      <!-- 垂直虚线 -->
      {#if showLines}
        <div
          class={cn('absolute top-0 bottom-0 border-l border-dashed transition-opacity duration-150', tone.line)}
          style="left: {ann.positionPct}%;"
        ></div>
      {/if}

      <!-- 浮动定位图钉卡片 -->
      <button
        type="button"
        class={cn(
          'absolute top-3 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-lg border shadow-xs transition-all duration-150 z-10 text-[10px] font-medium',
          tone.pin,
          isSelected ? 'ring-2 ring-primary scale-105 z-20' : 'hover:scale-105'
        )}
        style="left: {ann.positionPct}%;"
        onclick={() => handlePinClick(ann)}
      >
        <ToneIcon class="w-3 h-3" />
        <span class="truncate max-w-[80px]">{ann.label}</span>
      </button>
    {/each}

    <!-- 底部时间轴指示 -->
    <div class="w-full flex justify-between text-[9px] text-muted-foreground font-mono pt-1 border-t border-border/50">
      <span>T-7D</span>
      <span>T-5D</span>
      <span>T-3D</span>
      <span>T-1D</span>
      <span>实时 NOW</span>
    </div>
  </div>

  <!-- 选中事件卡片详情 -->
  {#if activeItem}
    {@const activeTone = getToneClass(activeItem.colorTone)}
    {@const ActiveIcon = activeTone.icon}
    <div class="p-3 rounded-xl border border-border bg-muted/10 flex items-start justify-between gap-3 animate-in fade-in-0 duration-150">
      <div class="flex items-start gap-2.5">
        <div class={cn('flex items-center justify-center w-7 h-7 rounded-lg border shrink-0 mt-0.5', activeTone.pin)}>
          <ActiveIcon class="w-3.5 h-3.5" />
        </div>
        <div class="flex flex-col">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-semibold text-foreground">{activeItem.label}</span>
            {#if activeItem.valueLabel}
              <span class={cn('text-[10px] px-1.5 py-0.2 rounded border font-medium font-mono', activeTone.badge)}>
                {activeItem.valueLabel}
              </span>
            {/if}
            {#if activeItem.timestamp}
              <span class="text-[10px] text-muted-foreground font-mono">
                {activeItem.timestamp}
              </span>
            {/if}
          </div>
          {#if activeItem.description}
            <p class="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              {activeItem.description}
            </p>
          {/if}
        </div>
      </div>

      <button
        type="button"
        class="text-muted-foreground hover:text-foreground p-1 rounded-md"
        onclick={() => (activeId = null)}
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  {/if}
</div>
