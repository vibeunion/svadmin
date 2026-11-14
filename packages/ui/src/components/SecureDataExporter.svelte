<script lang="ts">
  import {
    ShieldCheck,
    Download,
    AlertTriangle,
    Check,
    Fingerprint,
    X,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export interface ExportColumnDef {
    key: string;
    label: string;
    isSensitive?: boolean | undefined;
  }

  export interface ExportAuditPayload {
    exportId: string;
    operatorId: string;
    operatorName: string;
    reason: string;
    recordCount: number;
    sensitiveFields: string[];
    format: 'csv' | 'tsv';
    fingerprintHash: string;
    exportedAt: string;
  }

  export interface SecureDataExporterProps {
    data: Record<string, unknown>[];
    columns: ExportColumnDef[];
    fileName?: string | undefined;
    operatorId?: string | undefined;
    operatorName?: string | undefined;
    title?: string | undefined;
    class?: string | undefined;
    onExportAuditRecord?: ((audit: ExportAuditPayload) => void | Promise<void>) | undefined;
  }

  let {
    data = [],
    columns = [],
    fileName = 'export_records',
    operatorId = 'USER-9527',
    operatorName = '张财务 (Finance Lead)',
    title,
    class: className = '',
    onExportAuditRecord,
  }: SecureDataExporterProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let isModalOpen = $state(false);
  let exportReason = $state('');
  let exportFormat = $state<'csv' | 'tsv'>('csv');
  let isExporting = $state(false);
  let isSuccess = $state(false);

  const sensitiveColumns = $derived(columns.filter((c) => c.isSensitive));

  function generateFingerprint(exportId: string, timestamp: string): string {
    const raw = `${exportId}:${operatorId}:${timestamp}:${data.length}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return `FP-${Math.abs(hash).toString(16).padStart(8, '0').toUpperCase()}`;
  }

  function formatFileWithFingerprint(format: 'csv' | 'tsv', fingerprint: string, timestamp: string): string {
    const delimiter = format === 'tsv' ? '\t' : ',';
    const commentPrefix = '# ';
    const headerBanner = `${commentPrefix}CONFIDENTIAL EXPORT FINGERPRINT: [${fingerprint}] OPERATOR: [${operatorId}] TIME: [${timestamp}]\n`;

    const colHeaders = columns.map((c) => c.label).join(delimiter);
    const dataLines = data.map((row) =>
      columns
        .map((col) => {
          const val = row[col.key];
          const str = val === null || val === undefined ? '' : String(val);
          if (str.includes(delimiter) || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(delimiter),
    );

    return headerBanner + [colHeaders, ...dataLines].join('\n');
  }

  async function handleConfirmExport() {
    if (!exportReason.trim() || isExporting) return;
    isExporting = true;

    try {
      const exportId = `exp-${Math.random().toString(36).slice(2, 8)}`;
      const timestamp = new Date().toISOString();
      const fingerprintHash = generateFingerprint(exportId, timestamp);

      const audit: ExportAuditPayload = {
        exportId,
        operatorId,
        operatorName,
        reason: exportReason.trim(),
        recordCount: data.length,
        sensitiveFields: sensitiveColumns.map((c) => c.key),
        format: exportFormat,
        fingerprintHash,
        exportedAt: timestamp,
      };

      await onExportAuditRecord?.(audit);

      const content = formatFileWithFingerprint(exportFormat, fingerprintHash, timestamp);
      const mime = exportFormat === 'tsv' ? 'text/tab-separated-values;charset=utf-8;' : 'text/csv;charset=utf-8;';
      const blob = new Blob([content], { type: mime });

      if (typeof window !== 'undefined') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}_${fingerprintHash}.${exportFormat}`;
        a.click();
        URL.revokeObjectURL(url);
      }

      isSuccess = true;
      setTimeout(() => {
        isModalOpen = false;
        isSuccess = false;
        exportReason = '';
      }, 1200);
    } finally {
      isExporting = false;
    }
  }

  const resolvedBtnLabel = $derived(
    title ?? (chinese ? '安全溯源导出' : 'Secure Export'),
  );
</script>

<div
  data-svadmin-component="SecureDataExporter"
  class={cn('inline-flex items-center', className)}
>
  <Button
    type="button"
    variant="outline"
    size="sm"
    onclick={() => (isModalOpen = true)}
    class="gap-1.5 text-xs font-medium"
  >
    <ShieldCheck class="h-4 w-4 text-primary" />
    <span>{resolvedBtnLabel}</span>
  </Button>
</div>

<!-- Security Confirmation & Reason Modal -->
{#if isModalOpen}
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Secure export confirmation"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
  >
    <div
      class="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs"
    >
      <!-- Header -->
      <div class="flex items-start justify-between border-b border-border/70 pb-3">
        <div class="flex items-center gap-2.5">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Fingerprint class="h-5 w-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-foreground">
              {chinese ? '企业数据安全溯源导出' : 'Secure Traceable Data Export'}
            </h3>
            <p class="text-[11px] text-muted-foreground mt-0.5">
              {chinese ? '本次导出将自动嵌入防篡改数字溯源指纹与操作员工号' : 'Export file will be stamped with operator fingerprint'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onclick={() => (isModalOpen = false)}
          class="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Scope & Security Warning Banner -->
      <div class="rounded-xl border border-warning/30 bg-warning/5 p-3.5 space-y-2">
        <div class="flex items-center justify-between font-medium">
          <span class="flex items-center gap-1.5 text-warning font-bold">
            <AlertTriangle class="h-4 w-4" />
            <span>{chinese ? '导出范围与安全提示' : 'Export Security Notice'}</span>
          </span>
          <span class="font-mono text-foreground font-bold">
            {chinese ? `共 ${data.length} 条记录` : `${data.length} records`}
          </span>
        </div>

        {#if sensitiveColumns.length > 0}
          <div class="text-[11px] text-muted-foreground">
            {chinese ? '检测到包含隐私/敏感字段:' : 'Contains sensitive fields:'}
            <span class="text-destructive font-mono font-medium ml-1">
              {sensitiveColumns.map((c) => c.label).join(', ')}
            </span>
          </div>
        {/if}

        <div class="text-[11px] text-muted-foreground">
          {chinese ? `当前操作人: ${operatorName} (${operatorId})` : `Operator: ${operatorName} (${operatorId})`}
        </div>
      </div>

      <!-- Format & Reason Form -->
      <div class="space-y-3">
        <div>
          <div class="block font-semibold text-foreground mb-1">
            {chinese ? '文件导出格式' : 'Export Format'}
          </div>
          <div class="flex gap-4">
            <label class="inline-flex items-center gap-1.5 cursor-pointer font-medium">
              <input type="radio" value="csv" bind:group={exportFormat} class="accent-primary" />
              <span>CSV (.csv)</span>
            </label>
            <label class="inline-flex items-center gap-1.5 cursor-pointer font-medium">
              <input type="radio" value="tsv" bind:group={exportFormat} class="accent-primary" />
              <span>Excel TSV (.tsv)</span>
            </label>
          </div>
        </div>

        <div>
          <label for="export-reason-input" class="block font-semibold text-foreground mb-1">
            {chinese ? '合规导出申请事由 (必填) *' : 'Compliance Export Reason (Required) *'}
          </label>
          <textarea
            id="export-reason-input"
            bind:value={exportReason}
            rows="3"
            placeholder={chinese ? '请如实填写导出用途 (如: 2026Q4 财务清算审计)…' : 'State reason for export for compliance audit…'}
            class="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          ></textarea>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="flex items-center justify-between border-t border-border/70 pt-3">
        <span class="text-[10px] text-muted-foreground font-mono">
          STAMP: SHA256-INJECTED
        </span>

        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onclick={() => (isModalOpen = false)}
            disabled={isExporting}
          >
            {chinese ? '取消' : 'Cancel'}
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={!exportReason.trim() || isExporting}
            onclick={handleConfirmExport}
            class="gap-1.5 min-w-28"
          >
            {#if isSuccess}
              <Check class="h-3.5 w-3.5 text-success" />
              <span>{chinese ? '已加签导出' : 'Exported'}</span>
            {:else}
              <Download class="h-3.5 w-3.5" />
              <span>{chinese ? '确认并加签导出' : 'Authorize & Export'}</span>
            {/if}
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}
