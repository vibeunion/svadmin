import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import AsyncExportModal from './AsyncExportModal.svelte';

describe('AsyncExportModal Component', () => {
  const sampleColumns = [
    { key: 'id', label: '订单编号', defaultSelected: true },
    { key: 'customer', label: '客户名称', defaultSelected: true },
    { key: 'amount', label: '成交金额', defaultSelected: true },
    { key: 'remark', label: '内部备注', defaultSelected: false },
  ];

  it('does not render modal when open is false', () => {
    const { container } = render(AsyncExportModal, {
      props: {
        open: false,
        columns: sampleColumns,
      },
    });

    expect(container.querySelector('[data-svadmin-component="AsyncExportModal"]')).toBeNull();
  });

  it('renders export config modal when open is true and toggles columns', async () => {
    const { container } = render(AsyncExportModal, {
      props: {
        open: true,
        resourceName: '订单记录',
        totalCount: 5400,
        selectedCount: 12,
        columns: sampleColumns,
      },
    });

    const modal = container.querySelector('[data-svadmin-component="AsyncExportModal"]');
    expect(modal).toBeTruthy();
    expect(container.textContent).toContain('导出 订单记录');
    expect(container.textContent).toContain('导出字段列 (3/4)');

    // Toggle all columns
    const toggleAllBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('全部勾选')
    );
    expect(toggleAllBtn).toBeTruthy();
    if (toggleAllBtn) {
      await fireEvent.click(toggleAllBtn);
      expect(container.textContent).toContain('导出字段列 (4/4)');
    }
  });

  it('executes custom onexport handler and shows completed download screen', async () => {
    const onExport = vi.fn().mockResolvedValue({
      fileName: 'audit-orders.csv',
      fileSize: '1.2 MB',
      rowCount: 1200,
      durationMs: 420,
      fileUrl: 'https://example.test/audit-orders.csv',
    });

    const { container } = render(AsyncExportModal, {
      props: {
        open: true,
        defaultFileName: 'audit-orders',
        columns: sampleColumns,
        onexport: onExport,
      },
    });

    // Switch to CSV format
    const csvBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('CSV 纯文本')
    );
    expect(csvBtn).toBeTruthy();
    if (csvBtn) await fireEvent.click(csvBtn);

    const startBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('开始生成报表')
    );
    expect(startBtn).toBeTruthy();
    if (startBtn) {
      await fireEvent.click(startBtn);
      await new Promise((r) => setTimeout(r, 20));
    }

    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onExport).toHaveBeenCalledWith({
      fileName: 'audit-orders.csv',
      format: 'csv',
      scope: 'all',
      selectedColumns: ['id', 'customer', 'amount'],
    });
    expect(container.textContent).toContain('报表已成功生成');
    expect(container.textContent).toContain('1.2 MB');
    expect(container.textContent).toContain('立即下载');
  });

  it('displays error screen with retry action when onexport rejects', async () => {
    const onExport = vi.fn().mockRejectedValue(new Error('导出服务超时，请缩小筛选范围'));

    const { container } = render(AsyncExportModal, {
      props: {
        open: true,
        columns: sampleColumns,
        onexport: onExport,
      },
    });

    const startBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('开始生成报表')
    );
    if (startBtn) {
      await fireEvent.click(startBtn);
      await new Promise((r) => setTimeout(r, 20));
    }

    expect(container.textContent).toContain('报表生成失败');
    expect(container.textContent).toContain('导出服务超时，请缩小筛选范围');
    expect(container.textContent).toContain('重新发起');
  });
});
