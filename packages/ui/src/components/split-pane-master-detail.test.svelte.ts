import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import SplitPaneLayout from './SplitPaneLayout.svelte';
import MasterDetailView from './MasterDetailView.svelte';

describe('SplitPaneLayout and MasterDetailView', () => {
  it('renders SplitPaneLayout container', () => {
    const view = render(SplitPaneLayout);
    expect(view.container.querySelector('.cursor-col-resize')).toBeTruthy();
  });

  it('renders MasterDetailView master items and details', () => {
    const items = [
      { id: 1, title: 'Item Alpha', subtitle: 'First category' },
      { id: 2, title: 'Item Beta', subtitle: 'Second category' },
    ];

    const view = render(MasterDetailView, {
      items,
      selectedId: 1,
    });

    expect(view.container.textContent).toContain('Item Alpha');
    expect(view.container.textContent).toContain('Item Beta');
    expect(view.container.textContent).toContain('First category');
  });
});
