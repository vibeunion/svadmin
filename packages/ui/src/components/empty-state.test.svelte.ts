import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import EmptyState from './EmptyState.svelte';

afterEach(() => cleanup());

describe('EmptyState', () => {
  it('renders the default icon and copy', () => {
    render(EmptyState, { title: 'Nothing here', description: 'Create the first record.' });
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('supports an illustration image', () => {
    const view = render(EmptyState, {
      title: 'No results',
      image: '/illustrations/empty.svg',
      imageAlt: 'Empty results',
    });
    const image = view.container.querySelector('img');
    expect(image?.getAttribute('src')).toBe('/illustrations/empty.svg');
    expect(image?.getAttribute('alt')).toBe('Empty results');
  });
});
