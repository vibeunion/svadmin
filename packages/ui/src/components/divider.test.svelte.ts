import { cleanup, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Divider from './Divider.svelte';

afterEach(() => cleanup());

const snippetContent = createRawSnippet(() => ({
  render: () => '<span>Section Header</span>',
}));

describe('Divider', () => {
  it('renders default horizontal divider line', () => {
    const { container } = render(Divider);
    const hr = container.querySelector('hr[data-svadmin-component="Divider"]');
    expect(hr).not.toBeNull();
    expect(hr?.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('renders vertical divider separator', () => {
    const { container } = render(Divider, { type: 'vertical' });
    const span = container.querySelector('span[data-svadmin-component="Divider"]');
    expect(span).not.toBeNull();
    expect(span?.getAttribute('aria-orientation')).toBe('vertical');
    expect(span?.getAttribute('data-svadmin-type')).toBe('vertical');
  });

  it('renders horizontal divider with embedded title and custom orientation', () => {
    const { container } = render(Divider, {
      orientation: 'left',
      dashed: true,
      children: snippetContent,
    });

    const root = container.querySelector('div[data-svadmin-component="Divider"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute('data-orientation')).toBe('left');
    expect(root?.textContent).toContain('Section Header');

    const lines = root?.querySelectorAll('span.border-t');
    expect(lines?.length).toBe(2);
    expect(lines?.[0]?.classList.contains('border-dashed')).toBe(true);
  });
});
