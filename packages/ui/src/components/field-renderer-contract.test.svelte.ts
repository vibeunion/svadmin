import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import FieldRendererContractHarness from '../../test/fixtures/FieldRendererContractHarness.svelte';

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
});
