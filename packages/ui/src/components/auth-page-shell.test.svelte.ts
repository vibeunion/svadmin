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
});
