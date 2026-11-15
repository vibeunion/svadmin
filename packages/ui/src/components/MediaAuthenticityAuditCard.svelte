<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    Camera,
    MapPin,
    ShieldCheck,
    Download,
    RefreshCw,
    AlertTriangle
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type MediaTamperRiskLevel = 'safe' | 'low' | 'suspicious' | 'high_risk';

  export interface MediaExifMeta {
    /** 拍摄设备品牌，如 "Apple"、"Sony" */
    make?: string;
    /** 设备型号，如 "iPhone 15 Pro Max"、"ILCE-7M4" */
    model?: string;
    /** 镜头型号 */
    lens?: string;
    /** 光圈值，如 "f/1.8" */
    fNumber?: string;
    /** 曝光时间 / 快门速度，如 "1/120s" */
    exposureTime?: string;
    /** 感光度，如 "ISO 100" */
    iso?: string;
    /** 焦距，如 "24mm" */
    focalLength?: string;
    /** 原始拍摄时间，如 "2026-11-14 14:22:05" */
    capturedAt: string;
    /** 数字化/修改时间，若与原始时间不一致则有篡改嫌疑 */
    modifiedAt?: string;
    /** 记录的处理软件，如 "Adobe Photoshop 2024" 或 "None (Original)" */
    software?: string;
  }

  export interface MediaGpsLocation {
    latitude: number;
    longitude: number;
    altitudeMeters?: number;
    addressText?: string;
  }

  export interface BlindWatermarkPayload {
    detected: boolean;
    tenantId?: string;
    userId?: string;
    securityDigest?: string;
    timestamp?: string;
  }

  export interface MediaAuthenticityData {
    id: string;
    fileName: string;
    fileSizeMb: number;
    previewUrl?: string;
    mimeType: string;
    riskLevel: MediaTamperRiskLevel;
    tamperConfidencePercent: number; // 篡改置信度 0~100%
    exif: MediaExifMeta;
    location?: MediaGpsLocation;
    watermark?: BlindWatermarkPayload;
    auditFindings: string[];
  }

  export interface MediaAuthenticityAuditCardProps {
    /** 多媒体防伪与 EXIF 审计数据 */
    data: MediaAuthenticityData;
    /** 重新触发防伪复核回调 */
    onRecheck?: (mediaId: string) => void;
    /** 导出防伪存证凭据回调 */
    onExportEvidence?: (data: MediaAuthenticityData) => void;
    /** 自定义操作栏插槽 */
    actions?: Snippet | undefined;
    class?: string | undefined;
  }

  let {
    data,
    onRecheck,
    onExportEvidence,
    actions,
    class: className = ''
  }: MediaAuthenticityAuditCardProps = $props();

  let isChecking = $state(false);

  async function handleRecheck() {
    if (isChecking) return;
    isChecking = true;
    try {
      onRecheck?.(data.id);
    } finally {
      setTimeout(() => {
        isChecking = false;
      }, 500);
    }
  }

  function getRiskConfig(level: MediaTamperRiskLevel) {
    switch (level) {
      case 'safe':
        return {
          label: '原始可信 · 未见篡改',
          tone: 'success',
          border: 'border-success/30',
          badgeClass: 'bg-success/15 text-success border-success/30 dark:text-success',
          desc: 'EXIF 链路完整，拍摄时间与数字化时间一致，未检出图像处理软件二次重编码痕迹。'
        };
      case 'low':
        return {
          label: '低风险 · 元数据轻度修剪',
          tone: 'warning',
          border: 'border-warning/30',
          badgeClass: 'bg-warning/15 text-warning border-warning/30 dark:text-warning',
          desc: '存在常规重命名或无损压缩痕迹，核心拍摄参数与设备特征仍保持一致。'
        };
      case 'suspicious':
        return {
          label: '疑似篡改 · 存在二次编辑',
          tone: 'danger',
          border: 'border-destructive/30',
          badgeClass: 'bg-destructive/15 text-destructive border-destructive/30 dark:text-destructive',
          desc: '检测到图像处理软件签名或时间戳跳变，建议法务与合规团队人工核验原件。'
        };
      default:
        return {
          label: '高危篡改 · 证实伪造',
          tone: 'danger',
          border: 'border-destructive/40',
          badgeClass: 'bg-destructive/15 text-destructive border-destructive/30',
          desc: '关键元数据全部遭擦除或重写，图片像素存在重采样拼接，已触发反作弊告警。'
        };
    }
  }

  const riskConfig = $derived(getRiskConfig(data.riskLevel));
</script>

<div
  class={cn(
    'flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm transition-all overflow-hidden',
    riskConfig.border,
    className
  )}
  data-svadmin-component="MediaAuthenticityAuditCard"
>
  <!-- 头部：防伪总览与操作 -->
  <header class="flex flex-wrap items-start justify-between gap-4 p-5 border-b border-border bg-muted/20">
    <div class="flex items-start gap-4">
      <!-- 媒体预览图或图标占位 -->
      <div class="relative flex h-20 w-24 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 overflow-hidden">
        {#if data.previewUrl}
          <div
            class="h-full w-full bg-cover bg-center"
            style="background-image: url('{data.previewUrl}');"
            role="img"
            aria-label={data.fileName}
          ></div>
        {:else}
          <Camera class="h-8 w-8 text-muted-foreground/60" />
        {/if}

        <div class="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.2 text-[9px] font-mono text-white">
          {data.mimeType.split('/')[1]?.toUpperCase() || 'IMG'}
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-base font-bold text-foreground">{data.fileName}</h3>
          <span class={cn('rounded border px-2 py-0.5 text-xs font-semibold', riskConfig.badgeClass)}>
            {riskConfig.label}
          </span>
          <span class="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground font-mono">
            {data.fileSizeMb} MB
          </span>
        </div>

        <p class="text-xs text-muted-foreground max-w-xl leading-relaxed">
          {riskConfig.desc}
        </p>

        <!-- 篡改置信度进度条 -->
        <div class="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
          <span>篡改嫌疑指数：</span>
          <div class="h-2 w-32 rounded-full bg-muted overflow-hidden">
            <div
              class={cn(
                'h-full transition-all',
                data.tamperConfidencePercent > 50 ? 'bg-destructive' : 'bg-success'
              )}
              style="width: {data.tamperConfidencePercent}%;"
            ></div>
          </div>
          <span class="font-mono font-semibold text-foreground">{data.tamperConfidencePercent}%</span>
        </div>
      </div>
    </div>

    <!-- 右侧操作区 -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        disabled={isChecking}
        onclick={handleRecheck}
      >
        <RefreshCw class={cn('h-3.5 w-3.5', isChecking && 'animate-spin text-primary')} />
        重新核验
      </button>

      {#if onExportEvidence}
        <button
          type="button"
          class="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          onclick={() => onExportEvidence(data)}
        >
          <Download class="h-3.5 w-3.5" />
          防伪存证
        </button>
      {/if}

      {#if actions}
        {@render actions()}
      {/if}
    </div>
  </header>

  <!-- 中间：EXIF 拍摄器材参数 + GPS 空间地理信息 -->
  <div class="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0 text-xs">
    <!-- EXIF 器材参数 (左) -->
    <div class="flex flex-col gap-2.5 p-5">
      <div class="flex items-center justify-between border-b border-border pb-2">
        <span class="flex items-center gap-1.5 font-semibold text-foreground">
          <Camera class="h-4 w-4 text-primary" />
          相机 EXIF 原始拍摄参数
        </span>
        {#if data.exif.software}
          <span class="rounded bg-muted px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground">
            软件: {data.exif.software}
          </span>
        {/if}
      </div>

      <div class="grid grid-cols-2 gap-2 text-muted-foreground">
        <div>
          <span>设备型号：</span>
          <strong class="text-foreground block pt-0.5">
            {data.exif.make || ''} {data.exif.model || '未记录硬件'}
          </strong>
        </div>
        <div>
          <span>拍摄时间：</span>
          <span class="font-mono text-foreground block pt-0.5">{data.exif.capturedAt}</span>
        </div>
        <div>
          <span>光学规格：</span>
          <span class="font-mono text-foreground block pt-0.5">
            {data.exif.focalLength || '24mm'} {data.exif.fNumber || 'f/1.8'}
          </span>
        </div>
        <div>
          <span>曝光与感光度：</span>
          <span class="font-mono text-foreground block pt-0.5">
            {data.exif.exposureTime || '1/60s'} {data.exif.iso || 'ISO 100'}
          </span>
        </div>
      </div>
    </div>

    <!-- GPS 地理空间与盲水印 (右) -->
    <div class="flex flex-col gap-2.5 p-5 bg-muted/10">
      <div class="flex items-center justify-between border-b border-border pb-2">
        <span class="flex items-center gap-1.5 font-semibold text-foreground">
          <MapPin class="h-4 w-4 text-success" />
          拍摄地理位置与隐形水印
        </span>
        {#if data.watermark?.detected}
          <span class="rounded bg-success/10 text-success border border-success/20 px-1.5 py-0.2 text-[10px]">
            检出数字水印
          </span>
        {:else}
          <span class="rounded bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground">
            无内置盲水印
          </span>
        {/if}
      </div>

      <div class="flex flex-col gap-2 text-muted-foreground">
        {#if data.location}
          <div class="flex flex-col gap-1">
            <span class="text-foreground font-medium">{data.location.addressText || '已提取精准 GPS 坐标'}</span>
            <span class="font-mono text-[11px]">
              经度: {data.location.longitude}，纬度: {data.location.latitude}
              {#if data.location.altitudeMeters}
                （海拔 {data.location.altitudeMeters}m）
              {/if}
            </span>
          </div>
        {:else}
          <div class="py-1 text-muted-foreground italic">
            未包含 GPS 定位经纬度数据（可能拍摄时关闭定位或被擦除）
          </div>
        {/if}

        {#if data.watermark?.detected}
          <div class="rounded-md border border-border bg-card p-2 text-[11px] font-mono space-y-0.5">
            <div>租户标识：<span class="text-foreground font-semibold">{data.watermark.tenantId}</span></div>
            <div>归属员工：<span class="text-foreground">{data.watermark.userId}</span></div>
            <div>存证哈希：<code class="text-muted-foreground break-all">{data.watermark.securityDigest}</code></div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- 底部：详细质检异常审计日志 -->
  {#if data.auditFindings && data.auditFindings.length > 0}
    <div class="border-t border-border bg-card p-4 text-xs">
      <div class="mb-2 font-semibold text-foreground">防伪审计结论与风险探针 ({data.auditFindings.length})</div>
      <div class="flex flex-wrap gap-2">
        {#each data.auditFindings as finding, idx (idx)}
          <div class="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-muted-foreground">
            {#if data.riskLevel === 'safe'}
              <ShieldCheck class="h-3.5 w-3.5 text-success" />
            {:else}
              <AlertTriangle class="h-3.5 w-3.5 text-warning" />
            {/if}
            <span>{finding}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
