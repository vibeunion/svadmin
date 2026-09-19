import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import type { FieldDefinition, Filter } from '@svadmin/core';
import JsonSchemaForm from './JsonSchemaForm.svelte';
import FilterBuilder from './FilterBuilder.svelte';
import SpreadsheetView, { type SheetData } from './SpreadsheetView.svelte';

function input(container: HTMLElement, selector: string): HTMLInputElement {
  const element = container.querySelector(selector);
  if (!(element instanceof HTMLInputElement)) throw new Error(`Missing input: ${selector}`);
  return element;
}
const schema = { type: 'object', properties: {
  amount: { type: 'number', title: 'Amount', default: 0 },
  enabled: { type: 'boolean', title: 'Enabled', default: false },
  plan: { type: 'integer', title: 'Plan', enum: [1, 2], default: 1 },
} };

describe('enterprise schema form interactions', () => {
  it('submits the same typed defaults that are displayed', async () => {
    const onsubmit = vi.fn();
    const view = render(JsonSchemaForm, { schema, onsubmit });
    expect(input(view.container, '[name="amount"]').value).toBe('0');
    expect(input(view.container, '[name="enabled"]').checked).toBe(false);
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    expect(onsubmit).toHaveBeenCalledWith({ amount: 0, enabled: false, plan: 1 });
  });
  it('preserves number enum values after selecting an option', async () => {
    const onsubmit = vi.fn();
    const view = render(JsonSchemaForm, { schema, onsubmit });
    await fireEvent.change(view.getByLabelText('Plan'), { target: { value: '1' } });
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    expect(onsubmit).toHaveBeenCalledWith({ amount: 0, enabled: false, plan: 2 });
  });
  it('does not turn a cleared required number into zero or its default', async () => {
    const onsubmit = vi.fn(), onvalidationerror = vi.fn();
    const view = render(JsonSchemaForm, { schema: { ...schema, required: ['amount'] }, onsubmit, onvalidationerror });
    await fireEvent.input(input(view.container, '[name="amount"]'), { target: { value: '' } });
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    expect(onsubmit).not.toHaveBeenCalled();
    expect(onvalidationerror).toHaveBeenCalledWith(expect.arrayContaining([{ path: '/amount', code: 'required' }]));
    expect(input(view.container, '[name="amount"]').getAttribute('aria-invalid')).toBe('true');
  });
  it('omits an explicitly cleared optional number from the snapshot', async () => {
    const onsubmit = vi.fn();
    const view = render(JsonSchemaForm, { schema, onsubmit });
    await fireEvent.input(input(view.container, '[name="amount"]'), { target: { value: '' } });
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    expect(onsubmit).toHaveBeenCalledWith({ enabled: false, plan: 1 });
  });
  it('preserves supported recursive objects instead of replacing them with a scalar form', async () => {
    const onsubmit = vi.fn();
    const view = render(JsonSchemaForm, { schema: { properties: { nested: { type: 'object', properties: { count: { type: 'integer', default: 2 } } } } }, onsubmit });
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    expect(onsubmit).toHaveBeenCalledWith({ nested: { count: 2 } });
    expect(view.queryByTestId('schema-form-errors')).toBeNull();
  });
  it('does not share field IDs across form instances', () => {
    const first = render(JsonSchemaForm, { schema }), second = render(JsonSchemaForm, { schema });
    const a = input(first.container, '[name="amount"]'), b = input(second.container, '[name="amount"]');
    expect(a.id).not.toBe(b.id);
    expect(first.container.querySelector(`label[for="${a.id}"]`)?.textContent).toContain('Amount');
  });
  it('prevents duplicate submission while the callback is pending', async () => {
    let finish: () => void = () => { throw new Error('Submission did not start'); };
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const onsubmit = vi.fn(() => pending);
    const view = render(JsonSchemaForm, { schema, onsubmit });
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    expect(onsubmit).toHaveBeenCalledTimes(1);
    expect(input(view.container, '[name="amount"]').disabled).toBe(true);
    finish();
    await waitFor(() => expect(view.getByTestId('json-schema-form').getAttribute('aria-busy')).toBe('false'));
  });
  it('reports callback failures and allows an explicit retry', async () => {
    const error = new Error('provider unavailable');
    const onsubmit = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(undefined), onerror = vi.fn();
    const view = render(JsonSchemaForm, { schema, onsubmit, onerror });
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    await waitFor(() => expect(onerror).toHaveBeenCalledWith(error));
    expect(view.getByRole('alert')).toBeTruthy();
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    expect(onsubmit).toHaveBeenCalledTimes(2);
  });
  it('isolates submitted snapshots from the caller and visible data', async () => {
    const value = { amount: 3, hidden: { version: 1 } };
    const onsubmit = vi.fn((snapshot: Record<string, unknown>) => {
      (snapshot['hidden'] as { version: number }).version = 99;
      snapshot['amount'] = 99;
    });
    const view = render(JsonSchemaForm, { schema, value, onsubmit });
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    expect(value.hidden.version).toBe(1);
    expect(input(view.container, '[name="amount"]').value).toBe('3');
  });
  it('clears a numeric parse error when the host replaces the form value', async () => {
    const onsubmit = vi.fn();
    const view = render(JsonSchemaForm, { schema, onsubmit });
    const amount = input(view.container, '[name="amount"]');
    Object.defineProperty(amount, 'validity', { value: { badInput: true }, configurable: true });
    await fireEvent.input(amount, { target: { value: '' } });
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    expect(onsubmit).not.toHaveBeenCalled();
    await view.rerender({ schema, value: { amount: 3 }, onsubmit });
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    expect(onsubmit).toHaveBeenCalledWith({ amount: 3, enabled: false, plan: 1 });
  });
  it('blocks programmatic submission in readonly mode', async () => {
    const onsubmit = vi.fn();
    const view = render(JsonSchemaForm, { schema, readonly: true, onsubmit });
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    expect(onsubmit).not.toHaveBeenCalled();
  });
});

const fields: FieldDefinition[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'amount', label: 'Amount', type: 'number' },
  { key: 'plan', label: 'Plan', type: 'select', options: [{ label: 'One', value: 1 }, { label: 'Two', value: 2 }] },
];
function nestedFilters(): Filter[] {
  return [{ field: 'title', operator: 'contains', value: 'Svelte' }, { operator: 'or', value: [
    { field: 'amount', operator: 'gte', value: 0 },
    { operator: 'and', value: [{ field: 'plan', operator: 'eq', value: 1 }] },
  ] }];
}
describe('enterprise recursive filter interactions', () => {
  it('roundtrips a mixed nested query without flattening', async () => {
    const onApply = vi.fn(), filters = nestedFilters();
    const view = render(FilterBuilder, { fields, filters, onApply });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenCalledWith(filters);
    expect(view.container.querySelectorAll('[data-filter-group]').length).toBe(3);
  });
  it('edits a nested number while preserving sibling groups and scalar types', async () => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, { fields, filters: nestedFilters(), onApply });
    const rules = view.container.querySelectorAll('[data-filter-rule]');
    const numeric = rules[1]?.querySelector('input');
    if (!(numeric instanceof HTMLInputElement)) throw new Error('Missing nested numeric input');
    await fireEvent.input(numeric, { target: { value: '10' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    const expected = nestedFilters();
    const group = expected[1];
    if (!group || 'field' in group) throw new Error('Missing expected group');
    group.value[0] = { field: 'amount', operator: 'gte', value: 10 };
    expect(onApply).toHaveBeenCalledWith(expected);
  });
  it('does not silently discard an unfinished rule beside a valid rule', async () => {
    const onApply = vi.fn(), onInvalid = vi.fn();
    const view = render(FilterBuilder, { fields, filters: nestedFilters(), onApply, onInvalid });
    await fireEvent.click(view.getByTestId('filter-builder-add-rule'));
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalled();
  });
  it('preserves unknown incoming host fields read-only and permits explicit reset', async () => {
    const onApply = vi.fn(), onReset = vi.fn();
    const view = render(FilterBuilder, { fields, filters: [{ field: 'missing', operator: 'eq', value: 'x' }], onApply, onReset });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenCalledWith([{ field: 'missing', operator: 'eq', value: 'x' }]);
    expect(view.container.querySelector('output')).toBeTruthy();
    await fireEvent.click(view.getByTestId('filter-builder-reset'));
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith([]);
  });
  it('keeps edited enum filter values numeric', async () => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, { fields, filters: [{ field: 'plan', operator: 'eq', value: 1 }], onApply });
    const select = view.container.querySelector('select[id$="-value"]');
    if (!(select instanceof HTMLSelectElement)) throw new Error('Missing enum select');
    await fireEvent.change(select, { target: { value: '1' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenCalledWith([{ field: 'plan', operator: 'eq', value: 2 }]);
  });
  it('adopts replacement filters instead of keeping the previous resource query', async () => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, { fields, filters: nestedFilters(), onApply });
    const replacement: Filter[] = [{ field: 'title', operator: 'eq', value: 'Replacement' }];
    await view.rerender({ fields, filters: replacement, onApply });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenCalledWith(replacement);
  });
  it('does not apply filters while disabled', async () => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, { fields, filters: nestedFilters(), disabled: true, onApply });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).not.toHaveBeenCalled();
  });
});

function sheets(): SheetData[] {
  return [
    { id: 'one', name: 'First', rows: 2, cols: 3, cells: { A1: '2', B1: '=A1*2', C1: '=C1', A2: '0' } },
    { id: 'two', name: 'Second', rows: 1, cols: 1, cells: { A1: '99' } },
  ];
}
describe('enterprise spreadsheet interactions', () => {
  it('shows deterministic cyclic-reference errors rather than crashing', () => {
    const view = render(SpreadsheetView, { sheets: sheets(), activeSheetId: 'one' });
    expect(input(view.container, '[aria-label="Cell C1"]').value).toBe('#CYCLE!');
    expect(input(view.container, '[aria-label="Cell B1"]').value).toBe('4');
  });
  it('commits the latest formula bar event without a one-input lag', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, { sheets: sheets(), activeSheetId: 'one', onchange });
    await fireEvent.input(view.getByLabelText('Formula A1'), { target: { value: '12' } });
    expect(onchange.mock.lastCall?.[0]?.[0]?.cells['A1']).toBe('12');
    expect(input(view.container, '[aria-label="Cell B1"]').value).toBe('24');
  });
  it('synchronizes direct cell editing back to the formula bar', async () => {
    const view = render(SpreadsheetView, { sheets: sheets(), activeSheetId: 'one' });
    await fireEvent.focus(view.getByLabelText('Cell B1'));
    await fireEvent.input(view.getByLabelText('Cell B1'), { target: { value: '=A1+5' } });
    expect(input(view.container, '[aria-label="Formula B1"]').value).toBe('=A1+5');
  });
  it('resets the formula bar when switching worksheets', async () => {
    const view = render(SpreadsheetView, { sheets: sheets(), activeSheetId: 'one' });
    await fireEvent.click(view.getByRole('button', { name: 'Second' }));
    expect(input(view.container, '[aria-label="Formula A1"]').value).toBe('99');
  });
  it('does not mutate readonly sheets even for synthetic input events', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, { sheets: sheets(), activeSheetId: 'one', readonly: true, onchange });
    await fireEvent.input(view.getByLabelText('Formula A1'), { target: { value: '123' } });
    await fireEvent.input(view.getByLabelText('Cell A1'), { target: { value: '456' } });
    expect(onchange).not.toHaveBeenCalled();
    expect(view.queryByRole('button', { name: 'Row' })).toBeNull();
  });
  it('exports precise numbers and neutralizes formula-like text with CSV escaping', async () => {
    const onexport = vi.fn();
    const data: SheetData[] = [{ id: 'csv', name: 'CSV', rows: 1, cols: 4, cells: {
      A1: '=1/3', B1: '@SUM(1,2)', C1: 'ACME "Tokyo"', D1: '-42',
    } }];
    const view = render(SpreadsheetView, { sheets: data, activeSheetId: 'csv', onexport });
    await fireEvent.click(view.getByRole('button', { name: 'Export CSV' }));
    expect(onexport).toHaveBeenCalledWith('"0.3333333333333333","\'@SUM(1,2)","ACME ""Tokyo""","-42"');
  });
});


describe('recursive form parse-error ownership', () => {
  it('retains an invalid numeric draft across sibling edits until that field is corrected', async () => {
    const onsubmit = vi.fn(), onvalidationerror = vi.fn();
    const view = render(JsonSchemaForm, { schema, onsubmit, onvalidationerror });
    const amount = input(view.container, '[name="amount"]');
    Object.defineProperty(amount, 'validity', { value: { badInput: true }, configurable: true });
    await fireEvent.input(amount, { target: { value: '' } });
    await fireEvent.change(input(view.container, '[name="enabled"]'), { target: { checked: true } });
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    expect(onsubmit).not.toHaveBeenCalled();
    expect(onvalidationerror).toHaveBeenCalledWith(expect.arrayContaining([{ path: '/amount', code: 'invalid-value' }]));
    Object.defineProperty(amount, 'validity', { value: { badInput: false }, configurable: true });
    await fireEvent.input(amount, { target: { value: '0' } });
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    expect(onsubmit).toHaveBeenCalledWith({ amount: 0, enabled: true, plan: 1 });
  });
});
