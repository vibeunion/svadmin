import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import TrendIndicator from './TrendIndicator.svelte';

describe('TrendIndicator Component', () => {
  it('renders numeric positive value as up trend with sign', () => {
    const { container } = render(TrendIndicator, {
      props: {
        value: 15.4,
        showSign: true,
      },
    });

    const el = container.querySelector('[data-svadmin-component="TrendIndicator"]');
    expect(el).toBeTruthy();
    expect(el?.textContent).toContain('+15.4%');
    expect(el?.className).toContain('text-success');
  });

  it('renders negative value as down trend', () => {
    const { container } = render(TrendIndicator, {
      props: {
        value: -8.2,
      },
    });

    const el = container.querySelector('[data-svadmin-component="TrendIndicator"]');
    expect(el).toBeTruthy();
    expect(el?.textContent).toContain('-8.2%');
    expect(el?.className).toContain('text-destructive');
  });

  it('computes rate automatically when given value and prevValue', () => {
    const { container } = render(TrendIndicator, {
      props: {
        value: 120,
        prevValue: 100,
        prefix: 'YoY',
        showSign: true,
      },
    });

    const el = container.querySelector('[data-svadmin-component="TrendIndicator"]');
    expect(el?.textContent).toContain('YoY');
    expect(el?.textContent).toContain('+20.0%');
    expect(el?.className).toContain('text-success');
  });

  it('inverts color semantics when reverseColor is true', () => {
    // When reverseColor is true, an up trend (e.g. higher error rate) becomes destructive
    const { container } = render(TrendIndicator, {
      props: {
        value: 12.5,
        reverseColor: true,
      },
    });

    const el = container.querySelector('[data-svadmin-component="TrendIndicator"]');
    expect(el?.className).toContain('text-destructive');
  });

  it('supports badge variant and size props', () => {
    const { container } = render(TrendIndicator, {
      props: {
        value: '+5.0%',
        variant: 'badge',
        size: 'sm',
      },
    });

    const el = container.querySelector('[data-svadmin-component="TrendIndicator"]');
    expect(el?.className).toContain('rounded-full');
    expect(el?.className).toContain('text-[11px]');
  });

  it('supports compact icon variant with title tooltip', () => {
    const { container } = render(TrendIndicator, {
      props: {
        value: 12.4,
        variant: 'icon',
        prefix: 'MoM',
      },
    });

    const el = container.querySelector('[data-svadmin-component="TrendIndicator"]');
    expect(el).toBeTruthy();
    expect(el?.getAttribute('title')).toContain('MoM +12.4%');
    expect(el?.querySelector('svg')).toBeTruthy();
  });
});
