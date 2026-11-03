import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import RealtimeMonitorView from './RealtimeMonitorView.svelte';

describe('RealtimeMonitorView Component', () => {
  it('renders dashboard with component marker and metric values', () => {
    const { container } = render(RealtimeMonitorView, {
      props: {
        title: '集群监控大屏测试',
        streamResolution: '4K @ 60 FPS',
      },
    });

    const root = container.querySelector('[data-svadmin-component="RealtimeMonitorView"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('集群监控大屏测试');
    expect(container.textContent).toContain('4K @ 60 FPS');
    expect(container.textContent).toContain('CPU 使用率');
  });

  it('triggers emergency switch toggle callback', async () => {
    const onswitchtoggle = vi.fn();
    const { container } = render(RealtimeMonitorView, {
      props: { onswitchtoggle },
    });

    const throttleBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('网关高频限流保护')
    );
    expect(throttleBtn).toBeTruthy();
    if (throttleBtn) {
      await fireEvent.click(throttleBtn);
      expect(onswitchtoggle).toHaveBeenCalledWith('throttle', true);
    }
  });
});
