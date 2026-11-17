import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Countdown from './Countdown.svelte';
import Statistic from './Statistic.svelte';

describe('Countdown value, format, now, and start options', () => {
  it('supports value alias for target and custom format strings', () => {
    const now = 1000000;
    const target = now + (3600 + 120 + 5) * 1000; // 1h 2m 5s
    const { container } = render(Countdown, {
      props: {
        value: target,
        now,
        format: 'HH:mm:ss',
        start: false,
      },
    });
    const time = container.querySelector('time');
    expect(time?.textContent?.trim()).toBe('01:02:05');
  });

  it('pauses countdown when start=false', () => {
    const { container } = render(Countdown, {
      props: {
        duration: 60,
        start: false,
      },
    });
    const time = container.querySelector('time');
    expect(time?.textContent?.trim()).toBe('00:01:00');
  });
});

describe('Statistic separator and snippet title', () => {
  it('supports separator alias for groupSeparator', () => {
    const { container } = render(Statistic, {
      props: {
        value: 1234567,
        separator: ',',
      },
    });
    expect(container.textContent).toContain('1,234,567');
  });

  it('renders tip and tooltip on Statistic component', () => {
    const { container } = render(Statistic, {
      props: {
        title: '活跃用户',
        value: 9876,
        tooltip: '统计过去 30 天内活跃的用户总数',
      },
    });
    const tip = container.querySelector('.svadmin-statistic__tip');
    expect(tip).not.toBeNull();
    expect(tip?.getAttribute('title')).toBe('统计过去 30 天内活跃的用户总数');
  });
});
