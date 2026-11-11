import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PlanUsageQuotaBar, { type QuotaItem } from './PlanUsageQuotaBar.svelte';

describe('PlanUsageQuotaBar Component', () => {
  const quotas: QuotaItem[] = [
    { id: 'api', label: 'API 调用次数', current: 75000, limit: 100000, unit: '次' },
    { id: 'storage', label: '云存储空间', current: 98, limit: 100, unit: 'GB', dangerThreshold: 90 },
  ];

  it('renders plan name, quota items and percentages', () => {
    const { container } = render(PlanUsageQuotaBar, {
      props: {
        planName: '企业专属版 (Scale)',
        quotas,
      },
    });

    const root = container.querySelector('[data-svadmin-component="PlanUsageQuotaBar"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('企业专属版 (Scale)');
    expect(container.textContent).toContain('75%');
    expect(container.textContent).toContain('98%');
    expect(container.textContent).toContain('配额即将耗尽');
  });

  it('triggers onupgrade callback when upgrade button is clicked', async () => {
    const onUpgrade = vi.fn();
    const { container } = render(PlanUsageQuotaBar, {
      props: {
        quotas,
        onupgrade: onUpgrade,
      },
    });

    const btn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('升级套餐')
    );
    expect(btn).toBeTruthy();
    if (btn) {
      await fireEvent.click(btn);
      expect(onUpgrade).toHaveBeenCalledTimes(1);
    }
  });
});
