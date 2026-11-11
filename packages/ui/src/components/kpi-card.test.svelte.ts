import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import KpiCard from './KpiCard.svelte';

describe('KpiCard Component', () => {
  it('renders title, formatted value, prefix and suffix', () => {
    const { container } = render(KpiCard, {
      props: {
        title: '季度总营收',
        value: 1284500,
        prefix: '¥',
        suffix: '元',
        subtitle: '统计周期: Q3 季度',
        badge: '核心 KPI',
      },
    });

    const root = container.querySelector('[data-svadmin-component="KpiCard"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('季度总营收');
    expect(container.textContent).toContain('1,284,500');
    expect(container.textContent).toContain('¥');
    expect(container.textContent).toContain('元');
    expect(container.textContent).toContain('统计周期: Q3 季度');
    expect(container.textContent).toContain('核心 KPI');
  });

  it('renders Sparkline SVG polyline chart when sparklineData is provided', () => {
    const { container } = render(KpiCard, {
      props: {
        title: '活跃用户',
        value: 4520,
        sparklineData: [10, 25, 18, 42, 60, 55, 80],
        sparklineTone: 'success',
      },
    });

    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    const polyline = container.querySelector('polyline');
    expect(polyline).toBeTruthy();
    expect(polyline?.getAttribute('points')).toBeTruthy();
  });

  it('renders target completion progress bar and percent', () => {
    const { container } = render(KpiCard, {
      props: {
        title: '年度目标达成',
        value: '85%',
        targetProgress: {
          current: 85,
          target: 100,
          label: '目标达成率',
        },
      },
    });

    expect(container.textContent).toContain('目标达成率');
    expect(container.textContent).toContain('85%');
  });

  it('renders alert message with warning or danger styles', () => {
    const { container } = render(KpiCard, {
      props: {
        title: '系统故障率',
        value: '3.4%',
        alertStatus: 'danger',
        alertMessage: '超出 SLA 阈值，需紧急跟进',
      },
    });

    const root = container.querySelector('[data-svadmin-component="KpiCard"]');
    expect(root?.className).toContain('border-destructive');
    expect(container.textContent).toContain('超出 SLA 阈值，需紧急跟进');
  });

  it('renders skeleton pulse layout when loading is true', () => {
    const { container } = render(KpiCard, {
      props: {
        title: '数据加载中',
        value: 0,
        loading: true,
      },
    });

    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeTruthy();
  });
});
