import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import FilterToolbar from './content/FilterToolbar.svelte';

describe('FilterToolbar', () => {
  it('renders search input with clear button when query is present', async () => {
    const query = 'test-query';
    render(FilterToolbar, { query, placeholder: 'Search records...' });

    const input = screen.getByLabelText('Search records...') as HTMLInputElement;
    expect(input.value).toBe('test-query');

    const clearButton = screen.getByRole('button', { name: 'Clear search' });
    expect(clearButton).toBeTruthy();
  });

  it('supports compact density', () => {
    const { container } = render(FilterToolbar, {
      query: '',
      density: 'compact',
    });

    const input = container.querySelector('input');
    expect(input?.classList.contains('h-8')).toBe(true);
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
    expect(panel.getAttribute('aria-hidden')).toBe('false');
  });
});
