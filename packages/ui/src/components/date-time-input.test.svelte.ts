import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/svelte';
import DateTimeInput from './DateTimeInput.svelte';
import DateRangeInput from './DateRangeInput.svelte';
import FieldRenderer from './FieldRenderer.svelte';

describe('enterprise date and time inputs', () => {
  it('keeps empty date values nullable and preserves native input type', async () => {
    const onchange = vi.fn();
    const view = render(DateTimeInput, { mode: 'datetime', value: null, onchange });
    const input = view.container.querySelector('input');

    expect(input?.type).toBe('datetime-local');
    if (input) {
      await fireEvent.input(input, { target: { value: '2026-09-19T10:30' } });
      await fireEvent.input(input, { target: { value: '' } });
    }

    expect(onchange.mock.calls.map(([value]) => value)).toEqual(['2026-09-19T10:30', null]);
  });

  it('updates only the changed side of a date range', async () => {
    const onchange = vi.fn();
    const view = render(DateRangeInput, {
      value: { start: '2026-09-01', end: null },
      onchange,
    });
    const inputs = view.container.querySelectorAll('input');

    expect(inputs).toHaveLength(2);
    if (inputs[1]) await fireEvent.input(inputs[1], { target: { value: '2026-09-30' } });
    expect(onchange).toHaveBeenLastCalledWith({ start: '2026-09-01', end: '2026-09-30' });
  });

  it('routes date, datetime, time, and date-range fields through typed controls', () => {
    const date = render(FieldRenderer, {
      field: { key: 'birthday', label: '生日', type: 'date' },
      value: '2026-09-19',
      onchange: vi.fn(),
    });
    const datetime = render(FieldRenderer, {
      field: { key: 'createdAt', label: '创建时间', type: 'datetime' },
      value: '2026-09-19T10:30',
      onchange: vi.fn(),
    });
    const range = render(FieldRenderer, {
      field: { key: 'period', label: '周期', type: 'daterange' },
      value: { start: '2026-09-01', end: '2026-09-30' },
      onchange: vi.fn(),
    });

    expect(date.container.querySelector('[data-date-time-input="date"]')).not.toBeNull();
    expect(datetime.container.querySelector('[data-date-time-input="datetime"]')).not.toBeNull();
    expect(range.container.querySelector('[data-date-range-input]')).not.toBeNull();
  });

  it('emits a complete nullable range when editing an initially null value', async () => {
    const onchange = vi.fn();
    const view = render(DateRangeInput, { value: null, startId: 'range-start', startName: 'start', onchange });
    const start = view.container.querySelector('input');
    if (!(start instanceof HTMLInputElement)) throw new Error('Expected range input');
    expect(start.id).toBe('range-start');
    expect(start.name).toBe('start');
    await fireEvent.input(start, { target: { value: '2026-09-19' } });
    expect(onchange).toHaveBeenLastCalledWith({ start: '2026-09-19', end: null });
    await fireEvent.input(start, { target: { value: '' } });
    expect(onchange).toHaveBeenLastCalledWith({ start: null, end: null });
  });

});
