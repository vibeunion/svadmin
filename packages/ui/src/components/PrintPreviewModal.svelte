<script lang="ts">
  import { Printer, X } from '@lucide/svelte';
  import type { PrintTemplateConfig } from './print-utils.js';
  import PrintDocument from './PrintDocument.svelte';
  import { printDocument } from './print-document.js';

  export interface PrintPreviewModalProps {
    open?: boolean;
    config: PrintTemplateConfig;
    data?: Record<string, unknown>;
    items?: Array<Record<string, unknown>>;
    onClose?: () => void;
  }
  let { open = $bindable(false), config, data = {}, items = [], onClose }: PrintPreviewModalProps = $props();
  let pages = $state<HTMLDivElement>();
  let printing = $state(false);
  let printError = $state('');

  async function handlePrint() {
    if (printing || !pages) return;
    printing = true;
    printError = '';
    try { await printDocument(pages, config.paperSize); }
    catch { printError = '打印失败，请检查浏览器打印权限后重试'; }
    finally { printing = false; }
  }
  function handleClose() { open = false; onClose?.(); }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
    data-svadmin-component="PrintPreviewModal" data-svadmin-resource="print_templates">
    <div role="dialog" aria-modal="true" aria-label="单据打印预览"
      class="w-full max-w-4xl max-h-[92vh] overflow-auto rounded-lg bg-card border border-border p-6 shadow-2xl text-foreground">
      <div class="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <h3 class="font-bold text-base">单据打印预览 <span class="text-xs">{config.paperSize}</span></h3>
        <div class="flex gap-2">
          <button type="button" onclick={handlePrint} disabled={printing}
            class="flex gap-2 items-center px-3 py-2 rounded-md bg-primary text-primary-foreground">
            <Printer class="size-4" />打印全部联次
          </button>
          <button type="button" onclick={handleClose} aria-label="关闭" title="关闭"
            class="p-2 rounded-md border border-border"><X class="size-4" /></button>
        </div>
      </div>
      {#if printError}<p role="alert">{printError}</p>{/if}
      <div class="overflow-x-auto mt-4">
        <div bind:this={pages} class="print-pages"><PrintDocument {config} {data} {items} /></div>
      </div>
    </div>
  </div>
{/if}
