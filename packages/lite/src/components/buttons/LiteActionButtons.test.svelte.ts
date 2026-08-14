import { render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import LiteDeleteButton from './LiteDeleteButton.svelte';
import LiteExportButton from './LiteExportButton.svelte';
import LiteImportButton from './LiteImportButton.svelte';

vi.mock('@svadmin/core/i18n', () => ({
  t: (key: string) => key,
}));

describe('Lite action button routes', () => {
  it('posts delete actions to the configured resource route', () => {
    const { container } = render(LiteDeleteButton, {
      resource: 'posts',
      recordItemId: 42,
      basePath: '/backoffice',
    });

    expect(container.querySelector('details')).toBeNull();
    const confirmation = container.querySelector('.lite-confirm-target');
    expect(confirmation?.id).toBeTruthy();
    expect(container.querySelector(`a[href="#${confirmation?.id}"]`)).not.toBeNull();
    expect(confirmation?.querySelector('form')?.getAttribute('action')).toBe('/backoffice/posts?/delete');
    expect(confirmation?.querySelector(`a[href="#${confirmation?.id}-closed"]`)).not.toBeNull();
    expect(confirmation?.getAttribute('role')).toBe('dialog');
  });

  it('links exports to the configured resource route', () => {
    const { container } = render(LiteExportButton, {
      resource: 'posts',
      basePath: '/backoffice',
    });

    expect(container.querySelector('a')?.getAttribute('href')).toBe('/backoffice/posts?action=export');
  });

  it('posts imports to the configured resource action', () => {
    const { container } = render(LiteImportButton, {
      resource: 'posts',
      basePath: '/backoffice',
    });

    expect(container.querySelector('details')).toBeNull();
    const importPanel = container.querySelector('.lite-confirm-target');
    expect(importPanel?.id).toBeTruthy();
    expect(container.querySelector(`a[href="#${importPanel?.id}"]`)).not.toBeNull();
    expect(importPanel?.querySelector('form')?.getAttribute('action')).toBe('/backoffice/posts?/posts_import');
    expect(importPanel?.querySelector(`a[href="#${importPanel?.id}-closed"]`)).not.toBeNull();
    expect(importPanel?.getAttribute('aria-labelledby')).toBe(`${importPanel?.id}-title`);
  });
});
