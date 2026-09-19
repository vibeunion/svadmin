import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import FileBrowser from './FileBrowser.svelte';

describe('FileBrowser', () => {
  it('wraps SVAR File Manager with the shared theme and adapter props', () => {
    const init = vi.fn();
    const view = render(FileBrowser, {
      data: [{ id: '/全部文件', type: 'folder' }],
      mode: 'table',
      readonly: true,
      init,
    });

    expect(view.container.querySelector('[data-slot="file-browser"]')).toBeTruthy();
    expect(view.container.querySelector('.wx-willow-theme')).toBeTruthy();
    expect(view.container.textContent).toContain('全部文件');
  });
});
