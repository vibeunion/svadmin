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

<div class={cn('space-y-4 text-xs', className)}>
  <!-- Print Trigger Bar (Hidden during actual print) -->
  <div class="flex items-center justify-between p-3 rounded-xl border border-border bg-card shadow-xs print:hidden">
    <div class="text-muted-foreground">
      Document Ready: <strong class="text-foreground">{billNumber}</strong>
    </div>
    <Button size="sm" class="h-8 text-xs gap-1.5" onclick={handlePrint}>
      <Printer class="h-3.5 w-3.5" />
      Print Document
    </Button>
  </div>

  <!-- Printable A4 Paper Container -->
  <div class="rounded-xl border border-border bg-card p-8 shadow-xs max-w-3xl mx-auto space-y-6 print:border-none print:shadow-none print:p-0 print:m-0">
    <!-- Header -->
    <div class="flex items-start justify-between border-b-2 border-primary/40 pb-4">
      <div>
        <h2 class="text-xl font-bold text-foreground tracking-tight">{title}</h2>
        <p class="text-muted-foreground font-mono mt-0.5">No: {billNumber}</p>
      </div>
      <div class="text-right space-y-0.5">
        <h3 class="font-semibold text-foreground">{companyName}</h3>
        {#if companyAddress}
          <p class="text-muted-foreground text-[11px]">{companyAddress}</p>
        {/if}
        <p class="text-muted-foreground text-[11px]">Date: {date}</p>
      </div>
    </div>

    <!-- Customer Info -->
    <div class="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1">
      <span class="text-muted-foreground font-semibold uppercase text-[10px] block">Bill To</span>
      <div class="font-semibold text-foreground">{customerName}</div>
      {#if customerAddress}
        <div class="text-muted-foreground text-[11px]">{customerAddress}</div>
      {/if}
    </div>

    <!-- Items Table -->
    <table class="w-full text-left border-collapse border border-border/60">
      <thead class="bg-muted/40 font-semibold text-foreground border-b border-border/60">
        <tr>
          <th class="p-2 border-r border-border/40 w-12 text-center">#</th>
          <th class="p-2 border-r border-border/40">Item Description</th>
          <th class="p-2 border-r border-border/40 text-center w-20">Qty</th>
          <th class="p-2 border-r border-border/40 text-right w-24">Unit Price</th>
          <th class="p-2 text-right w-28">Amount</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border/40">
        {#each items as item, index (index)}
          {@const rowTotal = item.total ?? item.quantity * item.unitPrice}
          <tr>
            <td class="p-2 border-r border-border/40 text-center text-muted-foreground">{index + 1}</td>
            <td class="p-2 border-r border-border/40 font-medium text-foreground">
              {item.name}
              {#if item.spec}
                <span class="block text-[11px] text-muted-foreground">{item.spec}</span>
              {/if}
            </td>
            <td class="p-2 border-r border-border/40 text-center tabular-nums">{item.quantity}</td>
            <td class="p-2 border-r border-border/40 text-right tabular-nums">¥{item.unitPrice.toFixed(2)}</td>
            <td class="p-2 text-right tabular-nums font-semibold text-foreground">¥{rowTotal.toFixed(2)}</td>
          </tr>
        {/each}
      </tbody>
      <tfoot class="border-t-2 border-border font-semibold text-foreground bg-muted/20">
        <tr>
          <td colspan="4" class="p-2.5 text-right border-r border-border/40">Total Summary:</td>
          <td class="p-2.5 text-right text-sm tabular-nums text-primary font-bold">¥{subtotal.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Footer Notes & Signatures -->
    <div class="flex items-end justify-between pt-4 border-t border-border/40 text-xs">
      <div class="space-y-1 max-w-sm">
        {#if notes}
          <span class="font-semibold text-muted-foreground block text-[11px]">Notes:</span>
          <p class="text-muted-foreground">{notes}</p>
        {/if}
      </div>

      <div class="text-right space-y-4">
        {#if issuer}
          <p class="text-muted-foreground">Issued By: <strong class="text-foreground">{issuer}</strong></p>
        {/if}
        <div class="w-40 border-b border-foreground/40 pt-6"></div>
        <p class="text-[10px] text-muted-foreground text-center">Authorized Signature & Stamp</p>
      </div>
    </div>
  </div>
</div>
