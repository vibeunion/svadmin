import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import MicroAppFrame from './MicroAppFrame.svelte';

describe('MicroAppFrame Component', () => {
  const testSrc = 'about:blank';

  it('renders iframe with provided src, title, and initial loading overlay', () => {
    const { container } = render(MicroAppFrame, {
      props: {
        src: testSrc,
        title: 'Grafana Telemetry',
      },
    });

    const frameWrapper = container.querySelector('[data-svadmin-component="micro-app-frame"]');
    expect(frameWrapper).toBeDefined();

    expect(screen.getByText('Grafana Telemetry')).toBeDefined();

    const iframe = container.querySelector('iframe');
    expect(iframe).toBeDefined();
    expect(iframe?.getAttribute('src')).toBe(testSrc);

    // Initial loading indicator
    const loading = container.querySelector('[data-svadmin-frame-loading="true"]');
    expect(loading).toBeDefined();
  });

  it('toggles fullscreen mode when maximize button is clicked', async () => {
    const { container } = render(MicroAppFrame, {
      props: {
        src: testSrc,
      },
    });

    const toggleBtn = container.querySelector('[data-svadmin-action="toggle-fullscreen"]') as HTMLElement;
    expect(toggleBtn).toBeDefined();

    const wrapper = container.querySelector('[data-svadmin-component="micro-app-frame"]');
    expect(wrapper?.getAttribute('data-svadmin-fullscreen')).toBe('false');

    await fireEvent.click(toggleBtn);
    expect(wrapper?.getAttribute('data-svadmin-fullscreen')).toBe('true');

    await fireEvent.click(toggleBtn);
    expect(wrapper?.getAttribute('data-svadmin-fullscreen')).toBe('false');
  });

  it('handles postMessage svadmin:resize and svadmin:ready events', async () => {
    const onready = vi.fn();
    const onmessage = vi.fn();

    const { container } = render(MicroAppFrame, {
      props: {
        src: testSrc,
        autoResize: true,
        onready,
        onmessage,
      },
    });

    // Simulate child sending svadmin:ready
    const readyEvent = new MessageEvent('message', {
      data: { type: 'svadmin:ready' },
      origin: window.location.origin,
    });
    window.dispatchEvent(readyEvent);

    expect(onready).toHaveBeenCalled();
    expect(onmessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'svadmin:ready' }));

    // Simulate child sending svadmin:resize
    const resizeEvent = new MessageEvent('message', {
      data: { type: 'svadmin:resize', payload: { height: 920 } },
      origin: window.location.origin,
    });
    window.dispatchEvent(resizeEvent);

    expect(onmessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'svadmin:resize' }));
    await new Promise((r) => setTimeout(r, 30));
    const frameBody = container.querySelector('[data-svadmin-frame="true"]')?.parentElement;
    expect(frameBody?.getAttribute('style')).toContain('height: 920px');
  });

  it('triggers reload and displays error card when timeout expires', async () => {
    const onerror = vi.fn();

    const { container } = render(MicroAppFrame, {
      props: {
        src: testSrc,
        timeoutMs: 30, // 30ms short timeout
        onerror,
      },
    });

    // Wait for timeout to fire naturally
    await new Promise((r) => setTimeout(r, 60));

    const errorCard = container.querySelector('[data-svadmin-frame-error="true"]');
    expect(errorCard).toBeDefined();
    expect(screen.getByText('Failed to load embedded application')).toBeDefined();
    expect(onerror).toHaveBeenCalled();
  });
});
