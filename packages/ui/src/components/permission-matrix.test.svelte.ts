import { cleanup, fireEvent, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PermissionMatrix from './PermissionMatrix.svelte';
import FormHost from './permission-matrix.test-host.svelte';
import { renderWithI18n } from '../../test/fixtures/render-with-i18n';

const roles = [
  { code: 'reader', name: 'Reader' },
  { code: 'editor', name: 'Editor' },
];
const resources = [{ code: 'orders', name: 'Orders' }];
const actions = [
  { code: 'read', name: 'Read' },
  { code: 'update', name: 'Update' },
];

afterEach(cleanup);

describe('PermissionMatrix enterprise semantics', () => {
  it('preserves literal action names when localizing controls', async () => {
    const name = 'A$&B$$';
    const view = renderWithI18n(PermissionMatrix, {
      roles, resources, actions: [{ code: 'read', name }], selectedRole: 'reader',
      isGranted: () => false, onToggle: vi.fn(),
    });
    expect(view.getByRole('button', { name: `Toggle ${name}` })).toBeTruthy();
    await view.wrapper.setLocale('zh-CN');
    expect(view.getByRole('button', { name: `切换${name}` })).toBeTruthy();
    await view.wrapper.setLocale('en');
    expect(view.getByRole('button', { name: `Toggle ${name}` })).toBeTruthy();
  });

  it('localizes permission controls without losing focus, grants or pending locks', async () => {
    const onToggle = vi.fn();
    const view = renderWithI18n(PermissionMatrix, {
      roles, resources, actions, selectedRole: 'editor',
      isGranted: () => true, onToggle,
    });
    const read = view.getByRole('button', { name: 'Toggle Read', pressed: true });
    read.focus();
    await view.wrapper.setLocale('zh-CN');
    expect(view.getByRole('button', { name: '切换Read', pressed: true })).toBe(read);
    expect(document.activeElement).toBe(read);
    expect(view.getByRole('combobox')).toHaveProperty('value', 'editor');
    await view.rerender({ loading: true });
    for (const [locale, name] of [['en', 'Toggle Read'], ['zh-CN', '切换Read']] as const) {
      await view.wrapper.setLocale(locale);
      expect(view.getByRole('button', { name, pressed: true })).toBe(read);
      expect(read).toHaveProperty('disabled', true);
      await userEvent.setup().click(read);
      expect(onToggle).not.toHaveBeenCalled();
    }
    await view.rerender({ loading: false });
    await fireEvent.click(read);
    expect(onToggle).toHaveBeenCalledExactlyOnceWith('editor', 'orders', 'read', false);
  });

  it('isolates role select labels and selection across instances', async () => {
    const firstToggle = vi.fn();
    const secondToggle = vi.fn();
    const first = renderWithI18n(PermissionMatrix, {
      roles, resources, actions, selectedRole: 'reader', isGranted: () => false, onToggle: firstToggle,
    });
    const second = renderWithI18n(PermissionMatrix, {
      roles, resources, actions, selectedRole: 'reader', isGranted: () => false, onToggle: secondToggle,
    });
    const firstSelect = first.container.querySelector('select');
    const secondSelect = second.container.querySelector('select');
    expect(firstSelect).not.toBeNull();
    expect(secondSelect).not.toBeNull();
    if (!firstSelect || !secondSelect) throw new Error('Expected role selectors');
    expect(firstSelect.id).not.toBe(secondSelect.id);
    expect(first.container.querySelector(`label[for="${firstSelect.id}"]`)).not.toBeNull();
    const secondLabel = second.container.querySelector('label');
    if (!secondLabel) throw new Error('Expected role label');
    expect(secondLabel.control).toBe(secondSelect);
    await userEvent.setup().click(secondLabel);
    expect(document.activeElement).toBe(secondSelect);

    await fireEvent.change(secondSelect, { target: { value: 'editor' } });
    expect(secondSelect).toHaveProperty('value', 'editor');
    expect(firstSelect).toHaveProperty('value', 'reader');
    await fireEvent.click(within(second.container).getByRole('button', { name: 'Toggle Read' }));
    expect(secondToggle).toHaveBeenCalledExactlyOnceWith('editor', 'orders', 'read', true);
    expect(firstToggle).not.toHaveBeenCalled();
  });

  it.each(['role', 'permission'] as const)('activates a %s control without submitting its host form', async control => {
    const onToggle = vi.fn();
    const submit = vi.fn((event: Event) => event.preventDefault());
    const view = renderWithI18n(FormHost, {
      settings: { roles, resources, actions, selectedRole: 'reader', isGranted: () => false, onToggle },
      onsubmit: submit,
    });
    try {
      const button = view.getByRole('button', { name: control === 'role' ? 'Editor editor' : 'Toggle Read' });
      expect(button.getAttribute('type')).toBe('button');
      await userEvent.setup().click(button);
      expect(submit).not.toHaveBeenCalled();
      if (control === 'role') {
        expect(view.getByRole('combobox')).toHaveProperty('value', 'editor');
        expect(onToggle).not.toHaveBeenCalled();
      } else {
        expect(onToggle).toHaveBeenCalledExactlyOnceWith('reader', 'orders', 'read', true);
      }
      const toggleCalls = onToggle.mock.calls.length;
      await userEvent.setup().click(view.getByRole('button', { name: 'Submit host form' }));
      expect(submit).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledTimes(toggleCalls);
    } finally {
      view.unmount();
    }
  });

  it('exposes each permission state through aria-pressed', async () => {
    const onToggle = vi.fn();
    const view = renderWithI18n(PermissionMatrix, {
      roles, resources, actions, selectedRole: 'reader',
      isGranted: (_role, _resource, action) => action === 'read',
      onToggle,
    });
    const read = view.getByRole('button', { name: 'Toggle Read' });
    const update = view.getByRole('button', { name: 'Toggle Update' });
    expect(read.getAttribute('aria-pressed')).toBe('true');
    expect(update.getAttribute('aria-pressed')).toBe('false');
    await fireEvent.click(read);
    expect(onToggle).toHaveBeenCalledExactlyOnceWith('reader', 'orders', 'read', false);
    expect(read.getAttribute('aria-pressed')).toBe('true');
    await view.rerender({ isGranted: () => false });
    expect(view.getByRole('button', { name: 'Toggle Read', pressed: false })).toBe(read);
    await view.rerender({ isGranted: () => true, loading: true });
    expect(view.getByRole('button', { name: 'Toggle Read', pressed: true })).toBe(read);
    expect(read).toHaveProperty('disabled', true);
    await userEvent.setup().click(read);
    expect(onToggle).toHaveBeenCalledTimes(1);
    await view.rerender({ loading: false, selectedRole: 'editor' });
    expect(read).toHaveProperty('disabled', false);
    await fireEvent.click(read);
    expect(onToggle).toHaveBeenLastCalledWith('editor', 'orders', 'read', false);
  });

  it('provides role, resource, and action context without changing translated names', () => {
    const view = renderWithI18n(PermissionMatrix, {
      roles, resources, actions, selectedRole: 'editor',
      isGranted: () => false, onToggle: vi.fn(),
    });
    const read = view.getByRole('button', { name: 'Toggle Read' });
    const descriptionId = read.getAttribute('aria-describedby');
    expect(descriptionId).toBeTruthy();
    expect(descriptionId && view.container.querySelector(`#${descriptionId}`)?.textContent).toContain('Editor');
    expect(descriptionId && view.container.querySelector(`#${descriptionId}`)?.textContent).toContain('orders');
    expect(descriptionId && view.container.querySelector(`#${descriptionId}`)?.textContent).toContain('Read');
    expect(view.getByRole('button', { name: 'Editor editor', pressed: true })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Reader reader', pressed: false })).toBeTruthy();
  });

  it.each([
    ['success', 'status', 'polite'],
    ['warning', 'status', 'polite'],
    ['error', 'alert', 'assertive'],
  ] as const)('announces %s feedback with the matching live region semantics', (messageType, role, live) => {
    const view = renderWithI18n(PermissionMatrix, {
      roles, resources, actions, selectedRole: 'reader',
      isGranted: () => false, onToggle: vi.fn(),
      message: 'Permission update',
      messageType,
    });
    const feedback = view.getByRole(role);
    expect(feedback.getAttribute('aria-live')).toBe(live);
    expect(feedback.textContent).toContain('Permission update');
  });

  it('updates the pressed state after role changes and uses current grants for keyboard activation', async () => {
    const onToggle = vi.fn();
    const view = renderWithI18n(PermissionMatrix, {
      roles, resources, actions, selectedRole: 'reader',
      isGranted: (role, _resource, action) => role === 'reader' && action === 'read',
      onToggle,
    });
    const read = view.getByRole('button', { name: 'Toggle Read', pressed: true });
    await fireEvent.change(view.getByRole('combobox'), { target: { value: 'editor' } });
    expect(view.getByRole('button', { name: 'Toggle Read', pressed: false })).toBe(read);
    read.focus();
    await userEvent.setup().keyboard('{Enter}');
    expect(onToggle).toHaveBeenCalledExactlyOnceWith('editor', 'orders', 'read', true);
    expect(read.getAttribute('aria-pressed')).toBe('false');
    await view.rerender({ isGranted: () => true, selectedRole: 'editor' });
    await userEvent.setup().keyboard(' ');
    expect(onToggle).toHaveBeenCalledTimes(2);
    expect(onToggle).toHaveBeenLastCalledWith('editor', 'orders', 'read', false);
    expect(document.activeElement).toBe(read);
  });

  it.each([
    ['inherited', 'inherit'],
    ['missing reason', undefined],
    ['unknown status', { status: 'unknown' }],
  ] as const)('fail-closes an %s decision instead of showing granted or submitting', async (_label, decision) => {
    const onToggle = vi.fn();
    const submit = vi.fn((event: Event) => event.preventDefault());
    const view = renderWithI18n(FormHost, {
      settings: {
        roles, resources, actions, selectedRole: 'reader',
        isGranted: (() => decision) as unknown as (role: string, resource: string, action: string) => boolean,
        onToggle,
      },
      onsubmit: submit,
    });
    const read = view.getByRole('button', { name: 'Toggle Read' });
    expect(read.getAttribute('aria-pressed')).toBe('false');
    expect(read).toHaveProperty('disabled', true);
    await userEvent.setup().click(read);
    expect(onToggle).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it('contains resolver failures while keeping explicit denial actionable', async () => {
    const onToggle = vi.fn();
    const view = renderWithI18n(PermissionMatrix, {
      roles, resources, actions: [{ code: 'read', name: 'Read' }], selectedRole: 'reader',
      isGranted: () => { throw new Error('unknown inheritance reason'); },
      onToggle,
    });
    const read = view.getByRole('button', { name: 'Toggle Read' });
    expect(read.getAttribute('aria-pressed')).toBe('false');
    expect(read).toHaveProperty('disabled', true);
    await fireEvent.click(read);
    expect(onToggle).not.toHaveBeenCalled();
    await view.rerender({ isGranted: () => false });
    expect(view.getByRole('button', { name: 'Toggle Read', pressed: false })).toHaveProperty('disabled', false);
    await fireEvent.click(read);
    expect(onToggle).toHaveBeenCalledExactlyOnceWith('reader', 'orders', 'read', true);
  });
});
