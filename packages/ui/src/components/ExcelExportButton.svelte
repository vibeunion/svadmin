<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Download, Loader2 } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core';

  export interface ExcelExportColumn {
    key: string;
    label: string;
    formatter?: ((value: unknown, record: Record<string, unknown>) => string) | undefined;
  }

  export interface ExcelExportButtonProps {
    columns: ExcelExportColumn[];
    dataSource: Record<string, unknown>[] | (() => Promise<Record<string, unknown>[]>);
    filename?: string | undefined;
    format?: 'csv' | 'tsv' | undefined;
    disabled?: boolean | undefined;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | undefined;
    size?: 'default' | 'sm' | 'lg' | undefined;
    class?: string | undefined;
    children?: Snippet | undefined;
    onexport?: ((count: number) => void) | undefined;
  }

  let {
    columns = [],
    dataSource,
    filename = 'export',
    format = 'csv',
    disabled = false,
    variant = 'outline',
    size = 'default',
    class: className = '',
    children,
    onexport,
  }: ExcelExportButtonProps = $props();

  const i18n = useTranslation();
  let loading = $state(false);

  // 转义 CSV/TSV 字段值
  function formatCell(val: unknown, delimiter: string): string {
    if (val === null || val === undefined) return '';
    const rawText = String(val);
    const text = /^[=+\-@]/.test(rawText) ? `'${rawText}` : rawText;
    if (text.includes(delimiter) || text.includes('"') || text.includes('\n') || text.includes('\r')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  async function handleExport() {
    if (disabled || loading) return;
    loading = true;

    try {
      let records: Record<string, unknown>[] = [];
      if (typeof dataSource === 'function') {
        records = await dataSource();
      } else if (Array.isArray(dataSource)) {
        records = dataSource;
      }

      const delimiter = format === 'tsv' ? '\t' : ',';
      const ext = format === 'tsv' ? 'tsv' : 'csv';

      // 构建表头
      const headerRow = columns.map((col) => formatCell(col.label, delimiter)).join(delimiter);

      // 构建数据行
      const bodyRows = records.map((record) => {
        return columns
          .map((col) => {
            const rawVal = record[col.key];
            const displayVal = col.formatter ? col.formatter(rawVal, record) : rawVal;
            return formatCell(displayVal, delimiter);
          })
          .join(delimiter);
      });

      // UTF-8 BOM 确保 Windows Excel 识别中文字符
      const csvContent = '\uFEFF' + [headerRow, ...bodyRows].join('\r\n');
      const blob = new Blob([csvContent], {
        type: format === 'tsv' ? 'text/tab-separated-values;charset=utf-8' : 'text/csv;charset=utf-8',
      });

      // 触发下载
      const safeFilename = filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onexport?.(records.length);
    } finally {
      loading = false;
    }
  }

  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-2xs',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-2xs',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
  };

  const sizeClasses = {
    default: 'h-9 px-3.5 py-2 text-xs',
    sm: 'h-8 px-2.5 text-xs',
    lg: 'h-10 px-4 text-sm',
  };
</script>

<button
  type="button"
  data-svadmin-component="ExcelExportButton"
  disabled={disabled || loading}
  class={cn(
    'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
    variantClasses[variant] ?? variantClasses.outline,
    sizeClasses[size] ?? sizeClasses.default,
    className,
  )}
  onclick={handleExport}
>
  {#if loading}
    <Loader2 size={14} class="animate-spin" />
  {:else}
    <Download size={14} />
  {/if}

  {#if children}
    {@render children()}
  {:else}
    <span>{loading ? '正在导出…' : i18n.t('excel.export')}</span>
  {/if}
</button>
