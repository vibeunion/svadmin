import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import StatisticCard from './StatisticCard.svelte';

describe('StatisticCard Component', () => {
  it('renders statistic card with title, formatted values, and component marker', () => {
    const { container } = render(StatisticCard, {
      props: {
        title: '总销售额',
        value: 126560,
        prefix: '¥',
        suffix: '元',
        precision: 2,
        trends: [
          { label: '周同比', value: '12.4%', direction: 'up' },
          { label: '日环比', value: '2.8%', direction: 'down' },
        ],
      },
    });

    const root = container.querySelector('[data-svadmin-component="StatisticCard"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('总销售额');
    expect(container.textContent).toContain('126560.00');
    expect(container.textContent).toContain('¥');
    expect(container.textContent).toContain('元');
    expect(container.textContent).toContain('周同比');
    expect(container.textContent).toContain('12.4%');
    expect(container.textContent).toContain('日环比');
    expect(container.textContent).toContain('2.8%');
  });

  it('renders with custom tip and small size', () => {
    const { container } = render(StatisticCard, {
      props: {
        title: '转化率',
        tip: '支付成功订单占总浏览人数比例',
        value: '78.5%',
        size: 'small',
      },
    });

    expect(container.textContent).toContain('转化率');
    expect(container.textContent).toContain('78.5%');
    const tipSpan = container.querySelector('span[title="支付成功订单占总浏览人数比例"]');
    expect(tipSpan).toBeTruthy();
  });
});
