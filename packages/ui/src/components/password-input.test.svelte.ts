import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
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
  it('isolates visibility, values and controlled IDs between password instances', async () => {
    const user = userEvent.setup();
    const view = render(Host, { multiple: true, initialValue: 'first-fixture-value' });
    const first = control();
    const second = screen.getByLabelText('Confirm password');
    if (!(second instanceof HTMLInputElement)) throw new Error('Missing confirmation input');
    const firstToggle = view.container.querySelector<HTMLButtonElement>('button[aria-controls="password"]');
    const secondToggle = view.container.querySelector<HTMLButtonElement>('button[aria-controls="confirmation"]');
    if (!firstToggle || !secondToggle) throw new Error('Missing visibility toggles');
    await user.type(second, 'second-fixture-value');
    await user.click(firstToggle);
    expect(first.type).toBe('text');
    expect(second.type).toBe('password');
    await user.click(secondToggle);
    await user.click(firstToggle);
    expect(first.type).toBe('password');
    expect(second.type).toBe('text');
    expect(first.value).toBe('first-fixture-value');
    expect(second.value).toBe('second-fixture-value');
    expect(screen.getByTestId('submit-count').textContent).toBe('0');
  });

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

  it('publishes stable anatomy hooks while keeping the label, lock, and password type', () => {
    const { container } = render(Host);

    const root = container.querySelector('[data-svadmin-password-input]');
    const label = screen.getByText('Password');
    const input = control();

    expect(root?.classList.contains('svadmin-password-input')).toBe(true);
    expect(root?.hasAttribute('data-svadmin-login-password')).toBe(true);
    expect(root?.querySelector('[data-svadmin-password-field]')).not.toBeNull();
    expect(root?.querySelector('[data-svadmin-password-icon]')).not.toBeNull();
    expect(label.tagName).toBe('LABEL');
    expect(input.type).toBe('password');
    expect(input.classList.contains('svadmin-password-input__control')).toBe(true);
    expect(input.getAttribute('data-svadmin-password-control')).not.toBeNull();
  });

  it('reveals and hides by click or Space without submitting or clearing the value', async () => {
    const user = userEvent.setup();
    render(Host, { initialValue: 'secret-value' });

    const input = control();
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle.getAttribute('type')).toBe('button');
    expect(toggle.hasAttribute('tabindex')).toBe(false);

    await user.click(toggle);
    expect(input.type).toBe('text');
    expect(input.value).toBe('secret-value');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('submit-count').textContent).toBe('0');

    await user.click(toggle);
    expect(input.type).toBe('password');
    expect(input.value).toBe('secret-value');
    expect(screen.getByTestId('submit-count').textContent).toBe('0');

    input.focus();
    await user.tab();
    expect(document.activeElement).toBe(toggle);
    await user.keyboard(' ');
    expect(input.type).toBe('text');
    expect(input.value).toBe('secret-value');
    expect(screen.getByTestId('submit-count').textContent).toBe('0');
  });

  it('forwards disabled and described invalid state without dropping the value', () => {
    render(Host, {
      initialValue: 'invalid-secret',
      disabled: true,
      ariaInvalid: 'true',
      ariaDescribedby: 'password-help',
    });

    const input = control();
    const toggle = screen.getByRole('button', { name: 'Show password' });

    expect(input.disabled).toBe(true);
    expect(input.value).toBe('invalid-secret');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('password-help');
    expect(toggle).toHaveProperty('disabled', true);
  });

  it('keeps the strength meter in the same stable anatomy after typing', async () => {
    const { container } = render(Host, { showStrength: true });
    const input = control();

    await fireEvent.input(input, { target: { value: 'Abcdef123!@#' } });

    const strength = container.querySelector('[data-svadmin-password-strength]');
    expect(strength).not.toBeNull();
    expect(strength?.querySelector('[data-tone="success"]')).not.toBeNull();
    expect(screen.getByTestId('password-value').textContent).toBe('Abcdef123!@#');
  });
});
