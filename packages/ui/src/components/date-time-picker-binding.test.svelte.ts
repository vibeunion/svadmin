import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import DateTimePickerBindingHost from './date-time-picker-binding.test-host.svelte';
import type { DateRangeInputValue } from './DateRangeInput.svelte';

type ChangeHandler = (kind: 'date' | 'time' | 'datetime' | 'range', value: string | DateRangeInputValue | null) => void;

function input(label: string): HTMLInputElement {
  const element = screen.getByLabelText(label);
  if (!(element instanceof HTMLInputElement)) throw new Error(`Expected input: ${label}`);
  return element;
}

function parentRange(): unknown {
  return JSON.parse(screen.getByTestId('range-value').textContent ?? '');
}

describe('date and time picker public bindings', () => {
  it('propagates user edits, nullable clears, and range keys through every public entry point', async () => {
    const onchange = vi.fn<ChangeHandler>();
    render(DateTimePickerBindingHost, { onchange });

    expect(screen.getByTestId('date-value').textContent).toBe('null');
    expect(screen.getByTestId('time-value').textContent).toBe('null');
    expect(screen.getByTestId('datetime-value').textContent).toBe('null');
    expect(parentRange()).toBeNull();

    await fireEvent.input(input('Date'), { target: { value: '2026-09-20' } });
    await fireEvent.input(input('Time'), { target: { value: '09:30' } });
    await fireEvent.input(input('Date and time'), { target: { value: '2026-09-20T09:30' } });
    await fireEvent.input(input('Range start'), { target: { value: '2026-09-01' } });
    await fireEvent.input(input('Range end'), { target: { value: '2026-09-20' } });

    expect(screen.getByTestId('date-value').textContent).toBe('2026-09-20');
    expect(screen.getByTestId('time-value').textContent).toBe('09:30');
    expect(screen.getByTestId('datetime-value').textContent).toBe('2026-09-20T09:30');
    expect(parentRange()).toEqual({ start: '2026-09-01', end: '2026-09-20' });

    await fireEvent.input(input('Date'), { target: { value: '' } });
    await fireEvent.input(input('Time'), { target: { value: '' } });
    await fireEvent.input(input('Date and time'), { target: { value: '' } });
    await fireEvent.input(input('Range start'), { target: { value: '' } });
    await fireEvent.input(input('Range end'), { target: { value: '' } });

    expect(screen.getByTestId('date-value').textContent).toBe('null');
    expect(screen.getByTestId('time-value').textContent).toBe('null');
    expect(screen.getByTestId('datetime-value').textContent).toBe('null');
    expect(parentRange()).toEqual({ start: null, end: null });
    expect(onchange.mock.calls).toEqual([
      ['date', '2026-09-20'],
      ['time', '09:30'],
      ['datetime', '2026-09-20T09:30'],
      ['range', { start: '2026-09-01', end: null }],
      ['range', { start: '2026-09-01', end: '2026-09-20' }],
      ['date', null],
      ['time', null],
      ['datetime', null],
      ['range', { start: null, end: '2026-09-20' }],
      ['range', { start: null, end: null }],
    ]);
  });

  it('reflects parent assignments and clearing without emitting onchange', async () => {
    const onchange = vi.fn<ChangeHandler>();
    render(DateTimePickerBindingHost, { onchange });

    await fireEvent.click(screen.getByRole('button', { name: 'Set parent values' }));
    expect(input('Date').value).toBe('2026-09-21');
    expect(input('Time').value).toBe('09:30');
    expect(input('Date and time').value).toBe('2026-09-21T09:30');
    expect(input('Range start').value).toBe('2026-09-01');
    expect(input('Range end').value).toBe('2026-09-21');
    expect(onchange).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole('button', { name: 'Clear parent values' }));
    expect(input('Date').value).toBe('');
    expect(input('Time').value).toBe('');
    expect(input('Date and time').value).toBe('');
    expect(input('Range start').value).toBe('');
    expect(input('Range end').value).toBe('');
    expect(onchange).not.toHaveBeenCalled();
  });

  it('binds and submits an instant once while displaying the configured civil time', async () => {
    const onchange = vi.fn<ChangeHandler>();
    const view = render(DateTimePickerBindingHost, { instant: true, onchange });
    const form = document.createElement('form');
    view.container.append(form);
    form.append(...Array.from(view.container.childNodes).filter(node => node !== form));

    await fireEvent.click(screen.getByRole('button', { name: 'Set parent values' }));
    expect(input('Date and time').value).toBe('2026-09-21T09:30');
    expect(screen.getByTestId('datetime-value').textContent).toBe('2026-09-21T01:30:00.000Z');
    const data = new FormData(form);
    const expectedFields = {
      date: '2026-09-21',
      time: '09:30',
      datetime: '2026-09-21T01:30:00.000Z',
      'period.start': '2026-09-01',
      'period.end': '2026-09-21',
    };
    expect([...data.keys()]).toHaveLength(Object.keys(expectedFields).length);
    for (const [name, value] of Object.entries(expectedFields)) {
      expect(data.getAll(name)).toEqual([value]);
    }
    expect(onchange).not.toHaveBeenCalled();

    await fireEvent.input(input('Date and time'), { target: { value: '2026-09-22T00:30' } });
    expect(screen.getByTestId('datetime-value').textContent).toBe('2026-09-21T16:30:00.000Z');
    expect(new FormData(form).getAll('datetime')).toEqual(['2026-09-21T16:30:00.000Z']);
    expect(onchange).toHaveBeenCalledExactlyOnceWith('datetime', '2026-09-21T16:30:00.000Z');

    await fireEvent.input(input('Date and time'), { target: { value: '' } });
    expect(screen.getByTestId('datetime-value').textContent).toBe('null');
    expect(new FormData(form).getAll('datetime')).toEqual(['']);
    expect(onchange.mock.calls).toEqual([
      ['datetime', '2026-09-21T16:30:00.000Z'],
      ['datetime', null],
    ]);
  });

  it('retains a rejected range draft without changing the parent value or the other endpoint', async () => {
    const onchange = vi.fn<ChangeHandler>();
    render(DateTimePickerBindingHost, { onchange });
    await fireEvent.click(screen.getByRole('button', { name: 'Set parent values' }));
    const start = input('Range start');

    await fireEvent.input(start, { target: { value: '2026-09-22' } });
    expect(start.value).toBe('2026-09-22');
    expect(start.validity.customError).toBe(true);
    expect(start.getAttribute('aria-invalid')).toBe('true');
    expect(parentRange()).toEqual({ start: '2026-09-01', end: '2026-09-21' });
    expect(input('Range end').value).toBe('2026-09-21');
    expect(onchange).not.toHaveBeenCalled();

    await fireEvent.input(start, { target: { value: '2026-09-20' } });
    expect(start.validity.customError).toBe(false);
    expect(parentRange()).toEqual({ start: '2026-09-20', end: '2026-09-21' });
    expect(onchange).toHaveBeenCalledExactlyOnceWith('range', { start: '2026-09-20', end: '2026-09-21' });
  });
});
