<script lang="ts">
  import { Button } from './ui/button/index.js';
  import { Printer } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface BillItem {
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
    companyAddress?: string;
    customerName: string;
    customerAddress?: string;
    items?: BillItem[];
    notes?: string;
    issuer?: string;
    onprint?: () => void;
    class?: string;
  }

  let {
    title = 'INVOICE / RECEIPT',
    billNumber,
    date,
    companyName = 'Enterprise Admin Co., Ltd.',
    companyAddress,
    customerName,
    customerAddress,
    items = [],
    notes,
    issuer,
    onprint,
    class: className = '',
  }: Props = $props();

  const subtotal = $derived(
    items.reduce((acc, item) => acc + (item.total ?? item.quantity * item.unitPrice), 0)
  );

  function handlePrint() {
    if (onprint) {
      onprint();
    } else if (typeof window !== 'undefined') {
      window.print();
    }
  }
</script>

<div class={cn('svadmin-u-3e7ce58d64fa svadmin-u-359090c2d529', className)}>
  <!-- Print Trigger Bar (Hidden during actual print) -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-eb6e8b881acd svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-cef5b893cf23 svadmin-u-38a2a10339a0">
    <div class="svadmin-u-bfa603190748">
      Document Ready: <strong class="svadmin-u-d4108abe6359">{billNumber}</strong>
    </div>
    <Button size="sm" class="svadmin-u-ed8a5df7b2fb svadmin-u-359090c2d529 svadmin-u-58284b4ea568" onclick={handlePrint}>
      <Printer class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
      Print Document
    </Button>
  </div>

  <!-- Printable A4 Paper Container -->
  <div class="svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-845f53365c8d svadmin-u-cef5b893cf23 svadmin-u-fa3f7111e53b svadmin-u-0e12dc7de920 svadmin-u-b3542e058833 svadmin-u-952dfef04298 svadmin-u-a9436de0cd55 svadmin-u-d0dfe7e6acb2 svadmin-u-3d50bc090e79">
    <!-- Header -->
    <div class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-8ef2268efbbc svadmin-u-65ac0c49a5d5 svadmin-u-f5583b2907be svadmin-u-9fcd8a13827e">
      <div>
        <h2 class="svadmin-u-d5c9b0001e7e svadmin-u-69450ef1487e svadmin-u-d4108abe6359 svadmin-u-1d7f28b046ad">{title}</h2>
        <p class="svadmin-u-bfa603190748 svadmin-u-0e65706bcccd svadmin-u-15e1b1f444fe">No: {billNumber}</p>
      </div>
      <div class="svadmin-u-308fc069e46e svadmin-u-e2eedc5718f0">
        <h3 class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{companyName}</h3>
        {#if companyAddress}
          <p class="svadmin-u-bfa603190748 svadmin-u-d058ca6de60f">{companyAddress}</p>
        {/if}
        <p class="svadmin-u-bfa603190748 svadmin-u-d058ca6de60f">Date: {date}</p>
      </div>
    </div>

    <!-- Customer Info -->
    <div class="svadmin-u-eb6e8b881acd svadmin-u-5f22e64f2282 svadmin-u-967d113a1451 svadmin-u-ca6bcd4b6f3f svadmin-u-6ee2d41e2d2d svadmin-u-da7c36cd8867">
      <span class="svadmin-u-bfa603190748 svadmin-u-e83a7042bc91 uppercase svadmin-u-1dc571a3609f svadmin-u-0214b4b355d1">Bill To</span>
      <div class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{customerName}</div>
      {#if customerAddress}
        <div class="svadmin-u-bfa603190748 svadmin-u-d058ca6de60f">{customerAddress}</div>
      {/if}
    </div>

    <!-- Items Table -->
    <table class="svadmin-u-6da6a3c3f741 svadmin-u-2eba0d65d059 svadmin-u-4583f90cd9bd svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff">
      <thead class="svadmin-u-b00f43c30c2b svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
        <tr>
          <th class="svadmin-u-7660b450905a svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d svadmin-u-e7e371071bc5 svadmin-u-ca6bf63030aa">#</th>
          <th class="svadmin-u-7660b450905a svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d">Item Description</th>
          <th class="svadmin-u-7660b450905a svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d svadmin-u-ca6bf63030aa svadmin-u-ed831a4dff32">Qty</th>
          <th class="svadmin-u-7660b450905a svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d svadmin-u-308fc069e46e svadmin-u-69da7e4ff95d">Unit Price</th>
          <th class="svadmin-u-7660b450905a svadmin-u-308fc069e46e svadmin-u-b67ee2eeca37">Amount</th>
        </tr>
      </thead>
      <tbody class="svadmin-u-fa6acbf81d74 svadmin-u-08b5607c7258">
        {#each items as item, index (index)}
          {@const rowTotal = item.total ?? item.quantity * item.unitPrice}
          <tr>
            <td class="svadmin-u-7660b450905a svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d svadmin-u-ca6bf63030aa svadmin-u-bfa603190748">{index + 1}</td>
            <td class="svadmin-u-7660b450905a svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d svadmin-u-2689f3958069 svadmin-u-d4108abe6359">
              {item.name}
              {#if item.spec}
                <span class="svadmin-u-0214b4b355d1 svadmin-u-d058ca6de60f svadmin-u-bfa603190748">{item.spec}</span>
              {/if}
            </td>
            <td class="svadmin-u-7660b450905a svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d svadmin-u-ca6bf63030aa svadmin-u-3032cae0badb">{item.quantity}</td>
            <td class="svadmin-u-7660b450905a svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d svadmin-u-308fc069e46e svadmin-u-3032cae0badb">¥{item.unitPrice.toFixed(2)}</td>
            <td class="svadmin-u-7660b450905a svadmin-u-308fc069e46e svadmin-u-3032cae0badb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">¥{rowTotal.toFixed(2)}</td>
          </tr>
        {/each}
      </tbody>
      <tfoot class="svadmin-u-bee68af349c9 svadmin-u-18049387f0af svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359 svadmin-u-967d113a1451">
        <tr>
          <td colspan="4" class="svadmin-u-9fe52d5d506c svadmin-u-308fc069e46e svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d">Total Summary:</td>
          <td class="svadmin-u-9fe52d5d506c svadmin-u-308fc069e46e svadmin-u-fc7473ca09eb svadmin-u-3032cae0badb svadmin-u-20aaf08a7ed1 svadmin-u-69450ef1487e">¥{subtotal.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Footer Notes & Signatures -->
    <div class="svadmin-u-60fbb7713999 svadmin-u-6f27f4f79e55 svadmin-u-8ef2268efbbc svadmin-u-173fa8f06789 svadmin-u-b950dda299d3 svadmin-u-6ee2d41e2d2d svadmin-u-359090c2d529">
      <div class="svadmin-u-da7c36cd8867 svadmin-u-2472e9b81a97">
        {#if notes}
          <span class="svadmin-u-e83a7042bc91 svadmin-u-bfa603190748 svadmin-u-0214b4b355d1 svadmin-u-d058ca6de60f">Notes:</span>
          <p class="svadmin-u-bfa603190748">{notes}</p>
        {/if}
      </div>

      <div class="svadmin-u-308fc069e46e svadmin-u-3e7ce58d64fa">
        {#if issuer}
          <p class="svadmin-u-bfa603190748">Issued By: <strong class="svadmin-u-d4108abe6359">{issuer}</strong></p>
        {/if}
        <div class="svadmin-u-84789e8a20cd svadmin-u-65fdbade2025 svadmin-u-a4fe7d4d1e07 svadmin-u-30c1d058f0db"></div>
        <p class="svadmin-u-1dc571a3609f svadmin-u-bfa603190748 svadmin-u-ca6bf63030aa">Authorized Signature & Stamp</p>
      </div>
    </div>
  </div>
</div>
