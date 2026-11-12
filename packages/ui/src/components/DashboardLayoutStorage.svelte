<script lang="ts">
  import {
    FolderKanban,
    Download,
    Check,
    Trash2,
    Layers,
    Plus,
    X,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import type { DashboardGridItem } from './DashboardGridLayout.svelte';

  export interface DashboardPreset {
    id: string;
    name: string;
    description?: string | undefined;
    isDefault?: boolean | undefined;
    role?: string | undefined;
    updatedAt?: string | undefined;
    items: DashboardGridItem[];
  }

  export interface DashboardLayoutStorageProps {
    currentPresetId?: string | undefined;
    presets?: DashboardPreset[] | undefined;
    currentLayout?: DashboardGridItem[] | undefined;
    class?: string | undefined;
    onSelectPreset?: ((preset: DashboardPreset) => void) | undefined;
    onSaveCurrentAsPreset?: ((name: string, description?: string) => void) | undefined;
    onDeletePreset?: ((presetId: string) => void) | undefined;
    onExportLayout?: (() => void) | undefined;
  }

  let {
    currentPresetId = $bindable('preset-exec-01'),
    presets = $bindable([
      {
        id: 'preset-exec-01',
        name: '高管经营全景大屏',
        description: '重点监控季度 GMV、企业客户留存、活跃租户与网关可用率',
        isDefault: true,
        role: 'CEO / 高管',
        updatedAt: '2026-11-12 10:00',
        items: [
          { id: 'w1', title: '季度 GMV 营收', w: 4, h: 2, widgetType: 'kpi', metricValue: '¥48.2M' },
          { id: 'w2', title: '付费企业租户数', w: 4, h: 2, widgetType: 'kpi', metricValue: '1,420 家' },
          { id: 'w3', title: 'SLA 可用率', w: 4, h: 2, widgetType: 'kpi', metricValue: '99.98%' },
          { id: 'w4', title: '全链路业务趋势', w: 12, h: 4, widgetType: 'chart' },
        ],
      },
      {
        id: 'preset-fin-02',
        name: '财务月结与对账大屏',
        description: '聚焦大额采购单审批、资金划转链路与税务发票导出',
        isDefault: false,
        role: '财务总监',
        updatedAt: '2026-11-11 16:30',
        items: [
          { id: 'w5', title: '待清算资金总额', w: 6, h: 2, widgetType: 'kpi', metricValue: '¥8,320,000' },
          { id: 'w6', title: '双人复核工单池', w: 6, h: 2, widgetType: 'kpi', metricValue: '14 笔' },
          { id: 'w7', title: '待核对采购明细表', w: 12, h: 4, widgetType: 'table' },
        ],
      },
      {
        id: 'preset-sre-03',
        name: 'SRE 集群故障监控看板',
        description: '多活可用区健康状态、慢查询日志与容量告警预测',
        isDefault: false,
        role: '运维架构师',
        updatedAt: '2026-11-10 18:20',
        items: [
          { id: 'w8', title: '网关实时吞吐', w: 6, h: 2, widgetType: 'kpi', metricValue: '14.2K QPS' },
          { id: 'w9', title: 'P99 响应延迟', w: 6, h: 2, widgetType: 'kpi', metricValue: '18ms' },
          { id: 'w10', title: '实时日志尾部流', w: 12, h: 4, widgetType: 'log' },
        ],
      },
    ]),
    currentLayout = [],
    class: className = '',
    onSelectPreset,
    onSaveCurrentAsPreset,
    onDeletePreset,
    onExportLayout,
  }: DashboardLayoutStorageProps = $props();

  let isSavingNew = $state(false);
  let newPresetName = $state('');
  let newPresetDesc = $state('');

  let activePreset = $derived(
    presets.find((p) => p.id === currentPresetId) ?? presets[0]
  );

  function handleSelect(preset: DashboardPreset) {
    currentPresetId = preset.id;
    onSelectPreset?.(preset);
  }

  function handleConfirmSave() {
    if (!newPresetName.trim()) return;
    const name = newPresetName.trim();
    const desc = newPresetDesc.trim();
    const id = `preset-custom-${Date.now()}`;
    const newPreset: DashboardPreset = {
      id,
      name,
      description: desc || '用户自定义大屏排版方案',
      isDefault: false,
      role: '自定义方案',
      updatedAt: '刚刚',
      items: currentLayout.length > 0 ? [...currentLayout] : (activePreset ? [...activePreset.items] : []),
    };

    presets = [...presets, newPreset];
    currentPresetId = id;
    newPresetName = '';
    newPresetDesc = '';
    isSavingNew = false;
    onSaveCurrentAsPreset?.(name, desc);
  }

  function handleDelete(id: string) {
    presets = presets.filter((p) => p.id !== id);
    const first = presets[0];
    if (currentPresetId === id && first) {
      currentPresetId = first.id;
      onSelectPreset?.(first);
    }
    onDeletePreset?.(id);
  }
</script>

<div
  class={cn('w-full rounded-2xl border border-border bg-card text-foreground shadow-sm flex flex-col p-4 gap-3', className)}
  data-svadmin-component="dashboard-layout-storage"
>
  <!-- 预设方案头部 -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
    <div class="flex items-center gap-2">
      <FolderKanban class="w-4 h-4 text-primary" />
      <span class="text-xs font-semibold text-foreground tracking-tight">大屏排版预设方案库</span>
      <span class="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border">
        {presets.length} 个方案
      </span>
    </div>

    <!-- 方案操作 -->
    <div class="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        class="h-7 text-xs gap-1"
        onclick={() => (isSavingNew = !isSavingNew)}
      >
        <Plus class="w-3 h-3 text-primary" />
        <span>另存为方案</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        class="h-7 text-xs gap-1 text-muted-foreground"
        onclick={() => onExportLayout?.()}
      >
        <Download class="w-3 h-3" />
        <span>导出 JSON</span>
      </Button>
    </div>
  </div>

  <!-- 新增预设输入条 -->
  {#if isSavingNew}
    <div class="p-3 rounded-xl border border-primary/30 bg-primary/5 flex flex-col gap-2 animate-in fade-in-0 duration-150">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-foreground">另存当前画布为新大屏方案</span>
        <button type="button" class="text-muted-foreground hover:text-foreground" onclick={() => (isSavingNew = false)}>
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="flex flex-col sm:flex-row items-center gap-2">
        <input
          type="text"
          bind:value={newPresetName}
          placeholder="输入大屏方案名称 (如：双十一作战指挥大屏)..."
          class="w-full sm:flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          type="text"
          bind:value={newPresetDesc}
          placeholder="方案简要说明 (可选)..."
          class="w-full sm:w-64 px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button
          variant="default"
          size="sm"
          class="h-8 text-xs px-3 bg-primary text-primary-foreground shrink-0 w-full sm:w-auto"
          disabled={!newPresetName.trim()}
          onclick={handleConfirmSave}
        >
          保存方案
        </Button>
      </div>
    </div>
  {/if}

  <!-- 预设方案卡片网格 -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
    {#each presets as preset (preset.id)}
      {@const isActive = preset.id === currentPresetId}
      <div
        class={cn(
          'p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between gap-2 relative',
          isActive
            ? 'border-primary/50 bg-primary/5 shadow-xs'
            : 'border-border bg-card hover:border-border/80 hover:bg-muted/30'
        )}
      >
        <div class="flex items-start justify-between gap-1.5">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="text-xs font-semibold text-foreground truncate">{preset.name}</span>
            {#if preset.isDefault}
              <span class="text-[9px] px-1 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 shrink-0 font-medium">
                默认
              </span>
            {/if}
          </div>

          <div class="flex items-center gap-1 shrink-0">
            {#if !preset.isDefault}
              <button
                type="button"
                class="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors"
                title="删除方案"
                onclick={(e) => {
                  e.stopPropagation();
                  handleDelete(preset.id);
                }}
              >
                <Trash2 class="w-3 h-3" />
              </button>
            {/if}
          </div>
        </div>

        {#if preset.description}
          <p class="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {preset.description}
          </p>
        {/if}

        <div class="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
          <span class="flex items-center gap-1">
            <Layers class="w-3 h-3" />
            {preset.items.length} 个小部件
          </span>

          <Button
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            class="h-6 text-[11px] px-2"
            disabled={isActive}
            onclick={() => handleSelect(preset)}
          >
            {#if isActive}
              <Check class="w-3 h-3 mr-1" />
              <span>当前使用中</span>
            {:else}
              <span>应用此布局</span>
            {/if}
          </Button>
        </div>
      </div>
    {/each}
  </div>
</div>
