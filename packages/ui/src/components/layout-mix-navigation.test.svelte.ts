import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/svelte';
import { uiPreferences, updateUiPreferences, resetUiPreferences } from '../ui-preferences.svelte.js';
import AppearanceSettings from './AppearanceSettings.svelte';

afterEach(() => {
  cleanup();
  resetUiPreferences();
});

beforeEach(() => {
  resetUiPreferences();
});

describe('Mix Navigation and Appearance Preferences', () => {
  it('updates navigation layout preference when clicking layout modes in AppearanceSettings', async () => {
    const { container } = render(AppearanceSettings);

    expect(uiPreferences.navigation).toBe('side');

    // Find all buttons
    const buttons = Array.from(container.querySelectorAll('button'));
    const topNavBtn = buttons.find((b) => b.textContent?.includes('Top') || b.textContent?.includes('顶部'));
    expect(topNavBtn).toBeDefined();
    if (topNavBtn) {
      await fireEvent.click(topNavBtn);
      expect(uiPreferences.navigation).toBe('top');
    }

    const mixNavBtn = buttons.find((b) => b.textContent?.includes('Mix') || b.textContent?.includes('混合'));
    expect(mixNavBtn).toBeDefined();
    if (mixNavBtn) {
      await fireEvent.click(mixNavBtn);
      expect(uiPreferences.navigation).toBe('mix');
    }
  });

  it('toggles color weakness and page transition preferences', async () => {
    render(AppearanceSettings);

    expect(uiPreferences.colorWeak).toBe(false);
    expect(uiPreferences.pageTransition).toBe(true);

    updateUiPreferences({ colorWeak: true });
    expect(uiPreferences.colorWeak).toBe(true);

    updateUiPreferences({ pageTransition: false });
    expect(uiPreferences.pageTransition).toBe(false);
  });

  it('updates content width preference between fixed and fluid', async () => {
    const { container } = render(AppearanceSettings);

    expect(uiPreferences.contentWidth).toBe('fixed');

    const buttons = Array.from(container.querySelectorAll('button'));
    const fluidBtn = buttons.find((b) => b.textContent?.includes('Fluid') || b.textContent?.includes('流式'));
    expect(fluidBtn).toBeDefined();
    if (fluidBtn) {
      await fireEvent.click(fluidBtn);
      expect(uiPreferences.contentWidth).toBe('fluid');
    }
  });
});
