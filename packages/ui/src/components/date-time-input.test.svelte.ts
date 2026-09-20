import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/svelte';
import DateTimeInput from './DateTimeInput.svelte';
import DateRangeInput from './DateRangeInput.svelte';
import FieldRenderer from './FieldRenderer.svelte';
import { dateInputAllowed, dateInputNumber } from '../date-input-policy.js';
import { civilDateTimeToInstant, formatCivilDateTime, parseDateTimeInstant } from '@svadmin/core/date-time';

describe('enterprise date and time inputs', () => {
  it('submits range instants and preserves the caller civil boundaries', async () => {
    const onchange = vi.fn();
    const view = render(FieldRenderer, {
      field: { key: 'period', label: 'Period', type: 'daterange', dateInput: {
        rangeMode: 'datetime', valueMode: 'instant', timeZone: 'Asia/Shanghai',
        min: '2026-09-19T08:00', max: '2026-09-19T18:00',
      } },
      value: { start: '2026-09-19T01:00:00Z', end: '2026-09-19T04:00:00Z' }, onchange,
    });
    const form = document.createElement('form');
    form.append(view.container);
    const inputs = form.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]');
    expect(inputs[0]!.value).toBe('2026-09-19T09:00');
    expect(inputs[0]!.min).toBe('2026-09-19T08:00');
    expect(inputs[1]!.max).toBe('2026-09-19T18:00');
    await fireEvent.input(inputs[1]!, { target: { value: '2026-09-19T08:30' } });
    expect(onchange).not.toHaveBeenCalled();
    expect(inputs[1]!.validity.customError).toBe(true);
    await fireEvent.input(inputs[1]!, { target: { value: '2026-09-19T13:30' } });
    expect(onchange).toHaveBeenLastCalledWith({ start: '2026-09-19T01:00:00Z', end: '2026-09-19T05:30:00.000Z' });
    expect(new FormData(form).getAll('period.end')).toEqual(['2026-09-19T05:30:00.000Z']);
    await fireEvent.input(inputs[1]!, { target: { value: '2026-09-19T19:00' } });
    expect(onchange).toHaveBeenCalledOnce();
  });

  it('compares fold endpoints as instants even when local clocks appear reversed', async () => {
    const onchange = vi.fn();
    const view = render(DateRangeInput, {
      mode: 'datetime', valueMode: 'instant', timeZone: 'America/Los_Angeles',
      value: { start: '2026-11-01T01:45:00-07:00', end: '2026-11-01T01:15:00-08:00' }, onchange,
    });
    const inputs = view.container.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]');
    expect(inputs[0]!.value).toBe('2026-11-01T01:45');
    expect(inputs[1]!.value).toBe('2026-11-01T01:15');
    expect(inputs[0]!.validity.customError).toBe(false);
    expect(inputs[1]!.validity.customError).toBe(false);
    await fireEvent.input(inputs[1]!, { target: { value: '2026-11-01T01:30' } });
    expect(onchange).not.toHaveBeenCalled();
    expect(inputs[1]!.validity.customError).toBe(true);
    await view.rerender({ disambiguation: 'later' });
    await fireEvent.input(inputs[1]!, { target: { value: '2026-11-01T01:30' } });
    expect(onchange).toHaveBeenLastCalledWith({ start: '2026-11-01T01:45:00-07:00', end: '2026-11-01T09:30:00.000Z' });
  });

  it('validates instant presets atomically, including configuration and civil policy', async () => {
    const onchange = vi.fn();
    const presets = [
      { label: 'Valid fold', value: { start: '2026-11-01T08:45:00Z', end: '2026-11-01T09:15:00Z' } },
      { label: 'Reversed', value: { start: '2026-11-01T09:45:00Z', end: '2026-11-01T09:15:00Z' } },
      { label: 'Civil', value: { start: '2026-11-01T01:00', end: '2026-11-01T02:00' } },
    ];
    const view = render(DateRangeInput, {
      mode: 'datetime', valueMode: 'instant', timeZone: 'America/Los_Angeles', presets, onchange,
    });
    await fireEvent.change(view.getByRole('combobox'), { target: { value: '1' } });
    await fireEvent.change(view.getByRole('combobox'), { target: { value: '2' } });
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.change(view.getByRole('combobox'), { target: { value: '0' } });
    expect(onchange).toHaveBeenCalledExactlyOnceWith(presets[0]!.value);
    await view.rerender({ timeZone: 'invalid' });
    await fireEvent.change(view.getByRole('combobox'), { target: { value: '0' } });
    expect(onchange).toHaveBeenCalledOnce();
  });

  it('rejects gaps and supports clearing an instant range endpoint', async () => {
    const onchange = vi.fn();
    const view = render(DateRangeInput, {
      mode: 'datetime', valueMode: 'instant', timeZone: 'America/Los_Angeles', onchange,
      value: { start: '2026-03-08T09:00:00Z', end: null },
    });
    const end = view.container.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]')[1]!;
    await fireEvent.input(end, { target: { value: '2026-03-08T02:30' } });
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.input(end, { target: { value: '2026-03-08T03:30' } });
    expect(onchange).toHaveBeenLastCalledWith({ start: '2026-03-08T09:00:00Z', end: '2026-03-08T10:30:00.000Z' });
    await fireEvent.input(end, { target: { value: '' } });
    expect(onchange).toHaveBeenLastCalledWith({ start: '2026-03-08T09:00:00Z', end: null });
  });
  it('rejects gaps and requires an explicit choice for duplicated local time', () => {
    const timeZone = 'America/Los_Angeles';
    const civil = '2026-11-01T01:30';
    expect(civilDateTimeToInstant(civil, timeZone)).toBeUndefined();
    expect(civilDateTimeToInstant(civil, timeZone, 'earlier')).toBe(Date.parse('2026-11-01T08:30Z'));
    expect(civilDateTimeToInstant(civil, timeZone, 'later')).toBe(Date.parse('2026-11-01T09:30Z'));
    for (const policy of ['reject', 'earlier', 'later'] as const) {
      expect(civilDateTimeToInstant('2026-03-08T02:30', timeZone, policy)).toBeUndefined();
    }
  });

  it('preserves milliseconds and fractional-hour timezone offsets', () => {
    const instant = Date.parse('2026-09-19T00:00:00.123Z');
    expect(formatCivilDateTime(instant, 'Asia/Kathmandu')).toBe('2026-09-19T05:45:00.123');
    expect(civilDateTimeToInstant('2026-09-19T05:45:00.123', 'Asia/Kathmandu')).toBe(instant);
    expect(civilDateTimeToInstant('0099-01-01T00:00', 'UTC')).toBe(Date.parse('0099-01-01T00:00Z'));
  });

  it('rejects malformed instant values and invalid timezones without fallback to host time', () => {
    for (const value of ['2026-02-30T00:00Z', '2026-01-00T00:00Z', '2026-09-19T10:00', 'yesterday', '2026-09-19']) {
      expect(parseDateTimeInstant(value)).toBeUndefined();
    }
    expect(parseDateTimeInstant('2026-09-19T10:00:00+08:00')).toBe(Date.parse('2026-09-19T02:00Z'));
    for (const timeZone of ['', 'Not/AZone']) {
      expect(formatCivilDateTime(0, timeZone)).toBeUndefined();
      expect(civilDateTimeToInstant('2026-09-19T10:00', timeZone)).toBeUndefined();
    }
    expect(formatCivilDateTime(Number.MAX_VALUE, 'UTC')).toBeUndefined();
  });

  it('blocks invalid configuration and retains invalid bound instants as validation errors', async () => {
    const onchange = vi.fn();
    const view = render(DateTimeInput, { mode: 'datetime', valueMode: 'instant', value: 'invalid', onchange });
    const input = view.container.querySelector('input')!;
    expect(input.validity.customError).toBe(true);
    await fireEvent.input(input, { target: { value: '2026-09-19T10:00' } });
    expect(onchange).not.toHaveBeenCalled();
    await view.rerender({ timeZone: 'UTC', value: '2026-09-19T10:00' });
    expect(input.validity.customError).toBe(true);
    await fireEvent.input(input, { target: { value: '2026-09-19T12:00' } });
    expect(onchange).toHaveBeenLastCalledWith('2026-09-19T12:00:00.000Z');
    expect(input.validity.customError).toBe(false);
  });

  it('uses the field timezone contract and submits an instant, not the displayed local value', async () => {
    const view = render(DateTimeInput, {
      name: 'occurredAt', mode: 'datetime', valueMode: 'instant', timeZone: 'Asia/Shanghai',
      value: '2026-09-19T00:00:00Z',
    });
    const form = document.createElement('form');
    form.append(view.container);
    const input = form.querySelector('input[type="datetime-local"]')!;
    expect(input.getAttribute('name')).toBeNull();
    await fireEvent.input(input, { target: { value: '2026-09-19T09:00' } });
    expect(new FormData(form).getAll('occurredAt')).toEqual(['2026-09-19T01:00:00.000Z']);
    const onchange = vi.fn();
    const field = render(FieldRenderer, {
      field: { key: 'when', label: 'When', type: 'datetime', dateInput: {
        valueMode: 'instant', timeZone: 'America/Los_Angeles', disambiguation: 'later',
      } }, value: null, onchange,
    });
    await fireEvent.input(field.container.querySelector('input[type="datetime-local"]')!, { target: { value: '2026-11-01T01:30' } });
    expect(onchange).toHaveBeenCalledWith('2026-11-01T09:30:00.000Z');
  });
  it('uses resource date policy without confusing numeric bounds with calendar bounds', async () => {
    const onchange = vi.fn();
    const view = render(FieldRenderer, {
      field: {
        key: 'booking', label: 'Booking', type: 'date', min: 9999,
        dateInput: { min: '2026-09-01', max: '2026-09-30', disabledDate: date => date === '2026-09-19' },
      },
      value: '2026-09-18', onchange,
    });
    const input = view.container.querySelector('input');
    if (!input) throw new Error('Missing date field');
    expect(input.min).toBe('2026-09-01');
    expect(input.max).toBe('2026-09-30');
    await fireEvent.input(input, { target: { value: '2026-09-19' } });
    expect(onchange).not.toHaveBeenCalled();
    expect(input.validity.customError).toBe(true);
    await view.rerender({
      field: { key: 'booking', label: 'Booking', type: 'date', dateInput: { disabledDate: () => false } },
    });
    expect(input.validity.customError).toBe(false);
    await fireEvent.input(input, { target: { value: '2026-09-20' } });
    expect(onchange).toHaveBeenLastCalledWith('2026-09-20');
  });

  it('shares range presets and local datetime mode through the resource field', async () => {
    const onchange = vi.fn();
    const view = render(FieldRenderer, {
      field: {
        key: 'period', label: 'Period', type: 'daterange',
        dateInput: {
          rangeMode: 'datetime', step: 60,
          presets: [{ label: 'Night shift', value: { start: '2026-09-19T22:00', end: '2026-09-20T06:00' } }],
        },
      },
      value: null, onchange,
    });
    expect([...view.container.querySelectorAll('input')].every(input => input.type === 'datetime-local')).toBe(true);
    await fireEvent.change(view.getByRole('combobox'), { target: { value: '0' } });
    expect(onchange).toHaveBeenCalledExactlyOnceWith({ start: '2026-09-19T22:00', end: '2026-09-20T06:00' });
  });
  it('retains a blocked draft for correction without emitting it as an accepted value', async () => {
    const onchange = vi.fn();
    const view = render(DateTimeInput, {
      value: '2026-09-18', ariaLabel: 'Booking', onchange,
      disabledDate: date => date === '2026-09-19',
    });
    const input = view.getByLabelText('Booking') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: '2026-09-19' } });
    expect(onchange).not.toHaveBeenCalled();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.validity.customError).toBe(true);
    await fireEvent.input(input, { target: { value: '2026-09-20' } });
    expect(onchange).toHaveBeenLastCalledWith('2026-09-20');
    expect(input.validity.customError).toBe(false);
    await view.rerender({ disabledDate: () => true });
    expect(input.validity.customError).toBe(true);
    await fireEvent.input(input, { target: { value: '' } });
    expect(onchange).toHaveBeenLastCalledWith(null);
  });

  it('applies a complete preset atomically and rejects blocked or reversed ranges', async () => {
    const onchange = vi.fn();
    const view = render(DateRangeInput, {
      min: '2026-09-01', max: '2026-09-30', onchange,
      disabledDate: date => date === '2026-09-19',
      presets: [
        { label: 'First week', value: { start: '2026-09-01', end: '2026-09-07' } },
        { label: 'Blocked', value: { start: '2026-09-19', end: '2026-09-20' } },
        { label: 'Reversed', value: { start: '2026-09-20', end: '2026-09-10' } },
        { label: 'Outside', value: { start: '2026-08-01', end: '2026-09-01' } },
      ],
    });
    const select = view.getByRole('combobox');
    for (const value of ['1', '2', '3']) await fireEvent.change(select, { target: { value } });
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.change(select, { target: { value: '0' } });
    expect(onchange).toHaveBeenCalledExactlyOnceWith({ start: '2026-09-01', end: '2026-09-07' });
    await view.rerender({ disabled: true });
    await fireEvent.change(select, { target: { value: '0' } });
    expect(onchange).toHaveBeenCalledOnce();
  });

  it('validates civil dates strictly and compares equivalent time precision numerically', () => {
    expect(dateInputNumber('2026-02-30', 'date')).toBeUndefined();
    expect(dateInputNumber('2026-09-19T10:00Z', 'datetime')).toBeUndefined();
    expect(dateInputAllowed('10:00:00', 'time', '10:00', '10:00')).toBe(true);
    expect(dateInputAllowed('2026-09-19', 'date', undefined, undefined, () => { throw new Error('private'); })).toBe(false);
    expect(dateInputAllowed('2026-09-19', 'date', 'invalid')).toBe(false);
  });

  it('round-trips explicit timezone instants across a DST boundary and rejects nonexistent civil time', async () => {
    const onchange = vi.fn();
    const view = render(DateTimeInput, {
      mode: 'datetime', value: '2026-03-08T09:30:00.000Z',
      timeZone: 'America/Los_Angeles', valueMode: 'instant', onchange,
    });
    const input = view.container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('2026-03-08T01:30');
    await fireEvent.input(input, { target: { value: '2026-03-08T02:30' } });
    expect(onchange).not.toHaveBeenCalled();
    expect(input.validity.customError).toBe(true);
  });
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

  it('converts explicit civil datetimes to instants only with an explicit timezone', async () => {
    const onchange = vi.fn();
    const view = render(DateTimeInput, {
      mode: 'datetime', value: '2026-01-01T00:00:00.000Z',
      timeZone: 'America/Los_Angeles', valueMode: 'instant', onchange,
    });
    const input = view.container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('2025-12-31T16:00');
    await fireEvent.input(input, { target: { value: '2026-01-01T00:00' } });
    expect(onchange).toHaveBeenLastCalledWith('2026-01-01T08:00:00.000Z');
    await view.rerender({ value: '2026-03-08T10:00:00.000Z' });
    expect(input.value).toBe('2026-03-08T03:00');
    await fireEvent.input(input, { target: { value: '2026-03-08T02:00' } });
    expect(onchange).toHaveBeenLastCalledWith('2026-01-01T08:00:00.000Z');
    expect(input.validity.customError).toBe(true);
  });

  it('updates only the changed side of a date range', async () => {
    const onchange = vi.fn();
    const view = render(DateRangeInput, {
      value: { start: '2026-09-01', end: null },
      onchange,
    });
    const inputs = view.container.querySelectorAll('input');

    expect(inputs).toHaveLength(2);
    expect(inputs[0]?.getAttribute('max')).toBeNull();
    expect(inputs[1]?.getAttribute('min')).toBe('2026-09-01');
    expect(inputs[0]?.getAttribute('aria-label')).toBe('Start date');
    if (inputs[1]) await fireEvent.input(inputs[1], { target: { value: '2026-09-30' } });
    expect(inputs[0]?.getAttribute('max')).toBe('2026-09-30');
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
    expect(range.getByLabelText('周期 Start date')).toBeTruthy();
    expect(range.getByLabelText('周期 End date')).toBeTruthy();
  });

  it.each(['start', 'end'] as const)('preserves both nullable keys when editing an empty range: %s', async part => {
    const onchange = vi.fn();
    const view = render(DateRangeInput, { value: null, onchange });
    const input = view.getByLabelText(part === 'start' ? 'Start date' : 'End date');
    await fireEvent.input(input, { target: { value: '2026-09-20' } });
    expect(onchange).toHaveBeenLastCalledWith({
      start: part === 'start' ? '2026-09-20' : null,
      end: part === 'end' ? '2026-09-20' : null,
    });
    await fireEvent.input(input, { target: { value: '' } });
    expect(onchange).toHaveBeenLastCalledWith({ start: null, end: null });
  });

  it('never relaxes external bounds and restores them after clearing either side', async () => {
    const view = render(DateRangeInput, {
      min: '2026-09-10', max: '2026-09-25',
      value: { start: '2026-09-01', end: '2026-09-30' },
    });
    const start = view.getByLabelText('Start date') as HTMLInputElement;
    const end = view.getByLabelText('End date') as HTMLInputElement;
    expect(start.max).toBe('2026-09-25');
    expect(end.min).toBe('2026-09-10');
    await fireEvent.input(start, { target: { value: '2026-09-15' } });
    expect(end.min).toBe('2026-09-15');
    await fireEvent.input(start, { target: { value: '' } });
    expect(end.min).toBe('2026-09-10');
    await fireEvent.input(end, { target: { value: '2026-09-20' } });
    expect(start.max).toBe('2026-09-20');
    await fireEvent.input(end, { target: { value: '' } });
    expect(start.max).toBe('2026-09-25');
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
