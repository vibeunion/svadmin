<script lang="ts">
  import { untrack } from 'svelte';
  import type { PrintTemplateConfig } from './print-utils.js';
  import { printSampleItems } from './print-utils.js';
  import { printDocument } from './print-document.js';
  import PrintDocument from './PrintDocument.svelte';

  export interface PrintTemplateDesignerProps {
    config?: Partial<PrintTemplateConfig>;
    sampleData?: Record<string, unknown>;
    class?: string;
    onSave?: (config: PrintTemplateConfig) => void;
    onPreview?: (config: PrintTemplateConfig) => void;
  }

  const {
    config: initialConfig = {},
    sampleData = {},
    class: className = '',
    onSave,
    onPreview,
  }: PrintTemplateDesignerProps = $props();

  // Reactive state
  let config = $state<PrintTemplateConfig>(untrack(() => ({
    id: initialConfig.id || 'template-receipt-standard',
    name: initialConfig.name || '标准销售出库发货单',
    title: initialConfig.title || '商品发货单 / 出库凭证',
    subTitle: initialConfig.subTitle || 'SHIPPING & WAREHOUSE DISPATCH NOTE',
    companyName: initialConfig.companyName || '极速智能科技 (北京) 有限责任公司',
    paperSize: initialConfig.paperSize || 'A4',
    showBarcode: initialConfig.showBarcode ?? true,
    showQrCode: initialConfig.showQrCode ?? true,
    showWatermark: initialConfig.showWatermark ?? false,
    watermarkText: initialConfig.watermarkText || '正品保证 · 内部凭据',
    showAmountInWords: initialConfig.showAmountInWords ?? true,
    currencySymbol: initialConfig.currencySymbol || '¥',
    metaFields: initialConfig.metaFields || [
      { id: 'f-1', label: '单据编号', field: 'order_no', value: 'CK-20261115-0089' },
      { id: 'f-2', label: '出库日期', field: 'dispatch_date', value: '2026-11-15' },
      { id: 'f-3', label: '客户名称', field: 'customer_name', value: '未来科技有限公司' },
      { id: 'f-4', label: '出库仓库', field: 'warehouse', value: '华东一号中心仓 (A-02)' },
      { id: 'f-5', label: '联系电话', field: 'phone', value: '138-0000-8888' },
      { id: 'f-6', label: '结算方式', field: 'payment_method', value: '银行对公转账 / 月结' },
    ],
    columns: initialConfig.columns || [
      { id: 'c-1', label: '序号', field: 'index', width: '40px', align: 'center', visible: true },
      { id: 'c-2', label: '商品编号', field: 'sku', width: '90px', align: 'left', visible: true },
      { id: 'c-3', label: '商品/物料名称', field: 'name', width: 'auto', align: 'left', visible: true },
      { id: 'c-4', label: '规格型号', field: 'spec', width: '80px', align: 'center', visible: true },
      { id: 'c-5', label: '数量', field: 'quantity', width: '60px', align: 'right', visible: true },
      { id: 'c-6', label: '单价', field: 'unit_price', width: '70px', align: 'right', visible: true },
      { id: 'c-7', label: '金额 (元)', field: 'total_amount', width: '80px', align: 'right', visible: true },
      { id: 'c-8', label: '备注', field: 'remark', width: '80px', align: 'left', visible: false },
    ],
    signers: initialConfig.signers || ['制单人: 张三', '仓管员: 李四', '复核人: 王五', '提货人(签字): _______'],
    copies: initialConfig.copies || ['第一联: 存根联 (白)', '第二联: 客户联 (红)', '第三联: 财务联 (黄)'],
    footerNotes: initialConfig.footerNotes || '特别提示: 货物送达后请现场当面验收并在提货联签字确认，如有异议请在24小时内联系客服。',
  })));

  // Active view tabs
  let activeTab = $state<'DESIGN' | 'PREVIEW'>('PREVIEW');
  let activeCopyIndex = $state<number>(0);

  const sampleItems = $derived(printSampleItems(sampleData));
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

  function handleSave() {
    onSave?.($state.snapshot(config));
  }

  function handlePreview() {
    onPreview?.($state.snapshot(config));
  }

  function addColumn() {
    const id = `col-${Date.now()}`;
    config.columns = [
      ...config.columns,
      { id, label: '新增列', field: 'custom_field', width: '80px', align: 'left', visible: true },
    ];
  }

  function removeColumn(id: string) {
    config.columns = config.columns.filter(c => c.id !== id);
  }
</script>

<div
  class="w-full flex flex-col gap-6 p-6 bg-background text-foreground rounded-xl border border-border shadow-sm {className}"
  data-svadmin-component="PrintTemplateDesigner"
  data-svadmin-resource="print_templates"
>
  <!-- Top Navigation & Action Controls -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <h2 class="text-xl font-bold tracking-tight text-foreground">单据套打与模板打印设计器 (Print Studio)</h2>
        <span class="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/20">
          Enterprise Print
        </span>
      </div>
      <p class="text-sm text-muted-foreground">
        定制出入库单、仓储面单、财务三联单标准规范，内置大写金额自动转换与高保真分页防截断打印。
      </p>
    </div>

    <div class="flex items-center gap-2">
      <!-- Tabs -->
      <div class="inline-flex rounded-lg border border-border p-1 bg-muted/40">
        <button
          type="button"
          onclick={() => (activeTab = 'PREVIEW')}
          class="text-xs px-3 py-1.5 rounded-md font-medium transition-colors {activeTab === 'PREVIEW' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
        >
          单据实效预览
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'DESIGN')}
          class="text-xs px-3 py-1.5 rounded-md font-medium transition-colors {activeTab === 'DESIGN' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
        >
          属性与版式配置
        </button>
      </div>

      <button
        type="button"
        onclick={handlePrint}
        disabled={printing}
        class="inline-flex items-center justify-center text-xs font-semibold px-3 py-2 rounded-lg border border-border bg-card text-card-foreground hover:bg-muted transition-colors shadow-sm"
      >
        <svg class="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        调起系统打印
      </button>

      <button
        type="button"
        onclick={handlePreview}
        class="inline-flex items-center justify-center text-xs font-semibold px-3 py-2 rounded-lg border border-border bg-card text-card-foreground hover:bg-muted transition-colors shadow-sm"
      >
        预览模板
      </button>

      <button
        type="button"
        onclick={handleSave}
        class="inline-flex items-center justify-center text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
      >
        保存模板
      </button>
    </div>
  </div>

  <!-- Main Work Area -->
  <div class="flex flex-col lg:flex-row gap-6">
    <!-- Left: Designer Configuration Panel (Shown when DESIGN or on side) -->
    {#if activeTab === 'DESIGN'}
      <div class="w-full lg:w-96 flex flex-col gap-4 p-4 rounded-xl border border-border bg-card text-xs">
        <h3 class="font-bold text-sm text-foreground border-b border-border pb-2">版式与基本参数</h3>

        <!-- Paper Size -->
        <div class="flex flex-col gap-1.5">
          <label for="paper-size-select" class="font-semibold text-foreground">纸张规格</label>
          <select
            id="paper-size-select"
            bind:value={config.paperSize}
            class="px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground"
          >
            <option value="A4">A4 纵向 (210 × 297 mm)</option>
            <option value="A4_LANDSCAPE">A4 横向 (297 × 210 mm)</option>
            <option value="TRIPLICATE_241X140">针式三联打孔单 (241 × 140 mm)</option>
            <option value="SHIPPING_100X180">仓储物流面单 (100 × 180 mm)</option>
            <option value="RECEIPT_80MM">热敏小票 (80 mm)</option>
          </select>
        </div>

        <!-- Titles -->
        <div class="flex flex-col gap-1.5">
          <label for="company-name-input" class="font-semibold text-foreground">企业抬头名称</label>
          <input
            id="company-name-input"
            type="text"
            bind:value={config.companyName}
            class="px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="main-title-input" class="font-semibold text-foreground">单据大标题</label>
          <input
            id="main-title-input"
            type="text"
            bind:value={config.title}
            class="px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground"
          />
        </div>

        <!-- Options toggles -->
        <div class="flex flex-col gap-2 pt-2 border-t border-border">
          <span class="font-semibold text-foreground">单据功能组件</span>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" bind:checked={config.showBarcode} class="rounded border-border" />
            <span>显示流水单号条形码 (Code 128)</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" bind:checked={config.showQrCode} class="rounded border-border" />
            <span>显示溯源验真二维码</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" bind:checked={config.showAmountInWords} class="rounded border-border" />
            <span>自动生成中文人民币大写合计</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" bind:checked={config.showWatermark} class="rounded border-border" />
            <span>开启背景防伪水印</span>
          </label>
        </div>

        <!-- Column Settings -->
        <div class="flex flex-col gap-2 pt-2 border-t border-border">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-foreground">明细表格列显隐</span>
            <button type="button" onclick={addColumn} class="text-[11px] text-primary hover:underline">+ 增列</button>
          </div>
          <div class="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
            {#each config.columns as col (col.id)}
              <div class="flex items-center justify-between p-1.5 rounded bg-muted/40 border border-border">
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" bind:checked={col.visible} class="rounded border-border" />
                  <input type="text" bind:value={col.label} class="w-24 text-xs bg-transparent border-b border-border/50 focus:outline-none" />
                </label>
                <button type="button" onclick={() => removeColumn(col.id)} class="text-muted-foreground hover:text-destructive px-1">✕</button>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- Right: High-Fidelity Paper Preview -->
    <div class="flex-1 flex flex-col items-center justify-start p-6 rounded-xl border border-border bg-muted/20 overflow-x-auto">
      <!-- Copy multi-tabs switcher -->
      {#if config.copies.length > 1}
        <div class="flex items-center gap-2 mb-4">
          <span class="text-xs text-muted-foreground font-medium">预览联次:</span>
          {#each config.copies as copyName, index (copyName)}
            <button
              type="button"
              onclick={() => (activeCopyIndex = index)}
              class="text-xs px-3 py-1 rounded-full border transition-colors {activeCopyIndex === index ? 'bg-primary text-primary-foreground border-primary font-semibold' : 'bg-card text-muted-foreground border-border hover:bg-muted'}"
            >
              {copyName}
            </button>
          {/each}
        </div>
      {/if}

      {#if printError}<p role="alert">{printError}</p>{/if}
      <PrintDocument {config} data={sampleData} items={sampleItems}
        copies={[config.copies[activeCopyIndex] ?? '打印联']} />
      <div bind:this={pages} class="print-pages" hidden>
        <PrintDocument {config} data={sampleData} items={sampleItems} />
      </div>
    </div>
  </div>
</div>
