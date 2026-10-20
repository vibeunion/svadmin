import { createRawSnippet } from 'svelte';
import { render } from '@testing-library/svelte';
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
    expect(container.querySelector('[data-svadmin-auth-card]')?.getAttribute('aria-labelledby')).toBe('svadmin-auth-title');
    expect(container.querySelector('#svadmin-auth-title')?.textContent).toBe('Sign in');
    expect(container.querySelector('#svadmin-auth-description')).toBeNull();
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
    expect(container.querySelector('[data-svadmin-auth-footer]')).toBeTruthy();
  });

  it('associates the card with its description and keeps focusable content in DOM order', () => {
    const { container } = render(AuthPageShell, {
      brand: 'Qualification',
      title: 'Sign in',
      description: 'Use your work account',
      children: snippet('<form><input aria-label="Email" /><input aria-label="Password" /><button type="submit">Sign in</button></form>'),
    });

    const card = container.querySelector('[data-svadmin-auth-card]');
    expect(card?.getAttribute('aria-describedby')).toBe('svadmin-auth-description');
    expect(container.querySelector('#svadmin-auth-description')?.textContent).toBe('Use your work account');
    expect([...container.querySelectorAll<HTMLElement>('input, button')].map(element => element.getAttribute('aria-label') ?? element.textContent?.trim()))
      .toEqual(['Email', 'Password', 'Sign in']);
  });
});
