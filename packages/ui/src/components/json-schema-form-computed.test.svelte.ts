import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import JsonSchemaForm from './JsonSchemaForm.svelte';

const form = (view: { container: HTMLElement }): HTMLFormElement => {
  const element = view.container.querySelector('form');
  if (!element) throw new Error('Missing form');
  return element;
};

const schema = {
  properties: {
    quantity: { type: 'number', title: 'Quantity', default: 2 },
    price: { type: 'number', title: 'Price', default: 3 },
    total: { type: 'number', title: 'Total', computed: { from: ['quantity', 'price'], op: 'sum' } },
    label: { type: 'string', title: 'Label', computed: { from: ['quantity', 'price'], op: 'concat', separator: ' / ' } },
    note: {
      type: 'string',
      title: 'Note',
      visibleWhen: { all: [{ path: ['quantity'], equals: 2 }, { not: { path: ['price'], equals: 99 } }] },
    },
  },
};

afterEach(cleanup);

describe('schema form computed fields', () => {
  it('renders derived values read-only and recomputes them on submit', async () => {
    const onsubmit = vi.fn();
    const view = render(JsonSchemaForm, { schema, onsubmit, locale: 'en-US' });

    const total = view.getByLabelText('Total') as HTMLInputElement;
    expect(total.value).toBe('5');
    expect(total.disabled || total.readOnly).toBe(true);

    const label = view.getByLabelText('Label') as HTMLInputElement;
    expect(label.value).toBe('2 / 3');
    expect(label.disabled || label.readOnly).toBe(true);

    await fireEvent.input(view.getByLabelText('Quantity'), { target: { value: '4' } });
    expect((view.getByLabelText('Total') as HTMLInputElement).value).toBe('7');
    expect((view.getByLabelText('Label') as HTMLInputElement).value).toBe('4 / 3');

    await fireEvent.submit(form(view));
    expect(onsubmit).toHaveBeenCalledOnce();
    expect(onsubmit.mock.calls[0]?.[0]).toMatchObject({ quantity: 4, price: 3, total: 7, label: '4 / 3' });
  });

  it('applies the visibleWhen combinator tree while rendering', async () => {
    const view = render(JsonSchemaForm, { schema, locale: 'en-US' });
    expect(view.queryByLabelText('Note')).not.toBeNull();
    await fireEvent.input(view.getByLabelText('Price'), { target: { value: '99' } });
    expect(view.queryByLabelText('Note')).toBeNull();
  });
});