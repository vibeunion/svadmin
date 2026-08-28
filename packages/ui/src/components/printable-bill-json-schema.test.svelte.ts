import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import PrintableBill from './PrintableBill.svelte';
import JsonSchemaForm from './JsonSchemaForm.svelte';

describe('PrintableBill and JsonSchemaForm', () => {
  it('renders PrintableBill document with invoice details', () => {
    const items = [
      { name: 'Cloud Server M1', quantity: 2, unitPrice: 299 },
    ];

    const view = render(PrintableBill, {
      billNumber: 'INV-2026-888',
      date: '2026-08-29',
      customerName: 'Enterprise Global Corp',
      items,
    });

    expect(view.container.textContent).toContain('INV-2026-888');
    expect(view.container.textContent).toContain('Enterprise Global Corp');
    expect(view.container.textContent).toContain('Cloud Server M1');
    expect(view.container.textContent).toContain('598.00');
  });

  it('renders JsonSchemaForm based on JSON Schema properties', () => {
    const schema = {
      title: 'User Profile Setup',
      properties: {
        username: { type: 'string', title: 'Username' },
        age: { type: 'number', title: 'User Age' },
      },
      required: ['username'],
    };

    const view = render(JsonSchemaForm, {
      schema,
    });

    expect(view.container.textContent).toContain('User Profile Setup');
    expect(view.container.textContent).toContain('Username');
    expect(view.container.textContent).toContain('User Age');
    expect(view.container.textContent).toContain('Submit Form');
  });
});
