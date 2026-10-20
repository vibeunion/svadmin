import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import AppShellPage from './AppShellPage.svelte';

const snippet = (html: string) => createRawSnippet(() => ({ render: () => html }));

function renderShell(overrides: Record<string, unknown> = {}) {
  return render(AppShellPage, {
    children: snippet('<p>Page body</p>'),
    ...overrides,
  });
}

describe('AppShellPage', () => {
  it('renders page content inside the primary landmark without a sidebar', () => {
    const { container } = renderShell();
    const main = container.querySelector('main');
    expect(main).toBeTruthy();
    expect(main?.textContent).toContain('Page body');
    expect(container.querySelector('nav')).toBeNull();
    expect(container.querySelector('.svadmin-app-shell')?.getAttribute('data-sidebar')).toBeNull();
  });

  it('exposes a labelled navigation landmark and a skip link that targets main', () => {
    const { container } = renderShell({
      sidebar: snippet('<a href="#/orders">Orders</a>'),
      label: 'Primary',
    });
    expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe('Primary');
    const nav = container.querySelector('nav') as HTMLElement;
    const toggle = container.querySelector('[data-slot="app-shell-mobile-toggle"]') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-controls')).toBe(nav.id);
    const skip = container.querySelector('.svadmin-app-shell__skip') as HTMLAnchorElement;
    const main = container.querySelector('main') as HTMLElement;
    expect(skip.getAttribute('href')).toBe(`#${main.id}`);
    expect(main.id).not.toBe('');
    expect(container.querySelector('.svadmin-app-shell')?.getAttribute('data-sidebar')).toBe('true');
  });

  it('moves focus to main without turning the skip link into a route change', async () => {
    const { container } = renderShell({ sidebar: snippet('<a href="#/orders">Orders</a>') });
    const skip = container.querySelector('.svadmin-app-shell__skip') as HTMLAnchorElement;
    const main = container.querySelector('main') as HTMLElement;
    await fireEvent.click(skip);
    expect(document.activeElement).toBe(main);
    expect(window.location.hash).not.toBe(`#${main.id}`);
  });

  it('maps width and collapsed state onto shell hooks', () => {
    const { container, rerender } = renderShell({ width: 'wide', collapsed: true });
    const shell = container.querySelector('.svadmin-app-shell') as HTMLElement;
    expect(shell.getAttribute('data-width')).toBe('wide');
    expect(shell.getAttribute('data-collapsed')).toBe('true');
    rerender({ width: 'narrow', collapsed: false });
    expect(shell.getAttribute('data-width')).toBe('narrow');
    expect(shell.getAttribute('data-collapsed')).toBeNull();
  });

  it('renders topbar slots in leading, middle and trailing order', () => {
    const { container } = renderShell({
      topbarStart: snippet('<span>Brand</span>'),
      topbar: snippet('<span>Search</span>'),
      topbarEnd: snippet('<span>Account</span>'),
    });
    const topbar = container.querySelector('.svadmin-app-shell__topbar') as HTMLElement;
    const text = topbar.textContent ?? '';
    expect(text.indexOf('Brand')).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('Brand')).toBeLessThan(text.indexOf('Search'));
    expect(text.indexOf('Search')).toBeLessThan(text.indexOf('Account'));
  });

  it('renders the aside region only when provided', () => {
    const { container, rerender } = renderShell();
    expect(container.querySelector('aside')).toBeNull();
    rerender({ aside: snippet('<p>Audit trail</p>') });
    expect(screen.getByText('Audit trail')).toBeTruthy();
    expect(container.querySelector('.svadmin-app-shell')?.getAttribute('data-aside')).toBe('true');
  });

  it('toggles the mobile navigation drawer and closes it on Escape', async () => {
    const { container } = renderShell({ sidebar: snippet('<a href="#/orders">Orders</a>') });
    const toggle = container.querySelector('[data-slot="app-shell-mobile-toggle"]') as HTMLButtonElement;
    const shell = container.querySelector('.svadmin-app-shell') as HTMLElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    await fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(shell.getAttribute('data-mobile-open')).toBe('true');

    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(shell.getAttribute('data-mobile-open')).toBeNull();
  });

  it('closes the drawer from the scrim', async () => {
    const { container } = renderShell({ sidebar: snippet('<a href="#/orders">Orders</a>') });
    const scrim = container.querySelector('[data-slot="app-shell-scrim"]') as HTMLButtonElement;
    await fireEvent.click(container.querySelector('[data-slot="app-shell-mobile-toggle"]') as HTMLButtonElement);
    await fireEvent.click(scrim);
    expect(container.querySelector('.svadmin-app-shell')?.getAttribute('data-mobile-open')).toBeNull();
  });

  it('renders the footer region when provided', () => {
    renderShell({ footer: snippet('<span>Version 1.0</span>') });
    expect(screen.getByText('Version 1.0')).toBeTruthy();
  });
});
