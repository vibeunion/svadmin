import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import PricingTable, { type PricingPlan, type FeatureComparisonGroup } from './PricingTable.svelte';
import UsageCard from './UsageCard.svelte';

describe('PricingTable', () => {
  const plans: PricingPlan[] = [
    {
      key: 'starter',
      title: 'Starter Plan',
      description: 'For small projects',
      monthlyPrice: '$19',
      yearlyPrice: '$190',
      buttonText: 'Get Starter',
      features: ['1 Project', 'Community Support'],
    },
    {
      key: 'pro',
      title: 'Pro Plan',
      description: 'For growing teams',
      monthlyPrice: '$49',
      yearlyPrice: '$490',
      highlighted: true,
      badge: 'Best Value',
      buttonText: 'Get Pro',
      features: ['Unlimited Projects', 'Priority Support'],
    },
  ];

  const comparisonGroups: FeatureComparisonGroup[] = [
    {
      category: 'Core Features',
      rows: [
        {
          name: 'Custom Domain',
          values: { starter: false, pro: true },
        },
        {
          name: 'API Requests',
          values: { starter: '10,000 / mo', pro: 'Unlimited' },
        },
      ],
    },
  ];

  it('renders plan titles, prices, and toggles billing cycles', async () => {
    const handleSelectPlan = vi.fn();
    const { container } = render(PricingTable, {
      plans,
      comparisonGroups,
      onselectplan: handleSelectPlan,
    });

    expect(screen.getAllByText('Starter Plan').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pro Plan').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$19')).toBeTruthy();
    expect(screen.getByText('$49')).toBeTruthy();

    // Toggle to yearly
    const yearlyBtn = screen.getByRole('button', { name: /Yearly/i });
    await fireEvent.click(yearlyBtn);

    const root = container.querySelector('[data-svadmin-component="PricingTable"]');
    expect(root?.getAttribute('data-cycle')).toBe('yearly');
    expect(screen.getByText('$190')).toBeTruthy();
    expect(screen.getByText('$490')).toBeTruthy();

    // Click select button
    const selectProBtn = screen.getByRole('button', { name: 'Get Pro' });
    await fireEvent.click(selectProBtn);
    expect(handleSelectPlan).toHaveBeenCalledTimes(1);
    expect(handleSelectPlan).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'pro', title: 'Pro Plan' }),
      'yearly',
    );
  });

  it('renders detailed comparison matrix table', () => {
    render(PricingTable, {
      plans,
      comparisonGroups,
    });

    expect(screen.getByText('Feature Comparison')).toBeTruthy();
    expect(screen.getByText('Core Features')).toBeTruthy();
    expect(screen.getByText('Custom Domain')).toBeTruthy();
    expect(screen.getByText('10,000 / mo')).toBeTruthy();
    expect(screen.getByText('Unlimited')).toBeTruthy();
  });
});

describe('UsageCard', () => {
  it('renders title, tier, renewal date, and metrics', async () => {
    const handleUpgrade = vi.fn();
    render(UsageCard, {
      title: 'Current Subscription',
      tier: 'Enterprise Team',
      renewalDate: 'Dec 31, 2026',
      upgradeText: 'Manage Plan',
      onupgrade: handleUpgrade,
      metrics: [
        {
          key: 'seats',
          label: 'Team Seats',
          used: 8,
          total: 10,
          unit: 'seats',
        },
        {
          key: 'bandwidth',
          label: 'Monthly Bandwidth',
          used: 45,
          total: 100,
          unit: 'GB',
        },
      ],
    });

    expect(screen.getByText('Current Subscription')).toBeTruthy();
    expect(screen.getByText('Enterprise Team')).toBeTruthy();
    expect(screen.getByText('Renews on Dec 31, 2026')).toBeTruthy();
    expect(screen.getByText('Team Seats')).toBeTruthy();
    expect(screen.getByText('Monthly Bandwidth')).toBeTruthy();

    const upgradeBtn = screen.getByRole('button', { name: 'Manage Plan' });
    await fireEvent.click(upgradeBtn);
    expect(handleUpgrade).toHaveBeenCalledTimes(1);
  });
});
