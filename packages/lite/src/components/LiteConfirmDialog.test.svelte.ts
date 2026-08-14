import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import LiteConfirmDialog from './LiteConfirmDialog.svelte';
import { liteFragmentId } from '../fragment-id';

describe('LiteConfirmDialog no-JavaScript confirmation', () => {
  it('uses a caller-stable fragment without client event handlers', () => {
    const { container } = render(LiteConfirmDialog, {
      confirmationId: 'discard-draft',
      triggerLabel: 'Discard',
      action: '?/discard',
      hiddenInputs: { id: 'draft-7' },
    });

    expect(container.querySelector('details')).toBeNull();
    const confirmationId = liteFragmentId('confirm', 'discard-draft');
    expect(container.querySelector(`a[href="#${confirmationId}"]`)).not.toBeNull();
    const confirmation = container.querySelector(`#${confirmationId}`);
    expect(confirmation?.querySelector('form')?.getAttribute('action')).toBe('?/discard');
    expect(confirmation?.querySelector('input[name="id"]')?.getAttribute('value')).toBe('draft-7');
    expect(confirmation?.querySelector(`a[href="#${confirmationId}-closed"]`)).not.toBeNull();
    expect(confirmation?.getAttribute('role')).toBe('dialog');
    expect(confirmation?.getAttribute('aria-labelledby')).toBe(`${confirmationId}-title`);
    expect(container.querySelector('[onclick]')).toBeNull();
  });

  it('creates a unique default fragment for each dialog instance', () => {
    const first = render(LiteConfirmDialog, { action: '?/delete', triggerLabel: 'Delete' });
    const second = render(LiteConfirmDialog, { action: '?/delete', triggerLabel: 'Delete' });

    const firstId = first.container.querySelector('.lite-confirm-target')?.id;
    const secondId = second.container.querySelector('.lite-confirm-target')?.id;
    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();
    expect(firstId).not.toBe(secondId);
  });
});
