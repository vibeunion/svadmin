import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import TreemapChart from './TreemapChart.svelte';
import SankeyChart from './SankeyChart.svelte';

afterEach(() => cleanup());

describe('advanced charts', () => {
  it('renders treemap leaves with labels and a11y names', () => {
    const view = render(TreemapChart, {
      data: {
        name: 'Revenue',
        children: [
          { name: 'Cloud', value: 70 },
          { name: 'Services', value: 30 },
        ],
      },
      width: 400,
      height: 240,
    });
    expect(view.getByText('Cloud')).toBeTruthy();
    expect(view.getByText('Services')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Cloud: 70' })).toBeTruthy();
    expect(view.container.querySelectorAll('rect').length).toBeGreaterThanOrEqual(2);
  });

  it('renders sankey nodes and links', () => {
    const view = render(SankeyChart, {
      data: {
        nodes: [
          { id: 'visit', label: 'Visit' },
          { id: 'signup', label: 'Signup' },
          { id: 'paid', label: 'Paid' },
        ],
        links: [
          { source: 'visit', target: 'signup', value: 60 },
          { source: 'signup', target: 'paid', value: 24 },
        ],
      },
      width: 400,
      height: 240,
    });
    expect(view.getByText('Visit')).toBeTruthy();
    expect(view.getByText('Paid')).toBeTruthy();
    expect(view.container.querySelectorAll('rect').length).toBe(3);
    expect(view.container.querySelectorAll('path').length).toBe(2);
  });
});
