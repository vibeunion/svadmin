import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import FeatureAnnouncementModal from './FeatureAnnouncementModal.svelte';

describe('FeatureAnnouncementModal suite', () => {
  it('renders release announcement modal with version and feature cards', () => {
    const view = render(FeatureAnnouncementModal, {
      open: true,
      version: 'v0.5.15',
      releaseDate: '2026-11-11',
    });

    expect(view.container.textContent).toContain('v0.5.15');
    expect(view.container.textContent).toContain('多级审批流设计器');
  });

  it('triggers onExplore callback when exploring', async () => {
    const onExplore = vi.fn();
    const view = render(FeatureAnnouncementModal, {
      open: true,
      onExplore,
    });

    const exploreBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('立即去体验') || b.textContent?.includes('Explore Now'),
    );
    expect(exploreBtn).toBeTruthy();
    if (exploreBtn) {
      await fireEvent.click(exploreBtn);
      expect(onExplore).toHaveBeenCalled();
    }
  });
});
