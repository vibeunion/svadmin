import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DropdownContainmentHarness from '../../test/fixtures/DropdownContainmentHarness.svelte';
import RowActionsDetailDrawerHarness from '../../test/fixtures/RowActionsDetailDrawerHarness.svelte';
import SheetFocusLifecycleHarness from '../../test/fixtures/SheetFocusLifecycleHarness.svelte';

beforeEach(() => {
  document.body.style.overflow = '';
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

afterEach(() => { vi.restoreAllMocks(); });

describe('RowActions and DetailDrawer', () => {
  it('opens in the top layer while preserving drawer ownership and Escape focus', async () => {
    const showPopover = vi.fn();
    const previous = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover');
    Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, value: showPopover });
    try {
      const view = render(DropdownContainmentHarness);
      await fireEvent.click(view.getByRole('button', { name: 'Open drawer' }));
      const dialog = view.getByRole('dialog', { name: 'Containment drawer' });
      const trigger = within(dialog).getByRole('button', { name: 'Drawer actions' });
      await fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      const menu = within(dialog).getByRole('menu', { name: 'Drawer actions' });
      expect(menu.getAttribute('popover')).toBe('manual');
      expect(showPopover).toHaveBeenCalledTimes(1);
      expect(dialog.contains(menu)).toBe(true);
      expect(menu.hasAttribute('data-floating')).toBe(true);
      await waitFor(() => expect(document.activeElement).toBe(within(menu).getByRole('menuitem', { name: 'Inspect' })));
      await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
      await waitFor(() => expect(document.activeElement).toBe(trigger));
      expect(view.getByRole('dialog', { name: 'Containment drawer' })).toBe(dialog);
      expect(within(dialog).queryByRole('menu')).toBeNull();
      view.unmount();
    } finally {
      if (previous) Object.defineProperty(HTMLElement.prototype, 'showPopover', previous);
      else Reflect.deleteProperty(HTMLElement.prototype, 'showPopover');
    }
  });

  it('renders actions without nested interactive controls and runs overflow actions', async () => {
    const view = render(RowActionsDetailDrawerHarness);
    const rowActions = view.getByTestId('row-actions');

    expect(within(rowActions).getByRole('button', { name: 'View' })).toBeTruthy();
    expect(within(rowActions).queryByText('Hidden')).toBeNull();
    expect(rowActions.querySelector('button button')).toBeNull();

    await fireEvent.click(within(rowActions).getByRole('button', { name: 'View' }));
    expect(view.getByTestId('last-action').textContent).toBe('view');

    await fireEvent.click(within(rowActions).getByRole('button', { name: 'More actions' }));
    const menu = within(rowActions).getByRole('menu', { name: 'More actions' });
    const docsLink = within(menu).getByRole('menuitem', { name: 'Docs' });
    expect(docsLink.getAttribute('href')).toBe('/records/42');
    expect(docsLink.querySelector('button')).toBeNull();

    await fireEvent.click(within(rowActions).getByRole('menuitem', { name: 'Delete' }));
    expect(view.getByTestId('last-action').textContent).toBe('delete');
    expect(within(rowActions).queryByRole('menuitem', { name: 'Delete' })).toBeNull();
  });

  it('supports menu keyboard navigation and restores trigger focus', async () => {
    const view = render(RowActionsDetailDrawerHarness);
    const rowActions = view.getByTestId('row-actions');
    const trigger = within(rowActions).getByRole('button', { name: 'More actions' });

    trigger.focus();
    await fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const menu = within(rowActions).getByRole('menu', { name: 'More actions' });
    const items = within(menu).getAllByRole('menuitem');
    await waitFor(() => expect(document.activeElement).toBe(items[0]));

    await fireEvent.keyDown(items[0], { key: 'End' });
    expect(document.activeElement).toBe(items.at(-1));
    await fireEvent.keyDown(items.at(-1) as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[0]);
    await fireEvent.keyDown(items[0], { key: 'Escape' });

    await waitFor(() => {
      expect(within(rowActions).queryByRole('menu')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('exposes an accessible dialog and synchronizes close state', async () => {
    const view = render(RowActionsDetailDrawerHarness);
    const dialog = view.getByRole('dialog', { name: 'Record details' });

    expect(dialog.getAttribute('aria-labelledby')).toBe('record-details-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('record-details-description');
    expect(within(dialog).getByTestId('drawer-extra-badge').textContent).toBe('Active');
    expect(within(dialog).getByText('Record content')).toBeTruthy();
    expect(within(dialog).getByText('Save changes')).toBeTruthy();

    await fireEvent.click(within(dialog).getByRole('button', { name: 'Close record details' }));
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
