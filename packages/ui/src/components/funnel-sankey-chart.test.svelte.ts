import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ConversionFunnel, { type FunnelStageItem } from './ConversionFunnel.svelte';
import SankeyChart, { type SankeyNode, type SankeyLink } from './SankeyChart.svelte';

describe('FunnelChart and SankeyChart suite', () => {
  it('renders FunnelChart with conversion stages and computes dropoff rates', () => {
    const stages: FunnelStageItem[] = [
      { id: '1', label: '线索访问', value: 1000 },
      { id: '2', label: '注册咨询', value: 600 },
      { id: '3', label: '成单签署', value: 300 },
    ];

    const onSelect = vi.fn();
    const view = render(ConversionFunnel, {
      stages,
      title: '销售漏斗',
      onSelectStage: onSelect,
    });

    expect(view.container.textContent).toContain('销售漏斗');
    expect(view.container.textContent).toContain('线索访问');
    expect(view.container.textContent).toContain('1,000');
    expect(view.container.textContent).toContain('100%');
    expect(view.container.textContent).toContain('600');
    expect(view.container.textContent).toContain('60%');
    expect(view.container.textContent).toContain('40% 流失');
    expect(view.container.textContent).toContain('30%');
  });

  it('renders SankeyChart with flow nodes and links', () => {
    const nodes: SankeyNode[] = [
      { id: 'organic', label: '自然搜索', value: 500 },
      { id: 'paid', label: '广告推广', value: 300 },
      { id: 'home', label: '首页落地' },
      { id: 'pricing', label: '定价页' },
    ];
    const links: SankeyLink[] = [
      { source: '自然搜索', target: '首页落地', value: 350 },
      { source: '广告推广', target: '定价页', value: 200 },
    ];

    const view = render(SankeyChart, {
      nodes,
      links,
      title: '用户来源流向',
    });

    expect(view.container.textContent).toContain('用户来源流向');
    expect(view.container.textContent).toContain('自然搜索');
    expect(view.container.textContent).toContain('广告推广');
  });
});
