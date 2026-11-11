<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Printer, Stamp, FileText } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import { usePrintExport } from './usePrintExport.svelte.js';

  export interface ReportSignatureItem {
    role: string;
    name?: string | undefined;
    date?: string | undefined;
  }

  export interface ReportMetadataItem {
    label: string;
    value: string | number;
  }

  export interface PrintableReportLayoutProps {
    title: string;
    subtitle?: string | undefined;
    reportNo?: string | undefined;
    companyName?: string | undefined;
    paperSize?: ('a4' | 'a5' | 'letter') | undefined;
    orientation?: ('portrait' | 'landscape') | undefined;
    watermarkText?: string | undefined;
    showPageNumbers?: boolean | undefined;
    showStampArea?: boolean | undefined;
    stampText?: string | undefined;
    metadata?: ReportMetadataItem[] | undefined;
    signatures?: ReportSignatureItem[] | undefined;
    class?: string | undefined;
    actions?: Snippet | undefined;
    header?: Snippet | undefined;
    footer?: Snippet | undefined;
    children?: Snippet | undefined;
  }

  let {
    title,
    subtitle,
    reportNo,
    companyName,
    paperSize = 'a4',
    orientation = 'portrait',
    watermarkText,
    showPageNumbers = true,
    showStampArea = true,
    stampText,
    metadata = [],
    signatures = [],
    class: className = '',
    actions,
    header,
    footer,
    children,
  }: PrintableReportLayoutProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let reportRootRef = $state<HTMLElement | null>(null);
  const printTool = usePrintExport();

  function handleTriggerPrint() {
    printTool.print(reportRootRef, {
      filename: `${title}_${reportNo ?? Date.now()}`,
      orientation,
    });
  }

  const resolvedCompany = $derived(companyName ?? (chinese ? '企业运营管理平台' : 'Enterprise Operations Platform'));
  const resolvedStampText = $derived(stampText ?? (chinese ? '业务审核专用章' : 'Official Approval Seal'));
</script>

<div
  bind:this={reportRootRef}
  data-svadmin-component="PrintableReportLayout"
  data-paper-size={paperSize}
  data-orientation={orientation}
  class={cn(
    'relative w-full rounded-md border border-border bg-card text-card-foreground shadow-sm p-8 print:p-0 print:border-none print:shadow-none print:bg-transparent',
    className,
  )}
>
  <!-- Screen-Only Actions Toolbar -->
  <div class="no-print mb-6 flex items-center justify-between border-b border-border/70 pb-4">
    <div class="flex items-center gap-2">
      <FileText class="h-5 w-5 text-primary" />
      <span class="text-sm font-semibold text-foreground">
        {chinese ? '报表打印排版预览' : 'Printable Report Preview'}
      </span>
      <span class="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground uppercase">
        {paperSize} {orientation}
      </span>
    </div>

    <div class="flex items-center gap-2">
      {#if actions}
        {@render actions()}
      {/if}
      <Button
        type="button"
        size="sm"
        onclick={handleTriggerPrint}
        disabled={printTool.isPrinting}
        class="gap-1.5"
      >
        <Printer class="h-4 w-4" />
        <span>{chinese ? '打印 / 导出 PDF' : 'Print / Export PDF'}</span>
      </Button>
    </div>
  </div>

  <!-- Printable Paper Canvas Container -->
  <div class="relative print:w-full space-y-6">
    <!-- Optional Watermark Overlay -->
    {#if watermarkText}
      <div
        class="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-5 select-none print:opacity-10 z-0"
        aria-hidden="true"
      >
        <span class="rotate-[-25deg] text-6xl font-black uppercase tracking-widest text-foreground">
          {watermarkText}
        </span>
      </div>
    {/if}

    <!-- Header Section -->
    <header class="relative z-10 border-b-2 border-foreground/80 pb-4">
      {#if header}
        {@render header()}
      {:else}
        <div class="flex items-start justify-between">
          <div>
            <div class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {resolvedCompany}
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-foreground mt-1">
              {title}
            </h1>
            {#if subtitle}
              <p class="text-xs text-muted-foreground mt-1">{subtitle}</p>
            {/if}
          </div>

          {#if reportNo}
            <div class="text-right">
              <span class="block text-xs font-medium text-muted-foreground uppercase">
                {chinese ? '单据编号' : 'Document No.'}
              </span>
              <span class="font-mono text-sm font-bold text-foreground">{reportNo}</span>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Metadata Badges Strip -->
      {#if metadata.length > 0}
        <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-3 rounded-lg border border-border/60 text-xs">
          {#each metadata as item (item.label)}
            <div>
              <span class="block text-muted-foreground text-xs">{item.label}</span>
              <span class="font-semibold text-foreground mt-0.5">{item.value}</span>
            </div>
          {/each}
        </div>
      {/if}
    </header>

    <!-- Main Content Body (Tables, grids, descriptions) -->
    <main class="relative z-10 min-h-64 py-2">
      {#if children}
        {@render children()}
      {/if}
    </main>

    <!-- Signature and Seal Section -->
    {#if signatures.length > 0 || showStampArea}
      <section class="page-break-avoid relative z-10 border-t border-border/80 pt-6 mt-8">
        <div class="flex items-end justify-between gap-6">
          <!-- Signatures Columns -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-6 flex-1">
            {#each signatures as sig (sig.role)}
              <div class="space-y-4">
                <div class="text-xs font-semibold text-foreground">{sig.role}:</div>
                <div class="border-b border-foreground/40 pb-1">
                  <span class="font-serif italic text-sm">{sig.name || '_______________'}</span>
                </div>
                <div class="text-xs text-muted-foreground font-mono">
                  {sig.date || (chinese ? '日期: ____年__月__日' : 'Date: YYYY-MM-DD')}
                </div>
              </div>
            {/each}
          </div>

          <!-- Electronic Seal / Stamp Area -->
          {#if showStampArea}
            <div class="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-destructive/60 bg-destructive/5 text-destructive select-none p-2 text-center rotate-[-8deg]">
              <div class="space-y-0.5">
                <Stamp class="h-5 w-5 mx-auto opacity-70" />
                <div class="text-xs font-bold leading-tight uppercase tracking-tight">
                  {resolvedStampText}
                </div>
                <div class="text-[8px] font-mono opacity-80">
                  SEAL VALIDATED
                </div>
              </div>
            </div>
          {/if}
        </div>
      </section>
    {/if}

    <!-- Page Numbering & Footer -->
    <footer class="relative z-10 flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
      {#if footer}
        {@render footer()}
      {:else}
        <span>{chinese ? '机密文件 · 请妥善保管' : 'Confidential document - preserve carefully'}</span>
        {#if showPageNumbers}
          <span class="font-mono">{chinese ? '第 1 页 / 共 1 页' : 'Page 1 of 1'}</span>
        {/if}
      {/if}
    </footer>
  </div>
</div>

<style>
  @media print {
    :global(body) {
      background: white !important;
      color: black !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .no-print {
      display: none !important;
    }
    .page-break-avoid {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    :global(table) {
      page-break-inside: auto;
    }
    :global(tr) {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    :global(thead) {
      display: table-header-group;
    }
    :global(tfoot) {
      display: table-footer-group;
    }
  }
</style>
