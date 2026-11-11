import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import PeriodComparisonCard from './PeriodComparisonCard.svelte';

describe('PeriodComparisonCard suite', () => {
  it('computes positive delta and renders green percentage pill', () => {
    const view = render(PeriodComparisonCard, {
      title: '本季度净营收',
      currentValue: 1250000,
      previousValue: 1000000,
      prefix: '¥',
    });

    expect(view.container.textContent).toContain('本季度净营收');
    expect(view.container.textContent).toContain('+25%');
    expect(view.container.textContent).toContain('+¥250,000');
    expect(view.container.querySelector('.text-success')).toBeTruthy();
  });

  it('computes negative delta and supports reverseColor', () => {
    const view = render(PeriodComparisonCard, {
      title: '接口平均延迟',
      currentValue: 80,
      previousValue: 50,
      suffix: 'ms',
      reverseColor: true,
    });

    expect(view.container.textContent).toContain('接口平均延迟');
    expect(view.container.textContent).toContain('+60%');
    // For latency, an increase is negative (destructive) when reverseColor is true
    expect(view.container.querySelector('.text-destructive')).toBeTruthy();
  });
});
