<script lang="ts">
  import { untrack } from 'svelte';
  import {
    LayoutDashboard,
    GripVertical,
    Plus,
    RotateCcw,
    Edit3,
    Check,
    Trash2,
    Lock,
    Unlock,
    Maximize2,
    Minimize2,
    BarChart3,
    Activity,
    Layers,
    Table as TableIcon,
    Settings2,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export interface DashboardGridItem {
    id: string;
    title: string;
    x?: number | undefined;
    y?: number | undefined;
    w: number; // 1..12
    h: number; // rows
    minW?: number | undefined;
    minH?: number | undefined;
    static?: boolean | undefined;
    category?: string | undefined;
    widgetType?: 'kpi' | 'chart' | 'table' | 'log' | 'custom' | undefined;
    description?: string | undefined;
    metricValue?: string | number | undefined;
    metricTrend?: string | undefined;
  }

  export interface DashboardGridLayoutProps {
    items?: DashboardGridItem[] | undefined;
    isEditable?: boolean | undefined;
    title?: string | undefined;
    description?: string | undefined;
    class?: string | undefined;
    onLayoutChange?: ((items: DashboardGridItem[]) => void) | undefined;
    onAddWidget?: ((type: DashboardGridItem['widgetType']) => void) | undefined;
    onRemoveWidget?: ((id: string) => void) | undefined;
    onResetLayout?: (() => void) | undefined;
  }

  let {
    items = $bindable([
      { id: 'wgt-kpi-rev', title: '本季度核心营收 (GMV)', w: 4, h: 2, widgetType: 'kpi', category: '财务', metricValue: '¥48,290,000', metricTrend: '+18.4% 同比' },
      { id: 'wgt-kpi-users', title: '全局活跃企业租户数', w: 4, h: 2, widgetType: 'kpi', category: 'SaaS', metricValue: '1,420 家', metricTrend: '+12.1% 环比' },
      { id: 'wgt-kpi-sla', title: '核心网关可用率 (SLA)', w: 4, h: 2, widgetType: 'kpi', category: 'SRE', metricValue: '99.985%', metricTrend: '稳定运行 42天' },
      { id: 'wgt-chart-trend', title: '双大区实时业务吞吐量趋势', w: 8, h: 4, widgetType: 'chart', category: '监控', description: '华东大区与华北多活集群实时 QPS 波动曲线' },
      { id: 'wgt-table-orders', title: '最新待审批大额采购单', w: 4, h: 4, widgetType: 'table', category: '审批', description: '超 10 万元资金划转与双人复核队列' },
    ]),
    isEditable = $bindable(false),
    title = '智能动态业务大屏 (Dashboard Grid)',
    description = '12 栅格自适应流式排版，支持小部件拖拽、尺寸自由伸缩与布局方案持久化',
    class: className = '',
    onLayoutChange,
    onAddWidget,
    onRemoveWidget,
    onResetLayout,
  }: DashboardGridLayoutProps = $props();

  function toggleEditable() {
    isEditable = !isEditable;
    if (!isEditable) {
      onLayoutChange?.(items);
    }
  }

  function resizeItem(id: string, deltaW: number, deltaH: number) {
    items = items.map((it) => {
      if (it.id !== id || it.static) return it;
      const newW = Math.max(1, Math.min(12, it.w + deltaW));
      const newH = Math.max(1, Math.min(8, it.h + deltaH));
      return { ...it, w: newW, h: newH };
    });
    onLayoutChange?.(items);
  }

  function toggleLock(id: string) {
    items = items.map((it) => {
      if (it.id !== id) return it;
      return { ...it, static: !it.static };
    });
    onLayoutChange?.(items);
  }

  function removeItem(id: string) {
    items = items.filter((it) => it.id !== id);
    onRemoveWidget?.(id);
    onLayoutChange?.(items);
  }

  function addSampleWidget(type: DashboardGridItem['widgetType'] = 'kpi') {
    const id = `wgt-${Date.now()}`;
    const newWidget: DashboardGridItem = {
      id,
      title: type === 'kpi' ? '新指标计分卡' : type === 'chart' ? '新业务统计图表' : '新待办数据表',
      w: type === 'chart' ? 6 : 4,
      h: type === 'chart' ? 3 : 2,
      widgetType: type,
      category: '自定义',
      metricValue: type === 'kpi' ? '98.5%' : undefined,
    };
    items = [...items, newWidget];
    onAddWidget?.(type);
    onLayoutChange?.(items);
  }

  function resetToDefault() {
    onResetLayout?.();
  }
</script>

<div
  class={cn('w-full rounded-2xl border border-border bg-card text-foreground shadow-sm flex flex-col overflow-hidden', className)}
  data-svadmin-component="dashboard-grid-layout"
>
  <!-- 头部控制栏 -->
  <div class="p-4 border-b border-border bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div class="flex items-center gap-2.5">
      <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
        <LayoutDashboard class="w-4 h-4" />
      </div>
      <div>
        <h3 class="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
        <p class="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>

    <!-- 顶部操作按钮 -->
    <div class="flex items-center gap-2">
      {#if isEditable}
        <Button
          variant="outline"
          size="sm"
          class="h-8 gap-1 text-xs"
          onclick={() => addSampleWidget('kpi')}
        >
          <Plus class="w-3.5 h-3.5 text-primary" />
          <span>添加卡片</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          class="h-8 gap-1 text-xs"
          onclick={() => addSampleWidget('chart')}
        >
          <BarChart3 class="w-3.5 h-3.5 text-primary" />
          <span>添加图表</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          class="h-8 gap-1 text-xs text-muted-foreground"
          onclick={resetToDefault}
        >
          <RotateCcw class="w-3.5 h-3.5" />
          <span>重置默认</span>
        </Button>
      {/if}

      <Button
        variant={isEditable ? 'default' : 'outline'}
        size="sm"
        class={cn('h-8 gap-1.5 text-xs', isEditable && 'bg-primary text-primary-foreground')}
        onclick={toggleEditable}
      >
        {#if isEditable}
          <Check class="w-3.5 h-3.5" />
          <span>完成排版</span>
        {:else}
          <Edit3 class="w-3.5 h-3.5" />
          <span>编辑布局</span>
        {/if}
      </Button>
    </div>
  </div>

  <!-- 12 栅格自适应容器 -->
  <div class="p-4 bg-muted/5 min-h-[420px]">
    {#if items.length === 0}
      <div class="py-24 text-center text-sm text-muted-foreground">
        <LayoutDashboard class="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>当前画布暂无小部件，点击上方按钮添加小部件</p>
      </div>
    {:else}
      <div class="grid grid-cols-12 gap-3.5">
        {#each items as item (item.id)}
          <div
            class={cn(
              'rounded-xl border border-border bg-card p-3.5 flex flex-col justify-between transition-all duration-150 relative shadow-2xs',
              isEditable && 'ring-1 ring-primary/30 border-primary/40',
              item.static && 'opacity-90'
            )}
            style="grid-column: span {item.w}; min-height: {item.h * 72}px;"
          >
            <!-- 小部件头部 -->
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="flex items-center gap-1.5 min-w-0">
                {#if isEditable && !item.static}
                  <span class="cursor-grab text-muted-foreground/60 hover:text-foreground">
                    <GripVertical class="w-3.5 h-3.5" />
                  </span>
                {/if}
                <div class="flex flex-col min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-semibold text-foreground truncate">{item.title}</span>
                    {#if item.category}
                      <span class="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border">
                        {item.category}
                      </span>
                    {/if}
                  </div>
                  {#if item.description}
                    <p class="text-[10px] text-muted-foreground truncate mt-0.5">{item.description}</p>
                  {/if}
                </div>
              </div>

              <!-- 编辑工具按钮 -->
              {#if isEditable}
                <div class="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    class="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    title={item.static ? '解锁小部件' : '锁定位置'}
                    onclick={() => toggleLock(item.id)}
                  >
                    {#if item.static}
                      <Lock class="w-3 h-3 text-warning" />
                    {:else}
                      <Unlock class="w-3 h-3" />
                    {/if}
                  </button>

                  {#if !item.static}
                    <button
                      type="button"
                      class="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="放大宽度"
                      disabled={item.w >= 12}
                      onclick={() => resizeItem(item.id, 1, 0)}
                    >
                      <Maximize2 class="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      class="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="缩小宽度"
                      disabled={item.w <= 2}
                      onclick={() => resizeItem(item.id, -1, 0)}
                    >
                      <Minimize2 class="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      class="p-1 rounded text-destructive hover:bg-destructive/10"
                      title="移除小部件"
                      onclick={() => removeItem(item.id)}
                    >
                      <Trash2 class="w-3 h-3" />
                    </button>
                  {/if}
                </div>
              {/if}
            </div>

            <!-- 小部件内容呈现 -->
            <div class="flex-1 flex flex-col justify-center">
              {#if item.widgetType === 'kpi'}
                <div class="flex items-baseline justify-between mt-1">
                  <span class="text-xl font-bold tracking-tight text-foreground font-mono">
                    {item.metricValue ?? '0'}
                  </span>
                  {#if item.metricTrend}
                    <span class="text-xs font-medium text-success bg-success/10 px-1.5 py-0.5 rounded border border-success/20">
                      {item.metricTrend}
                    </span>
                  {/if}
                </div>
              {:else if item.widgetType === 'chart'}
                <div class="h-28 w-full rounded-lg bg-muted/20 border border-dashed border-border/70 flex items-center justify-center text-xs text-muted-foreground flex-col gap-1">
                  <BarChart3 class="w-6 h-6 text-primary/60 mb-1" />
                  <span>实时时序图表绘制区域 ({item.w}x{item.h} 栅格)</span>
                </div>
              {:else if item.widgetType === 'table'}
                <div class="h-28 w-full rounded-lg bg-muted/20 border border-dashed border-border/70 flex items-center justify-center text-xs text-muted-foreground flex-col gap-1">
                  <TableIcon class="w-6 h-6 text-primary/60 mb-1" />
                  <span>结构化数据表格展示区域</span>
                </div>
              {:else}
                <div class="h-20 w-full rounded bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
                  自定义业务小部件
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
