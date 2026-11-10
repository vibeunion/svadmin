import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '../../test/legacy-locale';
import PivotDrilldownModal from './PivotDrilldownModal.svelte';

beforeEach(() => {
  setLocale('zh-CN');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const sampleFilters = [
  { dimension: '区域', value: '华东' },
  { dimension: '季度', value: '2026-Q3' },
];

const sampleColumns = [
  { key: 'orderId', label: '订单号' },
  { key: 'customer', label: '客户名称' },
  { key: 'amount', label: '金额 (万元)' },
];

const sampleRecords = [
  { orderId: 'ORD-001', customer: '上海商贸集团', amount: 120 },
  { orderId: 'ORD-002', customer: '杭州网络科技', amount: 85 },
];

describe('PivotDrilldownModal', () => {
  it('renders modal dialog when open is true', () => {
    const { container } = render(PivotDrilldownModal, {
      open: true,
      filters: sampleFilters,
      columns: sampleColumns,
      records: sampleRecords,
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(screen.getByText('多维分析下钻详情')).toBeTruthy();
    expect(screen.getByText('区域:')).toBeTruthy();
    expect(screen.getByText('华东')).toBeTruthy();
    expect(screen.getByText('上海商贸集团')).toBeTruthy();
  });

  it('filters rows via search input', async () => {
    const { container } = render(PivotDrilldownModal, {
      open: true,
      filters: sampleFilters,
      columns: sampleColumns,
      records: sampleRecords,
    });

    const searchInput = container.querySelector('input[placeholder="搜索明细内容..."]');
    expect(searchInput).toBeTruthy();

    if (searchInput) {
      await fireEvent.input(searchInput, { target: { value: '杭州' } });
      expect(screen.queryByText('上海商贸集团')).toBeNull();
      expect(screen.getByText('杭州网络科技')).toBeTruthy();
    }
  });

  it('triggers close when clicking close button', async () => {
    const onclose = vi.fn();
    render(PivotDrilldownModal, {
      open: true,
      filters: sampleFilters,
      columns: sampleColumns,
      records: sampleRecords,
      onclose,
    });

    const closeBtn = screen.getByText('关闭');
    await fireEvent.click(closeBtn);

    expect(onclose).toHaveBeenCalledTimes(1);
  });
});
