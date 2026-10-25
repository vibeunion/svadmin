import { fireEvent, render, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ErrorSummary from './ErrorSummary.svelte';
import ErrorSummaryHost from './error-summary.test-host.svelte';

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
    expect(region.getAttribute('data-svadmin-error-summary')).toBe('');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-atomic')).toBe('true');
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

  it('renders a named summary when errors become populated', async () => {
    const view = render(ErrorSummary, { errors: [] });
    expect(view.container.querySelector('[data-svadmin-error-summary]')).toBeNull();
    await view.rerender({
      errors: [{ fieldKey: 'name', label: 'Name', message: 'Required' }],
      id: 'form-errors',
    });
    const region = view.getByRole('region', { name: 'Please fix the following errors' });
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-atomic')).toBe('true');
    expect(view.getByText('Name: Required')).toBeTruthy();
  });

  it('keeps automatically generated heading IDs isolated and stable after clearing errors', async () => {
    const errors = [{ fieldKey: 'name', label: 'Name', message: 'Required' }];
    const first = render(ErrorSummary, { errors });
    const second = render(ErrorSummary, { errors });
    const region = within(first.container).getByRole('region', { name: 'Please fix the following errors' });
    const headingId = region.getAttribute('aria-labelledby');
    expect(headingId).toBeTruthy();
    expect(first.container.querySelector('h2')?.id).toBe(headingId);
    const secondHeadingId = second.container.querySelector('h2')?.id;
    expect(secondHeadingId).toBe(second.container.querySelector('[role="region"]')?.getAttribute('aria-labelledby'));
    expect(secondHeadingId).not.toBe(headingId);
    await first.rerender({ errors: [] });
    expect(first.container.querySelector('[role="region"]')).toBeNull();
    await first.rerender({ errors });
    expect(first.container.querySelector('h2')?.id).toBe(headingId);
  });

  it('renders repeated field keys and identical errors in host order through updates', async () => {
    const requiredError = { fieldKey: 'name', label: 'Name', message: 'Required' };
    const tooShortError = { fieldKey: 'name', label: 'Name', message: 'Too short' };
    const errors = [requiredError, tooShortError, requiredError];
    const focused: string[] = [];
    const view = render(ErrorSummary, { errors, onfocusfield: (key) => { focused.push(key); } });
    expect(view.getAllByRole('listitem').map((item) => item.textContent?.trim()))
      .toEqual(['Name: Required', 'Name: Too short', 'Name: Required']);
    await view.rerender({ errors: [tooShortError] });
    const button = view.getByRole('button', { name: 'Name: Too short' });
    expect(button.getAttribute('type')).toBe('button');
    await fireEvent.click(button);
    expect(focused).toEqual(['name']);
  });

  it('updates the default accessible name with the scoped locale', async () => {
    const view = render(ErrorSummaryHost);
    expect(view.getByRole('region', { name: 'Please fix the following errors' })).toBeTruthy();
    await view.component.setLocale('zh-CN');
    expect(view.getByRole('region', { name: '请修正以下错误' })).toBeTruthy();
  });

  it('preserves an explicit title across locale changes and restores the translated fallback', async () => {
    const view = render(ErrorSummaryHost, { title: 'Review these fields' });
    await view.component.setLocale('zh-CN');
    expect(view.getByRole('region', { name: 'Review these fields' })).toBeTruthy();
    await view.rerender({ title: undefined });
    expect(view.getByRole('region', { name: '请修正以下错误' })).toBeTruthy();
  });
});
