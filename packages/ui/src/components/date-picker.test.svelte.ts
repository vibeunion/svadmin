import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import DatePicker from './DatePicker.svelte';
import DateRangePicker from './DateRangePicker.svelte';

afterEach(() => {
  cleanup();
});

describe('date picker entry points', () => {
  it('provides a date-only picker while reusing the date input contract', () => {
    const view = render(DatePicker, { value: '2026-09-20' });
    const input = view.container.querySelector('input');
    expect(input?.type).toBe('date');
    expect(input?.value).toBe('2026-09-20');
  });

  it('provides a date-only range picker with ordered endpoints', () => {
    const view = render(DateRangePicker, {
      value: { start: '2026-09-01', end: '2026-09-20' },
    });
    const inputs = [...view.container.querySelectorAll('input')];
    expect(inputs.map(input => input.value)).toEqual(['2026-09-01', '2026-09-20']);
    expect(inputs[0]?.max).toBe('2026-09-20');
    expect(inputs[1]?.min).toBe('2026-09-01');
  });
});
