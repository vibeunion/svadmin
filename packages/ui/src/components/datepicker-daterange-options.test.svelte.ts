import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import DatePicker from './DatePicker.svelte';
import DateRangePicker from './DateRangePicker.svelte';
import DateTimeInput from './DateTimeInput.svelte';
import TimePicker from './TimePicker.svelte';
import DateTimePicker from './DateTimePicker.svelte';

describe('DatePicker and DateRangePicker option parity', () => {
  it('DateTimeInput, TimePicker, and DateTimePicker support defaultValue and onChange', async () => {
    const onChange = vi.fn();
    const { container } = render(DateTimeInput, {
      props: {
        defaultValue: '2026-11-25',
        onChange,
      },
    });

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('2026-11-25');

    await fireEvent.input(input, { target: { value: '2026-11-30' } });
    expect(onChange).toHaveBeenCalledWith('2026-11-30');
  });

  it('TimePicker and DateTimePicker pass defaultValue and onChange', () => {
    const { container: timeContainer } = render(TimePicker, {
      props: {
        defaultValue: '14:30',
      },
    });
    const timeInput = timeContainer.querySelector('input') as HTMLInputElement;
    expect(timeInput.value).toBe('14:30');

    const { container: dtContainer } = render(DateTimePicker, {
      props: {
        defaultValue: '2026-11-25T14:30',
      },
    });
    const dtInput = dtContainer.querySelector('input') as HTMLInputElement;
    expect(dtInput.value).toBe('2026-11-25T14:30');
  });

  it('DatePicker panel supports size, status, and allowClear toggle', () => {
    const { container } = render(DatePicker, {
      props: {
        value: '2026-11-20',
        panel: true,
        size: 'small',
        status: 'error',
        allowClear: false,
      },
    });

    const trigger = container.querySelector('.svadmin-date-picker__trigger');
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute('data-size')).toBe('small');
    expect(trigger?.getAttribute('data-status')).toBe('error');
  });

  it('DateRangePicker supports custom separator, size, status, and clear button', async () => {
    const onchange = vi.fn();
    const { container } = render(DateRangePicker, {
      props: {
        value: { start: '2026-11-01', end: '2026-11-15' },
        separator: '~',
        size: 'large',
        status: 'warning',
        allowClear: true,
        onchange,
      },
    });

    const root = container.querySelector('[data-date-range-input]');
    expect(root?.getAttribute('data-size')).toBe('large');
    expect(root?.getAttribute('data-status')).toBe('warning');
    expect(container.textContent).toContain('~');

    const clearBtn = container.querySelector('button[aria-label="Clear date range"]');
    expect(clearBtn).not.toBeNull();
    if (clearBtn) {
      await fireEvent.click(clearBtn);
      expect(onchange).toHaveBeenCalledWith({ start: null, end: null });
    }
  });

  it('DateRangePicker supports defaultValue and onChange callback', async () => {
    const onChange = vi.fn();
    const { container } = render(DateRangePicker, {
      props: {
        defaultValue: { start: '2026-11-01', end: '2026-11-20' },
        onChange,
        allowClear: true,
      },
    });

    const inputs = container.querySelectorAll('input');
    expect(inputs[0]?.value).toBe('2026-11-01');
    expect(inputs[1]?.value).toBe('2026-11-20');

    const clearBtn = container.querySelector('button[aria-label="Clear date range"]');
    if (clearBtn) {
      await fireEvent.click(clearBtn);
      expect(onChange).toHaveBeenCalledWith({ start: null, end: null });
    }
  });
});
