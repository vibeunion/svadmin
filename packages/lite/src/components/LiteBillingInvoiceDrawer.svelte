<script lang="ts">
  interface BillItem {
    name: string;
    amount: string | number;
  }

  interface Props {
    invoiceNo?: string;
    period?: string;
    totalAmount?: string | number;
    status?: string;
    items?: BillItem[];
    downloadUrl?: string;
    class?: string;
  }

  let {
    invoiceNo = 'INV-202611-001',
    period = '2026-10',
    totalAmount = '¥12,500',
    status = 'paid',
    items = [
      { name: 'SaaS Monthly License', amount: '¥10,000' },
      { name: 'Extra Storage Usage', amount: '¥2,500' },
    ],
    downloadUrl,
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-invoice-card {className}"
  data-svadmin-component="LiteBillingInvoiceDrawer"
  role="region"
  aria-label="Billing Invoice Details"
>
  <header class="lite-inv-header">
    <div>
      <span class="lite-inv-no">账单 #{invoiceNo}</span>
      <span class="lite-inv-period">({period})</span>
    </div>
    <span class="lite-inv-status lite-status-{status.toLowerCase()}">{status.toUpperCase()}</span>
  </header>

  <div class="lite-inv-body">
    <div class="lite-inv-total">
      <span class="lite-total-label">结算总金额:</span>
      <strong class="lite-total-val">{totalAmount}</strong>
    </div>

    {#if items.length > 0}
      <ul class="lite-inv-items">
        {#each items as item (item.name)}
          <li>
            <span>{item.name}</span>
            <span class="lite-item-amt">{item.amount}</span>
          </li>
        {/each}
      </ul>
    {/if}

    {#if downloadUrl}
      <div class="lite-inv-action">
        <a href={downloadUrl} class="lite-inv-download">下载发票 (PDF)</a>
      </div>
    {/if}
  </div>
</div>

<style>
  .lite-invoice-card {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-inv-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-inv-no { font-weight: 700; font-family: monospace; color: #1d2129; }
  .lite-inv-period { color: #86909c; font-size: 11px; margin-left: 4px; }
  .lite-inv-status { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
  .lite-status-paid { background: #e8ffea; color: #00b42a; }
  .lite-status-pending { background: #fff7e8; color: #ff7d00; }
  .lite-inv-body { padding: 12px 14px; }
  .lite-inv-total { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #e5e6eb; }
  .lite-total-label { color: #4e5969; }
  .lite-total-val { font-size: 16px; color: #165dff; font-family: monospace; }
  .lite-inv-items { list-style: none; margin: 0 0 10px; padding: 0; }
  .lite-inv-items li { display: flex; justify-content: space-between; padding: 4px 0; color: #4e5969; font-size: 11px; }
  .lite-item-amt { font-family: monospace; font-weight: 600; color: #1d2129; }
  .lite-inv-action { text-align: right; margin-top: 8px; }
  .lite-inv-download { display: inline-block; padding: 4px 10px; background: #165dff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 500; font-size: 11px; }
</style>
