<script lang="ts">
  import Barcode from './Barcode.svelte';
  import QRCode from './QRCode.svelte';
  import { currencyMinorUnits, numberToChineseCurrency, PRINT_PAPER_DIMENSIONS,
    type PrintTemplateConfig } from './print-utils.js';

  let { config, data = {}, items = [], copies = config.copies }: {
    config: PrintTemplateConfig;
    data?: Record<string, unknown>;
    items?: Record<string, unknown>[];
    copies?: string[];
  } = $props();

  const columns = $derived(config.columns.filter(column => column.visible));
  const totalCents = $derived(items.reduce((sum, row) =>
    sum + currencyMinorUnits(Number(row['total_amount'] ?? row['amount'] ?? 0)), 0));
  const total = $derived(totalCents / 100);
  const quantity = $derived(items.reduce((sum, row) => sum + Number(row['quantity'] ?? row['qty'] ?? 0), 0));
  const paper = $derived(PRINT_PAPER_DIMENSIONS[config.paperSize]);
  const orderNumber = $derived(String(data['order_no'] ?? config.metaFields.find(field => field.field === 'order_no')?.value ?? ''));
</script>

{#each copies.length ? copies : ['打印联'] as copy, copyIndex (copyIndex)}
  <article class="print-page" data-print-copy={copyIndex}
    style:width="{paper.width}mm" style:min-height="{paper.height}mm">
    {#if config.showWatermark && config.watermarkText}
      <div class="watermark" aria-hidden="true">{config.watermarkText}</div>
    {/if}
    <header><div><strong>{config.companyName}</strong><p>{config.subTitle ?? ''}</p></div><span>{copy}</span></header>
    <div class="document-title">
      <h1>{config.title}</h1>
      <div class="codes">
        {#if config.showBarcode && orderNumber}
          {#if /^[\x20-\x7e]+$/.test(orderNumber)}
            <Barcode value={orderNumber} width={1} height={45} margin={10} />
          {:else}<span>单号不支持 Code 128 B 编码</span>{/if}
        {/if}
        {#if config.showQrCode && orderNumber}
          <QRCode value={orderNumber} size={80} color="black" background="white" ariaLabel="单据二维码" />
        {/if}
      </div>
    </div>
    <dl>{#each config.metaFields as field (field.id)}
      <div><dt>{field.label}:</dt><dd>{String(data[field.field] ?? field.value ?? '-')}</dd></div>
    {/each}</dl>
    {#if columns.length}
      <table>
        <thead><tr>{#each columns as column (column.id)}
          <th style:text-align={column.align ?? 'left'} style:width={column.width ?? 'auto'}>{column.label}</th>
        {/each}</tr></thead>
        <tbody>{#each items as row, index (index)}
          <tr>{#each columns as column (column.id)}
            <td style:text-align={column.align ?? 'left'}>
              {#if column.field === 'index'}{index + 1}
              {:else if column.field === 'total_amount' || column.field === 'unit_price'}
                {config.currencySymbol}{(currencyMinorUnits(Number(row[column.field] ?? (column.field === 'total_amount' ? row['amount'] : 0) ?? 0)) / 100).toFixed(2)}
              {:else if column.field === 'quantity'}{row['quantity'] ?? row['qty'] ?? ''}
              {:else}{String(row[column.field] ?? '')}{/if}
            </td>
          {/each}</tr>
        {:else}<tr><td colspan={columns.length}>暂无单据明细数据</td></tr>{/each}</tbody>
      </table>
    {/if}
    <div class="summary"><strong>合计 (TOTAL):</strong><span>总件数: {quantity} 件</span>
      <strong>合计金额: {config.currencySymbol}{total.toFixed(2)}</strong></div>
    {#if config.showAmountInWords}
      <div class="summary">金额大写: <strong>{numberToChineseCurrency(total)}</strong>
        <span>小写合计: {config.currencySymbol}{total.toFixed(2)}</span></div>
    {/if}
    <footer>{#each config.signers as signer, index (index)}<span>{signer}</span>{/each}</footer>
    {#if config.footerNotes}<p class="notes">{config.footerNotes}</p>{/if}
  </article>
{/each}

<style>
  .print-page { box-sizing: border-box; padding: 8mm; position: relative; background: white; color: black; font: 12px/1.5 sans-serif; overflow-wrap: anywhere; }
  header, .document-title, .summary, footer { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; }
  header { border-bottom: 1px solid black; padding-bottom: 8px; }
  header p, h1 { margin: 0; }
  h1 { font-size: 20px; }
  .document-title { margin: 12px 0; }
  .codes { display: flex; flex-wrap: wrap; align-items: center; max-width: 100%; }
  .codes :global([data-svadmin-component="Barcode"]) { color: black; background: white; --foreground: black; --muted-foreground: black; max-width: 100%; }
  dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-block: 1px solid #bbb; padding: 8px 0; }
  dl div { display: flex; flex-wrap: wrap; gap: 6px; } dd { margin: 0; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 1px solid #bbb; padding: 4px; overflow-wrap: anywhere; }
  tr { break-inside: avoid; }
  .summary { padding: 8px 0; border-bottom: 1px solid #bbb; }
  footer { margin-top: 16px; } .notes { font-size: 10px; }
  .watermark { position: absolute; inset: 0; display: grid; place-items: center; opacity: 0.05; font-size: 48px; pointer-events: none; }
  @media print { .print-page:not(:last-child) { break-after: page; } }
</style>
