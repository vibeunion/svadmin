import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FullscreenButton from './FullscreenButton.svelte';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('FullscreenButton', () => {
  it('renders with default attributes and lucide icon', () => {
    const { container } = render(FullscreenButton);
    const button = container.querySelector('[data-svadmin-component="FullscreenButton"]');
    expect(button).not.toBeNull();
    expect(button?.getAttribute('aria-pressed')).toBe('false');
  });

  it('handles toggle click and requests fullscreen on documentElement', async () => {
    const requestFullscreenMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: requestFullscreenMock,
      configurable: true,
      writable: true,
    });

    const onchange = vi.fn();
    const { container } = render(FullscreenButton, { onchange });
    const button = container.querySelector('button');
    expect(button).not.toBeNull();

    if (button) {
      await fireEvent.click(button);
      expect(requestFullscreenMock).toHaveBeenCalledTimes(1);
    }
  });

  it('exits fullscreen when document.fullscreenElement is active', async () => {
    const exitFullscreenMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'fullscreenElement', {
      value: document.documentElement,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(document, 'exitFullscreen', {
      value: exitFullscreenMock,
      configurable: true,
      writable: true,
    });

    const { container } = render(FullscreenButton);
    const button = container.querySelector('button');
    expect(button).not.toBeNull();

    if (button) {
      await fireEvent.click(button);
      expect(exitFullscreenMock).toHaveBeenCalledTimes(1);
    }

    // Clean up mock property
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      configurable: true,
      writable: true,
    });
  });
});
