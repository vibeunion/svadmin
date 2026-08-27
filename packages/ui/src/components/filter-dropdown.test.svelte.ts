import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import FilterDropdown from './FilterDropdown.svelte';

describe('FilterDropdown component', () => {
  it('renders trigger button and toggles open state', async () => {
    const view = render(FilterDropdown, { title: 'Filter Status' });
    const trigger = view.container.querySelector('button');
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute('aria-label')).toBe('Filter Status');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');

    if (trigger) await fireEvent.click(trigger);
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    expect(view.container.textContent).toContain('Filter Status');
    expect(view.container.textContent).toContain('Apply');
    expect(view.container.textContent).toContain('Reset');
  });

  it('shows active indicator dot when filter is active', () => {
    const view = render(FilterDropdown, { title: 'Filter Code', active: true });
    expect(view.container.querySelector('.bg-primary')).not.toBeNull();
  });

  it('renders and selects option checkboxes in select mode', async () => {
    const onapply = vi.fn();
    const options = [
      { label: 'Pending', value: 'pending' },
      { label: 'Approved', value: 'approved' },
      { label: 'Rejected', value: 'rejected' },
    ];
    const view = render(FilterDropdown, {
      title: 'Status',
      open: true,
      options,
      onapply,
    });

    expect(view.container.textContent).toContain('Pending');
    expect(view.container.textContent).toContain('Approved');

    const checkboxes = view.container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(3);

    await fireEvent.click(checkboxes[0]);
    const applyButton = Array.from(view.container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Apply'
    );
    expect(applyButton).toBeDefined();
    if (applyButton) await fireEvent.click(applyButton);

    expect(onapply).toHaveBeenCalledWith(['pending']);
  });

  it('synchronizes option selections when a controlled value is cleared', async () => {
    const options = [
      { label: 'Pending', value: 'pending' },
      { label: 'Approved', value: 'approved' },
    ];
    const view = render(FilterDropdown, {
      title: 'Status',
      open: true,
      options,
      value: ['pending'],
    });

    let checkboxes = view.container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(checkboxes[0]?.checked).toBe(true);

    await view.rerender({
      title: 'Status',
      open: true,
      options,
      value: [],
    });

    checkboxes = view.container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(checkboxes[0]?.checked).toBe(false);
  });

  it('discards unapplied text changes when the dropdown closes', async () => {
    const view = render(FilterDropdown, {
      title: 'Keyword',
      open: true,
      value: 'applied query',
    });

    const input = view.container.querySelector('input') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'draft query' } });
    expect(input.value).toBe('draft query');

    const closeButton = view.container.querySelector<HTMLButtonElement>('[aria-label="Close"]');
    expect(closeButton).not.toBeNull();
    if (closeButton) await fireEvent.click(closeButton);

    await view.rerender({
      title: 'Keyword',
      open: true,
      value: 'applied query',
    });

    expect((view.container.querySelector('input') as HTMLInputElement).value).toBe('applied query');
  });

  it('handles text filter and calls onreset', async () => {
    const onreset = vi.fn();
    const view = render(FilterDropdown, {
      title: 'Keyword',
      open: true,
      value: 'sample query',
      onreset,
    });

    const input = view.container.querySelector('input') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('sample query');

    const resetButton = Array.from(view.container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Reset'
    );
    expect(resetButton).toBeDefined();
    if (resetButton) await fireEvent.click(resetButton);

    expect(onreset).toHaveBeenCalled();
  });
});
