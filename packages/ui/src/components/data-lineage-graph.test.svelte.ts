import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import DataLineageGraph from './DataLineageGraph.svelte';

describe('DataLineageGraph component suite', () => {
  it('renders graph nodes and edges flow', () => {
    const { getByText, container } = render(DataLineageGraph, {
      title: '数仓血缘关系图'
    });

    expect(getByText('数仓血缘关系图')).toBeTruthy();
    expect(container.textContent).toContain('src_erp_orders');
    expect(container.textContent).toContain('dws_finance_monthly');
  });

  it('selects node on click and triggers onselectnode callback', async () => {
    const onSelect = vi.fn();
    const { getAllByText } = render(DataLineageGraph, {
      onselectnode: onSelect
    });

    const nodes = getAllByText('src_erp_orders');
    const node = nodes[0];
    if (node) await fireEvent.click(node);
    expect(onSelect).toHaveBeenCalled();
  });
});
