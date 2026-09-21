import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import AutoFormAccessibilityHarness from '../../test/fixtures/AutoFormAccessibilityHarness.svelte';

import { requireValue } from '../../../../scripts/test-assertions';
beforeEach(() => {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

describe('AutoForm accessibility', () => {
  it('keeps error references and summary focus inside each form instance', async () => {
    const first = render(AutoFormAccessibilityHarness);
    const second = render(AutoFormAccessibilityHarness);
    const forms = [within(first.container), within(second.container)];
    const inputs: HTMLElement[] = [];
    for (const form of forms) {
      const input = await form.findByRole('textbox', { name: /^Name/ });
      inputs.push(input);
      await fireEvent.click(form.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(input.getAttribute('aria-invalid')).toBe('true'));
    }
    expect(requireValue(inputs[0]).getAttribute('aria-describedby')).not.toBe(requireValue(inputs[1]).getAttribute('aria-describedby'));
    for (let index = 0; index < forms.length; index += 1) {
      const summary = requireValue(forms[index]).getByRole('region', { name: 'Please fix the following errors' });
      await fireEvent.click(within(summary).getByRole('button', { name: /^Name:/ }));
      expect(document.activeElement).toBe(inputs[index]);
      const error = document.getElementById(requireValue(requireValue(inputs[index]).getAttribute('aria-describedby')));
      expect(error?.closest('form')).toBe(requireValue(inputs[index]).closest('form'));
    }
  });

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
      expect(nameInput.getAttribute('aria-describedby')).toMatch(/^.+-products-name-error$/);
      expect(descriptionInput.getAttribute('aria-describedby')).toMatch(/^.+-products-description-error$/);
      expect(document.activeElement).toBe(nameInput);
    });

    const nameErrorId = requireValue(nameInput.getAttribute('aria-describedby'));
    expect(view.getByText('This field is required', { selector: `#${nameErrorId}` })).toBeTruthy();
    expect(view.getByRole('region', { name: 'Please fix the following errors' })).toBeTruthy();
    await fireEvent.click(requireValue(view.getByRole('region', { name: 'Please fix the following errors' }).querySelector('button')));
    expect(document.activeElement).toBe(nameInput);
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
