import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import LiteScreenAntiLeakGuard from './LiteScreenAntiLeakGuard.svelte';
import LiteDataLineageGraph from './LiteDataLineageGraph.svelte';
import LiteLiveStreamLogViewer from './LiteLiveStreamLogViewer.svelte';
import LiteElectronicSealStamp from './LiteElectronicSealStamp.svelte';
import LiteSystemCapacityForecastCard from './LiteSystemCapacityForecastCard.svelte';

describe('Lite Enterprise Parity Wave 10 suite', () => {
  it('renders LiteScreenAntiLeakGuard with watermark text', () => {
    const { container } = render(LiteScreenAntiLeakGuard, {
      text: '绝密数据 · 严禁扩散',
      subtext: '内部审计追责'
    });
    expect(container.textContent).toContain('绝密数据 · 严禁扩散');
    expect(container.textContent).toContain('内部审计追责');
    expect(container.querySelector('[data-svadmin-component="LiteScreenAntiLeakGuard"]')).toBeTruthy();
  });

  it('renders LiteDataLineageGraph with nodes flow', () => {
    const { getByText, container } = render(LiteDataLineageGraph, {
      title: '数据血缘树'
    });
    expect(getByText('数据血缘树')).toBeTruthy();
    expect(container.textContent).toContain('src_erp_orders');
    expect(container.textContent).toContain('上市公司经营报表');
  });

  it('renders LiteLiveStreamLogViewer with logs', () => {
    const { getByText, container } = render(LiteLiveStreamLogViewer, {
      title: '流式日志监控'
    });
    expect(getByText('流式日志监控')).toBeTruthy();
    expect(container.textContent).toContain('Gateway');
    expect(container.textContent).toContain('3 条日志记录');
  });

  it('renders LiteElectronicSealStamp with seal titles', () => {
    const { container } = render(LiteElectronicSealStamp, {
      companyName: '测试企业集团',
      sealTitle: '公章',
      serialNumber: '9901020088712'
    });
    expect(container.textContent).toContain('测试企业集团');
    expect(container.textContent).toContain('公章');
    expect(container.textContent).toContain('9901020088712');
  });

  it('renders LiteSystemCapacityForecastCard with countdown', () => {
    const { getByText, container } = render(LiteSystemCapacityForecastCard, {
      resourceName: '存储容量',
      estimatedDaysRemaining: 7,
      currentUsage: 800,
      hardLimit: 1000
    });
    expect(getByText('存储容量')).toBeTruthy();
    expect(container.textContent).toContain('预计 7 天后达上限');
    expect(container.textContent).toContain('800');
  });
});
