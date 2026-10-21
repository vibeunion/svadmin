import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import PasswordInputHost from '../../test/fixtures/PasswordInputHost.svelte';

function passwordControl() {
  const control = screen.getByLabelText('Password');
  if (!(control instanceof HTMLInputElement)) throw new Error('Missing password input');
  return control;
}

describe('PasswordInput', () => {
  it('publishes stable anatomy hooks while keeping the label, lock, and password type', () => {
    const { container } = render(PasswordInputHost);

    const root = container.querySelector('[data-svadmin-password-input]');
    const label = screen.getByText('Password');
    const control = passwordControl();

    expect(root?.classList.contains('svadmin-password-input')).toBe(true);
    expect(root?.hasAttribute('data-svadmin-login-password')).toBe(true);
    expect(root?.querySelector('[data-svadmin-password-field]')).not.toBeNull();
    expect(root?.querySelector('[data-svadmin-password-icon]')).not.toBeNull();
    expect(label.tagName).toBe('LABEL');
    expect(control.type).toBe('password');
    expect(control.classList.contains('svadmin-password-input__control')).toBe(true);
    expect(control.getAttribute('data-svadmin-password-control')).not.toBeNull();
  });

  it('reveals and hides by click or Space without submitting or clearing the value', async () => {
    const user = userEvent.setup();
    render(PasswordInputHost, { initialValue: 'secret-value' });

    const control = passwordControl();
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle.getAttribute('type')).toBe('button');
    expect(toggle.hasAttribute('tabindex')).toBe(false);

    await user.click(toggle);
    expect(control.type).toBe('text');
    expect(control.value).toBe('secret-value');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('submit-count').textContent).toBe('0');

    await user.click(toggle);
    expect(control.type).toBe('password');
    expect(control.value).toBe('secret-value');
    expect(screen.getByTestId('submit-count').textContent).toBe('0');

    control.focus();
    await user.tab();
    expect(document.activeElement).toBe(toggle);
    await user.keyboard(' ');
    expect(control.type).toBe('text');
    expect(control.value).toBe('secret-value');
    expect(screen.getByTestId('submit-count').textContent).toBe('0');
  });

  it('forwards disabled and described invalid state without dropping the value', () => {
    render(PasswordInputHost, {
      initialValue: 'invalid-secret',
      disabled: true,
      ariaInvalid: 'true',
      ariaDescribedby: 'password-help',
    });

    const control = passwordControl();
    const toggle = screen.getByRole('button', { name: 'Show password' });

    expect(control.disabled).toBe(true);
    expect(control.value).toBe('invalid-secret');
    expect(control.getAttribute('aria-invalid')).toBe('true');
    expect(control.getAttribute('aria-describedby')).toBe('password-help');
    expect(toggle).toHaveProperty('disabled', true);
  });

  it('keeps the strength meter in the same stable anatomy after typing', async () => {
    const { container } = render(PasswordInputHost, { showStrength: true });
    const control = passwordControl();

    await fireEvent.input(control, { target: { value: 'Abcdef123!@#' } });

    const strength = container.querySelector('[data-svadmin-password-strength]');
    expect(strength).not.toBeNull();
    expect(strength?.querySelector('[data-tone="success"]')).not.toBeNull();
    expect(screen.getByTestId('password-value').textContent).toBe('Abcdef123!@#');
  });
});
