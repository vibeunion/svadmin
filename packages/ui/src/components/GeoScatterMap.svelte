<script lang="ts">
  import { untrack } from 'svelte';

  export interface GeoRegionData {
    id: string;
    name: string;
    value: number;
    subtext?: string | undefined;
    status?: 'normal' | 'warning' | 'critical' | 'highlight' | undefined;
    x?: number | undefined;
    y?: number | undefined;
  }

  export interface GeoScatterMapProps {
    title?: string | undefined;
    subtitle?: string | undefined;
    regions?: GeoRegionData[] | undefined;
    metricLabel?: string | undefined;
    selectedRegionId?: string | undefined;
    showBubbles?: boolean | undefined;
    class?: string | undefined;
    onSelectRegion?: ((region: GeoRegionData) => void) | undefined;
  }

  const defaultRegions: GeoRegionData[] = [
    { id: 'east', name: '华东大区 (上海/江浙)', value: 4820, x: 78, y: 58, status: 'highlight', subtext: '含5个超级算力中心' },
    { id: 'south', name: '华南大区 (广深/港澳)', value: 3650, x: 68, y: 82, status: 'normal', subtext: '跨境核心中继集群' },
    { id: 'north', name: '华北大区 (京津冀)', value: 4120, x: 72, y: 35, status: 'normal', subtext: '主核心控制节点' },
    { id: 'central', name: '华中大区 (两湖/河南)', value: 2450, x: 60, y: 60, status: 'normal', subtext: '灾备冷备存储仓' },
    { id: 'southwest', name: '西南大区 (成渝/云贵)', value: 3100, x: 42, y: 68, status: 'warning', subtext: '水冷水电高能效算力' },
    { id: 'northwest', name: '西北大区 (陕甘宁青新)', value: 1850, x: 30, y: 38, status: 'normal', subtext: '西数东算绿色基地' },
    { id: 'northeast', name: '东北大区 (黑吉辽)', value: 1280, x: 86, y: 22, status: 'normal', subtext: '北方边缘缓存池' }
  ];

  const {
    title = '业务地域空间分布拓扑图',
    subtitle = '轻量原生 SVG 矢量区划与散点热力分布',
    regions = defaultRegions,
    metricLabel = '并发连接数',
    selectedRegionId = undefined,
    showBubbles = true,
    class: className = '',
    onSelectRegion = undefined
  }: GeoScatterMapProps = $props();

  let activeRegionId = $state<string | undefined>(untrack(() => selectedRegionId ?? regions[0]?.id));

  const sortedRegions = $derived(
    [...regions].sort((a, b) => b.value - a.value)
  );

  const maxValue = $derived(
    Math.max(...regions.map(r => r.value), 1)
  );

  const currentActiveRegion = $derived(
    regions.find(r => r.id === activeRegionId) ?? regions[0]
  );

  function handleSelect(region: GeoRegionData) {
    activeRegionId = region.id;
    onSelectRegion?.(region);
  }

  function getStatusBadge(status?: string): { label: string; class: string } {
    switch (status) {
      case 'highlight':
        return { label: '重点区域', class: 'bg-primary/10 text-primary border-primary/20' };
      case 'warning':
        return { label: '算力预警', class: 'bg-warning/10 text-warning border-warning/20' };
      case 'critical':
        return { label: '负载超限', class: 'bg-destructive/10 text-destructive border-destructive/20' };
      default:
        return { label: '运行正常', class: 'bg-success/10 text-success border-success/20' };
    }
  }
</script>

<div
  class="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm {className}"
  data-svadmin-component="GeoScatterMap"
>
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
    <div class="flex items-center gap-2.5">
      <div class="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <h3 class="text-sm font-medium text-foreground">{title}</h3>
        <p class="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <span class="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        <span class="h-1.5 w-1.5 rounded-full bg-success"></span>
        实时动态心跳
      </span>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <div class="lg:col-span-2 relative min-h-[320px] rounded-md border border-border bg-muted/20 p-4 flex flex-col justify-between overflow-hidden">
      <svg class="absolute inset-0 h-full w-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" stroke-width="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <div class="relative h-full w-full min-h-[280px]">
        {#each regions as region (region.id)}
          {@const x = region.x ?? 50}
          {@const y = region.y ?? 50}
          {@const radius = Math.max(14, Math.min(36, (region.value / maxValue) * 36))}
          {@const isSelected = activeRegionId === region.id}

          <div
            class="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 group"
            style="left: {x}%; top: {y}%;"
            onclick={() => handleSelect(region)}
            onkeydown={(e) => { if (e.key === 'Enter') handleSelect(region); }}
            role="button"
            tabindex="0"
          >
            {#if showBubbles}
              <div
                class="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform group-hover:scale-125 {isSelected ? 'bg-primary/20 ring-2 ring-primary' : 'bg-primary/10'}"
                style="width: {radius * 2}px; height: {radius * 2}px; left: 50%; top: 50%;"
              ></div>
            {/if}

            <div
              class="relative z-10 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm transition-all {isSelected ? 'border-primary bg-primary text-primary-foreground scale-105' : 'border-border bg-card text-card-foreground hover:border-primary/50'}"
            >
              <span class="h-2 w-2 rounded-full {region.status === 'warning' ? 'bg-warning' : region.status === 'critical' ? 'bg-destructive' : 'bg-primary'}"></span>
              <span class="font-medium whitespace-nowrap">{region.name.split(' ')[0]}</span>
              <span class="opacity-80 text-[10px]">{region.value}</span>
            </div>
          </div>
        {/each}
      </div>

      <div class="relative z-10 mt-2 flex flex-wrap items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2">
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1">
            <span class="h-2 w-2 rounded-full bg-primary"></span> 核心大区
          </span>
          <span class="flex items-center gap-1">
            <span class="h-2 w-2 rounded-full bg-warning"></span> 高峰载荷
          </span>
          <span class="flex items-center gap-1">
            <span class="h-2 w-2 rounded-full bg-success"></span> 稳定低延时
          </span>
        </div>
        <div>
          <span>散点权重基准: {metricLabel}</span>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      {#if currentActiveRegion}
        {@const badge = getStatusBadge(currentActiveRegion.status)}
        <div class="rounded-md border border-border bg-muted/30 p-3 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-foreground">{currentActiveRegion.name}</span>
            <span class="rounded border px-1.5 py-0.5 text-[10px] font-medium {badge.class}">
              {badge.label}
            </span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-bold tracking-tight text-primary">
              {currentActiveRegion.value.toLocaleString()}
            </span>
            <span class="text-xs text-muted-foreground">{metricLabel}</span>
          </div>
          {#if currentActiveRegion.subtext}
            <p class="text-xs text-muted-foreground border-t border-border/40 pt-1.5">
              {currentActiveRegion.subtext}
            </p>
          {/if}
        </div>
      {/if}

      <div class="rounded-md border border-border bg-card p-3 flex-1 flex flex-col gap-2">
        <div class="flex items-center justify-between border-b border-border pb-2">
          <span class="text-xs font-medium text-foreground">各区域综合负载排行</span>
          <span class="text-[10px] text-muted-foreground">TOP {sortedRegions.length}</span>
        </div>
        <div class="flex flex-col gap-2 overflow-y-auto max-h-[220px] pr-1">
          {#each sortedRegions as r, idx (r.id)}
            {@const percent = Math.round((r.value / maxValue) * 100)}
            <div
              class="flex flex-col gap-1 cursor-pointer rounded p-1.5 transition-colors hover:bg-muted/50 {activeRegionId === r.id ? 'bg-muted/60 ring-1 ring-primary/40' : ''}"
              onclick={() => handleSelect(r)}
              onkeydown={(e) => { if (e.key === 'Enter') handleSelect(r); }}
              role="button"
              tabindex="0"
            >
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-1.5">
                  <span class="inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold {idx === 0 ? 'bg-primary text-primary-foreground' : idx < 3 ? 'bg-muted text-foreground' : 'text-muted-foreground'}">
                    {idx + 1}
                  </span>
                  <span class="font-medium text-foreground">{r.name}</span>
                </div>
                <span class="font-semibold text-foreground">{r.value}</span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  class="h-full rounded-full bg-primary transition-all duration-300"
                  style="width: {percent}%"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>
