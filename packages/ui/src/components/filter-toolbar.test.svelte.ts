import { render, screen } from '@testing-library/svelte';
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
});
