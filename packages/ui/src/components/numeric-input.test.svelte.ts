import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import NumberInput from './NumberInput.svelte';
import MoneyInput from './MoneyInput.svelte';
import PercentInput from './PercentInput.svelte';
import FieldRenderer from './FieldRenderer.svelte';
import NumericInputBindingHost from './numeric-input-binding.test-host.svelte';
import type { NumericInputMode } from './NumericInput.svelte';

function numericField(label: string): HTMLInputElement {
  const input = screen.getByRole('spinbutton', { name: label });
  if (!(input instanceof HTMLInputElement)) throw new Error(`Expected numeric input: ${label}`);
  return input;
}

describe('enterprise numeric inputs', () => {
  it('preserves null and zero as distinct values', async () => {
    const onchange = vi.fn();
    const view = render(NumberInput, { value: 0, onchange });
    const input = view.container.querySelector('input');
    expect(input?.value).toBe('0');

    if (input) {
      await fireEvent.input(input, { target: { value: '' } });
      await fireEvent.input(input, { target: { value: '0' } });
    }

    expect(onchange.mock.calls.map(([value]) => value)).toEqual([null, 0]);
  });

  it('renders money and percent semantics without changing stored money units', async () => {
    const moneyChange = vi.fn();
    const percentChange = vi.fn();
    const money = render(MoneyInput, { value: 12.5, currency: 'CNY', onchange: moneyChange });
    const percent = render(PercentInput, { value: 0.25, scale: '1', onchange: percentChange });

    expect(money.container.textContent).toContain('CNY');
    expect(percent.container.textContent).toContain('%');
    expect(percent.container.querySelector('input')?.value).toBe('25');

    const percentInput = percent.container.querySelector('input');
    if (percentInput) await fireEvent.input(percentInput, { target: { value: '30' } });
    expect(percentChange).toHaveBeenLastCalledWith(0.3);
  });

  it('routes currency and percent field definitions through typed inputs', () => {
    const currency = render(FieldRenderer, {
      field: { key: 'price', label: '价格', type: 'currency', currency: 'CNY', precision: 2 },
      value: 12.5,
      onchange: vi.fn(),
    });
    const percent = render(FieldRenderer, {
      field: { key: 'rate', label: '比例', type: 'percent', scale: '1' },
      value: 0.2,
      onchange: vi.fn(),
    });

    expect(currency.container.querySelector('[data-numeric-input="currency"]')).not.toBeNull();
    expect(percent.container.querySelector('[data-numeric-input="percent"]')).not.toBeNull();
  });

  it('applies precision to display only and clamps it to 0..20', async () => {
    const onchange = vi.fn();
    const rounded = render(NumberInput, { value: 1.23456, precision: 2, onchange });
    const input = rounded.container.querySelector('input');
    expect(input?.value).toBe('1.23');

    if (input) await fireEvent.input(input, { target: { value: '1.23456' } });
    expect(onchange).toHaveBeenLastCalledWith(1.23456);

    const floor = render(NumberInput, { value: 1.4, precision: -3 });
    expect(floor.container.querySelector('input')?.value).toBe('1');
    const ceiling = render(NumberInput, { value: 1.5, precision: 25 });
    expect(ceiling.container.querySelector('input')?.value).toBe('1.50000000000000000000');
  });

  it('derives the step from precision and percent scale', () => {
    const number = render(NumberInput, { value: 1, precision: 2 });
    expect(number.container.querySelector('input')?.getAttribute('step')).toBe('0.01');
    const money = render(MoneyInput, { value: 1, precision: 0 });
    expect(money.container.querySelector('input')?.getAttribute('step')).toBe('1');
    const percent = render(PercentInput, { value: 0.6, scale: '1' });
    expect(percent.container.querySelector('input')?.getAttribute('step')).toBe('1');
  });

  it('hits the Number.isFinite guard for unsanitized happy-dom text, not real paste/locale input', async () => {
    const onchange = vi.fn();
    const view = render(MoneyInput, { value: 12.5, currency: 'CNY', onchange });
    const input = view.container.querySelector('input');
    if (!input) throw new Error('Expected a money input');

    // happy-dom passes raw strings through to `input.value`; the component then
    // takes its non-finite defensive branch. Real browsers sanitize
    // `type="number"` values before input events, so this is not evidence that
    // locale-formatted text or real paste is rejected with the display intact.
    for (const invalid of ['1,234.5', '1.234,5', '1 234', '12abc', '1e999']) {
      await fireEvent.input(input, { target: { value: invalid } });
      expect(onchange).not.toHaveBeenCalled();
    }

    await fireEvent.input(input, { target: { value: '19.5' } });
    expect(onchange.mock.calls).toEqual([[19.5]]);
  });

  it.each([
    { label: 'Number', key: 'number', mode: 'number', input: '12', stored: 12 },
    { label: 'Money', key: 'money', mode: 'currency', input: '19.5', stored: 19.5 },
    { label: 'Percent', key: 'percent', mode: 'percent', input: '25', stored: 0.25 },
  ] as const)('preserves parent binding, null/zero and one callback for $label', async ({ label, key, mode, input, stored }) => {
    const onchange = vi.fn<(mode: NumericInputMode, value: number | null) => void>();
    render(NumericInputBindingHost, { onchange });
    const field = numericField(label);
    const output = screen.getByTestId(`${key}-value`);
    expect(output.textContent).toBe('null');
    expect(field.value).toBe('');

    await fireEvent.input(field, { target: { value: input } });
    expect(output.textContent).toBe(String(stored));
    await fireEvent.input(field, { target: { value: '' } });
    expect(output.textContent).toBe('null');
    await fireEvent.input(field, { target: { value: '0' } });
    expect(output.textContent).toBe('0');
    expect(onchange.mock.calls).toEqual([[mode, stored], [mode, null], [mode, 0]]);
  });

  it('reflects parent value changes and clearing without emitting input callbacks', async () => {
    const onchange = vi.fn<(mode: NumericInputMode, value: number | null) => void>();
    render(NumericInputBindingHost, { onchange });
    await fireEvent.click(screen.getByRole('button', { name: 'Set parent values' }));
    expect(numericField('Number').value).toBe('0');
    expect(numericField('Money').value).toBe('12.5');
    expect(numericField('Percent').value).toBe('60');
    expect(onchange).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole('button', { name: 'Clear parent values' }));
    for (const label of ['Number', 'Money', 'Percent']) expect(numericField(label).value).toBe('');
    for (const key of ['number', 'money', 'percent']) expect(screen.getByTestId(`${key}-value`).textContent).toBe('null');
    expect(onchange).not.toHaveBeenCalled();
  });
});

describe('enterprise numeric inputs with explicit locale', () => {
  function localeInput(container: HTMLElement): HTMLInputElement {
    const input = container.querySelector('input');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected a numeric input');
    return input;
  }

  it.each([
    ['en-US', '1,234.5'],
    ['de-DE', '1.234,5'],
    ['zh-CN', '1,234.5'],
  ] as const)('formats %s with grouping and a locale decimal separator', (locale, expected) => {
    const view = render(NumberInput, { value: 1234.5, locale });
    const input = localeInput(view.container);
    expect(input.getAttribute('type')).toBe('text');
    expect(input.getAttribute('role')).toBe('spinbutton');
    expect(input.getAttribute('lang')).toBe(locale);
    expect(input.value).toBe(expected);
  });

  it('keeps the legacy type=number contract when locale is omitted', () => {
    const view = render(NumberInput, { value: 1234.5 });
    const input = localeInput(view.container);
    expect(input.getAttribute('type')).toBe('number');
    expect(input.getAttribute('role')).toBeNull();
    expect(input.value).toBe('1234.5');
  });

  it('writes parsed values, not display separators, for en-US and de-DE', async () => {
    const enChange = vi.fn();
    const en = render(MoneyInput, { value: null, currency: 'CNY', locale: 'en-US', precision: 2, onchange: enChange });
    const enInput = localeInput(en.container);
    expect(en.container.textContent).toContain('CNY');
    await fireEvent.input(enInput, { target: { value: '1,234.50' } });
    expect(enChange).toHaveBeenLastCalledWith(1234.5);
    await fireEvent.blur(enInput);
    expect(enInput.value).toBe('1,234.50');

    const deChange = vi.fn();
    const de = render(MoneyInput, { value: null, currency: 'EUR', locale: 'de-DE', precision: 2, onchange: deChange });
    const deInput = localeInput(de.container);
    await fireEvent.input(deInput, { target: { value: '1.234,50' } });
    expect(deChange).toHaveBeenLastCalledWith(1234.5);
    await fireEvent.blur(deInput);
    expect(deInput.value).toBe('1.234,50');
  });

  it('rejects mixed separators without writing or echoing a raw error', async () => {
    const onchange = vi.fn();
    const view = render(NumberInput, { value: 42.5, locale: 'de-DE', onchange });
    const input = localeInput(view.container);
    expect(input.value).toBe('42,5');
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: '1,234.5' } });
    expect(onchange).not.toHaveBeenCalled();
    expect(view.container.textContent).not.toContain('1,234.5');
    expect(view.container.querySelector('[role="alert"]')).toBeNull();
    await fireEvent.blur(input);
    expect(input.value).toBe('1,234.5');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.validationMessage).not.toBe('');
  });

  it('keeps null and zero distinct and applies percent scale before storage', async () => {
    const onchange = vi.fn();
    const view = render(PercentInput, { value: 0.25, locale: 'de-DE', scale: '1', precision: 1, onchange });
    const input = localeInput(view.container);
    expect(input.value).toBe('25,0');
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: '25,5' } });
    expect(onchange).toHaveBeenLastCalledWith(0.255);
    await fireEvent.input(input, { target: { value: '' } });
    expect(onchange).toHaveBeenLastCalledWith(null);
    await fireEvent.input(input, { target: { value: '0' } });
    expect(onchange).toHaveBeenLastCalledWith(0);
  });

  it('steps with the precision-derived increment and clamps to min/max', async () => {
    const onchange = vi.fn();
    const view = render(NumberInput, { value: 1.23, locale: 'en-US', precision: 2, min: 1, max: 1.24, onchange });
    const input = localeInput(view.container);
    expect(input.getAttribute('step')).toBe('0.01');
    await fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(onchange).toHaveBeenLastCalledWith(1.24);
    await fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(onchange).toHaveBeenLastCalledWith(1.24);
    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(onchange).toHaveBeenLastCalledWith(1.23);
  });
});
