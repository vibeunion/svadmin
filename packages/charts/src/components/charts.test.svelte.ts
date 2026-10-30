import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import TreemapChart from './TreemapChart.svelte';
import SankeyChart from './SankeyChart.svelte';
import BoxPlotChart from './BoxPlotChart.svelte';
import SunburstChart from './SunburstChart.svelte';
import GraphChart from './GraphChart.svelte';

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

  it('renders box plot quartiles and outliers', () => {
    const view = render(BoxPlotChart, {
      data: [
        { label: 'Latency', values: [10, 12, 13, 14, 15, 16, 60] },
        { label: 'Throughput', values: [40, 42, 43, 45, 47] },
      ],
      width: 400,
      height: 240,
    });
    expect(view.getByText('Latency')).toBeTruthy();
    expect(view.getByText('Throughput')).toBeTruthy();
    expect(view.container.querySelectorAll('rect')).toHaveLength(2);
    expect(view.container.querySelectorAll('circle')).toHaveLength(1);
    expect(view.getByRole('img').getAttribute('aria-label')).toBe('Box plot');
  });

  it('renders sunburst rings and labels', () => {
    const view = render(SunburstChart, {
      data: {
        name: 'Revenue',
        children: [
          { name: 'Cloud', children: [{ name: 'Compute', value: 40 }, { name: 'Storage', value: 20 }] },
          { name: 'Services', value: 40 },
        ],
      },
      width: 300,
      height: 300,
    });
    expect(view.getByText('Cloud')).toBeTruthy();
    expect(view.getByText('Compute')).toBeTruthy();
    expect(view.container.querySelectorAll('path').length).toBeGreaterThanOrEqual(4);
    expect(view.getByRole('img').getAttribute('aria-label')).toBe('Sunburst chart');
  });

  it('renders a force graph with nodes and links', () => {
    const view = render(GraphChart, {
      data: {
        nodes: [
          { id: 'a', label: 'API', group: 'core' },
          { id: 'b', label: 'Worker', group: 'core' },
          { id: 'c', label: 'Database', group: 'data' },
        ],
        links: [
          { source: 'a', target: 'b', value: 12 },
          { source: 'b', target: 'c', value: 8 },
        ],
      },
      width: 400,
      height: 260,
    });
    expect(view.getAllByText('API').length).toBeGreaterThan(0);
    expect(view.getAllByText('Database').length).toBeGreaterThan(0);
    expect(view.container.querySelectorAll('line')).toHaveLength(2);
    expect(view.container.querySelectorAll('circle')).toHaveLength(3);
  });
});
