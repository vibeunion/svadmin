import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import TableAggregationFooter, { type AggregationColumnConfig } from './TableAggregationFooter.svelte';

describe('TableAggregationFooter suite', () => {
  const columns: AggregationColumnConfig[] = [
    { key: 'orderNo', label: '订单号' },
    { key: 'amount', label: '金额', op: 'sum', prefix: '¥' },
  ];

  it('calculates page subtotal and selected rows sum', () => {
    const pageRows = [{ orderNo: '1', amount: 100 }, { orderNo: '2', amount: 200 }];
    const selectedRows = [{ orderNo: '1', amount: 100 }];

    const view = render(TableAggregationFooter, {
      columns,
      pageRows,
      selectedRows,
    });

    // Page subtotal is 300
    expect(view.container.textContent).toContain('300.00');
    // Selected sum is 100
    expect(view.container.textContent).toContain('100.00');
  });
});
