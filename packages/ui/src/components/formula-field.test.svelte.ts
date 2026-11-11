import { describe, expect, it } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { evaluateFormula } from './useFormulaEngine.svelte.js';
import FormulaField from './FormulaField.svelte';

describe('useFormulaEngine and FormulaField suite', () => {
  it('evaluates arithmetic expressions with scope variables', () => {
    const scope = { price: 100, qty: 5, discount: 0.1 };
    const res = evaluateFormula('price * qty * (1 - discount)', scope);
    expect(res).toBe(450);
  });

  it('evaluates helper functions SUM, ROUND, IF', () => {
    expect(evaluateFormula('ROUND(10 / 3, 2)')).toBe(3.33);
    expect(evaluateFormula('SUM(10, 20, 30)')).toBe(60);
    expect(evaluateFormula('IF(1, 100, 200)')).toBe(100);
    expect(evaluateFormula('IF(0, 100, 200)')).toBe(200);
  });

  it('renders FormulaField with prefix and computed value', () => {
    const view = render(FormulaField, {
      label: '订单折后总价',
      formula: 'price * qty',
      scope: { price: 200, qty: 3 },
      prefix: '¥',
    });

    expect(view.container.textContent).toContain('订单折后总价');
    expect(view.container.textContent).toContain('f(x):');
    expect(view.container.textContent).toContain('price * qty');

    const input = view.container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('600.00');
  });

  it('allows manual override when enabled', async () => {
    const view = render(FormulaField, {
      formula: '100 + 50',
      allowManualOverride: true,
    });

    const overrideBtn = view.container.querySelector('button');
    expect(overrideBtn).toBeTruthy();
    if (overrideBtn) {
      await fireEvent.click(overrideBtn);
      const input = view.container.querySelector('input') as HTMLInputElement;
      expect(input.readOnly).toBe(false);
    }
  });
});
