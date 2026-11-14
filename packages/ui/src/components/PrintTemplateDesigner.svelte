<script lang="ts">
  import type { PaperSize, PrintColumn, PrintTemplateConfig } from './print-utils.js';
  import { numberToChineseCurrency } from './print-utils.js';

  export type { PaperSize, PrintColumn, PrintTemplateConfig };
  export { numberToChineseCurrency };

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
  let config = $state<PrintTemplateConfig>({
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
  });

  // Active view tabs
  let activeTab = $state<'DESIGN' | 'PREVIEW'>('PREVIEW');
  let activeCopyIndex = $state<number>(0);

  // Sample items
  const mockItems = [
    { index: 1, sku: 'PROD-A01', name: '高保真低功耗边缘网关核心模块', spec: 'Pro-16G', quantity: 10, unit_price: 1280.00, total_amount: 12800.00 },
    { index: 2, sku: 'PROD-B02', name: '工业级千兆以太网交换机 (8口 PoE)', spec: 'Gigabit-8P', quantity: 4, unit_price: 650.00, total_amount: 2600.00 },
    { index: 3, sku: 'PROD-C03', name: '金属外壳防浪涌电源适配器', spec: '24V-5A', quantity: 14, unit_price: 120.00, total_amount: 1680.00 },
  ];

  const totalSum = $derived(mockItems.reduce((acc, curr) => acc + curr.total_amount, 0));
  const totalQty = $derived(mockItems.reduce((acc, curr) => acc + curr.quantity, 0));
  const amountInWords = $derived(numberToChineseCurrency(totalSum));

  function getPaperSizeStyles(size: PaperSize) {
    switch (size) {
      case 'A4':
        return 'w-[210mm] min-h-[297mm] p-[15mm]';
      case 'A4_LANDSCAPE':
        return 'w-[297mm] min-h-[210mm] p-[15mm]';
      case 'RECEIPT_80MM':
        return 'w-[80mm] min-h-[160mm] p-[5mm] text-[11px]';
      case 'SHIPPING_100X180':
        return 'w-[100mm] min-h-[180mm] p-[8mm] text-xs';
      case 'TRIPLICATE_241X140':
        return 'w-[241mm] min-h-[140mm] p-[10mm]';
      default:
        return 'w-[210mm] min-h-[297mm] p-[15mm]';
    }
  }

  function handlePrint() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  function handleSave() {
    onSave?.($state.snapshot(config));
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
        class="inline-flex items-center justify-center text-xs font-semibold px-3 py-2 rounded-lg border border-border bg-card text-card-foreground hover:bg-muted transition-colors shadow-sm"
      >
        <svg class="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        调起系统打印
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
    <div class="flex-1 flex flex-col items-center justify-start p-6 rounded-xl border border-border bg-muted/20 overflow-x-auto min-h-[500px]">
      <!-- Copy multi-tabs switcher -->
      {#if config.copies.length > 1}
        <div class="flex items-center gap-2 mb-4">
          <span class="text-xs text-muted-foreground font-medium">预览联次:</span>
          {#each config.copies as copyName, index}
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

      <!-- High-Fidelity Printable Paper Canvas Container -->
      <div
        class="bg-white text-neutral-900 border border-neutral-300 shadow-xl relative transition-all duration-200 select-none {getPaperSizeStyles(config.paperSize)}"
      >
        <!-- Optional Watermark Overlay -->
        {#if config.showWatermark && config.watermarkText}
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 overflow-hidden">
            <span class="text-5xl font-black rotate-[-30deg] tracking-widest text-neutral-900 select-none">
              {config.watermarkText}
            </span>
          </div>
        {/if}

        <!-- Top Header: Company Name & Copy Tag -->
        <div class="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div class="flex flex-col">
            <span class="text-base font-extrabold tracking-wide uppercase">{config.companyName}</span>
            <span class="text-[10px] text-neutral-600 font-mono">{config.subTitle}</span>
          </div>
          <div class="flex flex-col items-end">
            <span class="text-xs font-bold border border-neutral-800 px-2 py-0.5 rounded">
              {config.copies[activeCopyIndex] || '标准打印联'}
            </span>
            <span class="text-[9px] text-neutral-500 mt-1">印刷编号: SV-PRT-0988</span>
          </div>
        </div>

        <!-- Big Center Title & Barcode Row -->
        <div class="flex items-center justify-between my-3">
          <h1 class="text-xl font-bold tracking-widest text-neutral-900">{config.title}</h1>

          {#if config.showBarcode}
            <div class="flex flex-col items-center">
              <!-- Visual Barcode representation -->
              <div class="flex items-end gap-[1.5px] h-7 px-1">
                {#each [2,3,1,4,2,1,3,2,4,1,2,3,1,4,2,3,1,2,4,1,3,2,1,4] as h}
                  <div class="bg-black w-[1.5px]" style="height: {h * 6}px"></div>
                {/each}
              </div>
              <span class="font-mono text-[9px] tracking-wider text-neutral-700">CK-20261115-0089</span>
            </div>
          {/if}
        </div>

        <!-- Meta Grid -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5 text-xs py-2 border-y border-neutral-300">
          {#each config.metaFields as mf}
            <div class="flex items-center">
              <span class="text-neutral-600 w-16 shrink-0">{mf.label}:</span>
              <span class="font-semibold text-neutral-900 font-mono truncate">{mf.value || '-'}</span>
            </div>
          {/each}
        </div>

        <!-- Detail Table -->
        <div class="my-3 overflow-x-auto">
          <table class="w-full text-xs border-collapse border border-neutral-400">
            <thead>
              <tr class="bg-neutral-100 border-b border-neutral-400 text-neutral-800">
                {#each config.columns.filter(c => c.visible) as col}
                  <th
                    class="py-1 px-2 border-r border-neutral-400 font-bold"
                    style="text-align: {col.align || 'left'}; width: {col.width || 'auto'};"
                  >
                    {col.label}
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each mockItems as item}
                <tr class="border-b border-neutral-300 hover:bg-neutral-50">
                  {#each config.columns.filter(c => c.visible) as col}
                    <td
                      class="py-1 px-2 border-r border-neutral-300 font-mono text-[11px]"
                      style="text-align: {col.align || 'left'};"
                    >
                      {#if col.field === 'total_amount' || col.field === 'unit_price'}
                        {config.currencySymbol}{Number((item as Record<string, unknown>)[col.field] || 0).toFixed(2)}
                      {:else}
                        {(item as Record<string, unknown>)[col.field] ?? ''}
                      {/if}
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
            <!-- Summary Row -->
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

        <!-- Amount In Words (Chinese Currency Capitalization) -->
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

        <!-- Signer Signature Fields -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 mt-4 border-t border-neutral-300 text-xs">
          {#each config.signers as signer}
            <div class="flex items-center text-neutral-800">
              <span>{signer}</span>
            </div>
          {/each}
        </div>

        <!-- Footer Notes -->
        {#if config.footerNotes}
          <div class="mt-4 pt-2 border-t border-neutral-200 text-[10px] text-neutral-500 leading-relaxed">
            {config.footerNotes}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
