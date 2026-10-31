import { render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import LiteAutoSaveIndicator from './advanced/LiteAutoSaveIndicator.svelte';
import LiteRealtimeStatus from './compatibility/LiteRealtimeStatus.svelte';
import LiteSkeleton from './LiteSkeleton.svelte';
import LiteTabs from './LiteTabs.svelte';

/**
 * Contract for the four mappings upgraded from `fallback` to `exact` after the
 * second re-audit: the capability is fully expressed in server HTML, so the tests
 * pin the state machine rather than a visual snapshot.
 */
afterEach(() => {
  document.head.querySelectorAll('meta[http-equiv="refresh"]').forEach((node) => node.remove());
});

describe('Lite auto-save indicator', () => {
  it('renders all four save states with live-region semantics', () => {
    const idle = render(LiteAutoSaveIndicator, { status: 'idle' });
    const status = idle.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-label')).toBe('All changes saved');
    expect(status.textContent).toContain('All changes saved');
    idle.unmount();

    const loading = render(LiteAutoSaveIndicator, { status: 'loading' });
    expect(loading.getByRole('status').getAttribute('aria-label')).toBe('Saving');
    expect(loading.getByRole('status').textContent).toContain('Saving');
    loading.unmount();

    const success = render(LiteAutoSaveIndicator, { status: 'success' });
    expect(success.getByRole('status').getAttribute('aria-label')).toBe('Saved');
    expect(success.container.querySelector('.lite-auto-save--success')).toBeTruthy();
  });

  it('exposes the error detail and still accepts the legacy `saved` spelling', () => {
    const failed = render(LiteAutoSaveIndicator, {
      status: 'error',
      error: 'Network unreachable',
    });
    const status = failed.getByRole('status');
    expect(status.getAttribute('aria-label')).toBe('Save failed');
    expect(status.getAttribute('title')).toBe('Network unreachable');
    expect(status.textContent).toContain('Network unreachable');
    failed.unmount();

    const legacy = render(LiteAutoSaveIndicator, { status: 'saved' });
    expect(legacy.container.querySelector('.lite-auto-save--success')).toBeTruthy();
    expect(legacy.getByRole('status').getAttribute('aria-label')).toBe('Saved');
  });

  it('merges a caller class and keeps a message override', () => {
    const view = render(LiteAutoSaveIndicator, {
      status: 'loading',
      message: 'Persisting draft',
      class: 'host-surface',
    });
    const status = view.getByRole('status');
    expect(status.classList.contains('host-surface')).toBe(true);
    expect(status.classList.contains('lite-auto-save')).toBe(true);
    expect(status.textContent).toContain('Persisting draft');
  });
});

describe('Lite realtime status', () => {
  it('maps the three connection states to a labelled badge', () => {
    const connected = render(LiteRealtimeStatus, { connection: 'connected' });
    const live = connected.getByRole('status');
    expect(live.textContent).toBe('Live');
    expect(live.classList.contains('lite-badge-success')).toBe(true);
    expect(connected.container.querySelector('[data-connection="connected"]')).toBeTruthy();
    connected.unmount();

    const connecting = render(LiteRealtimeStatus, { connection: 'connecting' });
    expect(connecting.getByRole('status').textContent).toBe('Connecting…');
    expect(connecting.getByRole('status').classList.contains('lite-badge-warning')).toBe(true);
    connecting.unmount();

    const offline = render(LiteRealtimeStatus, { connection: 'disconnected' });
    expect(offline.getByRole('status').textContent).toBe('Offline');
    expect(offline.getByRole('status').classList.contains('lite-badge-danger')).toBe(true);
  });

  it('renders resource and last-event details only when asked', () => {
    const detailed = render(LiteRealtimeStatus, {
      connection: 'connected',
      resource: 'orders',
      lastEvent: { type: 'order.updated', timestamp: 0 },
      showDetails: true,
    });
    expect(detailed.container.textContent).toContain('orders');
    expect(detailed.container.textContent).toContain('order.updated');
    detailed.unmount();

    const plain = render(LiteRealtimeStatus, {
      connection: 'connected',
      resource: 'orders',
      lastEvent: { type: 'order.updated', timestamp: 0 },
    });
    expect(plain.container.textContent).toContain('orders');
    expect(plain.container.textContent).not.toContain('order.updated');
  });

  it('keeps the free-text snapshot label and the refresh fallback', () => {
    const view = render(LiteRealtimeStatus, {
      status: 'Snapshot 12:00',
      refreshHref: '/lite/status',
      refreshSeconds: 15,
    });
    expect(view.container.querySelector('.lite-badge')?.textContent).toBe('Snapshot 12:00');
    expect(view.container.querySelector('a[href="/lite/status"]')).toBeTruthy();
    expect(document.head.querySelector('meta[http-equiv="refresh"]')?.getAttribute('content'))
      .toBe('15; url=/lite/status');
  });
});

describe('Lite page skeleton', () => {
  it('generates list rows from props without any client randomness', () => {
    const view = render(LiteSkeleton, { variant: 'list', rows: 3, label: 'Loading orders' });
    const region = view.getByRole('status', { name: 'Loading orders' });
    expect(region.getAttribute('data-variant')).toBe('list');
    expect(region.querySelectorAll('.lite-skeleton__block[data-shape="list"]')).toHaveLength(3);
    // Header block only appears for the list variant.
    expect(region.querySelector('.lite-skeleton__header')).toBeTruthy();
  });

  it('renders show and form layouts with the form action block', () => {
    const show = render(LiteSkeleton, { variant: 'show', rows: 2 });
    expect(show.container.querySelectorAll('.lite-skeleton__block[data-shape="show"]')).toHaveLength(2);
    expect(show.container.querySelector('[data-shape="actions"]')).toBeNull();
    show.unmount();

    const form = render(LiteSkeleton, { variant: 'form', rows: 2 });
    expect(form.container.querySelectorAll('.lite-skeleton__block[data-shape="form"]')).toHaveLength(2);
    expect(form.container.querySelector('[data-shape="actions"]')).toBeTruthy();
  });

  it('keeps the plain text-line mode as the default', () => {
    const view = render(LiteSkeleton, { lines: 2 });
    const region = view.getByRole('status', { name: 'Loading' });
    expect(region.getAttribute('data-variant')).toBe('text');
    expect(region.querySelector('.lite-skeleton__header')).toBeNull();
    expect(region.querySelectorAll('.lite-skeleton__line')).toHaveLength(2);
  });
});

describe('Lite tabs as a segmented control', () => {
  const items = [
    { label: 'Open', value: 'open', href: '/lite/orders?status=open' },
    { label: 'Closed', value: 'closed', href: '/lite/orders?status=closed' },
  ];

  it('marks the active option with aria-current and a group label', () => {
    const view = render(LiteTabs, { items, activeValue: 'open', label: 'Order status' });
    const group = view.getByRole('navigation', { name: 'Order status' });
    const links = Array.from(group.querySelectorAll('a'));
    expect(links).toHaveLength(2);
    expect(links[0]?.getAttribute('aria-current')).toBe('page');
    expect(links[0]?.getAttribute('href')).toBe('/lite/orders?status=open');
    expect(links[1]?.getAttribute('aria-current')).toBeNull();
  });

  it('renders a disabled option as inert text instead of a link', () => {
    const view = render(LiteTabs, {
      items: [...items, { label: 'Archived', value: 'archived', href: '/lite/orders?status=archived', disabled: true }],
      activeValue: 'open',
    });
    const disabled = view.container.querySelector('[aria-disabled="true"]');
    expect(disabled?.tagName.toLowerCase()).toBe('span');
    expect(disabled?.textContent).toBe('Archived');
    expect(view.container.querySelectorAll('a')).toHaveLength(2);
  });

  it('merges a caller class and never invents a selection', () => {
    const view = render(LiteTabs, {
      items,
      activeValue: 'missing',
      class: 'host-surface',
    });
    const group = view.container.querySelector('.lite-tabs');
    expect(group?.classList.contains('host-surface')).toBe(true);
    expect(view.container.querySelectorAll('[aria-current]')).toHaveLength(0);
    expect(view.container.querySelectorAll('.active')).toHaveLength(0);
  });
});