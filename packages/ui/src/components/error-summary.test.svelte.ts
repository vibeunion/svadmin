import { fireEvent, render, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ErrorSummary from './ErrorSummary.svelte';

describe('ErrorSummary', () => {
  it('renders nothing for an empty error collection', () => {
    const view = render(ErrorSummary, { props: { errors: [] } });
    expect(view.container.querySelector('[role="region"]')).toBeNull();
  });

  it('renders accessible field links and focuses the requested field', async () => {
    let focusedField = '';
    const view = render(ErrorSummary, {
      props: {
        id: 'product-errors',
        title: 'Please fix the following errors',
        errors: [
          { fieldKey: 'name', label: 'Name', message: 'Required' },
          { fieldKey: 'price', label: 'Price', message: 'Must be positive' },
        ],
        onfocusfield: (fieldKey: string) => { focusedField = fieldKey; },
      },
    });

    const region = view.getByRole('region', { name: 'Please fix the following errors' });
    expect(region.querySelector('h2')?.id).toBe('product-errors-title');
    expect(within(region).getAllByRole('button')).toHaveLength(2);

    await fireEvent.click(within(region).getByRole('button', { name: 'Price: Must be positive' }));
    expect(focusedField).toBe('price');
  });

  it('can render non-interactive errors without a focus callback', () => {
    const view = render(ErrorSummary, {
      props: {
        errors: [{ fieldKey: 'name', label: 'Name', message: 'Required' }],
      },
    });
    expect(view.getByText('Name: Required')).toBeTruthy();
    expect(view.container.querySelector('button')).toBeNull();
  });
});
