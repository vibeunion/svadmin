import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TimePicker from './TimePicker.svelte';
import DateTimePicker from './DateTimePicker.svelte';

afterEach(() => cleanup());

describe('time and datetime picker entry points', () => {
  it('pins the input mode to time', () => {
    const view = render(TimePicker, { value: '09:30' });
    expect(view.container.querySelector('input')?.type).toBe('time');
  });

  it('pins the input mode to datetime-local', () => {
    const view = render(DateTimePicker, { value: '2026-09-20T09:30' });
    expect(view.container.querySelector('input')?.type).toBe('datetime-local');
  });

  it('forwards disabled and suppresses callbacks for synthetic input events', async () => {
    const onchange = vi.fn();
    const time = render(TimePicker, { value: '09:30', disabled: true, ariaLabel: 'Time', onchange });
    const timeInput = time.getByLabelText('Time') as HTMLInputElement;
    expect(timeInput.disabled).toBe(true);
    await fireEvent.input(timeInput, { target: { value: '10:15' } });
    expect(onchange).not.toHaveBeenCalled();

    const datetime = render(DateTimePicker, {
      value: '2026-09-21T23:30', disabled: true, ariaLabel: 'Date and time', onchange,
    });
    const datetimeInput = datetime.getByLabelText('Date and time') as HTMLInputElement;
    expect(datetimeInput.disabled).toBe(true);
    await fireEvent.input(datetimeInput, { target: { value: '2026-09-22T00:30' } });
    expect(onchange).not.toHaveBeenCalled();
  });
});
