import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SystemCapacityForecastCard from './SystemCapacityForecastCard.svelte';

describe('SystemCapacityForecastCard component suite', () => {
  it('renders capacity metrics and days remaining countdown', () => {
    const { getByText, container } = render(SystemCapacityForecastCard, {
      resourceName: 'Redis 内存配额',
      currentUsage: 75,
      hardLimit: 100,
      unit: 'GB',
      estimatedDaysRemaining: 12
    });

    expect(getByText('Redis 内存配额')).toBeTruthy();
    expect(container.textContent).toContain('预计 12 天后达到上限');
    expect(container.textContent).toContain('75 / 100 GB');
  });

  it('triggers onrequestupgrade callback on button click', async () => {
    const onUpgrade = vi.fn();
    const { getByText } = render(SystemCapacityForecastCard, {
      onrequestupgrade: onUpgrade
    });

    const btn = getByText('申请临时扩容');
    await fireEvent.click(btn);
    expect(onUpgrade).toHaveBeenCalled();
  });
});
