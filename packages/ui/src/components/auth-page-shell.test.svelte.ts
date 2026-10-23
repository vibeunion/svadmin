import { createRawSnippet } from 'svelte';
import { render } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import AuthPageShell from './AuthPageShell.svelte';

const snippet = (html: string) => createRawSnippet(() => ({ render: () => html }));

describe('AuthPageShell', () => {
  it('keeps the default logo when no brand mark is supplied', () => {
    const { container } = render(AuthPageShell, {
      brand: 'Qualification',
      title: 'Sign in',
      children: snippet('<form aria-label="Login form"></form>'),
    });

    expect(container.querySelector('[data-svadmin-auth-aside]')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-auth-main]')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-auth-card]')).toBeTruthy();
    expect(container.querySelectorAll('[data-svadmin-auth-default-mark]')).toHaveLength(2);
  });

  it('renders a host brand mark in both desktop and mobile brand regions', () => {
    const { container } = render(AuthPageShell, {
      brand: 'Qualification',
      title: 'Sign in',
      brandMark: snippet('<span data-testid="host-brand-mark">CQ</span>'),
      children: snippet('<form aria-label="Login form"></form>'),
      footer: snippet('<a href="/help">Help</a>'),
    });

    expect(container.querySelectorAll('[data-testid="host-brand-mark"]')).toHaveLength(2);
    expect(container.querySelector('[data-svadmin-auth-default-mark]')).toBeNull();
    expect(container.querySelector('[data-svadmin-auth-footer]')).toBeTruthy();
  });

  it('labels the authentication region with its own heading and optional description', async () => {
    const view = render(AuthPageShell, {
      brand: 'Qualification',
      title: 'Sign in',
      description: 'Use your work account',
      children: snippet('<form aria-label="Login form"></form>'),
    });

    const region = view.getByRole('region', { name: 'Sign in' });
    const heading = view.getByRole('heading', { name: 'Sign in', level: 1 });
    const descriptionId = region.getAttribute('aria-describedby');
    expect(region.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId ?? '')?.textContent).toBe('Use your work account');

    await view.rerender({ title: 'Continue', description: '' });
    expect(view.getByRole('region', { name: 'Continue' })).toBe(region);
    expect(region.hasAttribute('aria-describedby')).toBe(false);
    expect(document.getElementById(descriptionId ?? '')).toBeNull();
    expect(region.getAttribute('aria-labelledby')).toBe(heading.id);
  });

  it('does not describe the region when supporting copy is omitted', () => {
    const view = render(AuthPageShell, {
      brand: 'Qualification',
      title: 'Sign in',
      children: snippet('<form aria-label="Login form"></form>'),
    });

    expect(view.getByRole('region', { name: 'Sign in' }).hasAttribute('aria-describedby')).toBe(false);
  });

  it('keeps heading and description references isolated across instances', () => {
    const first = render(AuthPageShell, {
      brand: 'Qualification',
      title: 'Sign in',
      description: 'Use your work account',
      children: snippet('<form aria-label="Login form"></form>'),
    });
    const second = render(AuthPageShell, {
      brand: 'Qualification',
      title: 'Reset password',
      description: 'Choose a new password',
      children: snippet('<form aria-label="Reset form"></form>'),
    });
    const firstRegion = first.getByRole('region', { name: 'Sign in' });
    const secondRegion = second.getByRole('region', { name: 'Reset password' });

    for (const attribute of ['aria-labelledby', 'aria-describedby']) {
      const firstId = firstRegion.getAttribute(attribute);
      const secondId = secondRegion.getAttribute(attribute);
      expect(firstId).toBeTruthy();
      expect(secondId).toBeTruthy();
      expect(firstId).not.toBe(secondId);
      expect(firstRegion.contains(document.getElementById(firstId ?? ''))).toBe(true);
      expect(secondRegion.contains(document.getElementById(secondId ?? ''))).toBe(true);
    }
  });

  it('preserves keyboard order from credential fields through the footer', async () => {
    const user = userEvent.setup();
    const view = render(AuthPageShell, {
      brand: 'Qualification',
      title: 'Sign in',
      children: snippet('<form><input aria-label="Email" /><input aria-label="Password" type="password" /><button type="submit">Sign in</button></form>'),
      footer: snippet('<a href="/help">Help</a>'),
    });
    for (const control of [
      view.getByLabelText('Email'),
      view.getByLabelText('Password'),
      view.getByRole('button', { name: 'Sign in' }),
      view.getByRole('link', { name: 'Help' }),
    ]) {
      await user.tab();
      expect(document.activeElement).toBe(control);
    }
  });
});
