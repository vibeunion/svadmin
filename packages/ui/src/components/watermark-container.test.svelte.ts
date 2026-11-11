import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import WatermarkContainer from './WatermarkContainer.svelte';

describe('WatermarkContainer Component', () => {
  it('renders root container and watermark overlay layer', () => {
    const { container } = render(WatermarkContainer, {
      props: {
        content: ['SVAdmin Enterprise', 'CONFIDENTIAL - 2026-11-11'],
        gapX: 32,
        gapY: 32,
      },
    });

    const root = container.querySelector('[data-svadmin-component="WatermarkContainer"]');
    expect(root).toBeTruthy();

    const overlay = container.querySelector('[data-svadmin-watermark-overlay="true"]');
    expect(overlay).toBeTruthy();
    expect(overlay?.getAttribute('aria-hidden')).toBe('true');
  });

  it('restores overlay element if removed (anti-tamper protection)', async () => {
    const { container } = render(WatermarkContainer, {
      props: {
        content: 'SECURITY_TOKEN_123',
        antiTamper: true,
      },
    });

    const root = container.querySelector('[data-svadmin-component="WatermarkContainer"]');
    expect(root).toBeTruthy();
    let overlay = container.querySelector('[data-svadmin-watermark-overlay="true"]');
    expect(overlay).toBeTruthy();

    // Simulate tampering: malicious script removes watermark overlay
    overlay?.remove();
    expect(container.querySelector('[data-svadmin-watermark-overlay="true"]')).toBeNull();

    // Wait for MutationObserver callback
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Anti-tamper should restore the overlay
    overlay = container.querySelector('[data-svadmin-watermark-overlay="true"]');
    expect(overlay).toBeTruthy();
  });

  it('restores overlay styles if tampered via inline style', async () => {
    const { container } = render(WatermarkContainer, {
      props: {
        content: 'SECURITY_TOKEN_123',
        antiTamper: true,
      },
    });

    const overlay = container.querySelector<HTMLElement>('[data-svadmin-watermark-overlay="true"]');
    expect(overlay).toBeTruthy();

    if (overlay) {
      // Simulate tampering: style="display: none"
      overlay.style.display = 'none';

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(overlay.style.display).not.toBe('none');
    }
  });
});
