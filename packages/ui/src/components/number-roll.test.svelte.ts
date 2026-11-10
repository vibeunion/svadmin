import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import NumberRoll from './NumberRoll.svelte';

describe('NumberRoll Component', () => {
  it('renders numeric value with prefix and suffix', () => {
    const { container } = render(NumberRoll, {
      props: {
        value: 12500,
        from: 12500,
        duration: 0,
        prefix: '¥',
        suffix: ' 元',
        separator: ',',
      },
    });

    const root = container.querySelector('[data-svadmin-component="NumberRoll"]');
    expect(root).not.toBeNull();
    expect(container.textContent).toContain('¥');
    expect(container.textContent).toContain('12,500');
    expect(container.textContent).toContain('元');
  });

  it('formats decimals correctly', () => {
    const { container } = render(NumberRoll, {
      props: {
        value: 9876.54,
        from: 9876.54,
        duration: 0,
        decimals: 2,
        separator: ',',
        decimalSeparator: '.',
      },
    });

    expect(container.textContent).toContain('9,876.54');
  });

  it('renders positive trend icon and color class', () => {
    const { container } = render(NumberRoll, {
      props: {
        value: 35.8,
        from: 35.8,
        duration: 0,
        trendColor: true,
        showTrendIcon: true,
      },
    });

    const root = container.querySelector('[data-svadmin-component="NumberRoll"]');
    expect(root?.classList.contains('text-primary')).toBe(true);
    const icon = container.querySelector('svg');
    expect(icon).not.toBeNull();
  });

  it('renders negative trend icon and destructive color class', () => {
    const { container } = render(NumberRoll, {
      props: {
        value: -12.4,
        from: -12.4,
        duration: 0,
        trendColor: true,
        showTrendIcon: true,
      },
    });

    const root = container.querySelector('[data-svadmin-component="NumberRoll"]');
    expect(root?.classList.contains('text-destructive')).toBe(true);
  });
});
