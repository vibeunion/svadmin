<script lang="ts">
  import { X, Receipt, Download, FileText, CheckCircle2, Clock, RotateCcw } from '@lucide/svelte';
  import { formatAdminCurrency } from '@svadmin/core';
  import { cn } from '../utils.js';

  export interface BillingItem {
    id: string;
    description: string;
    category: string;
    amount: number;
    quantity?: number | undefined;
  }

  export interface InvoiceData {
    invoiceNo: string;
    period: string;
    issueDate: string;
    status: 'paid' | 'pending' | 'refunded';
    totalAmount: number;
    taxAmount?: number | undefined;
    items: BillingItem[];
    invoiceTitle?: string | undefined;
    taxId?: string | undefined;
    downloadUrl?: string | undefined;
  }

  export interface BillingInvoiceDrawerProps {
    open?: boolean | undefined;
    invoice: InvoiceData | null;
    onclose?: (() => void) | undefined;
    onrequestinvoice?: (() => void) | undefined;
    ondownload?: ((url: string) => void) | undefined;
    class?: string | undefined;
  }

  let {
    open = false,
    invoice,
    onclose,
    onrequestinvoice,
    ondownload,
    class: className = '',
  }: BillingInvoiceDrawerProps = $props();

  function getStatusTone(status: InvoiceData['status']) {
    switch (status) {
      case 'paid':
        return {
          badge: 'bg-success/10 text-success border-success/30',
          icon: CheckCircle2,
          text: '已全额结清 (Paid)',
        };
      case 'pending':
        return {
          badge: 'bg-warning/10 text-warning border-warning/30',
          icon: Clock,
          text: '等待付款 (Pending)',
        };
      case 'refunded':
      default:
        return {
          badge: 'bg-muted text-muted-foreground border-border',
          icon: RotateCcw,
          text: '已退款 (Refunded)',
        };
    }
  }
</script>

{#if open && invoice}
  {@const statusTone = getStatusTone(invoice.status)}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs select-none flex justify-end"
    data-svadmin-component="BillingInvoiceDrawer"
    role="dialog"
    aria-modal="true"
  >
    <div
      class={cn(
        'w-full max-w-lg h-full bg-card border-l border-border text-card-foreground shadow-[var(--shadow-overlay)] flex flex-col',
        className
      )}
    >
      <!-- Header -->
      <header class="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/20 shrink-0">
        <div class="flex items-center gap-2">
          <Receipt class="h-4 w-4 text-primary" />
          <h3 class="font-bold text-sm text-foreground">账单与结算明细</h3>
        </div>
        <button
          type="button"
          class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          onclick={onclose}
          aria-label="Close drawer"
        >
          <X class="h-4 w-4" />
        </button>
      </header>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
        <!-- Invoice Overview Card -->
        <div class="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
          <div class="flex justify-between items-start">
            <div>
              <span class="text-muted-foreground text-[11px] block">账期编号</span>
              <span class="font-mono font-bold text-foreground text-sm">{invoice.invoiceNo}</span>
            </div>
            <span class={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-semibold text-[11px] font-mono', statusTone.badge)}>
              <statusTone.icon class="h-3 w-3" />
              <span>{statusTone.text}</span>
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-[11px] font-mono border-t border-border/60 pt-2 text-muted-foreground">
            <div>结算周期: <strong class="text-foreground">{invoice.period}</strong></div>
            <div>出账日期: <strong class="text-foreground">{invoice.issueDate}</strong></div>
          </div>
        </div>

        <!-- Total Settlement Box -->
        <div class="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-baseline justify-between font-mono">
          <div>
            <span class="text-muted-foreground text-xs block">当期应付结算总额</span>
            <span class="text-2xl font-bold text-primary">{formatAdminCurrency(invoice.totalAmount, { locale: 'zh-CN', currency: 'CNY' })}</span>
          </div>
          {#if invoice.taxAmount !== undefined}
            <span class="text-xs text-muted-foreground">含增值税额: {formatAdminCurrency(invoice.taxAmount, { locale: 'zh-CN', currency: 'CNY' })}</span>
          {/if}
        </div>

        <!-- Itemized Table -->
        <div class="space-y-2">
          <h4 class="font-semibold text-foreground text-xs">消费项目明细清单</h4>
          <div class="rounded-lg border border-border overflow-hidden">
            <table class="w-full border-collapse font-mono text-xs">
              <thead class="bg-muted/40 border-b border-border text-muted-foreground">
                <tr>
                  <th class="p-2.5 text-left font-medium">项目描述</th>
                  <th class="p-2.5 text-center font-medium">类别</th>
                  <th class="p-2.5 text-right font-medium">金额</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/60">
                {#each invoice.items as item (item.id)}
                  <tr class="hover:bg-muted/20">
                    <td class="p-2.5 text-foreground">
                      <span class="font-medium block">{item.description}</span>
                      {#if item.quantity}
                        <span class="text-xs text-muted-foreground">数量: {item.quantity}</span>
                      {/if}
                    </td>
                    <td class="p-2.5 text-center text-muted-foreground">{item.category}</td>
                    <td class="p-2.5 text-right font-bold text-foreground">{formatAdminCurrency(item.amount, { locale: 'zh-CN', currency: 'CNY' })}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tax & Invoicing Section -->
        <div class="rounded-lg border border-border bg-card p-4 space-y-3">
          <h4 class="font-semibold text-foreground text-xs flex items-center gap-1.5">
            <FileText class="h-3.5 w-3.5 text-primary" />
            <span>发票凭证与税务信息</span>
          </h4>

          {#if invoice.invoiceTitle}
            <div class="text-[11px] font-mono space-y-1 text-muted-foreground">
              <div>发票抬头: <strong class="text-foreground">{invoice.invoiceTitle}</strong></div>
              {#if invoice.taxId}
                <div>纳税人识别号: <strong class="text-foreground">{invoice.taxId}</strong></div>
              {/if}
            </div>
          {:else}
            <p class="text-xs text-muted-foreground">当前月结单尚未开具发票，可在此提交开票申请。</p>
          {/if}
        </div>
      </div>

      <!-- Footer Actions -->
      <footer class="flex items-center justify-end gap-2.5 border-t border-border px-5 py-3.5 bg-muted/20 shrink-0 text-xs font-medium">
        {#if invoice.downloadUrl}
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
            onclick={() => invoice.downloadUrl && ondownload?.(invoice.downloadUrl)}
          >
            <Download class="h-3.5 w-3.5" />
            <span>下载电子发票 (PDF)</span>
          </button>
        {:else if onrequestinvoice}
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3.5 py-1.5 text-foreground hover:bg-muted transition-colors cursor-pointer"
            onclick={onrequestinvoice}
          >
            <FileText class="h-3.5 w-3.5 text-primary" />
            <span>申请增值税电子发票</span>
          </button>
        {/if}
      </footer>
    </div>
  </div>
{/if}
