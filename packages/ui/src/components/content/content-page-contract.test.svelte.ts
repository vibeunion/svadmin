import { cleanup, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import ContentPageHeader from './ContentPageHeader.svelte';
import ContentPageShell from './ContentPageShell.svelte';

afterEach(cleanup);

describe('content page layout contract', () => {
  it('propagates shell density to its generated header and keeps host hooks', () => {
    const children = createRawSnippet(() => ({
      render: () => '<section data-testid="page-child">Primary work area</section>',
    }));
    const view = render(ContentPageShell, {
      title: 'Access review',
      pageId: 'access-review',
      width: 'wide',
      density: 'compact',
      class: 'host-shell',
      children,
    });

    const shell = view.container.querySelector<HTMLElement>('[data-svadmin-content-page]');
    const header = view.container.querySelector<HTMLElement>('[data-svadmin-content-header]');

    expect(shell?.dataset['svadminContentPage']).toBe('access-review');
    expect(shell?.dataset['svadminContentPageWidth']).toBe('wide');
    expect(shell?.dataset['density']).toBe('compact');
    expect(shell?.className).toContain('host-shell');
    expect(shell?.className).toContain('space-y-4');
    expect(header?.getAttribute('data-svadmin-page-header')).toBe('');
    expect(header?.dataset['density']).toBe('compact');
    expect(header?.className).toContain('space-y-2');
    expect(view.getByTestId('page-child').textContent).toBe('Primary work area');
  });

  it('supports standalone headers with an explicit density and consumer class', () => {
    const view = render(ContentPageHeader, {
      title: 'Exceptions',
      breadcrumbs: ['Access review', 'Exceptions'],
      density: 'compact',
      class: 'host-header',
    });

    const header = view.container.querySelector<HTMLElement>('[data-svadmin-content-header]');
    expect(header?.className).toContain('host-header');
    expect(header?.className).toContain('space-y-2');
    expect(header?.dataset['density']).toBe('compact');
    expect(view.getByRole('heading', { level: 1 }).textContent).toBe('Exceptions');
    expect(view.getByRole('navigation', { name: 'Breadcrumb' })).not.toBeNull();
  });
});
