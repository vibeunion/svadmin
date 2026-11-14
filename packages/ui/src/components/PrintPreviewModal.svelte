<script lang="ts">
  import type { PrintTemplateConfig } from './print-utils.js';
  import { numberToChineseCurrency } from './print-utils.js';

  export interface PrintPreviewModalProps {
    open?: boolean;
    config: PrintTemplateConfig;
    data?: Record<string, unknown>;
    items?: Array<Record<string, unknown>>;
    onClose?: () => void;
  }

  let {
    open = $bindable(false),
    config,
    data = {},
    items = [],
    onClose,
  }: PrintPreviewModalProps = $props();

  const totalSum = $derived(
    items.reduce((acc, curr) => acc + (Number(curr['total_amount'] || curr['amount'] || 0)), 0),
  );
  const totalQty = $derived(
    items.reduce((acc, curr) => acc + (Number(curr['quantity'] || curr['qty'] || 0)), 0),
  );
  const amountInWords = $derived(numberToChineseCurrency(totalSum));

  function handlePrint() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  function handleClose() {
    open = false;
    onClose?.();
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:p-0 print:bg-white print:static"
    data-svadmin-component="PrintPreviewModal"
    data-svadmin-resource="print_templates"
  >
    <div
      class="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl bg-card border border-border p-6 shadow-2xl flex flex-col gap-4 text-foreground print:border-none print:shadow-none print:max-w-none print:max-h-none print:p-0"
    >
      <!-- Action Bar (Hidden on Print) -->
      <div class="flex items-center justify-between pb-3 border-b border-border print:hidden">
        <div class="flex items-center gap-2">
          <h3 class="font-bold text-base text-foreground">单据高保真打印预览</h3>
          <span class="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
            {config.paperSize}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={handlePrint}
            class="px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors inline-flex items-center shadow-sm"
          >
            <svg class="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            调起系统打印 (Ctrl+P)
          </button>
          <button
            type="button"
            onclick={handleClose}
            class="px-3 py-2 text-xs rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            关闭
          </button>
        </div>
      </div>

      <!-- High-Fidelity Printable Canvas Document -->
      <div class="flex justify-center bg-muted/20 p-4 rounded-lg print:p-0 print:bg-white">
        <div
          class="w-full max-w-[210mm] bg-white text-neutral-900 border border-neutral-300 p-8 shadow-md relative print:shadow-none print:border-none print:p-0"
        >
          <!-- Watermark -->
          {#if config.showWatermark && config.watermarkText}
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
              <span class="text-6xl font-black rotate-[-30deg] tracking-widest text-neutral-900">
                {config.watermarkText}
              </span>
            </div>
          {/if}

          <!-- Header -->
          <div class="flex items-center justify-between pb-2 border-b border-neutral-900">
            <div>
              <h2 class="text-lg font-black tracking-wide uppercase">{config.companyName}</h2>
              <p class="text-[10px] text-neutral-500 font-mono">{config.subTitle}</p>
            </div>
            <div class="text-right">
              <span class="text-xs font-bold border border-neutral-800 px-2 py-0.5 rounded">
                {config.copies[0] || '打印联'}
              </span>
            </div>
          </div>

          <!-- Document Title & Barcode -->
          <div class="flex items-center justify-between my-4">
            <h1 class="text-xl font-bold tracking-widest text-neutral-900">{config.title}</h1>
            {#if config.showBarcode}
              <div class="flex flex-col items-center">
                <div class="flex items-end gap-[1.5px] h-7 px-1">
                  {#each [2,3,1,4,2,1,3,2,4,1,2,3,1,4,2,3] as h}
                    <div class="bg-black w-[1.5px]" style="height: {h * 6}px"></div>
                  {/each}
                </div>
                <span class="font-mono text-[9px] tracking-wider text-neutral-700">
                  {String(data['order_no'] || 'NO-20261115')}
                </span>
              </div>
            {/if}
          </div>

          <!-- Meta Grid -->
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs py-2 border-y border-neutral-300">
            {#each config.metaFields as mf}
              <div class="flex items-center">
                <span class="text-neutral-500 w-16 shrink-0">{mf.label}:</span>
                <span class="font-semibold text-neutral-900 font-mono truncate">
                  {String(data[mf.field] ?? mf.value ?? '-')}
                </span>
              </div>
            {/each}
          </div>

          <!-- Items Table -->
          <div class="my-4">
            <table class="w-full text-xs border-collapse border border-neutral-400 print:break-inside-avoid">
              <thead>
                <tr class="bg-neutral-100 border-b border-neutral-400 text-neutral-800 font-bold">
                  {#each config.columns.filter(c => c.visible) as col}
                    <th
                      class="py-1 px-2 border-r border-neutral-400"
                      style="text-align: {col.align || 'left'}; width: {col.width || 'auto'};"
                    >
                      {col.label}
                    </th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#if items.length === 0}
                  <tr>
                    <td colspan={config.columns.filter(c => c.visible).length} class="py-4 text-center text-neutral-400">
                      暂无单据明细数据
                    </td>
                  </tr>
                {:else}
                  {#each items as item, index}
                    <tr class="border-b border-neutral-300 print:break-inside-avoid">
                      {#each config.columns.filter(c => c.visible) as col}
                        <td
                          class="py-1 px-2 border-r border-neutral-300 font-mono text-[11px]"
                          style="text-align: {col.align || 'left'};"
                        >
                          {#if col.field === 'index'}
                            {index + 1}
                          {:else if col.field === 'total_amount' || col.field === 'unit_price'}
                            {config.currencySymbol}{Number(item[col.field] || 0).toFixed(2)}
                          {:else}
                            {item[col.field] ?? ''}
                          {/if}
                        </td>
                      {/each}
                    </tr>
                  {/each}
                {/if}
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-neutral-500 bg-neutral-50 font-bold text-xs">
                  <td class="py-1 px-2 border-r border-neutral-300" colspan="2">合计 (TOTAL):</td>
                  <td class="py-1 px-2 border-r border-neutral-300 text-right font-mono" colspan="2">
                    总件数: {totalQty} 件
                  </td>
                  <td class="py-1 px-2 border-r border-neutral-300 text-right font-mono" colspan="3">
                    合计金额: {config.currencySymbol}{totalSum.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Currency Words -->
          {#if config.showAmountInWords}
            <div class="flex items-center justify-between p-2 my-2 border border-neutral-400 bg-neutral-50 text-xs">
              <div class="flex items-center gap-2">
                <span class="font-bold text-neutral-800">金额大写:</span>
                <span class="font-bold font-serif text-neutral-900 tracking-wider">{amountInWords}</span>
              </div>
              <div class="flex items-center gap-1 font-mono text-neutral-700">
                <span>小写合计:</span>
                <span class="font-bold">{config.currencySymbol}{totalSum.toFixed(2)}</span>
              </div>
            </div>
          {/if}

          <!-- Signers -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 mt-4 border-t border-neutral-300 text-xs">
            {#each config.signers as signer}
              <div class="text-neutral-800">{signer}</div>
            {/each}
          </div>

          {#if config.footerNotes}
            <div class="mt-4 pt-2 border-t border-neutral-200 text-[10px] text-neutral-500">
              {config.footerNotes}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
