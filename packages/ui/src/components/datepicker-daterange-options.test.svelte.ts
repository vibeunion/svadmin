import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import DatePicker from './DatePicker.svelte';
import DateRangePicker from './DateRangePicker.svelte';

describe('DatePicker and DateRangePicker option parity', () => {
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
});
