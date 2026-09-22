import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AppFooter from './AppFooter.svelte';

afterEach(() => cleanup());

describe('AppFooter', () => {
  it('renders columns, links, and copyright with safe external links', () => {
    const view = render(AppFooter, {
      copyright: '© 2026 svadmin',
      columns: [
        {
          title: 'Product',
          links: [
            { label: 'Docs', href: '/docs' },
            { label: 'External', href: 'https://example.com', external: true },
          ],
        },
      ],
      links: [{ label: 'Privacy', href: '/privacy' }],
    });

    expect(view.getByRole('navigation', { name: 'Product' })).not.toBeNull();
    expect(view.getByRole('link', { name: 'Docs' }).getAttribute('href')).toBe('/docs');

    const external = view.getByRole('link', { name: 'External' });
    expect(external.getAttribute('target')).toBe('_blank');
    expect(external.getAttribute('rel')).toContain('noopener');
    expect(external.getAttribute('rel')).toContain('noreferrer');

    expect(view.getByText('© 2026 svadmin')).not.toBeNull();
    expect(view.getByRole('link', { name: 'Privacy' })).not.toBeNull();
  });

  it('renders action links as buttons and calls the handler', async () => {
    const onclick = vi.fn();
    const view = render(AppFooter, { links: [{ label: 'Sign out', onclick }] });

    await fireEvent.click(view.getByRole('button', { name: 'Sign out' }));
    expect(onclick).toHaveBeenCalledTimes(1);
  });
});