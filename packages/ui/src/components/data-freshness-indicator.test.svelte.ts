import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import DataFreshnessIndicator from './DataFreshnessIndicator.svelte';

describe('DataFreshnessIndicator Component', () => {
  it('renders relative time and pulse indicator dot', () => {
    const now = Date.now();
    const { container } = render(DataFreshnessIndicator, {
      props: {
        lastUpdated: now,
      },
    });

    const root = container.querySelector('[data-svadmin-component="DataFreshnessIndicator"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('刚刚更新');
    expect(root?.getAttribute('data-freshness')).toBe('live');
  });

  it('switches to stale status when elapsed exceeds staleThresholdMs', () => {
    const tenMinutesAgo = Date.now() - 1000 * 60 * 10;
    const { container } = render(DataFreshnessIndicator, {
      props: {
        lastUpdated: tenMinutesAgo,
        staleThresholdMs: 60000,
      },
    });

    const root = container.querySelector('[data-svadmin-component="DataFreshnessIndicator"]');
    expect(root?.getAttribute('data-freshness')).toBe('stale');
    expect(container.textContent).toContain('分钟前');
  });

  it('triggers onsyncnow callback when clicked', async () => {
    const onSync = vi.fn();
    const { container } = render(DataFreshnessIndicator, {
      props: {
        lastUpdated: Date.now(),
        onsyncnow: onSync,
      },
    });

    const syncBtn = container.querySelector('button');
    expect(syncBtn).toBeTruthy();
    if (syncBtn) {
      await fireEvent.click(syncBtn);
      expect(onSync).toHaveBeenCalledTimes(1);
    }
  });

  it('uses the active locale for the poll interval accessible name', () => {
    const { container } = render(DataFreshnessIndicator, {
      props: { lastUpdated: Date.now(), pollInterval: 0 },
    });

    expect(container.querySelector('select[aria-label="Poll interval"]')).toBeTruthy();
  });
});
