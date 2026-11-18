import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import RowActions from './RowActions.svelte';

describe('RowActions trigger Escape', () => {
  it('closes a menu that contains only disabled actions', async () => {
    const view = render(RowActions, {
      actions: [{ label: 'Approve', disabled: true, disabledReason: '缺少签名' }],
      maxVisible: 0,
      moreLabel: 'More actions',
    });
    const trigger = within(view.container).getByRole('button', { name: 'More actions' });

    trigger.focus();
    await fireEvent.click(trigger);
    expect(within(document.body).getByRole('menu', { name: 'More actions' })).toBeTruthy();
    expect(document.activeElement).toBe(trigger);

    await fireEvent.keyDown(trigger, { key: 'Escape' });

    await waitFor(() => {
      expect(within(document.body).queryByRole('menu', { name: 'More actions' })).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('does not open a closed menu when Escape is pressed on the trigger', async () => {
    const view = render(RowActions, {
      actions: [{ label: 'Approve', disabled: true }],
      maxVisible: 0,
      moreLabel: 'More actions',
    });
    const trigger = within(view.container).getByRole('button', { name: 'More actions' });

    trigger.focus();
    await fireEvent.keyDown(trigger, { key: 'Escape' });

    expect(within(document.body).queryByRole('menu', { name: 'More actions' })).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
