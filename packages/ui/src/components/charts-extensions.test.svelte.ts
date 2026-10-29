import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import FunnelChart from './charts/FunnelChart.svelte';
import GaugeChart from './charts/GaugeChart.svelte';
import HeatmapChart from './charts/HeatmapChart.svelte';
import RadarChart from './charts/RadarChart.svelte';
import RoseChart from './charts/RoseChart.svelte';
import WaterfallChart from './charts/WaterfallChart.svelte';

afterEach(() => cleanup());

describe('extended charts', () => {
  it('renders radar rings, series polygons and legend', () => {
    const view = render(RadarChart, {
      indicators: [{ name: 'Speed', max: 100 }, { name: 'Power', max: 100 }, { name: 'Range', max: 100 }],
      series: [{ name: 'Model A', values: [80, 60, 70] }, { name: 'Model B', values: [50, 90, 40] }],
    });
    expect(view.getByRole('img').getAttribute('aria-label')).toContain('Model A');
    expect(view.container.querySelectorAll('polygon')).toHaveLength(6);
    expect(view.getByText('Model A')).toBeTruthy();
    expect(view.container.querySelector('title')?.textContent).toBe('Speed: 80');
  });

  it('renders a gauge arc with formatted value', () => {
    const view = render(GaugeChart, { value: 72, label: 'Usage', format: (value: number) => `${value}%` });
    expect(view.getByRole('img').getAttribute('aria-label')).toBe('Usage');
    expect(view.getByText('72%')).toBeTruthy();
    expect(view.container.querySelectorAll('path')[1]?.getAttribute('stroke-dasharray')).toBe('72 100');
  });

  it('renders funnel stages with ratios', () => {
    const view = render(FunnelChart, {
      data: [{ label: 'Visit', value: 100 }, { label: 'Signup', value: 40 }],
    });
    expect(view.container.querySelectorAll('title')[0]?.textContent).toBe('Visit: 100');
    expect(view.getByText('100 · 100.0%')).toBeTruthy();
    expect(view.getByText('40 · 40.0%')).toBeTruthy();
  });

  it('renders heatmap cells and derives labels', () => {
    const view = render(HeatmapChart, {
      data: [{ x: 'Mon', y: 'AM', value: 2 }, { x: 'Tue', y: 'AM', value: 8 }],
    });
    expect(view.getByText('Mon')).toBeTruthy();
    expect(view.getByText('Tue')).toBeTruthy();
    expect(view.container.querySelectorAll('rect')).toHaveLength(2);
    expect(view.container.querySelector('title')?.textContent).toBe('AM / Mon: 2');
  });

  it('renders waterfall steps with totals and connectors', () => {
    const view = render(WaterfallChart, {
      data: [
        { label: 'Revenue', value: 120 },
        { label: 'Cost', value: -40 },
        { label: 'Profit', value: 80, type: 'total' },
      ],
    });
    expect(view.container.querySelectorAll('rect')).toHaveLength(3);
    expect(view.container.querySelectorAll('title')[2]?.textContent).toBe('Profit: 80');
    expect(view.container.querySelectorAll('line[stroke-dasharray]')).toHaveLength(2);
    expect(view.getByText('Profit')).toBeTruthy();
  });

  it('renders rose wedges with legend', () => {
    const view = render(RoseChart, {
      data: [{ label: 'East', value: 12 }, { label: 'West', value: 6 }],
    });
    expect(view.getByRole('img').getAttribute('aria-label')).toBe('Rose chart');
    expect(view.container.querySelectorAll('path')).toHaveLength(2);
    expect(view.getByText('East')).toBeTruthy();
    expect(view.container.querySelectorAll('title')[1]?.textContent).toBe('West: 6');
  });
});