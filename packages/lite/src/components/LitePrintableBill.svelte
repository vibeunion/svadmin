<script lang="ts">
  interface LiteBillItem {
    name: string;
    spec?: string;
    quantity: number;
    unitPrice: number;
    total?: number;
  }

  interface Props {
    title?: string;
    billNumber: string;
    date: string;
    companyName?: string;
    customerName: string;
    items?: LiteBillItem[];
    notes?: string;
  }

  let {
    title = 'INVOICE / RECEIPT',
    billNumber,
    date,
    companyName = 'Enterprise Admin',
    customerName,
    items = [],
    notes,
  }: Props = $props();

  const total = $derived(
    items.reduce((acc, item) => acc + (item.total ?? item.quantity * item.unitPrice), 0)
  );
</script>

<div class="lite-bill-card">
  <div class="lite-bill-header">
    <div style="float: left;">
      <h3 style="margin: 0;">{title}</h3>
      <span style="color: #64748b; font-size: 11px;">No: {billNumber}</span>
    </div>
    <div style="float: right; text-align: right;">
      <strong>{companyName}</strong>
      <div style="color: #64748b; font-size: 11px;">Date: {date}</div>
    </div>
    <div style="clear: both;"></div>
  </div>

  <div class="lite-bill-customer">
    <strong>Bill To:</strong> {customerName}
  </div>

  <table class="lite-table lite-bill-table">
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th>Item Description</th>
        <th style="width: 50px; text-align: center;">Qty</th>
        <th style="width: 80px; text-align: right;">Price</th>
        <th style="width: 90px; text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      {#each items as item, index (index)}
        {@const rowTotal = item.total ?? item.quantity * item.unitPrice}
        <tr>
          <td style="text-align: center;">{index + 1}</td>
          <td>{item.name} {#if item.spec}({item.spec}){/if}</td>
          <td style="text-align: center;">{item.quantity}</td>
          <td style="text-align: right;">¥{item.unitPrice.toFixed(2)}</td>
          <td style="text-align: right; font-weight: bold;">¥{rowTotal.toFixed(2)}</td>
        </tr>
      {/each}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="text-align: right; font-weight: bold;">Grand Total:</td>
        <td style="text-align: right; font-weight: bold; color: #2563eb;">¥{total.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>

  {#if notes}
    <div class="lite-bill-notes">
      <strong>Notes:</strong> {notes}
    </div>
  {/if}
</div>

<style>
  .lite-bill-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 20px;
    margin-bottom: 16px;
  }
  .lite-bill-header {
    border-bottom: 2px solid #3b82f6;
    padding-bottom: 12px;
    margin-bottom: 12px;
  }
  .lite-bill-customer {
    background: #f8fafc;
    padding: 8px 12px;
    border-radius: 4px;
    margin-bottom: 16px;
    font-size: 13px;
  }
  .lite-bill-table {
    width: 100%;
    margin-bottom: 12px;
  }
  .lite-bill-notes {
    font-size: 12px;
    color: #64748b;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
  }
</style>
