import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import BillingInvoiceDrawer, { type InvoiceData } from './BillingInvoiceDrawer.svelte';

describe('BillingInvoiceDrawer Component', () => {
  const sampleInvoice: InvoiceData = {
    invoiceNo: 'INV-202611-00192',
    period: '2026年10月度',
    issueDate: '2026-11-01',
    status: 'paid',
    totalAmount: 12500,
    items: [
      { id: '1', description: 'SVAdmin 专属授权', category: '基础软件', amount: 10000, quantity: 1 },
      { id: '2', description: '超量存储流量包', category: '云计算', amount: 2500 },
    ],
    invoiceTitle: '科技创新控股有限公司',
    downloadUrl: 'https://example.test/invoice.pdf',
  };

  it('does not render drawer when open is false', () => {
    const { container } = render(BillingInvoiceDrawer, {
      props: {
        open: false,
        invoice: sampleInvoice,
      },
    });

    expect(container.querySelector('[data-svadmin-component="BillingInvoiceDrawer"]')).toBeNull();
  });

  it('renders invoice details, settlement amount and download action', async () => {
    const onDownload = vi.fn();
    const { container } = render(BillingInvoiceDrawer, {
      props: {
        open: true,
        invoice: sampleInvoice,
        ondownload: onDownload,
      },
    });

    const root = container.querySelector('[data-svadmin-component="BillingInvoiceDrawer"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('INV-202611-00192');
    expect(container.textContent).toContain('¥12,500');
    expect(container.textContent).toContain('已全额结清 (Paid)');
    expect(container.textContent).toContain('科技创新控股有限公司');

    const downloadBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('下载电子发票')
    );
    expect(downloadBtn).toBeTruthy();
    if (downloadBtn) {
      await fireEvent.click(downloadBtn);
      expect(onDownload).toHaveBeenCalledWith('https://example.test/invoice.pdf');
    }
  });
});
