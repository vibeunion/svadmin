import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import OfflineBanner from './OfflineSyncBanner.svelte';
import OfflineGuard from './OfflineGuard.svelte';
import { useNetworkStatus } from './useNetworkStatus.svelte.js';

describe('useNetworkStatus Hook', () => {
  it('initializes with online state and allows refresh', () => {
    const netStatus = useNetworkStatus();
    expect(typeof netStatus.isOnline).toBe('boolean');
    expect(typeof netStatus.isWeak).toBe('boolean');
    expect(netStatus.refresh).toBeDefined();
    netStatus.refresh();
  });
});

describe('OfflineBanner Component (Alias of OfflineSyncBanner)', () => {
  it('renders offline warning banner when isOnline is false', () => {
    const { container } = render(OfflineBanner, {
      props: {
        isOnline: false,
      },
    });

    const banner = container.querySelector('[role="status"]');
    expect(banner).toBeDefined();
    expect(container.textContent).toContain('Offline Mode');
  });

  it('renders banner when isOnline is true', () => {
    const { container } = render(OfflineBanner, {
      props: {
        isOnline: true,
      },
    });

    expect(container.textContent).toBeDefined();
  });
});

describe('OfflineGuard Component', () => {
  it('applies disabled styling when offline and mode is disable', () => {
    const { container } = render(OfflineGuard, {
      props: {
        online: false,
        mode: 'disable',
      },
    });

    const guard = container.querySelector('[data-svadmin-component="offline-guard"]');
    expect(guard).toBeDefined();
    expect(guard?.getAttribute('data-svadmin-offline')).toBe('true');

    const innerWrapper = guard?.firstElementChild;
    expect(innerWrapper?.className).toContain('pointer-events-none');
    expect(innerWrapper?.className).toContain('opacity-60');
  });

  it('renders overlay when offline and mode is overlay', () => {
    const { container } = render(OfflineGuard, {
      props: {
        online: false,
        mode: 'overlay',
        message: 'Submission suspended while offline',
      },
    });

    const overlay = container.querySelector('[data-svadmin-guard-overlay="true"]');
    expect(overlay).toBeDefined();
    expect(screen.getByText('Submission suspended while offline')).toBeDefined();
  });

  it('renders normally without restrictions when online', () => {
    const { container } = render(OfflineGuard, {
      props: {
        online: true,
        mode: 'disable',
      },
    });

    const guard = container.querySelector('[data-svadmin-component="offline-guard"]');
    expect(guard?.getAttribute('data-svadmin-offline')).toBe('false');

    const overlay = container.querySelector('[data-svadmin-guard-overlay="true"]');
    expect(overlay).toBeNull();
  });
});
