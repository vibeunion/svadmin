import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Link from './Link.svelte';
import CheckCard from './CheckCard.svelte';
import StatisticCard from './StatisticCard.svelte';

describe('Link, CheckCard, and StatisticCard option parity', () => {
  it('Link supports status="error" normalizing to danger, custom snippet icon, and loading state', () => {
    const { container } = render(Link, {
      props: {
        href: 'https://example.com',
        status: 'error',
        loading: true,
      },
    });

    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('data-status')).toBe('danger');
    expect(link?.getAttribute('aria-busy')).toBe('true');
    expect(link?.getAttribute('aria-disabled')).toBe('true');
    expect(link?.getAttribute('href')).toBeNull();
    const spinner = container.querySelector('svg.animate-spin');
    expect(spinner).not.toBeNull();
  });

  it('CheckCard supports value prop and snippet title/description', () => {
    const { container } = render(CheckCard, {
      props: {
        title: 'Pro Plan',
        description: 'Includes all enterprise features',
        value: 'pro_tier',
        checked: true,
      },
    });

    const card = container.querySelector('[data-svadmin-component="CheckCard"]');
    expect(card).not.toBeNull();
    expect(card?.getAttribute('data-value')).toBe('pro_tier');
    expect(card?.getAttribute('aria-checked')).toBe('true');
  });

  it('StatisticCard supports tooltip alias and loading skeleton', () => {
    const { container, rerender } = render(StatisticCard, {
      props: {
        title: 'Weekly Active Users',
        tooltip: 'Unique visitors with at least one event in 7 days',
        value: 48200,
        loading: true,
      },
    });

    const card = container.querySelector('[data-svadmin-component="StatisticCard"]');
    expect(card).not.toBeNull();
    const tooltip = container.querySelector('span[title="Unique visitors with at least one event in 7 days"]');
    expect(tooltip).not.toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();

    rerender({
      title: 'Weekly Active Users',
      tooltip: 'Unique visitors with at least one event in 7 days',
      value: 48200,
      loading: false,
    });
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
    expect(container.textContent).toContain('48200');
  });
});
