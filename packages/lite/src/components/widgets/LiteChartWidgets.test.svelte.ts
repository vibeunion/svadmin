import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import type { Component } from 'svelte';
import LiteAreaChart from './LiteAreaChart.svelte';
import LiteChartTable from './LiteChartTable.svelte';
import LiteDonutChart from './LiteDonutChart.svelte';
import LiteFunnelChart from './LiteFunnelChart.svelte';
import LiteGaugeChart from './LiteGaugeChart.svelte';
import LiteHeatmapChart from './LiteHeatmapChart.svelte';
import LiteRadarChart from './LiteRadarChart.svelte';
import LiteRoseChart from './LiteRoseChart.svelte';
import LiteScatterChart from './LiteScatterChart.svelte';
import LiteWaterfallChart from './LiteWaterfallChart.svelte';

afterEach(() => cleanup());

const widgets: Array<[string, Component<Record<string, unknown>>, string]> = [
  ['LiteAreaChart', LiteAreaChart, 'area'],
  ['LiteDonutChart', LiteDonutChart, 'donut'],
  ['LiteFunnelChart', LiteFunnelChart, 'funnel'],
  ['LiteGaugeChart', LiteGaugeChart, 'gauge'],
  ['LiteHeatmapChart', LiteHeatmapChart, 'heatmap'],
  ['LiteRadarChart', LiteRadarChart, 'radar'],
  ['LiteRoseChart', LiteRoseChart, 'rose'],
  ['LiteScatterChart', LiteScatterChart, 'scatter'],
  ['LiteWaterfallChart', LiteWaterfallChart, 'waterfall'],
];

describe('Lite chart widgets', () => {
  for (const [name, Widget, kind] of widgets) {
    it(`${name} exposes its kind and a titled accessible name`, () => {
      const view = render(Widget, { title: 'Revenue' });

      const section = view.getByRole('region', { name: 'Revenue' });
      expect(section.getAttribute('data-kind')).toBe(kind);
      expect(view.getByRole('heading', { level: 2, name: 'Revenue' })).toBeTruthy();
    });

    it(`${name} renders explicit rows under the default column headers`, () => {
      const view = render(Widget, {
        rows: [
          ['Jan', 12],
          ['Feb', 18],
        ],
      });

      expect(view.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
        'Label',
        'Value',
      ]);
      expect(view.getAllByRole('row')).toHaveLength(3);
      expect(view.getByRole('cell', { name: 'Feb' })).toBeTruthy();
    });

    it(`${name} falls back to the empty message when no rows are provided`, () => {
      const view = render(Widget, { emptyText: 'Nothing to plot yet' });

      expect(view.getByText('Nothing to plot yet').tagName).toBe('P');
      expect(view.queryByRole('table')).toBeNull();
      expect(view.getByRole('region', { name: `${kind} data` })).toBeTruthy();
    });
  }

  it('normalizes object data into typed cells for the table fallback', () => {
    const view = render(LiteAreaChart, {
      data: [
        { label: 'Jan', value: 12 },
        { label: 'Feb', value: null },
      ],
      columns: ['Month', 'Amount'],
    });

    expect(view.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Month',
      'Amount',
    ]);
    const rows = view.getAllByRole('row').slice(1);
    expect(rows[0]?.textContent).toContain('Jan');
    expect(rows[0]?.textContent).toContain('12');
    expect(rows[1]?.textContent).toContain('Feb');
  });

  it('keeps the chart table accessible without a title', () => {
    const view = render(LiteChartTable, { kind: 'bar', rows: [['A', 1]] });

    expect(view.getByRole('region', { name: 'bar data' })).toBeTruthy();
    expect(view.queryByRole('heading')).toBeNull();
    expect(view.getByRole('cell', { name: 'A' })).toBeTruthy();
  });
});