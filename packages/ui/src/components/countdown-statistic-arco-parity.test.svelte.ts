import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Countdown from './Countdown.svelte';
import Statistic from './Statistic.svelte';

describe('Countdown Arco Parity (value, format, now, start)', () => {
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

describe('Statistic Arco Parity (separator, snippet title)', () => {
  it('supports separator alias for groupSeparator', () => {
    const { container } = render(Statistic, {
      props: {
        value: 1234567,
        separator: ',',
      },
    });
    expect(container.textContent).toContain('1,234,567');
  });
});
