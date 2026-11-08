import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import PricingCard from './PricingCard.svelte';
import QuotaProgressBar from './QuotaProgressBar.svelte';

describe('PricingCard', () => {
  it('renders title, price, and features correctly', () => {
    render(PricingCard, {
      title: 'Pro Plan',
      description: 'Ideal for scaling businesses',
      price: '$99',
      interval: '/month',
      badge: 'Popular',
      highlighted: true,
      features: [
        { label: 'Unlimited Projects', included: true },
        { label: 'Custom Domain', included: true },
        { label: 'Dedicated Account Manager', included: false },
      ],
    });

    expect(screen.getByText('Pro Plan')).toBeTruthy();
    expect(screen.getByText('Ideal for scaling businesses')).toBeTruthy();
    expect(screen.getByText('$99')).toBeTruthy();
    expect(screen.getByText('/month')).toBeTruthy();
    expect(screen.getByText('Popular')).toBeTruthy();
    expect(screen.getByText('Unlimited Projects')).toBeTruthy();
    expect(screen.getByText('Dedicated Account Manager')).toBeTruthy();
  });

  it('triggers onselect callback when button is clicked', async () => {
    const handleSelect = vi.fn();
    render(PricingCard, {
      title: 'Starter',
      price: '$19',
      buttonText: 'Choose Starter',
      onselect: handleSelect,
    });

    const button = screen.getByRole('button', { name: 'Choose Starter' });
    await fireEvent.click(button);
    expect(handleSelect).toHaveBeenCalledTimes(1);
  });
});

describe('QuotaProgressBar', () => {
  it('calculates ratio and progressbar attributes accurately in normal state', () => {
    render(QuotaProgressBar, {
      label: 'Monthly API Calls',
      used: 2500,
      total: 10000,
      unit: 'calls',
    });

    expect(screen.getByText('Monthly API Calls')).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy();

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar.getAttribute('aria-valuenow')).toBe('2500');
    expect(progressbar.getAttribute('aria-valuemax')).toBe('10000');
  });

  it('triggers warning and critical states based on threshold', () => {
    const { container: warningContainer } = render(QuotaProgressBar, {
      label: 'Storage Quota',
      used: 85,
      total: 100,
      warningThreshold: 0.8,
      criticalThreshold: 0.95,
    });

    const warningEl = warningContainer.querySelector('[data-svadmin-component="QuotaProgressBar"]');
    expect(warningEl?.getAttribute('data-status')).toBe('warning');

    const { container: criticalContainer } = render(QuotaProgressBar, {
      label: 'Storage Quota Critical',
      used: 98,
      total: 100,
      warningThreshold: 0.8,
      criticalThreshold: 0.95,
    });

    const criticalEl = criticalContainer.querySelector('[data-svadmin-component="QuotaProgressBar"]');
    expect(criticalEl?.getAttribute('data-status')).toBe('critical');
  });

  it('renders compact inline format cleanly', () => {
    render(QuotaProgressBar, {
      label: 'Memory Limit',
      used: 512,
      total: 1024,
      unit: 'MB',
      compact: true,
    });

    expect(screen.getByText('Memory Limit')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
  });
});
