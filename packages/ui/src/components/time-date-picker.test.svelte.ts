import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
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
});
