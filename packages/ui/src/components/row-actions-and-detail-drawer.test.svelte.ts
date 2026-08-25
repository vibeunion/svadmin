import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import RowActionsDetailDrawerHarness from '../../test/fixtures/RowActionsDetailDrawerHarness.svelte';
import SheetFocusLifecycleHarness from '../../test/fixtures/SheetFocusLifecycleHarness.svelte';

beforeEach(() => {
  document.body.style.overflow = '';
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

  it('traps focus in the topmost drawer and restores nested focus and scroll state', async () => {
    const view = render(SheetFocusLifecycleHarness);
    const outerTrigger = view.getByRole('button', { name: 'Open outer drawer' });
    document.body.style.overflow = 'clip';
    outerTrigger.focus();
    await fireEvent.click(outerTrigger);

    const outerDialog = view.getByRole('dialog', { name: 'Outer drawer' });
    const outerFirst = within(outerDialog).getByText('Outer editable action');
    const innerTrigger = within(outerDialog).getByRole('button', { name: 'Open inner drawer' });
    await waitFor(() => expect(document.activeElement).toBe(outerFirst));
    expect(document.activeElement).not.toBe(within(outerDialog).getByRole('button', { name: 'Outer CSS hidden action', hidden: true }));
    expect(document.body.style.overflow).toBe('hidden');

    innerTrigger.focus();
    await fireEvent.click(innerTrigger);
    const innerDialog = view.getByRole('dialog', { name: 'Inner drawer' });
    const innerFirst = within(innerDialog).getByText('Inner editable action');
    const innerProgrammatic = within(innerDialog).getByRole('button', { name: 'Inner programmatic action' });
    const innerClose = within(innerDialog).getByRole('button', { name: 'Close' });
    await waitFor(() => expect(document.activeElement).toBe(innerFirst));
    expect(document.activeElement).not.toBe(within(innerDialog).getByRole('button', { name: 'Inner programmatic action' }));
    expect(document.activeElement).not.toBe(within(innerDialog).getByText('Inner programmatic editor'));

    innerProgrammatic.focus();
    await fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(innerClose);
    innerProgrammatic.focus();
    await fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(innerFirst);

    innerFirst.focus();
    await fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(innerClose);
    await fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(innerFirst);

    outerTrigger.focus();
    await fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(innerFirst);

    await fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(innerTrigger));
    expect(view.queryByRole('dialog', { name: 'Inner drawer' })).toBeNull();
    expect(document.body.style.overflow).toBe('hidden');

    await fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(outerTrigger));
    expect(view.queryByRole('dialog', { name: 'Outer drawer' })).toBeNull();
    expect(document.body.style.overflow).toBe('clip');
  });
});
