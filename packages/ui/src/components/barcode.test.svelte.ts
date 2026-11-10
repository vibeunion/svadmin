import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Barcode from './Barcode.svelte';

describe('Barcode Component', () => {
  it('renders SVG barcode with CODE128 format by default', () => {
    const { container } = render(Barcode, {
      props: {
        value: 'SVADMIN-2026-TEST',
      },
    });

    const root = container.querySelector('[data-svadmin-component="Barcode"]');
    expect(root).not.toBeNull();

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-label')).toBe('Barcode for SVADMIN-2026-TEST');

    // 应该渲染若干条形码矩形
    const rects = container.querySelectorAll('svg rect');
    expect(rects.length).toBeGreaterThan(10);

    // 默认展示下方文本
    expect(container.textContent).toContain('SVADMIN-2026-TEST');
  });

  it('renders with CODE39 format correctly', () => {
    const { container } = render(Barcode, {
      props: {
        value: 'LOGISTICS-99',
        format: 'CODE39',
        width: 3,
        height: 80,
      },
    });

    const root = container.querySelector('[data-svadmin-component="Barcode"]');
    expect(root).not.toBeNull();
    expect(container.textContent).toContain('LOGISTICS-99');
  });

  it('supports hiding text and rendering action buttons', () => {
    const { container } = render(Barcode, {
      props: {
        value: 'ITEM-888',
        showText: false,
        showActions: true,
      },
    });

    const textEl = container.querySelector('text');
    expect(textEl).toBeNull();

    const copyBtn = container.querySelector('button[title="复制条码内容"]');
    expect(copyBtn).not.toBeNull();

    const printBtn = container.querySelector('button[title="打印条形码"]');
    expect(printBtn).not.toBeNull();
  });
});
