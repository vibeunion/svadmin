import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import GaugeChart from './charts/GaugeChart.svelte';
import MetricGrid from './MetricGrid.svelte';

describe('GaugeChart', () => {
  it('renders with accessibility meter role and default threshold attributes', () => {
    const { container } = render(GaugeChart, {
      props: {
        value: 45,
        min: 0,
        max: 100,
        label: 'CPU Utilization',
        unit: '%',
      },
    });

    const meter = screen.getByRole('meter');
    expect(meter).not.toBeNull();
    expect(meter.getAttribute('aria-valuenow')).toBe('45');
    expect(meter.getAttribute('aria-valuemin')).toBe('0');
    expect(meter.getAttribute('aria-valuemax')).toBe('100');
    expect(meter.getAttribute('data-tone')).toBe('success');
    expect(container.textContent).toContain('CPU Utilization');
    expect(container.textContent).toContain('45');
    expect(container.textContent).toContain('%');
  });

  it('updates tone according to threshold intervals (warning & critical)', () => {
    const { container, unmount } = render(GaugeChart, {
      props: {
        value: 75,
        thresholds: [
          { value: 60, tone: 'success', label: 'Healthy' },
          { value: 85, tone: 'warning', label: 'Elevated' },
          { value: 100, tone: 'destructive', label: 'Critical' },
        ],
      },
    });

    let meter = screen.getByRole('meter');
    expect(meter.getAttribute('data-tone')).toBe('warning');
    expect(container.textContent).toContain('Elevated');
    unmount();

    const result2 = render(GaugeChart, {
      props: {
        value: 95,
        thresholds: [
          { value: 60, tone: 'success', label: 'Healthy' },
          { value: 85, tone: 'warning', label: 'Elevated' },
          { value: 100, tone: 'destructive', label: 'Critical' },
        ],
      },
    });
    meter = screen.getByRole('meter');
    expect(meter.getAttribute('data-tone')).toBe('destructive');
    expect(result2.container.textContent).toContain('Critical');
  });

  it('handles 240-degree arc mode, needle mode and target benchmark', () => {
    const { container } = render(GaugeChart, {
      props: {
        value: 82,
        type: 'arc',
        mode: 'needle',
        target: 80,
        targetLabel: 'SLA Target',
        unit: '%',
      },
    });

    const meter = screen.getByRole('meter');
    expect(meter.getAttribute('data-gauge-type')).toBe('arc');
    expect(container.textContent).toContain('SLA Target: 80%');
    const svg = meter.querySelector('svg');
    expect(svg).not.toBeNull();
    const needle = svg?.querySelector('polygon');
    expect(needle).not.toBeNull();
  });

  it('safely clamps values exceeding maximum bound and applies custom formatter', () => {
    const { container } = render(GaugeChart, {
      props: {
        value: 150,
        min: 0,
        max: 100,
        unit: 'MB/s',
        formatter: (v: number) => `${v.toFixed(0)} MB/s`,
      },
    });

    const meter = screen.getByRole('meter');
    expect(meter.getAttribute('aria-valuenow')).toBe('150');
    expect(container.textContent).toContain('100 MB/s');
  });
});

describe('MetricGrid', () => {
  it('renders section container with column configuration', () => {
    const { container } = render(MetricGrid, {
      props: {
        title: 'Cluster Performance',
        description: 'Real-time metrics for node clusters',
        cols: 3,
      },
    });

    const section = container.querySelector('[data-svadmin-component="MetricGrid"]');
    expect(section).not.toBeNull();
    expect(section?.getAttribute('data-columns')).toBe('3');
    expect(container.textContent).toContain('Cluster Performance');
    expect(container.textContent).toContain('Real-time metrics for node clusters');
  });

  it('renders loading state with skeleton cards', () => {
    const { container } = render(MetricGrid, {
      props: {
        loading: true,
        skeletonCount: 3,
      },
    });

    const loadingRegion = container.querySelector('[data-slot="metric-grid-loading"]');
    expect(loadingRegion).not.toBeNull();
    expect(loadingRegion?.querySelectorAll('.space-y-3').length).toBe(3);
  });

  it('renders empty state placeholder when empty is true', () => {
    const { container } = render(MetricGrid, {
      props: {
        empty: true,
        emptyMessage: 'No monitoring data recorded',
      },
    });

    expect(container.textContent).toContain('No monitoring data recorded');
  });
});
