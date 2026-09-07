import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import FilterToolbar from './content/FilterToolbar.svelte';
import PageChromeHarness from '../../test/fixtures/PageChromeHarness.svelte';

describe('FilterToolbar', () => {
  it('renders search input with clear button when query is present', async () => {
    const query = 'test-query';
    render(FilterToolbar, { query, placeholder: 'Search records...' });

    const input = screen.getByLabelText('Search records...') as HTMLInputElement;
    expect(input.value).toBe('test-query');

    const clearButton = screen.getByRole('button', { name: 'Clear search' });
    expect(clearButton).toBeTruthy();
    await fireEvent.click(clearButton);
    expect(input.value).toBe('');
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
  });

  it('switches density while preserving the search value', async () => {
    const { container, rerender } = render(FilterToolbar, {
      query: 'orders',
      density: 'compact',
    });

    const input = container.querySelector('input');
    expect(input?.classList.contains('svadmin-filter-toolbar__input')).toBe(true);
    expect(container.querySelector('[data-svadmin-filter-toolbar]')?.getAttribute('data-density')).toBe('compact');
    await rerender({ density: 'comfortable' });
    expect(input?.value).toBe('orders');
    expect(container.querySelector('[data-svadmin-filter-toolbar]')?.getAttribute('data-density')).toBe('comfortable');
  });

  it('unmounts advanced content while collapsed and restores it when expanded', async () => {
    const advanced = createRawSnippet(() => ({ render: () => '<div data-testid="advanced-content">Advanced filters</div>' }));
    const { container } = render(FilterToolbar, { advanced });
    const toggle = screen.getByRole('button', { name: /Filters/i });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.svadmin-filter-toolbar-advanced')).toBeNull();

    await fireEvent.click(toggle);
    const panel = container.querySelector('.svadmin-filter-toolbar-advanced') as HTMLElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-hidden')).toBe('false');
    await fireEvent.click(toggle);
    expect(container.querySelector('.svadmin-filter-toolbar-advanced')).toBeNull();
  });

  it('keeps query and expansion bindings synchronized with the host', async () => {
    render(PageChromeHarness);
    const input = screen.getByLabelText('Search orders') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'pending' } });
    expect(screen.getByTestId('query-state').textContent).toBe('pending');
    await fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByTestId('query-state').textContent).toBe('');
    await fireEvent.click(screen.getByRole('button', { name: /Advanced filters/ }));
    expect(screen.getByTestId('advanced-state').textContent).toBe('true');
  });

  it('keeps advanced panel IDs and state separate across toolbar instances', async () => {
    const advanced = createRawSnippet(() => ({ render: () => '<div>Filters</div>' }));
    render(FilterToolbar, { advanced, advancedLabel: 'First filters' });
    render(FilterToolbar, { advanced, advancedLabel: 'Second filters' });
    const first = screen.getByRole('button', { name: 'First filters' });
    const second = screen.getByRole('button', { name: 'Second filters' });
    expect(first.getAttribute('aria-controls')).not.toBe(second.getAttribute('aria-controls'));
    await fireEvent.click(first);
    expect(screen.getByRole('region', { name: 'First filters' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Second filters' })).toBeNull();
    expect(second.getAttribute('aria-expanded')).toBe('false');
  });

  it('supports action-only toolbars without creating empty search controls', () => {
    const actions = createRawSnippet(() => ({ render: () => '<button>Export</button>' }));
    const { container } = render(FilterToolbar, { showSearch: false, actions, class: 'host-toolbar' });
    expect(container.querySelector('.svadmin-filter-toolbar.host-toolbar')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy();
  });
});
