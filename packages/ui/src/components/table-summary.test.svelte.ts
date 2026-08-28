import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import TableSummary from './TableSummary.svelte';

describe('TableSummary Component', () => {
  it('computes and renders sum and average values', () => {
    const data = [
      { id: 1, revenue: 100, cost: 40 },
      { id: 2, revenue: 200, cost: 60 },
    ];
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'cost', label: 'Cost' },
    ];

    const view = render(TableSummary, {
      columns,
      data,
      aggregations: {
        revenue: 'sum',
        cost: 'avg',
      },
      prefix: { revenue: '$' },
      title: 'Total',
    });

    expect(view.container.textContent).toContain('Total');
    expect(view.container.textContent).toContain('$300.00');
    expect(view.container.textContent).toContain('50.00');
  });
});
