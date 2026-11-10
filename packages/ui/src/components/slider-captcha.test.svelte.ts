import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SliderCaptcha from './SliderCaptcha.svelte';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    clip: vi.fn(),
    createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
    createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

describe('SliderCaptcha Component', () => {
  it('renders canvas elements, track, refresh button, and handle', () => {
    const { container } = render(SliderCaptcha, {
      props: {
        width: 300,
        height: 150,
        text: '请向右拖动完成拼图',
      },
    });

    const root = container.querySelector('[data-svadmin-component="SliderCaptcha"]');
    expect(root).not.toBeNull();

    const canvases = container.querySelectorAll('canvas');
    expect(canvases.length).toBe(2);

    const refreshBtn = container.querySelector('button[data-svadmin-action="refresh-captcha"]');
    expect(refreshBtn).not.toBeNull();

    const handle = container.querySelector('[data-svadmin-action="slider-handle"]');
    expect(handle).not.toBeNull();
    expect(container.textContent).toContain('请向右拖动完成拼图');
  });

  it('triggers onrefresh when clicking the refresh button', async () => {
    const onrefreshMock = vi.fn();
    const { container } = render(SliderCaptcha, {
      props: {
        onrefresh: onrefreshMock,
      },
    });

    const refreshBtn = container.querySelector('button[data-svadmin-action="refresh-captcha"]');
    expect(refreshBtn).not.toBeNull();
    if (refreshBtn) {
      await fireEvent.click(refreshBtn);
      expect(onrefreshMock).toHaveBeenCalledTimes(1);
    }
  });

  it('detects automated bot instant sliding and triggers onfail', async () => {
    const onfailMock = vi.fn();
    const onsuccessMock = vi.fn();

    const { container } = render(SliderCaptcha, {
      props: {
        minTimeMs: 300, // 要求至少 300ms 耗时
        onfail: onfailMock,
        onsuccess: onsuccessMock,
      },
    });

    const handle = container.querySelector('[data-svadmin-action="slider-handle"]');
    expect(handle).not.toBeNull();

    if (handle) {
      // 模拟机器瞬时拖动（耗时接近 0ms）
      await fireEvent.mouseDown(handle, { clientX: 10 });
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 180 }));
      window.dispatchEvent(new MouseEvent('mouseup'));

      // 瞬时滑动被检测为机器行为，触发失败
      expect(onfailMock).toHaveBeenCalled();
      expect(onsuccessMock).not.toHaveBeenCalled();
    }
  });

  it('respects disabled prop and prevents starting drag', async () => {
    const onfailMock = vi.fn();
    const onsuccessMock = vi.fn();

    const { container } = render(SliderCaptcha, {
      props: {
        disabled: true,
        onfail: onfailMock,
        onsuccess: onsuccessMock,
      },
    });

    const handle = container.querySelector('[data-svadmin-action="slider-handle"]');
    expect(handle).not.toBeNull();

    if (handle) {
      await fireEvent.mouseDown(handle, { clientX: 10 });
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100 }));
      window.dispatchEvent(new MouseEvent('mouseup'));

      expect(onfailMock).not.toHaveBeenCalled();
      expect(onsuccessMock).not.toHaveBeenCalled();
    }
  });
});
