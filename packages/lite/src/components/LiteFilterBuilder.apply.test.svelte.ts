import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FieldDefinition, Filter } from '@svadmin/core';
import LiteFilterBuilder from './LiteFilterBuilder.svelte';

afterEach(cleanup);
const fields: FieldDefinition[] = [{ key: 'age', label: 'Age', type: 'number' }, { key: 'active', label: 'Active', type: 'boolean' }];
const filters: Filter[] = [{ operator: 'or', value: [{ field: 'age', operator: 'gte', value: 18 }, { field: 'active', operator: 'eq', value: true }] }];
describe('Lite filter form callbacks and native fallback', () => {
  it('submits edited nested rules with numeric zero and boolean false preserved', async () => {
    const onApply = vi.fn(); const view = render(LiteFilterBuilder, { fields, filters, onApply });
    const age = view.container.querySelector('input[type="number"]');
    const active = view.container.querySelector('[name="filters[0.value.1][value]"]');
    const form = view.container.querySelector('form');
    if (!age || !active || !form) throw new Error('Missing filter controls');
    await fireEvent.input(age, { target: { value: '0' } });
    await fireEvent.change(active, { target: { value: 'false' } });
    await fireEvent.submit(form);
    expect(onApply).toHaveBeenCalledWith([{ operator: 'or', value: [
      { field: 'age', operator: 'gte', value: 0 }, { field: 'active', operator: 'eq', value: false },
    ] }]);
  });
  it('retains native submission without a callback and has unique instance IDs', () => {
    const first = render(LiteFilterBuilder, { fields, filters, action: '/filter', method: 'POST' });
    const second = render(LiteFilterBuilder, { fields, filters });
    const form = first.container.querySelector('form');
    if (!form) throw new Error('Missing form');
    expect(form.id).not.toBe(second.container.querySelector('form')?.id);
    const event = new SubmitEvent('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event); expect(event.defaultPrevented).toBe(false);
    expect(first.container.querySelector('button')?.getAttribute('form')).toBe(form.id);
  });
  it('does not invoke the callback for structural server actions or invalid input', async () => {
    const onApply = vi.fn(); const view = render(LiteFilterBuilder, { fields, filters, onApply });
    const form = view.container.querySelector('form');
    const submitter = view.container.querySelector<HTMLButtonElement>('button[name="_action"]');
    if (!form || !submitter) throw new Error('Missing structural action');
    const event = new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter });
    form.dispatchEvent(event); expect(event.defaultPrevented).toBe(false); expect(onApply).not.toHaveBeenCalled();
    const age = form.querySelector('input[type="number"]');
    if (!age) throw new Error('Missing numeric input');
    await fireEvent.input(age, { target: { value: '' } }); await fireEvent.submit(form);
    expect(onApply).not.toHaveBeenCalled(); expect(view.getByRole('alert')).toBeTruthy();
  });
});
