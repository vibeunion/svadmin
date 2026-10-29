import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import EditableTabs from './EditableTabs.svelte';

afterEach(() => cleanup());

describe('EditableTabs', () => {
  it('adds, selects and removes tabs', async () => {
    const view = render(EditableTabs, {
      items: [
        { value: 'alpha', label: 'Alpha' },
        { value: 'beta', label: 'Beta' },
      ],
      value: 'alpha',
    });

    expect(view.getByRole('tablist').getAttribute('data-variant')).toBe('line');
    expect(view.getByRole('tab', { name: 'Alpha' }).getAttribute('aria-selected')).toBe('true');

    await fireEvent.click(view.getByRole('button', { name: 'Add tab' }));
    const added = view.getByRole('tab', { name: 'Tab 1' });
    expect(added.getAttribute('aria-selected')).toBe('true');

    await fireEvent.click(view.getByRole('button', { name: 'Close Alpha' }));
    expect(view.queryByRole('tab', { name: 'Alpha' })).toBeNull();
  });

  it('honors maxItems and disabled items', () => {
    const view = render(EditableTabs, {
      items: [
        { value: 'alpha', label: 'Alpha', disabled: true },
        { value: 'beta', label: 'Beta', closable: false },
      ],
      value: 'beta',
      maxItems: 2,
    });

    expect(view.getByRole('tab', { name: 'Alpha' }).hasAttribute('disabled')).toBe(true);
    expect(view.queryByRole('button', { name: 'Add tab' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Close Beta' })).toBeNull();
  });
});
