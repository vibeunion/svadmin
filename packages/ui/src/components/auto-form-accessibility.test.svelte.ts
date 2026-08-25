import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import AutoFormAccessibilityHarness from '../../test/fixtures/AutoFormAccessibilityHarness.svelte';

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

describe('AutoForm accessibility', () => {
  it('marks invalid named controls, links error messages, and focuses the first error', async () => {
    const view = render(AutoFormAccessibilityHarness);
    const nameInput = await view.findByRole('textbox', { name: /^Name/ });
    const descriptionInput = await view.findByRole('textbox', { name: /^Description/ });

    expect(nameInput.getAttribute('name')).toBe('name');
    expect(descriptionInput.getAttribute('name')).toBe('description');

    await fireEvent.click(view.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(nameInput.getAttribute('aria-invalid')).toBe('true');
      expect(descriptionInput.getAttribute('aria-invalid')).toBe('true');
      expect(nameInput.getAttribute('aria-describedby')).toBe('products-name-error');
      expect(descriptionInput.getAttribute('aria-describedby')).toBe('products-description-error');
      expect(document.activeElement).toBe(nameInput);
    });

    expect(view.getByText('This field is required', { selector: '#products-name-error' })).toBeTruthy();
    expect(view.getByTestId('success-count').textContent).toBe('0');
  });

  it('calls the success callback only after valid submission', async () => {
    const view = render(AutoFormAccessibilityHarness);
    await fireEvent.input(await view.findByRole('textbox', { name: /^Name/ }), {
      target: { value: 'Validated product' },
    });
    await fireEvent.input(await view.findByRole('textbox', { name: /^Description/ }), {
      target: { value: 'Ready to create' },
    });

    await fireEvent.click(view.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(view.getByTestId('success-count').textContent).toBe('1');
    });
  });
});
