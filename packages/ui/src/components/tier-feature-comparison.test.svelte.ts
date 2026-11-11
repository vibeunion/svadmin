import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TierFeatureComparison, { type PricingTier, type FeatureGroup } from './TierFeatureComparison.svelte';

describe('TierFeatureComparison Component', () => {
  const tiers: PricingTier[] = [
    { key: 'starter', name: '基础版', price: '¥0', isCurrent: true },
    { key: 'pro', name: '专业版', price: '¥999', isPopular: true },
  ];

  const groups: FeatureGroup[] = [
    {
      groupName: '核心功能',
      features: [
        { name: '多租户隔离', values: { starter: true, pro: true } },
        { name: '自定义域名', values: { starter: false, pro: true } },
      ],
    },
  ];

  it('renders tier headers and feature comparisons', () => {
    const { container } = render(TierFeatureComparison, {
      props: {
        tiers,
        groups,
      },
    });

    const root = container.querySelector('[data-svadmin-component="TierFeatureComparison"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('基础版');
    expect(container.textContent).toContain('专业版');
    expect(container.textContent).toContain('¥999');
    expect(container.textContent).toContain('当前生效套餐');
    expect(container.textContent).toContain('强烈推荐');
  });

  it('triggers onselecttier callback when upgrade button is clicked', async () => {
    const onSelect = vi.fn();
    const { container } = render(TierFeatureComparison, {
      props: {
        tiers,
        groups,
        onselecttier: onSelect,
      },
    });

    const proBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('立即升级')
    );
    expect(proBtn).toBeTruthy();
    if (proBtn) {
      await fireEvent.click(proBtn);
      expect(onSelect).toHaveBeenCalledWith('pro');
    }
  });
});
