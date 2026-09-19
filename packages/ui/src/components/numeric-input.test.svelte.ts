import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/svelte';
import NumberInput from './NumberInput.svelte';
import MoneyInput from './MoneyInput.svelte';
import PercentInput from './PercentInput.svelte';
import FieldRenderer from './FieldRenderer.svelte';

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
});
