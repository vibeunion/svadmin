import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

  it('renders a calendar panel and switches month/year views', async () => {
    const onchange = vi.fn();
    const view = render(DatePicker, { value: '2026-09-20', panel: true, onchange });
    await fireEvent.click(view.getByRole('button'));
    const selected = await view.findByRole('button', { name: '20' });
    expect(selected.getAttribute('aria-pressed')).toBe('true');

    await fireEvent.click(view.getByText('2026-09'));
    const monthCells = await waitFor(() => {
      const cells = [...document.querySelectorAll<HTMLButtonElement>('.svadmin-date-picker__cell.h-14')];
      expect(cells).toHaveLength(12);
      return cells;
    });
    await fireEvent.click(monthCells[11] as HTMLButtonElement);
    await fireEvent.click(view.getByText('2026-12'));
    await fireEvent.click(view.getByText('2026'));
    const yearCells = await waitFor(() => {
      const cells = [...document.querySelectorAll<HTMLButtonElement>('.svadmin-date-picker__cell.h-11')];
      expect(cells).toHaveLength(12);
      return cells;
    });
    await fireEvent.click(yearCells.find((cell) => cell.textContent === '2027') as HTMLButtonElement);
    expect(view.getByText('2027')).toBeTruthy();
  });

  it('supports month, year, and quarter picker values', async () => {
    const onchange = vi.fn();
    const month = render(DatePicker, { panel: true, picker: 'month', value: '2026-09', onchange });
    await fireEvent.click(month.getByRole('button'));
    const monthCells = await waitFor(() => {
      const cells = [...document.querySelectorAll<HTMLButtonElement>('.svadmin-date-picker__cell.h-14')];
      expect(cells).toHaveLength(12);
      return cells;
    });
    await fireEvent.click(monthCells[11] as HTMLButtonElement);
    expect(onchange).toHaveBeenLastCalledWith('2026-12');
    cleanup();

    const year = render(DatePicker, { panel: true, picker: 'year', value: '2026', onchange });
    await fireEvent.click(year.getByRole('button'));
    const yearCells = await waitFor(() => {
      const cells = [...document.querySelectorAll<HTMLButtonElement>('.svadmin-date-picker__cell.h-11')];
      expect(cells).toHaveLength(12);
      return cells;
    });
    await fireEvent.click(yearCells.find((cell) => cell.textContent === '2027') as HTMLButtonElement);
    expect(onchange).toHaveBeenLastCalledWith('2027');
    cleanup();

    const quarter = render(DatePicker, { panel: true, picker: 'quarter', value: '2026-Q3', onchange });
    await fireEvent.click(quarter.getByRole('button'));
    await fireEvent.click(await quarter.findByRole('button', { name: 'Q4' }));
    expect(onchange).toHaveBeenLastCalledWith('2026-Q4');
  });

  it('provides a date-only range picker with ordered endpoints', () => {
    render(DateRangePicker, {
      value: { start: '2026-09-01', end: '2026-09-20' },
    });
    const inputs = [...document.querySelectorAll('input')];
    expect(inputs.map(input => input.value)).toEqual(['2026-09-01', '2026-09-20']);
    expect(inputs[0]?.max).toBe('2026-09-20');
    expect(inputs[1]?.min).toBe('2026-09-01');
  });
});
