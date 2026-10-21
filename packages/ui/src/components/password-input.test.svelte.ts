import { cleanup, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Host from '../../test/fixtures/PasswordInputHost.svelte';

afterEach(cleanup);

function control() {
  const input = screen.getByLabelText('Password', { exact: true });
  if (!(input instanceof HTMLInputElement)) throw new Error('Missing password input');
  return input;
}

describe('PasswordInput', () => {
  it.each([true, false])('keeps exactly one usable label with showLabel=%s', async showLabel => {
    const user = userEvent.setup();
    const view = render(Host, { showLabel });
    expect(view.container.querySelectorAll('label[for="password"]')).toHaveLength(1);
    expect(control().type).toBe('password');
    await user.click(screen.getByText('Password', { exact: true }));
    expect(document.activeElement).toBe(control());
  });

  it('supports Tab, Enter and Space without submitting or losing the value', async () => {
    const user = userEvent.setup();
    render(Host, { initialValue: 'fixture-value' });
    const input = control();
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle.getAttribute('type')).toBe('button');
    expect(toggle.getAttribute('aria-controls')).toBe('password');
    await user.tab();
    expect(document.activeElement).toBe(input);
    await user.tab();
    expect(document.activeElement).toBe(toggle);
    await user.keyboard('{Enter}');
    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBe(toggle);
    await user.keyboard(' ');
    expect(input.type).toBe('password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(input.value).toBe('fixture-value');
    expect(screen.getByTestId('submit-count').textContent).toBe('0');
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(input);
  });

  it('preserves disabled and validation state while excluding disabled controls from Tab', async () => {
    const user = userEvent.setup();
    const view = render(Host, {
      disabled: true, initialValue: 'fixture-value', ariaInvalid: 'true', ariaDescribedby: 'help',
    });
    const input = control();
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(input.disabled).toBe(true);
    expect(toggle).toHaveProperty('disabled', true);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('help');
    await user.click(toggle);
    expect(input.type).toBe('password');
    expect(input.value).toBe('fixture-value');
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Submit' }));
    await view.rerender({ disabled: false, ariaInvalid: undefined, ariaDescribedby: undefined });
    expect(input.disabled).toBe(false);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(input.value).toBe('fixture-value');
  });

  it('updates the strength indicator without changing the bound password', async () => {
    const user = userEvent.setup();
    const view = render(Host, { showStrength: true });
    expect(view.container.querySelector('[data-svadmin-password-strength]')).toBeNull();
    await user.type(control(), 'Abcdef123!@#');
    expect(view.container.querySelector('[data-tone="success"]')).not.toBeNull();
    expect(screen.getByTestId('password-value').textContent).toBe('Abcdef123!@#');
    await user.clear(control());
    expect(view.container.querySelector('[data-svadmin-password-strength]')).toBeNull();
  });
});
