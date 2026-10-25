import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import FieldRendererContractHarness from '../../test/fixtures/FieldRendererContractHarness.svelte';
import { requireValue } from '../../../../scripts/test-assertions';

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

describe('FieldRenderer form contract', () => {
  it('exposes field names and serializes scalar and structured values', async () => {
    const view = render(FieldRendererContractHarness);
    const form = await view.findByTestId('field-contract-form') as HTMLFormElement;

    await waitFor(() => {
      expect(form.querySelector('[name="title"]')).not.toBeNull();
      expect(form.querySelector('[name="metadata"]')).not.toBeNull();
    });

    const data = new FormData(form);
    expect(data.get('title')).toBe('Alpha');
    expect(data.get('summary')).toBe('Contract summary');
    expect(data.get('email')).toBe('alpha@example.test');
    expect(data.get('website')).toBe('https://example.test');
    expect(data.get('phone')).toBe('+1 555 0100');
    expect(data.get('count')).toBe('7');
    expect(data.get('launchedOn')).toBe('2026-08-25');
    expect(data.get('status')).toBe('active');
    expect(data.get('enabled')).toBe('true');
    expect(data.getAll('tags[]')).toEqual(['red', 'blue']);
    expect(data.getAll('permissions[]')).toEqual(['read', 'write']);
    expect(data.getAll('images[]')).toEqual([
      'https://example.test/a.png',
      'https://example.test/b.png',
    ]);
    expect(JSON.parse(String(data.get('metadata')))).toEqual({ audited: true });
    expect(data.get('ownerId')).toBe('2');
    expect(JSON.parse(String(data.get('items')))).toEqual([{ sku: 'SKU-1' }]);
  });

  it('connects validation errors to native and compound controls', async () => {
    const view = render(FieldRendererContractHarness);
    const title = await view.findByRole('textbox', { name: /^Title/ });
    const permissionsField = view.container.querySelector('[data-svadmin-field-key="permissions"]');
    const permissionsGroup = permissionsField?.querySelector('[role="group"]');
    const permissionCheckboxes = permissionsField?.querySelectorAll('[role="checkbox"]') ?? [];

    expect(title.getAttribute('aria-invalid')).toBe('true');
    expect(title.getAttribute('aria-describedby')).toBe('title-error');
    expect(permissionsGroup?.getAttribute('aria-describedby')).toBe('permissions-error');
    expect(permissionsGroup?.getAttribute('data-invalid')).toBe('true');
    expect(permissionCheckboxes).toHaveLength(2);
    for (const checkbox of permissionCheckboxes) {
      expect(checkbox.getAttribute('aria-invalid')).toBe('true');
      expect(checkbox.getAttribute('aria-describedby')).toBe('permissions-error');
    }
  });

  it('keeps the relation trigger named and linked to its field label', async () => {
    const view = render(FieldRendererContractHarness);
    const owner = await view.findByRole('button', { name: /Owner/ });
    const field = requireValue(owner.closest('[data-svadmin-field]'));
    const label = requireValue(field.querySelector<HTMLLabelElement>('label[data-svadmin-field-label]'));
    expect(label.htmlFor).toBe(owner.id);
    expect(label.control).toBe(owner);
    expect(owner.getAttribute('aria-invalid')).not.toBe('true');
  });

  it.each([false, true])('excludes disabled relation values from native submission (multiple=%s)', async (relationMultiple) => {
    const view = render(FieldRendererContractHarness, { relationMultiple, relationDisabled: true });
    const form = await view.findByTestId('field-contract-form') as HTMLFormElement;
    const trigger = await view.findByRole('button', { name: 'Owner' });
    expect(trigger.hasAttribute('disabled')).toBe(true);
    expect(new FormData(form).getAll('ownerId')).toEqual([]);
    await view.rerender({ relationDisabled: false });
    expect(trigger.hasAttribute('disabled')).toBe(false);
    expect(new FormData(form).getAll('ownerId')).toEqual(relationMultiple ? ['2', '3'] : ['2']);
  });

  it.each([false, true])('keeps relation feedback linked while the open menu and focus remain intact (multiple=%s)', async (relationMultiple) => {
    const view = render(FieldRendererContractHarness, { relationMultiple, relationDescription: 'Select the responsible owner', relationInvalid: true });
    const trigger = await view.findByRole('button', { name: 'Owner' });
    await waitFor(() => expect(trigger.getAttribute('aria-busy')).toBe('false'));
    const field = requireValue(trigger.closest('[data-svadmin-field]'));
    const description = requireValue(field.querySelector('[data-svadmin-field-description]'));
    expect(trigger.getAttribute('aria-describedby')).toBe(`${description.id} owner-error`);
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    await fireEvent.click(trigger);
    const search = await view.findByPlaceholderText('Search...');
    await waitFor(() => expect(document.activeElement).toBe(search));
    await view.rerender({ relationInvalid: false, relationDescription: 'Updated owner help' });
    expect(trigger.getAttribute('aria-describedby')).toBe(description.id);
    expect(trigger.hasAttribute('aria-invalid')).toBe(false);
    expect(description.textContent).toBe('Updated owner help');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(search);
    await view.rerender({ relationDescription: '' });
    expect(trigger.hasAttribute('aria-describedby')).toBe(false);
    expect(field.querySelector('[data-svadmin-field-description]')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(search);
    await fireEvent.keyDown(search, { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    const form = requireValue(view.container.querySelector('form'));
    expect(new FormData(form).getAll('ownerId')).toEqual(relationMultiple ? ['2', '3'] : ['2']);
  });
});
