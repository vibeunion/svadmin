import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import RowActionsDetailDrawerHarness from '../../test/fixtures/RowActionsDetailDrawerHarness.svelte';

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

describe('RowActions and DetailDrawer', () => {
  it('renders actions without nested interactive controls and runs overflow actions', async () => {
    const view = render(RowActionsDetailDrawerHarness);
    const rowActions = view.getByTestId('row-actions');

    expect(within(rowActions).getByRole('button', { name: 'View' })).toBeTruthy();
    expect(within(rowActions).queryByText('Hidden')).toBeNull();
    expect(rowActions.querySelector('button button')).toBeNull();

    await fireEvent.click(within(rowActions).getByRole('button', { name: 'View' }));
    expect(view.getByTestId('last-action').textContent).toBe('view');

    await fireEvent.click(within(rowActions).getByRole('button', { name: 'More actions' }));
    const docsLink = within(rowActions).getByRole('link', { name: 'Docs' });
    expect(docsLink.getAttribute('href')).toBe('/records/42');
    expect(docsLink.querySelector('button')).toBeNull();

    await fireEvent.click(within(rowActions).getByRole('button', { name: 'Delete' }));
    expect(view.getByTestId('last-action').textContent).toBe('delete');
    expect(within(rowActions).queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('exposes an accessible dialog and synchronizes close state', async () => {
    const view = render(RowActionsDetailDrawerHarness);
    const dialog = view.getByRole('dialog', { name: 'Record details' });

    expect(within(dialog).getByText('Record content')).toBeTruthy();
    expect(within(dialog).getByText('Save changes')).toBeTruthy();

    await fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(view.queryByRole('dialog', { name: 'Record details' })).toBeNull();
      expect(view.getByTestId('drawer-state').textContent).toBe('closed:1');
    });
  });
});
