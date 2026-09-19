import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import JsonSchemaForm from './JsonSchemaForm.svelte';

afterEach(cleanup);
const schema = { type: 'object', properties: { rows: { type: 'array', items: { type: 'object', properties: { amount: { type: 'number' } }, required: ['amount'] } } } };
function numberInput(container: HTMLElement, index: number): HTMLInputElement {
  const element = container.querySelector(`[name="rows.${index}.amount"]`);
  if (!(element instanceof HTMLInputElement)) throw new Error('Missing numeric array field');
  return element;
}

describe('array parse-error ownership', () => {
  it('retires an invalid numeric draft when its array item is removed', async () => {
    const onsubmit = vi.fn();
    const view = render(JsonSchemaForm, { schema, value: { rows: [{ amount: 1 }, { amount: 2 }] }, onsubmit, locale: 'en' });
    const first = numberInput(view.container, 0);
    Object.defineProperty(first, 'validity', { configurable: true, value: { badInput: true } });
    await fireEvent.input(first, { target: { value: '' } });
    await fireEvent.click(view.getAllByRole('button', { name: 'Remove', exact: true })[0]!);
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    expect(onsubmit).toHaveBeenCalledExactlyOnceWith({ rows: [{ amount: 2 }] });
  });
  it('reindexes a surviving invalid numeric draft when a previous array item is removed', async () => {
    const onsubmit = vi.fn(), onvalidationerror = vi.fn();
    const view = render(JsonSchemaForm, { schema, value: { rows: [{ amount: 1 }, { amount: 2 }] }, onsubmit, onvalidationerror, locale: 'en' });
    const second = numberInput(view.container, 1);
    Object.defineProperty(second, 'validity', { configurable: true, value: { badInput: true } });
    await fireEvent.input(second, { target: { value: '' } });
    await fireEvent.click(view.getAllByRole('button', { name: 'Remove', exact: true })[0]!);
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    expect(onsubmit).not.toHaveBeenCalled();
    expect(onvalidationerror).toHaveBeenLastCalledWith([{ path: '/rows/0/amount', code: 'invalid-value' }]);
    await fireEvent.input(numberInput(view.container, 0), { target: { value: '3' } });
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    expect(onsubmit).toHaveBeenCalledExactlyOnceWith({ rows: [{ amount: 3 }] });
  });
});
